-- OPRAVA: pravidlo na úložiště presetů nikdy nevyšlo.
--
-- Původní policy se ptala přímo `select 1 from public.users`. Jenže users má
-- zapnuté RLS bez policy pro čtení (schválně — přes veřejný klíč nesmí nikdo
-- vytáhnout seznam e-mailů). Podmínka uvnitř policy běží pod právy volajícího,
-- takže dostala nula řádků a nikdy nebyla pravdivá. Supabase pak vrací prázdný
-- seznam bez chyby, takže to vypadalo, že v bucketu nic není.
--
-- Řešení: ptát se přes security definer funkci, která RLS obejde.

-- 1) Academy má presety v ceně — ať to ví i funkce, ne jen policy.
create or replace function public.my_presets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select u.has_presets or u.tier = 'academy'
    from public.users u
    where lower(u.email) = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
  ), false);
$$;

revoke all on function public.my_presets() from public, anon;
grant execute on function public.my_presets() to authenticated;

-- 2) Policy se nově ptá funkce.
drop policy if exists "Presety pro ty, kdo je maji" on storage.objects;
create policy "Presety pro ty, kdo je maji"
on storage.objects
for select
to authenticated
using ( bucket_id = 'presety' and public.my_presets() );
