-- Webinář už nemá pole „Konec" (nedávalo smysl). Nejbližší webinář pro dashboard proto
-- určujeme podle ZAČÁTKU: nejbližší nadcházející (a běžící do 3 h po startu), ne podle ends_at.
-- Minulé webináře zůstávají v content_items (admin je vidí a může upravovat), ale na
-- dashboardu se už neukazují.

create or replace function public.next_webinar()
returns table(title text, body text, starts_at timestamptz, ends_at timestamptz, link_url text, metadata jsonb)
language sql stable security definer set search_path = public as $$
  select c.title, c.body, c.starts_at, c.ends_at, c.link_url, c.metadata
  from public.content_items c
  where c.type = 'webinar'
    and c.status in ('published', 'scheduled')
    and (c.starts_at is null or c.starts_at >= now() - interval '3 hours')
  order by c.starts_at asc nulls last
  limit 1;
$$;

grant execute on function public.next_webinar() to anon, authenticated;
