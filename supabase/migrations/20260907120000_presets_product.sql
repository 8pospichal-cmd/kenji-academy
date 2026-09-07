-- Presety jako samostatně prodejný produkt.
--
-- Presety nejsou tier (nedávají přístup k databázi ani kurzům), proto vlastní
-- příznak na uživateli. Soubory leží v SOUKROMÉM bucketu — do repa nesmí,
-- Netlify publikuje celý kořen a kdokoli by si je stáhl zdarma.

-- 1) Kdo má presety zaplacené. Nastavuje Stripe webhook přes service role.
alter table public.users add column if not exists has_presets boolean not null default false;

-- 2) Přečtení vlastního oprávnění (identita výhradně z ověřeného JWT).
create or replace function public.my_presets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select u.has_presets
    from public.users u
    where lower(u.email) = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
  ), false);
$$;

revoke all on function public.my_presets() from public, anon;
grant execute on function public.my_presets() to authenticated;

-- 3) Soukromý bucket na soubory presetů (public = false → veřejná URL nefunguje).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presety', 'presety', false, 104857600, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4) Stáhnout smí jen ten, kdo si je koupil (nebo člen Academy — má je v ceně).
drop policy if exists "Presety pro ty, kdo je maji" on storage.objects;
create policy "Presety pro ty, kdo je maji"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'presety'
  and exists (
    select 1 from public.users u
    where lower(u.email) = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
      and (u.has_presets or u.tier = 'academy')
  )
);
