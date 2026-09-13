-- Marketingovy souhlas a Ecomail synchronizace. Supabase zustava zdrojem pravdy;
-- Ecomail dostava jen kontakty s dolozenym souhlasem a nikdy se sam nereaktivuje.

alter table public.users add column if not exists marketing_consent_at timestamptz;
alter table public.users add column if not exists marketing_consent_source text;
alter table public.users add column if not exists marketing_unsubscribed_at timestamptz;
alter table public.users add column if not exists email_preferences jsonb not null default '{"weekly_challenge":true,"community_digest":true,"webinars":true,"academy_news":true}'::jsonb;
alter table public.users add column if not exists email_status text not null default 'unknown';
alter table public.users add column if not exists ecomail_synced_at timestamptz;
alter table public.users add column if not exists ecomail_sync_error text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_email_status_valid') then
    alter table public.users add constraint users_email_status_valid
      check (email_status in ('unknown','active','unsubscribed','bounced','complained'));
  end if;
end $$;

create table if not exists public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'ecomail',
  provider_event_id text,
  batch_id text,
  email text,
  event_type text not null,
  campaign_id text,
  pipeline_id text,
  subject text,
  occurred_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.email_delivery_events enable row level security;
create unique index if not exists email_delivery_provider_event_idx
  on public.email_delivery_events(provider, provider_event_id);
create index if not exists email_delivery_email_idx on public.email_delivery_events(lower(email), created_at desc);
create index if not exists email_delivery_type_idx on public.email_delivery_events(event_type, created_at desc);

create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  audience text not null default 'consented_free',
  status text not null default 'draft',
  from_name text not null default 'Lukáš Kenji Vrábel',
  from_email text not null default 'ahoj@kenji.cz',
  reply_to text not null default 'ahoj@kenji.cz',
  ecomail_pipeline_id bigint,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_sequences_status_valid check (status in ('draft','ready','active','paused')),
  constraint email_sequences_steps_array check (jsonb_typeof(steps) = 'array')
);

alter table public.email_sequences enable row level security;

