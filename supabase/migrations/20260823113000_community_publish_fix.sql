-- Make community publishing self-contained and keep access rules server-side.
-- Free/database users may post only to Foto feedback; Academy may use all channels.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'ALL')
      and (
        coalesce(qual, '') ilike '%post-media%'
        or coalesce(with_check, '') ilike '%post-media%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end;
$$;

drop policy if exists "Authenticated users upload community media" on storage.objects;
create policy "Authenticated users upload community media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own community media" on storage.objects;
create policy "Users delete own community media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.community_email(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = lower(trim(coalesce(p_email, '')))
      then lower(auth.jwt() ->> 'email')
    else null
  end;
$$;

create or replace function public.can_access_community_category(p_email text, p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where lower(u.email) = public.community_email(p_email)
      and (u.tier = 'academy' or p_category = 'foto-feedback')
  );
$$;

drop function if exists public.list_posts(text, text, int);
create function public.list_posts(p_email text, p_category text default null, p_limit int default 60)
returns table(id uuid, author_ig text, category text, body text, media_url text, media_type text,
              link_url text, created_at timestamptz, likes int, comments int, liked boolean,
              can_delete boolean, pinned boolean, can_pin boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, p.author_ig, p.category, p.body, p.media_url, p.media_type, p.link_url, p.created_at,
    (select count(*) from public.post_likes l where l.post_id = p.id)::int,
    (select count(*) from public.post_comments c where c.post_id = p.id)::int,
    exists(select 1 from public.post_likes l where l.post_id = p.id and l.author_email = public.community_email(p_email)),
    (p.author_email = public.community_email(p_email) or public.is_admin(public.community_email(p_email))),
    coalesce(p.pinned, false),
    public.is_admin(public.community_email(p_email))
  from public.posts p
  where public.can_access_community_category(p_email, p.category)
    and (p_category is null or p.category = p_category)
  order by p.pinned desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 60), 1), 100);
$$;

create or replace function public.create_post(
  p_email text,
  p_ig text,
  p_category text,
  p_body text,
  p_media_url text,
  p_media_type text,
  p_link_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := public.community_email(p_email);
  v_tier text;
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  select tier into v_tier from public.users where lower(email) = v_email;
  if not public.can_access_community_category(v_email, p_category) then
    raise exception 'Tento komunitni kanal je soucasti Kenji Academy.';
  end if;
  if p_category not in ('foto-feedback','novinky','slevy','dotazy','fotka-mesice','predstav-se','uspechy','second-shooting') then
    raise exception 'Neplatna kategorie.';
  end if;
  if p_category in ('novinky','slevy') and not public.is_admin(v_email) then
    raise exception 'Do teto rubriky muze prispivat jen Kenji.';
  end if;
  if coalesce(nullif(trim(p_body),''), nullif(trim(p_media_url),''), nullif(trim(p_link_url),'')) is null then
    raise exception 'Prispevek je prazdny.';
  end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'Prispevek je prilis dlouhy.'; end if;
  if coalesce(v_tier, 'free') <> 'academy' and (
    select count(*) from public.posts where author_email = v_email and created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Dosahl jsi denniho limitu 5 prispevku.';
  end if;

  insert into public.posts(author_email, author_ig, category, body, media_url, media_type, link_url)
  values (v_email, nullif(trim(p_ig),''), p_category, nullif(trim(p_body),''),
          nullif(trim(p_media_url),''), nullif(trim(p_media_type),''), nullif(trim(p_link_url),''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.community_email(text) from public, anon;
revoke all on function public.can_access_community_category(text,text) from public, anon;
revoke all on function public.list_posts(text,text,int) from public, anon;
revoke all on function public.create_post(text,text,text,text,text,text,text) from public, anon;

grant execute on function public.list_posts(text,text,int) to authenticated;
grant execute on function public.create_post(text,text,text,text,text,text,text) to authenticated;
