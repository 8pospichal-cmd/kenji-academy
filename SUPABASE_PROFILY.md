# Profily + Nastavení + Admin — Supabase

Stránka `nastaveni.html` umožní každému upravit profil (fotka, jméno, bio, Instagram)
a tobě (adminovi) spravovat všechny uživatele. Spusť tohle **jednou** v Supabase → SQL Editor.

## 1) SQL — rozšíření users + role + funkce
```sql
-- Profilová pole + role do stávající tabulky users
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists bio          text;
alter table public.users add column if not exists avatar_url   text;
alter table public.users add column if not exists role         text not null default 'member'; -- member | moderator | admin

-- Admin = pevný zakladatelský e-mail NEBO uživatel s rolí admin
create or replace function public.is_admin(p_email text) returns boolean
language sql security definer set search_path = public as $$
  select lower(trim(p_email)) in ('8pospichal@gmail.com')
      or exists (select 1 from public.users u where u.email = lower(trim(p_email)) and u.role = 'admin');
$$;

-- Načtení vlastního profilu
create or replace function public.get_profile(p_email text)
returns table(email text, display_name text, bio text, avatar_url text, instagram text, tier text, role text)
language sql security definer set search_path = public as $$
  select u.email, u.display_name, u.bio, u.avatar_url, u.instagram, u.tier, u.role
  from public.users u where u.email = lower(trim(p_email));
$$;

-- Uložení vlastního profilu
create or replace function public.save_profile(p_email text, p_display_name text, p_bio text, p_avatar_url text, p_instagram text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users set
    display_name = nullif(trim(p_display_name), ''),
    bio          = nullif(trim(p_bio), ''),
    avatar_url   = nullif(trim(p_avatar_url), ''),
    instagram    = coalesce(nullif(trim(p_instagram), ''), instagram),
    updated_at   = now()
  where email = lower(trim(p_email));
end; $$;

-- ADMIN: seznam uživatelů (jen pro admina)
create or replace function public.admin_list_users(p_admin text, p_search text default null, p_limit int default 300)
returns table(email text, display_name text, instagram text, tier text, role text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_admin) then raise exception 'Jen pro admina.'; end if;
  return query
    select u.email, u.display_name, u.instagram, u.tier, u.role, u.created_at
    from public.users u
    where p_search is null or p_search = ''
       or u.email ilike '%'||p_search||'%'
       or coalesce(u.instagram,'') ilike '%'||p_search||'%'
       or coalesce(u.display_name,'') ilike '%'||p_search||'%'
    order by u.created_at desc
    limit p_limit;
end; $$;

-- ADMIN: změna tieru / role uživatele (jen pro admina)
create or replace function public.admin_set_user(p_admin text, p_target text, p_tier text default null, p_role text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_admin) then raise exception 'Jen pro admina.'; end if;
  update public.users set
    tier = coalesce(nullif(trim(p_tier), ''), tier),
    role = coalesce(nullif(trim(p_role), ''), role),
    updated_at = now()
  where email = lower(trim(p_target));
end; $$;

-- Práva (anon smí volat jen tyhle funkce)
grant execute on function public.get_profile(text)                          to anon, authenticated;
grant execute on function public.save_profile(text,text,text,text,text)     to anon, authenticated;
grant execute on function public.admin_list_users(text,text,int)            to anon, authenticated;
grant execute on function public.admin_set_user(text,text,text,text)        to anon, authenticated;
```

## 2) Úložiště na profilovky
Supabase → **Storage → New bucket**: název `avatars`, **Public = ANO**.
Přidej INSERT policy pro roli `anon` (dočasně; po Google loginu zpřísníme).

## Pozn.
- Admin je `8pospichal@gmail.com` + kdokoliv s `role = 'admin'`.
- Ověření admina běží na serveru v každé funkci — z webu nejde obejít.
- Identita je zatím měkká (e-mail z brány); po Google loginu bude tvrdá.