insert into public.email_sequences(slug,name,description,audience,status,steps)
values (
  '7-dni-pro-lepsi-byznys',
  '7 dni pro lepsi byznys',
  'Kazdy den jeden kratky ukol s konkretnim vystupem. Pro aktivni kontakty, ktere nejsou cleny Academy.',
  'consented_non_academy',
  'draft',
  $$[
  {
    "id": "day-1",
    "position": 1,
    "delay_days": 0,
    "subject": "Než začneš shánět další klienty",
    "preheader": "Tři čísla, se kterými uvidíš svou práci jasněji.",
    "headline": "Nejdřív si zmapuj výchozí bod",
    "body": "Ahoj,\n\nvětšina tvůrců zkouší zlepšit všechno najednou. Portfolio, Instagram, ceny i reklamu. Výsledek je hodně práce a málo jasného posunu.\n\nDnes nic nepředělávej. Sepiš si tři čísla: kolik zakázek jsi měl za poslední tři měsíce, jaká byla jejich průměrná cena a kolik hodin ti jedna zakázka ve skutečnosti zabrala.\n\nÚkol na dnes: napiš si tato tři čísla na jedno místo. To je tvůj výchozí bod pro dalších sedm dní.",
    "cta_label": "Udělat si audit zdarma",
    "cta_url": "https://kenjiacademy.cz/audit.html",
    "status": "draft"
  },
  {
    "id": "day-2",
    "position": 2,
    "delay_days": 1,
    "subject": "Rozumí klient za 10 sekund tomu, co prodáváš?",
    "preheader": "Jedna věta, která zjednoduší portfolio i oslovování.",
    "headline": "Postav jednu srozumitelnou nabídku",
    "body": "Ahoj,\n\nklient nekupuje focení ani natáčení. Kupuje výsledek, který mu tvoje práce přinese. Když ho musí dlouze hledat, většinou odejde.\n\nDoplň tuto větu: Pomáhám [komu] získat [výsledek] pomocí [tvé služby].\n\nPříklad: Pomáhám restauracím získat více rezervací pomocí fotek a krátkých videí, které mohou hned použít na webu a sítích.\n\nÚkol na dnes: napiš jedinou větu bez obecných slov jako kvalita, emoce nebo profesionalita. Musí ji pochopit i člověk mimo tvůj obor.",
    "cta_label": "Uložit si směr v profilu",
    "cta_url": "https://kenjiacademy.cz/nastaveni.html",
    "status": "draft"
  },
  {
    "id": "day-3",
    "position": 3,
    "delay_days": 2,
    "subject": "Kolik ti z jedné zakázky opravdu zůstane?",
    "preheader": "Cena zakázky sama o sobě nic neříká.",
    "headline": "Spočítej skutečnou hodinovku",
    "body": "Ahoj,\n\nzakázka za 10 000 Kč může být skvělá, nebo ztrátová. Rozhoduje všechen čas okolo: komunikace, příprava, cesta, třídění, úpravy, odevzdání a administrativa.\n\nÚkol na dnes: vezmi poslední zakázku, sečti všechny hodiny. Od ceny zakázky nejdřív odečti přímé náklady a zbytek vyděl počtem hodin.\n\nPříklad: (10 000 Kč − 2 000 Kč nákladů) ÷ 16 hodin = 500 Kč za hodinu. Je to částka před daněmi, odvody a dalšími náklady podnikání.\n\nToto číslo není důvod ke stresu. Je to podklad pro lepší cenu, balíček nebo proces.",
    "cta_label": "Zmapovat svůj byznys v auditu",
    "cta_url": "https://kenjiacademy.cz/audit.html",
    "status": "draft"
  },
  {
    "id": "day-4",
    "position": 4,
    "delay_days": 3,
    "subject": "Tvoje portfolio možná ukazuje příliš mnoho",
    "preheader": "Méně práce může působit hodnotněji než více práce.",
    "headline": "Nech v portfoliu jen to, co chceš prodávat",
    "body": "Ahoj,\n\nportfolio není archiv všeho, co se ti povedlo. Je to výběr, který má přitáhnout konkrétní typ další zakázky. Slabší nebo nesouvisející ukázky rozmělňují to nejlepší.\n\nÚkol na dnes: otevři své portfolio jako klient a odeber tři ukázky, které neodpovídají práci, jakou chceš dělat za rok. Potom dej nejrelevantnější výsledek na první místo.\n\nNepřidávej dnes nic nového. Jen zprůhledni to, co už máš.",
    "cta_label": "Projít návod k portfoliu",
    "cta_url": "https://kenjiacademy.cz/clanky/portfolio.html",
    "status": "draft"
  },
  {
    "id": "day-5",
    "position": 5,
    "delay_days": 4,
    "subject": "Vrať se k pěti nedokončeným poptávkám",
    "preheader": "Dnes neposílej studené nabídky. Vrať se k rozehraným kontaktům.",
    "headline": "Udělej pět follow-upů",
    "body": "Ahoj,\n\nspousta zakázek nezmizela kvůli ceně. Jen je převálcovala jiná práce, dovolená nebo nerozhodnost. Tvůrci často pošlou jednu zprávu a považují ticho za odmítnutí.\n\nNajdi pět poptávek nebo rozhovorů z posledních tří měsíců, které zůstaly bez jasného konce. Pošli jim: Ahoj, vracím se k naší domluvě ohledně [projektu]. Je to pro vás ještě aktuální, nebo to mám prozatím uzavřít?\n\nÚkol na dnes: odešli všech pět zpráv. Bez slevy a bez dlouhého přesvědčování.",
    "cta_label": "Probrat zprávu s Kenji AI",
    "cta_url": "https://kenjiacademy.cz/kenji-ai.html",
    "status": "draft"
  },
  {
    "id": "day-6",
    "position": 6,
    "delay_days": 5,
    "subject": "Deset klientů, kterým tvoje práce opravdu pomůže",
    "preheader": "Oslovování je snazší, když víš, proč píšeš právě jim.",
    "headline": "Postav si malý seznam příležitostí",
    "body": "Ahoj,\n\nnáhodné oslovování rychle unaví. Lepší je malý seznam firem nebo lidí, u kterých vidíš konkrétní příležitost.\n\nÚkol na dnes: vyber deset potenciálních klientů. Ke každému napiš jedinou poznámku: co jim dnes ve vizuální komunikaci chybí a jaký obchodní výsledek by mohl lepší obsah podpořit.\n\nZatím jim nic neposílej. Cílem je mít deset relevantních důvodů ke kontaktu, ne deset stejných zkopírovaných zpráv.",
    "cta_label": "Připravit si oslovení",
    "cta_url": "https://kenjiacademy.cz/clanky/cold-outreach.html",
    "status": "draft"
  },
  {
    "id": "day-7",
    "position": 7,
    "delay_days": 6,
    "subject": "Teď z toho udělej systém na dalších 30 dní",
    "preheader": "Sedm drobných úkolů je začátek. Opakovatelnost dělá výsledek.",
    "headline": "Vyber jeden tah, který budeš opakovat",
    "body": "Ahoj,\n\nza posledních sedm dní jsi dostal šest úkolů: zmapovat čísla, zjednodušit nabídku, prověřit cenu, pročistit portfolio, oživit kontakty a připravit seznam příležitostí. Pokud jsi některý nestihl, vyber si z nich jeden a začni jím.\n\nTeď si vyber jedinou aktivitu, kterou budeš dalších 30 dní opakovat každý týden. Například pět follow-upů každé úterý nebo dvě cílené nabídky každý čtvrtek. Dej ji do kalendáře jako pevný blok.\n\nÚkol na dnes: zvol jednu aktivitu, den a čas. Ne další seznam nápadů. Konkrétní opakovatelný termín.\n\nPokud chceš mít další kroky, zpětnou vazbu a všechno na jednom místě, otevři si svůj bezplatný plán v Kenji Academy.",
    "cta_label": "Otevřít můj plán zdarma",
    "cta_url": "https://kenjiacademy.cz/index.html",
    "status": "draft"
  }
]$$::jsonb
)
on conflict (slug) do nothing;

