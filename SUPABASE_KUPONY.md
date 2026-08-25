# Slevové kupóny — SQL pro Supabase

Admin je spravuje v Nastavení (partnerské slevy typu NIKON20, PIXIN20…). Kód se uplatní
při platbě přes Stripe. Spusť v **SQL Editoru** (bez ` ``` ` řádků — vlož jen SQL):

```sql
-- Tabulka kupónů
create table if not exists public.coupons (
  code         text primary key,
  description  text,
  percent_off  int  not null check (percent_off between 1 and 100),
  products     text[] not null default '{}',   -- 'databaze' | 'academy' | 'presets'; prázdné = všechny
  active       boolean not null default true,
  max_uses     int,                              -- null = neomezeně
  used_count   int not null default 0,
  valid_until  timestamptz,                      -- null = bez konce
  created_at   timestamptz not null default now()
);
alter table public.coupons enable row level security;
-- žádné anon policy → čte/píše jen přes security-definer funkce níže

-- ADMIN: seznam kupónů
create or replace function public.admin_list_coupons(p_admin text)
returns setof public.coupons
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_admin) then raise exception 'Jen pro admina.'; end if;
  return query select * from public.coupons order by created_at desc;
end; $$;

-- ADMIN: přidat / upravit kupón
-- POZN.: nullovatelné parametry mají `default null` a jsou AŽ ZA povinnými
-- (jinak PostgREST při null hodnotě argument zahodí a funkci nenajde).
drop function if exists public.admin_upsert_coupon(text,text,text,int,text[],boolean,int,timestamptz);
create or replace function public.admin_upsert_coupon(
  p_admin text, p_code text, p_percent int,
  p_products text[] default '{}'::text[], p_active boolean default true,
  p_max_uses int default null, p_description text default null, p_valid_until timestamptz default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_admin) then raise exception 'Jen pro admina.'; end if;
  insert into public.coupons(code, description, percent_off, products, active, max_uses, valid_until)
  values (upper(trim(p_code)), p_description, p_percent, coalesce(p_products, '{}'), coalesce(p_active, true), p_max_uses, p_valid_until)
  on conflict (code) do update set
    description = excluded.description,
    percent_off = excluded.percent_off,
    products    = excluded.products,
    active      = excluded.active,
    max_uses    = excluded.max_uses,
    valid_until = excluded.valid_until;
end; $$;

-- ADMIN: smazat kupón
create or replace function public.admin_delete_coupon(p_admin text, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_admin) then raise exception 'Jen pro admina.'; end if;
  delete from public.coupons where code = upper(trim(p_code));
end; $$;

-- CHECKOUT: ověří platnost kódu pro daný produkt → vrátí slevu (volá Netlify funkce přes service role)
create or replace function public.get_valid_coupon(p_code text, p_product text)
returns table(code text, percent_off int)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select c.code, c.percent_off from public.coupons c
    where c.code = upper(trim(p_code))
      and c.active = true
      and (c.valid_until is null or c.valid_until > now())
      and (c.max_uses is null or c.used_count < c.max_uses)
      and (cardinality(c.products) = 0 or p_product = any(c.products));
end; $$;

-- WEBHOOK: po zaplacení zvýší počítadlo použití (volá se přes service role)
create or replace function public.increment_coupon_use(p_code text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.coupons set used_count = used_count + 1 where code = upper(trim(p_code));
end; $$;

-- Práva: admin funkce pro přihlášené, validace/increment jen service role (Netlify funkce)
grant execute on function public.admin_list_coupons(text)                              to anon, authenticated;
grant execute on function public.admin_upsert_coupon(text,text,int,text[],boolean,int,text,timestamptz) to anon, authenticated;
grant execute on function public.admin_delete_coupon(text,text)                        to anon, authenticated;
revoke all on function public.get_valid_coupon(text,text)     from public, anon, authenticated;
revoke all on function public.increment_coupon_use(text)      from public, anon, authenticated;
```

Poznámky:
- `is_admin(email)` musí existovat (viz `SUPABASE_PROFILY.md`).
- Netlify funkce `create-checkout-session` volá `get_valid_coupon` a `stripe-webhook` volá `increment_coupon_use` — obě přes `SUPABASE_SERVICE_ROLE_KEY`, takže RLS je neblokuje.
