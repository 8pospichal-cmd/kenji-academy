-- Secure freemium community access.
-- Identity always comes from the signed Supabase JWT, never from p_email alone.

alter table public.posts add column if not exists pinned boolean not null default false;
create table if not exists public.legacy_post_pin_overrides (
  post_id text primary key,
  pinned boolean not null,
  updated_at timestamptz not null default now()
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
    where u.email = public.community_email(p_email)
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

create or replace function public.list_comments(p_email text, p_post uuid)
returns table(id uuid, author_ig text, body text, created_at timestamptz, can_delete boolean)
language sql
security definer
set search_path = public
as $$
  select c.id, c.author_ig, c.body, c.created_at,
    (c.author_email = public.community_email(p_email) or public.is_admin(public.community_email(p_email)))
  from public.post_comments c
  join public.posts p on p.id = c.post_id
  where c.post_id = p_post
    and public.can_access_community_category(p_email, p.category)
  order by c.created_at asc;
$$;

create or replace function public.create_post(p_email text, p_ig text, p_category text,
              p_body text, p_media_url text, p_media_type text, p_link_url text)
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
  select tier into v_tier from public.users where email = v_email;
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

create or replace function public.add_comment(p_email text, p_ig text, p_post uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := public.community_email(p_email);
  v_category text;
  v_tier text;
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  select category into v_category from public.posts where id = p_post;
  select tier into v_tier from public.users where email = v_email;
  if v_category is null or not public.can_access_community_category(v_email, v_category) then
    raise exception 'K tomuto prispevku nemas pristup.';
  end if;
  if nullif(trim(p_body),'') is null then raise exception 'Prazdny komentar.'; end if;
  if char_length(trim(p_body)) > 2000 then raise exception 'Komentar je prilis dlouhy.'; end if;
  if coalesce(v_tier, 'free') <> 'academy' and (
    select count(*) from public.post_comments where author_email = v_email and created_at >= now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Dosahl jsi denniho limitu komentaru.';
  end if;
  insert into public.post_comments(post_id, author_email, author_ig, body)
  values (p_post, v_email, nullif(trim(p_ig),''), trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.toggle_like(p_email text, p_post uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.community_email(p_email);
  v_category text;
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  select category into v_category from public.posts where id = p_post;
  if v_category is null or not public.can_access_community_category(v_email, v_category) then
    raise exception 'K tomuto prispevku nemas pristup.';
  end if;
  if exists(select 1 from public.post_likes where post_id = p_post and author_email = v_email) then
    delete from public.post_likes where post_id = p_post and author_email = v_email;
    return false;
  end if;
  insert into public.post_likes(post_id, author_email) values (p_post, v_email);
  return true;
end;
$$;

create or replace function public.delete_post(p_email text, p_post uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_email text := public.community_email(p_email);
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  delete from public.posts where id = p_post and (author_email = v_email or public.is_admin(v_email));
end;
$$;

create or replace function public.delete_comment(p_email text, p_comment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_email text := public.community_email(p_email);
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  delete from public.post_comments where id = p_comment and (author_email = v_email or public.is_admin(v_email));
end;
$$;

create or replace function public.toggle_pin_post(p_email text, p_post uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_pinned boolean; v_email text := public.community_email(p_email);
begin
  if v_email is null or not public.is_admin(v_email) then raise exception 'Jen pro admina.'; end if;
  update public.posts set pinned = not pinned where id = p_post returning pinned into v_pinned;
  if v_pinned is null then raise exception 'Prispevek neexistuje.'; end if;
  return v_pinned;
end;
$$;

create or replace function public.list_legacy_pin_overrides(p_email text)
returns table(post_id text, pinned boolean)
language sql
security definer
set search_path = public
as $$
  select o.post_id, o.pinned from public.legacy_post_pin_overrides o
  where public.is_admin(public.community_email(p_email));
$$;

create or replace function public.toggle_legacy_pin(p_email text, p_post_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_pinned boolean; v_email text := public.community_email(p_email);
begin
  if v_email is null or not public.is_admin(v_email) then raise exception 'Jen pro admina.'; end if;
  select not coalesce((select o.pinned from public.legacy_post_pin_overrides o where o.post_id = p_post_id), false) into v_pinned;
  insert into public.legacy_post_pin_overrides(post_id, pinned, updated_at)
  values (p_post_id, v_pinned, now())
  on conflict (post_id) do update set pinned = excluded.pinned, updated_at = excluded.updated_at;
  return v_pinned;
end;
$$;

revoke all on function public.community_email(text) from public, anon;
revoke all on function public.can_access_community_category(text,text) from public, anon;
revoke all on function public.list_posts(text,text,int) from public, anon;
revoke all on function public.list_comments(text,uuid) from public, anon;
revoke all on function public.create_post(text,text,text,text,text,text,text) from public, anon;
revoke all on function public.add_comment(text,text,uuid,text) from public, anon;
revoke all on function public.toggle_like(text,uuid) from public, anon;
revoke all on function public.delete_post(text,uuid) from public, anon;
revoke all on function public.delete_comment(text,uuid) from public, anon;
revoke all on function public.toggle_pin_post(text,uuid) from public, anon;
revoke all on function public.list_legacy_pin_overrides(text) from public, anon;
revoke all on function public.toggle_legacy_pin(text,text) from public, anon;

grant execute on function public.list_posts(text,text,int) to authenticated;
grant execute on function public.list_comments(text,uuid) to authenticated;
grant execute on function public.create_post(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.add_comment(text,text,uuid,text) to authenticated;
grant execute on function public.toggle_like(text,uuid) to authenticated;
grant execute on function public.delete_post(text,uuid) to authenticated;
grant execute on function public.delete_comment(text,uuid) to authenticated;
grant execute on function public.toggle_pin_post(text,uuid) to authenticated;
grant execute on function public.list_legacy_pin_overrides(text) to authenticated;
grant execute on function public.toggle_legacy_pin(text,text) to authenticated;