create or replace function public.get_email_preferences()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'marketing_enabled', u.marketing_consent_at is not null and u.marketing_unsubscribed_at is null,
    'consent_at', u.marketing_consent_at,
    'unsubscribed_at', u.marketing_unsubscribed_at,
    'preferences', coalesce(u.email_preferences, '{}'::jsonb)
  )
  from public.users u
  where lower(u.email) = lower(nullif(trim(auth.jwt() ->> 'email'), ''))
  limit 1;
$$;

create or replace function public.set_email_preferences(
  p_marketing_enabled boolean,
  p_preferences jsonb default '{}'::jsonb,
  p_source text default 'settings'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  v_prefs jsonb;
begin
  if v_email is null then raise exception 'Prihlaseni je povinne.'; end if;
  if jsonb_typeof(coalesce(p_preferences, '{}'::jsonb)) <> 'object' then raise exception 'Neplatne preference.'; end if;

  v_prefs := jsonb_build_object(
    'weekly_challenge', coalesce((p_preferences ->> 'weekly_challenge')::boolean, true),
    'community_digest', coalesce((p_preferences ->> 'community_digest')::boolean, true),
    'webinars', coalesce((p_preferences ->> 'webinars')::boolean, true),
    'academy_news', coalesce((p_preferences ->> 'academy_news')::boolean, true)
  );

  insert into public.users(email, marketing_consent_at, marketing_consent_source, marketing_unsubscribed_at, email_preferences, email_status)
  values (
    v_email,
    case when p_marketing_enabled then now() else null end,
    case when p_marketing_enabled then left(coalesce(nullif(trim(p_source),''),'settings'),80) else null end,
    case when p_marketing_enabled then null else now() end,
    v_prefs,
    case when p_marketing_enabled then 'active' else 'unsubscribed' end
  )
  on conflict (email) do update set
    marketing_consent_at = case
      when p_marketing_enabled then coalesce(public.users.marketing_consent_at, now())
      else public.users.marketing_consent_at
    end,
    marketing_consent_source = case
      when p_marketing_enabled then left(coalesce(nullif(trim(p_source),''),'settings'),80)
      else public.users.marketing_consent_source
    end,
    marketing_unsubscribed_at = case when p_marketing_enabled then null else now() end,
    email_preferences = v_prefs,
    email_status = case when p_marketing_enabled then 'active' else 'unsubscribed' end,
    ecomail_sync_error = null,
    updated_at = now();

  return public.get_email_preferences();
end;
$$;

create or replace function public.admin_email_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin(auth.jwt() ->> 'email') then raise exception 'Jen pro admina.'; end if;
  select jsonb_build_object(
    'users_total', count(*),
    'consented_total', count(*) filter (where marketing_consent_at is not null and marketing_unsubscribed_at is null),
    'eligible_leads', count(*) filter (where marketing_consent_at is not null and marketing_unsubscribed_at is null and coalesce(tier,'free') <> 'academy' and coalesce(account_status,'active') = 'active'),
    'academy_consented', count(*) filter (where marketing_consent_at is not null and marketing_unsubscribed_at is null and tier = 'academy'),
    'synced_total', count(*) filter (where ecomail_synced_at is not null),
    'unsubscribed_total', count(*) filter (where marketing_unsubscribed_at is not null or email_status = 'unsubscribed'),
    'sync_errors', count(*) filter (where ecomail_sync_error is not null),
    'events_30d', (
      select jsonb_build_object(
        'delivered', count(*) filter (where event_type = 'delivery'),
        'opened', count(*) filter (where event_type in ('open','initial_open')),
        'clicked', count(*) filter (where event_type = 'click'),
        'bounced', count(*) filter (where event_type in ('bounce','out_of_band')),
        'unsubscribed', count(*) filter (where event_type in ('list_unsubscribe','link_unsubscribe')),
        'complained', count(*) filter (where event_type = 'spam_complaint')
      ) from public.email_delivery_events where coalesce(occurred_at,created_at) >= now() - interval '30 days'
    ),
    'recent_events', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (select email,event_type,campaign_id,pipeline_id,occurred_at,created_at from public.email_delivery_events order by created_at desc limit 20) x
    )
  ) into v_result
  from public.users;
  return v_result;
