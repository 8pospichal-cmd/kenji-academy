-- Presety jsou samostatný produkt — členství v Academy na ně nárok nedává.
--
-- Předchozí verze pouštěla ke stažení i každého s tier = 'academy'. To bylo
-- moje vlastní rozhodnutí, ne zadání: člen Academy tak měl presety zdarma,
-- přestože se prodávají zvlášť za 982 Kč. Nově rozhoduje výhradně has_presets,
-- které nastaví Stripe webhook po zaplacení.
--
-- Pokud bys chtěl presety někomu přidat ručně (dárek, reklamace), stačí:
--   update public.users set has_presets = true where lower(email) = 'nekdo@example.cz';

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

-- Politika na úložišti se ptá téhle funkce, takže se tím srovná i stahování.
drop policy if exists "Presety pro ty, kdo je maji" on storage.objects;
create policy "Presety pro ty, kdo je maji"
on storage.objects
for select
to authenticated
using ( bucket_id = 'presety' and public.my_presets() );
