-- Admin: přidat/nastavit člověka e-mailem + veřejné čtení nejbližšího webináře pro dashboard.

-- 1) Přidat nebo nastavit uživatele podle e-mailu (upsert). Jen admin.
create or replace function public.admin_upsert_user(p_email text, p_tier text default 'free')
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  if p_tier not in ('free','knihovna','academy') then raise exception 'Neplatny tier.'; end if;
  insert into public.users(email, tier, account_status, role, created_at, updated_at)
  values (lower(trim(p_email)), p_tier, 'active', 'member', now(), now())
  on conflict (email) do update
    set tier = excluded.tier, account_status = 'active', updated_at = now();
end $$;

revoke all on function public.admin_upsert_user(text, text) from public, anon;
grant execute on function public.admin_upsert_user(text, text) to authenticated;

-- 2) Nejbližší nadcházející webinář (z content_items) — veřejné čtení pro kartu na dashboardu.
create or replace function public.next_webinar()
returns table(title text, body text, starts_at timestamptz, ends_at timestamptz, link_url text, metadata jsonb)
language sql stable security definer set search_path = public as $$
  select c.title, c.body, c.starts_at, c.ends_at, c.link_url, c.metadata
  from public.content_items c
  where c.type = 'webinar'
    and c.status in ('published', 'scheduled')
    and (c.ends_at is null or c.ends_at >= now())
  order by c.starts_at asc nulls last
  limit 1;
$$;

grant execute on function public.next_webinar() to anon, authenticated;