end;
$$;

create or replace function public.admin_list_email_sequences()
returns setof public.email_sequences
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.jwt() ->> 'email') then raise exception 'Jen pro admina.'; end if;
  return query select * from public.email_sequences order by created_at;
end;
$$;

create or replace function public.admin_upsert_email_sequence(
  p_id uuid,
  p_name text,
  p_description text,
  p_audience text,
  p_status text,
  p_from_name text,
  p_from_email text,
  p_reply_to text,
  p_ecomail_pipeline_id bigint,
  p_steps jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_admin(auth.jwt() ->> 'email') then raise exception 'Jen pro admina.'; end if;
  if v_id is null then raise exception 'Chybi ID sekvence.'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Chybi nazev sekvence.'; end if;
  if p_status not in ('draft','ready','active','paused') then raise exception 'Neplatny stav.'; end if;
  if jsonb_typeof(coalesce(p_steps,'[]'::jsonb)) <> 'array' then raise exception 'Neplatne kroky.'; end if;
  if jsonb_array_length(coalesce(p_steps,'[]'::jsonb)) > 30 then raise exception 'Sekvence je prilis dlouha.'; end if;

  update public.email_sequences set
    name = left(trim(p_name),160),
    description = left(coalesce(p_description,''),500),
    audience = left(coalesce(nullif(trim(p_audience),''),'consented_non_academy'),80),
    status = p_status,
    from_name = left(coalesce(nullif(trim(p_from_name),''),'Lukáš Kenji Vrábel'),120),
    from_email = lower(left(coalesce(nullif(trim(p_from_email),''),'ahoj@kenji.cz'),254)),
    reply_to = lower(left(coalesce(nullif(trim(p_reply_to),''),'ahoj@kenji.cz'),254)),
    ecomail_pipeline_id = p_ecomail_pipeline_id,
    steps = p_steps,
    updated_at = now()
  where id = v_id;
  if not found then raise exception 'Sekvence neexistuje.'; end if;
  return v_id;
end;
$$;

revoke all on function public.get_email_preferences() from public, anon;
revoke all on function public.set_email_preferences(boolean,jsonb,text) from public, anon;
revoke all on function public.admin_email_overview() from public, anon;
revoke all on function public.admin_list_email_sequences() from public, anon;
revoke all on function public.admin_upsert_email_sequence(uuid,text,text,text,text,text,text,text,bigint,jsonb) from public, anon;
grant execute on function public.get_email_preferences() to authenticated;
grant execute on function public.set_email_preferences(boolean,jsonb,text) to authenticated;
grant execute on function public.admin_email_overview() to authenticated;
grant execute on function public.admin_list_email_sequences() to authenticated;
grant execute on function public.admin_upsert_email_sequence(uuid,text,text,text,text,text,text,text,bigint,jsonb) to authenticated;
