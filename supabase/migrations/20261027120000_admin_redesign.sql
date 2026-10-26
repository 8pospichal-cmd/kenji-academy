-- Redesign administrace: jeden člověk = jedna karta, objednávky, trychtýř.
-- 1) orders — každý zaplacený Stripe checkout (dřív se jen přepnul tier a částka se ztratila).
-- 2) track_event přijímá i události prodejní stránky a onboardingu (dřív šly jen do dataLayeru).
-- 3) admin_list_people — účty, zájemci z plánu na míru a lidé jen s nástrojem v jednom seznamu.
-- 4) admin_get_user_v2 — karta člověka i bez účtu + nákupy, plán na míru, AI, komunita.
-- 5) admin_overview — úkoly „K vyřízení", trychtýř 30 dní, tržby.
-- 6) admin_list_orders, admin_set_user_note.

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  stripe_session_id text unique,
  email text not null,
  product text,
  tier text,
  presets boolean not null default false,
  amount_total integer,
  currency text,
  coupon text,
  source text,
  status text not null default 'paid' check (status in ('paid', 'refunded'))
);
create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_created_idx on public.orders (created_at desc);
alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;

alter table public.users add column if not exists admin_note text;

-- Události, které posílá prodejní stránka a onboarding v dashboardu.
create or replace function public.track_event(
  p_event_name text,
  p_source text default null,
  p_properties jsonb default '{}'::jsonb,
  p_anonymous_id text default null,
  p_claimed_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_verified text := nullif(lower(auth.jwt() ->> 'email'), '');
  v_claimed text := case when coalesce(p_claimed_email,'') ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then lower(trim(p_claimed_email)) else null end;
begin
  if p_event_name not in ('page_view','session_started','registered','onboarding_completed','quiz_started','quiz_completed','audit_completed','hourly_calculator_completed','ai_question_sent','community_post_created','checkout_started','purchase_completed',
                          'onboarding_step_complete','onboarding_plan_created','academy_cta','academy_blocker') then
    raise exception 'Unsupported analytics event.';
  end if;
  if jsonb_typeof(coalesce(p_properties, '{}'::jsonb)) <> 'object' then raise exception 'Invalid properties.'; end if;
  if length(coalesce(p_properties::text,'')) > 8000 then raise exception 'Properties too large.'; end if;
  insert into public.analytics_events(user_email, claimed_email, anonymous_id, event_name, source, properties)
  values (v_verified, case when v_verified is null then v_claimed else null end, left(nullif(trim(p_anonymous_id),''),80), p_event_name, left(nullif(trim(p_source),''),100), coalesce(p_properties,'{}'::jsonb))
  returning id into v_id;
  if v_verified is not null then
    update public.users set last_seen_at = now(), updated_at = now() where lower(email) = v_verified;
  end if;
  return v_id;
end;
$$;

-- Měsíční příjem z výsledku nástroje (audit: current, hodinovka: monthly_revenue).
create or replace function public.tool_money(p_result jsonb)
returns numeric language sql immutable set search_path = public as $$
  select greatest(
    case when jsonb_typeof(p_result->'current') = 'number' then (p_result->>'current')::numeric else 0 end,
    case when jsonb_typeof(p_result->'monthly_revenue') = 'number' then (p_result->>'monthly_revenue')::numeric else 0 end
  );
$$;

create or replace function public.admin_list_people(p_limit int default 2000)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  with emails as (
    select lower(email) as email from public.users where email is not null
    union select lower(email) from public.plan_requests
    union select lower(coalesce(user_email, claimed_email)) from public.tool_submissions where coalesce(user_email, claimed_email) is not null
  ), rows as (
    select e.email,
      u.email is not null as has_account,
      coalesce(nullif(u.display_name,''), l.name) as name,
      coalesce(nullif(u.instagram,''), l.instagram) as instagram,
      l.phone,
      u.tier, u.role, u.account_status, coalesce(u.has_presets,false) as has_presets,
      coalesce(u.created_at, l.created_at, t.first_at) as created_at,
      greatest(u.last_seen_at, l.created_at, t.last_at) as last_seen_at,
      case when u.email is null then (l.marketing_consent is true)
           else (u.marketing_consent_at is not null and u.marketing_unsubscribed_at is null) end as consent,
      u.ecomail_sync_error,
      coalesce(u.acquisition_source, l.source, t.utm_source) as source,
      l.id as lead_id, l.status as lead_status, l.note as lead_note,
      t.money, t.tool as money_tool, t.potential, t.tools,
      coalesce(u.xp, 0) as xp,
      (select count(*) from public.orders o where lower(o.email) = e.email and o.status = 'paid') as orders
    from emails e
    left join public.users u on lower(u.email) = e.email
    left join lateral (select * from public.plan_requests p where lower(p.email) = e.email order by p.created_at desc limit 1) l on true
    left join lateral (
      select max(public.tool_money(s.result)) as money,
        (array_agg(s.tool order by public.tool_money(s.result) desc))[1] as tool,
        max(case when jsonb_typeof(s.result->'potential') = 'number' then (s.result->>'potential')::numeric end) as potential,
        array_agg(distinct s.tool) as tools,
        min(s.completed_at) as first_at, max(s.completed_at) as last_at,
        (array_agg(s.result->>'utm_source') filter (where s.result ? 'utm_source'))[1] as utm_source
      from public.tool_submissions s where lower(coalesce(s.user_email, s.claimed_email)) = e.email
    ) t on true
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc nulls last), '[]'::jsonb) into v_result
  from (select * from rows order by created_at desc nulls last limit least(greatest(p_limit,1),5000)) r;
  return v_result;
end $$;

