-- Odpovědi z „plánu na míru" (plan-na-miru.html → netlify/functions/plan-request.js).
-- Zapisuje a čte je jen service role (Netlify funkce, admin). Klient z prohlížeče
-- k tabulce nemá přístup: RLS je zapnuté a žádná policy pro anon/authenticated není.

create table if not exists public.plan_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  instagram text not null,
  obory text[] not null default '{}',
  level text,
  jobs text,
  price integer,
  blockers text[] not null default '{}',
  goal integer,
  hours integer,
  marketing_consent boolean not null default false,
  source text,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'novy' check (status in ('novy', 'kontaktovan', 'koupil', 'nezajem')),
  note text
);

create index if not exists plan_requests_created_idx on public.plan_requests (created_at desc);
create index if not exists plan_requests_email_idx on public.plan_requests (lower(email));

alter table public.plan_requests enable row level security;
revoke all on public.plan_requests from anon, authenticated;
