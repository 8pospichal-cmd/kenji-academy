-- Komunita: u příspěvků a komentářů vracet jméno a fotku autora z jeho profilu
-- (Nastavení → public.users.display_name / avatar_url). Dosud se vracel jen Instagram,
-- takže kdo ho neměl vyplněný, zobrazil se jako „člen“ s otazníkem místo fotky.
-- E-mail autora dál zůstává skrytý.

drop function if exists public.list_posts(text, text, int);
create function public.list_posts(p_email text, p_category text default null, p_limit int default 60)
returns table(id uuid, author_ig text, category text, body text, media_url text, media_type text,
              link_url text, created_at timestamptz, likes int, comments int, liked boolean,
              can_delete boolean, pinned boolean, can_pin boolean,
              author_name text, author_avatar text, author_founder boolean)
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
    public.is_admin(public.community_email(p_email)),
    nullif(trim(u.display_name), ''),
    nullif(trim(u.avatar_url), ''),
    coalesce(u.role, '') = 'admin'
  from public.posts p
  left join public.users u on lower(u.email) = lower(p.author_email)
  where public.can_access_community_category(p_email, p.category)
    and (p_category is null or p.category = p_category)
  order by p.pinned desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 60), 1), 100);
$$;

drop function if exists public.list_comments(text, uuid);
create function public.list_comments(p_email text, p_post uuid)
returns table(id uuid, author_ig text, body text, created_at timestamptz, can_delete boolean,
              author_name text, author_avatar text)
language sql
security definer
set search_path = public
as $$
  select c.id, c.author_ig, c.body, c.created_at,
    (c.author_email = public.community_email(p_email) or public.is_admin(public.community_email(p_email))),
    nullif(trim(u.display_name), ''),
    nullif(trim(u.avatar_url), '')
  from public.post_comments c
  join public.posts p on p.id = c.post_id
  left join public.users u on lower(u.email) = lower(c.author_email)
  where c.post_id = p_post
    and public.can_access_community_category(p_email, p.category)
  order by c.created_at asc;
$$;

revoke all on function public.list_posts(text, text, int) from public, anon;
revoke all on function public.list_comments(text, uuid) from public, anon;
grant execute on function public.list_posts(text, text, int) to authenticated;
grant execute on function public.list_comments(text, uuid) to authenticated;