create or replace function public.admin_get_user_v2(p_target text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_target)); v_user jsonb;
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  select to_jsonb(u) into v_user from public.users u where lower(u.email) = v_email;
  return jsonb_build_object(
    'user', coalesce(v_user, jsonb_build_object('email', v_email)),
    'has_account', v_user is not null,
    'submissions', coalesce((select jsonb_agg(row_to_json(s) order by s.completed_at desc) from public.tool_submissions s where lower(coalesce(s.user_email,s.claimed_email)) = v_email),'[]'::jsonb),
    'events', coalesce((select jsonb_agg(row_to_json(e) order by e.created_at desc) from (select event_name,source,properties,created_at from public.analytics_events where lower(coalesce(user_email,claimed_email)) = v_email order by created_at desc limit 50) e),'[]'::jsonb),
    'orders', coalesce((select jsonb_agg(row_to_json(o) order by o.created_at desc) from public.orders o where lower(o.email) = v_email),'[]'::jsonb),
    'plan_requests', coalesce((select jsonb_agg(row_to_json(p) order by p.created_at desc) from public.plan_requests p where lower(p.email) = v_email),'[]'::jsonb),
    'ai_questions', (select count(*) from public.ai_question_usage q join auth.users a on a.id = q.user_id where lower(a.email) = v_email),
    'posts', (select count(*) from public.posts p where lower(p.author_email) = v_email)
  );
end $$;

create or replace function public.admin_set_user_note(p_target text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  update public.users set admin_note = nullif(left(trim(coalesce(p_note,'')), 2000), ''), updated_at = now()
  where lower(email) = lower(trim(p_target));
end $$;

create or replace function public.admin_list_orders(p_limit int default 500)
returns setof public.orders language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  return query select * from public.orders order by created_at desc limit least(greatest(p_limit,1),2000);
end $$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin text := public.current_admin_email(); v_result jsonb;
begin
  if v_admin is null then raise exception 'Jen pro admina.'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from public.users),
    'users_new_7d', (select count(*) from public.users where created_at >= now()-interval '7 days'),
    'active_7d', (select count(*) from public.users where last_seen_at >= now()-interval '7 days'),
    'free_total', (select count(*) from public.users where tier='free'),
    'knihovna_total', (select count(*) from public.users where tier='knihovna'),
    'academy_total', (select count(*) from public.users where tier='academy'),
    'presets_total', (select count(*) from public.users where has_presets),
    'consented_total', (select count(*) from public.users where marketing_consent_at is not null and marketing_unsubscribed_at is null),
    'sync_errors', (select count(*) from public.users where ecomail_sync_error is not null),
    'quiz_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='quiz' and completed_at >= now()-interval '30 days'),
    'audit_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='audit' and completed_at >= now()-interval '30 days'),
    'calculator_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='hourly_calculator' and completed_at >= now()-interval '30 days'),
    'leads_new', (select count(*) from public.plan_requests where status='novy'),
    'leads_oldest_new', (select min(created_at) from public.plan_requests where status='novy'),
    'hot_no_academy', (select count(distinct lower(coalesce(s.user_email,s.claimed_email))) from public.tool_submissions s
                        where public.tool_money(s.result) >= 50000 and coalesce(s.user_email,s.claimed_email) is not null
                          and not exists (select 1 from public.users u where lower(u.email)=lower(coalesce(s.user_email,s.claimed_email)) and u.tier='academy')),
    'challenge_current_ends_at', (select max(ends_at) from public.content_items where type='weekly_challenge' and status='published' and coalesce(starts_at,now()) <= now() and (ends_at is null or ends_at >= now())),
    'challenge_upcoming', (select count(*) from public.content_items where type='weekly_challenge' and status in ('published','scheduled') and starts_at > now()),
    'revenue_30d', (select coalesce(sum(amount_total),0) from public.orders where status='paid' and created_at >= now()-interval '30 days'),
    'orders_30d', (select count(*) from public.orders where status='paid' and created_at >= now()-interval '30 days'),
    'funnel_30d', jsonb_build_object(
      'sales_page', (select count(distinct coalesce(user_email,claimed_email,anonymous_id)) from public.analytics_events where event_name='academy_cta' and created_at >= now()-interval '30 days'),
      'tools', (select count(distinct coalesce(lower(user_email),lower(claimed_email),anonymous_id,id::text)) from public.tool_submissions where completed_at >= now()-interval '30 days'),
      'registered', (select count(*) from public.users where created_at >= now()-interval '30 days'),
      'onboarding', (select count(distinct coalesce(user_email,claimed_email,anonymous_id)) from public.analytics_events where event_name='onboarding_completed' and created_at >= now()-interval '30 days'),
      'checkout', (select count(distinct coalesce(user_email,claimed_email,anonymous_id)) from public.analytics_events where event_name='checkout_started' and created_at >= now()-interval '30 days'),
      'purchases', (select count(*) from public.orders where status='paid' and created_at >= now()-interval '30 days')
    ),
    'recent_users', coalesce((select jsonb_agg(row_to_json(x)) from (select email,display_name,instagram,tier,account_status,created_at,last_seen_at from public.users order by created_at desc limit 8) x),'[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(row_to_json(x)) from (select event_name,coalesce(user_email,claimed_email) as email,source,created_at from public.analytics_events where event_name <> 'page_view' order by created_at desc limit 30) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.tool_money(jsonb) from public, anon, authenticated;
revoke all on function public.admin_list_people(int) from public, anon;
revoke all on function public.admin_set_user_note(text, text) from public, anon;
revoke all on function public.admin_list_orders(int) from public, anon;
grant execute on function public.admin_list_people(int) to authenticated;
grant execute on function public.admin_set_user_note(text, text) to authenticated;
grant execute on function public.admin_list_orders(int) to authenticated;
grant execute on function public.track_event(text,text,jsonb,text,text) to anon, authenticated;
