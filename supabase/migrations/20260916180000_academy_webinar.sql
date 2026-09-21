-- Serverové omezení odkazu na Academy webinář pouze na aktivní placené členy.

create or replace function public.next_webinar()
returns table(title text, body text, starts_at timestamptz, ends_at timestamptz, link_url text, metadata jsonb)
language sql stable security definer set search_path = public as $$
  select c.title, c.body, c.starts_at, c.ends_at, c.link_url, c.metadata
  from public.content_items c
  where c.type = 'webinar'
    and c.status in ('published', 'scheduled')
    and (c.starts_at is null or c.starts_at >= now() - interval '3 hours')
    and (c.audience <> 'academy' or exists (
      select 1 from public.users u
      where u.email = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
        and u.tier = 'academy'
        and u.account_status = 'active'
    ))
  order by c.starts_at asc nulls last
  limit 1;
$$;

-- Zabránit získání stejného odkazu přes obecný endpoint pro publikovaný obsah.
create or replace function public.list_published_content(p_type text)
returns table(id uuid,type text,title text,body text,audience text,starts_at timestamptz,ends_at timestamptz,xp int,link_url text,metadata jsonb)
language sql stable security definer set search_path = public as $$
  select c.id,c.type,c.title,c.body,c.audience,c.starts_at,c.ends_at,c.xp,c.link_url,c.metadata
  from public.content_items c
  where c.type = p_type
    and c.status in ('published','scheduled')
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and (c.audience <> 'academy' or exists (
      select 1 from public.users u
      where u.email = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
        and u.tier = 'academy'
        and u.account_status = 'active'
    ))
  order by c.starts_at desc nulls last;
$$;
