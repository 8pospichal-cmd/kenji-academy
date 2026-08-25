-- Adminske pripinani komunitnich prispevku.
-- Spust jednou v Supabase SQL Editoru po zakladnim SUPABASE_PRISPEVKY.md.

alter table public.posts add column if not exists pinned boolean not null default false;

create table if not exists public.legacy_post_pin_overrides (
  post_id text primary key,
  pinned boolean not null,
  updated_at timestamptz not null default now()
);

alter table public.legacy_post_pin_overrides enable row level security;

-- Dva prispevky, ktere byly pripnute uz na Flixy.
insert into public.legacy_post_pin_overrides(post_id, pinned)
values
  ('legacy-rv1n3vkt82ldv0m79yp01s7c', true),
  ('legacy-o31igvh01x662e5u3829ltq1', true)
on conflict (post_id) do nothing;

drop function if exists public.list_posts(text, text, int);
create function public.list_posts(p_email text, p_category text default null, p_limit int default 60)
returns table(id uuid, author_ig text, category text, body text, media_url text, media_type text,
              link_url text, created_at timestamptz, likes int, comments int, liked boolean,
              can_delete boolean, pinned boolean, can_pin boolean)
language sql security definer set search_path = public as $$
  select p.id, p.author_ig, p.category, p.body, p.media_url, p.media_type, p.link_url, p.created_at,
    (select count(*) from public.post_likes l where l.post_id = p.id)::int,
    (select count(*) from public.post_comments c where c.post_id = p.id)::int,
    exists(select 1 from public.post_likes l where l.post_id = p.id and l.author_email = lower(trim(p_email))),
    (p.author_email = lower(trim(p_email)) or public.is_admin(p_email)),
    p.pinned,
    public.is_admin(p_email)
  from public.posts p
  where public.is_member(p_email)
    and (p_category is null or p.category = p_category)
  order by p.pinned desc, p.created_at desc
  limit p_limit;
$$;

create or replace function public.toggle_pin_post(p_email text, p_post uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_pinned boolean;
begin
  if not public.is_admin(p_email) then raise exception 'Jen pro admina.'; end if;
  update public.posts set pinned = not pinned where id = p_post returning pinned into v_pinned;
  if v_pinned is null then raise exception 'Prispevek neexistuje.'; end if;
  return v_pinned;
end; $$;

create or replace function public.list_legacy_pin_overrides(p_email text)
returns table(post_id text, pinned boolean)
language sql security definer set search_path = public as $$
  select o.post_id, o.pinned
  from public.legacy_post_pin_overrides o
  where public.is_member(p_email);
$$;

create or replace function public.toggle_legacy_pin(p_email text, p_post_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_pinned boolean;
begin
  if not public.is_admin(p_email) then raise exception 'Jen pro admina.'; end if;
  select not coalesce((select o.pinned from public.legacy_post_pin_overrides o where o.post_id = p_post_id), false)
    into v_pinned;
  insert into public.legacy_post_pin_overrides(post_id, pinned, updated_at)
  values (p_post_id, v_pinned, now())
  on conflict (post_id) do update set pinned = excluded.pinned, updated_at = excluded.updated_at;
  return v_pinned;
end; $$;

grant execute on function public.list_posts(text,text,int) to anon, authenticated;
grant execute on function public.toggle_pin_post(text,uuid) to anon, authenticated;
grant execute on function public.list_legacy_pin_overrides(text) to anon, authenticated;
grant execute on function public.toggle_legacy_pin(text,text) to anon, authenticated;
