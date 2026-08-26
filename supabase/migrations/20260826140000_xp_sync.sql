-- Kenji Points (KP/XP) vázané na ÚČET, ne na zařízení.
-- KP se ukládají do users.xp (+ users.xp_log kvůli idempotenci klíčovaných odměn) a
-- synchronizují se napříč počítačem/telefonem/tabletem. Identita z ověřeného JWT.

alter table public.users add column if not exists xp integer not null default 0;
alter table public.users add column if not exists xp_log jsonb not null default '[]'::jsonb;

-- Načíst KP přihlášeného uživatele (total + log).
create or replace function public.get_xp()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object('xp', coalesce(u.xp, 0), 'log', coalesce(u.xp_log, '[]'::jsonb))
  from public.users u
  where u.email = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
  limit 1;
$function$;

revoke all on function public.get_xp() from public, anon;
grant execute on function public.get_xp() to authenticated;

-- Uložit KP. Server bere VYŠŠÍ z uloženého a nového totalu (KP nikdy neklesnou kvůli
-- zpožděnému/staršímu zápisu z jiného zařízení). Log se uloží tak, jak ho klient zmergoval.
create or replace function public.save_xp(p_xp integer, p_log jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  v_final integer;
begin
  if v_email is null then return null; end if;
  insert into public.users(email, xp, xp_log)
  values (v_email, greatest(coalesce(p_xp, 0), 0), coalesce(p_log, '[]'::jsonb))
  on conflict (email) do update
    set xp = greatest(coalesce(public.users.xp, 0), coalesce(p_xp, 0)),
        xp_log = coalesce(p_log, public.users.xp_log),
        updated_at = now()
  returning xp into v_final;
  return v_final;
end;
$function$;

revoke all on function public.save_xp(integer, jsonb) from public, anon;
grant execute on function public.save_xp(integer, jsonb) to authenticated;
