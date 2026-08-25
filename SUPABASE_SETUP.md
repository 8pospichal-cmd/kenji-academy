# Kenji Knihovna — napojení Supabase (gate + leady + progres)

Web teď běží v **lokálním režimu** (gate i progres fungují, ale ukládají se jen do prohlížeče).
Tímhle ho přepneš na **ostrý režim** — leady (e-mail + Instagram) i postup se ukládají na server
a uživateli se progres načte na jakémkoli zařízení, když zadá ten samý e-mail.

## 1) Založ Supabase projekt
1. Jdi na <https://supabase.com> → **New project** (free tier stačí).
2. Po vytvoření otevři **Project Settings → API** a zkopíruj si:
   - **Project URL** (např. `https://abcd1234.supabase.co`)
   - **anon public** klíč (dlouhý token)

## 2) Vytvoř tabulku a funkce (SQL)
V Supabase otevři **SQL Editor → New query**, vlož tohle a spusť (**Run**):

```sql
-- Tabulka uživatelů / leadů + progres
create table if not exists public.users (
  email       text primary key,
  instagram   text,
  tier        text not null default 'free',   -- free | knihovna | academy
  read        jsonb not null default '[]'::jsonb,
  quiz        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Zapni RLS a NEDÁVEJ anonymní přístup přímo k tabulce
-- (seznam e-mailů tak nikdo zvenčí nepřečte)
alter table public.users enable row level security;

-- Historie všech zadaných Instagramů (nic se neztratí)
alter table public.users
  add column if not exists instagram_history jsonb not null default '[]'::jsonb;

-- Registrace e-mailového leadu + vrácení progresu (volá web po vyplnění gate)
-- Instagram se doplní později při nastavení profilu; pokud už existuje, null ho nepřepíše.
create or replace function public.register_lead(p_email text, p_instagram text)
returns table(tier text, read jsonb, quiz jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_ig text := nullif(trim(p_instagram), '');
begin
  insert into public.users(email, instagram, instagram_history)
  values (
    lower(trim(p_email)),
    v_ig,
    case when v_ig is null then '[]'::jsonb else jsonb_build_array(v_ig) end
  )
  on conflict (email) do update
    set instagram = coalesce(v_ig, public.users.instagram),
        instagram_history = case
          when v_ig is null then public.users.instagram_history
          when public.users.instagram_history ? v_ig then public.users.instagram_history
          else public.users.instagram_history || to_jsonb(v_ig)
        end,
        updated_at = now();
  return query
    select u.tier, u.read, u.quiz from public.users u where u.email = lower(trim(p_email));
end; $$;

-- Uložení progresu (web posílá už zmergovaný stav)
create or replace function public.save_progress(p_email text, p_read jsonb, p_quiz jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set read = coalesce(p_read, read),
         quiz = coalesce(p_quiz, quiz),
         updated_at = now()
   where email = lower(trim(p_email));
end; $$;

-- Web (anon klíč) smí volat jen tyhle dvě funkce, ne číst celou tabulku
grant execute on function public.register_lead(text, text) to anon, authenticated;
grant execute on function public.save_progress(text, jsonb, jsonb) to anon, authenticated;
```

## 3) Vlož klíče do webu
Otevři `assets/auth.js`, úplně nahoře v `CONFIG` vyplň:

```js
const CONFIG = {
  supabaseUrl:     'https://abcd1234.supabase.co',   // ←  Project URL
  supabaseAnonKey: 'eyJhbGciOi...tvůj anon klíč...', // ←  anon public
  academyName: 'Kenji Academy',
  privacyUrl: 'index.html#'
};
```

Jakmile jsou klíče vyplněné, **lokální režim se sám vypne** a naběhne ostrý.

## 4) Hotovo — jak to funguje
- **Leady:** každý, kdo projde gate, se objeví v tabulce `users` (Supabase → **Table editor → users**). Nejdřív se uloží e-mail, tier a progres; Instagram se doplní při dokončení profilu. Data můžeš exportovat do CSV.
- **Progres cross-device:** uživatel zadá stejný e-mail na jiném zařízení → načte se mu jeho postup v kvízu, přečtené články i odemčená odměna.
- **Premium přístup:** komu chceš dát plný přístup, změň mu v tabulce `tier` na `knihovna` nebo `academy`. (Napojení na reálné platby řešíme zvlášť.)

## Pozn. k bezpečnosti
- Tabulka `users` má zapnuté RLS bez anonymních policy → **přes anon klíč nejde stáhnout seznam e-mailů**. Web pracuje jen přes dvě `security definer` funkce.
- E-mail je „měkká identita" bez hesla — pro progres/leady to stačí. Placený obsah se bude ověřovat zvlášť přes platbu.

## Kam dál (volitelné)
- **E-mail nástroj** (Ecomail/Mailerlite): leady jdou do Supabase; sync do rozesílače se dá doplnit přes Supabase webhook/Edge Function, až budeš chtít posílat kampaně.
- **Zásady ochrany údajů:** doplnit reálnou stránku a její odkaz do `CONFIG.privacyUrl` (gate na ni odkazuje u souhlasu).
