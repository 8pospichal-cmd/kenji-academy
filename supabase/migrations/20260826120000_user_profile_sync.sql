-- Onboarding profil (obor / zkušenost / co brzdí) synchronizovaný na server,
-- aby se onboarding neopakoval na jiném zařízení (mobil vs. počítač).
-- Identita se bere VÝHRADNĚ z ověřeného JWT (auth.jwt()->>'email'), stejně jako u register_lead.

-- 1) Úložiště profilu na řádku uživatele.
alter table public.users add column if not exists profile jsonb;

-- 2) Uložit profil (upsert). Jen ověřená session.
create or replace function public.save_profile(p_profile jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
begin
  if v_email is null then
    return; -- bez ověřené session neukládáme nic
  end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    return;
  end if;

  insert into public.users(email, profile)
  values (v_email, p_profile)
  on conflict (email) do update
    set profile = excluded.profile,
        updated_at = now();
end;
$function$;

revoke all on function public.save_profile(jsonb) from public, anon;
grant execute on function public.save_profile(jsonb) to authenticated;

-- 3) Načíst profil přihlášeného uživatele.
create or replace function public.get_profile()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select u.profile
  from public.users u
  where u.email = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
  limit 1;
$function$;

revoke all on function public.get_profile() from public, anon;
grant execute on function public.get_profile() to authenticated;
