-- Dedicated admin workspace, trustworthy product analytics and content planning.

create extension if not exists pgcrypto;

alter table public.users add column if not exists account_status text not null default 'active';
alter table public.users add column if not exists last_seen_at timestamptz;
alter table public.users add column if not exists acquisition_source text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_account_status_valid') then
    alter table public.users add constraint users_account_status_valid
      check (account_status in ('pending','active','paused','blocked'));
  end if;
end $$;

create or replace function public.is_admin(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = lower(trim(coalesce(p_email, '')))
    and (
      lower(trim(coalesce(p_email, ''))) = '8pospichal@gmail.com'
      or exists (
        select 1 from public.users u
        where lower(u.email) = lower(trim(p_email)) and u.role = 'admin'
      )
    );
$$;

create or replace function public.current_admin_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(auth.jwt() ->> 'email', '') <> ''
      and public.is_admin(auth.jwt() ->> 'email')
    then lower(auth.jwt() ->> 'email')
    else null
  end;
$$;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  claimed_email text,
  anonymous_id text,
  event_name text not null,
  source text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name, created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events(user_email, created_at desc);
create index if not exists analytics_events_anon_idx on public.analytics_events(anonymous_id, created_at desc);

create table if not exists public.tool_submissions (
  id uuid primary key default gen_random_uuid(),
  tool text not null check (tool in ('quiz','audit','hourly_calculator')),
  user_email text,
  claimed_email text,
  anonymous_id text,
  result jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);
alter table public.tool_submissions enable row level security;
create index if not exists tool_submissions_tool_idx on public.tool_submissions(tool, completed_at desc);
create index if not exists tool_submissions_user_idx on public.tool_submissions(user_email, completed_at desc);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('weekly_challenge','news','webinar')),
  title text not null,
  body text,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  audience text not null default 'all' check (audience in ('all','free','academy')),
  starts_at timestamptz,
  ends_at timestamptz,
  xp int not null default 0 check (xp between 0 and 10000),
  link_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_items enable row level security;
create index if not exists content_items_schedule_idx on public.content_items(type, status, starts_at desc);

create table if not exists public.coupons (
  code text primary key,
  description text,
  percent_off int not null check (percent_off between 1 and 100),
  products text[] not null default '{}',
  active boolean not null default true,
  max_uses int,
  used_count int not null default 0,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

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
  if p_event_name not in ('page_view','session_started','registered','onboarding_completed','quiz_started','quiz_completed','audit_completed','hourly_calculator_completed','ai_question_sent','community_post_created','checkout_started','purchase_completed') then
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

create or replace function public.record_tool_submission(
  p_tool text,
  p_result jsonb,
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
  if p_tool not in ('quiz','audit','hourly_calculator') then raise exception 'Unsupported tool.'; end if;
  if jsonb_typeof(coalesce(p_result, '{}'::jsonb)) <> 'object' then raise exception 'Invalid result.'; end if;
  if length(coalesce(p_result::text,'')) > 20000 then raise exception 'Result too large.'; end if;
  insert into public.tool_submissions(tool,user_email,claimed_email,anonymous_id,result)
  values (p_tool,v_verified,case when v_verified is null then v_claimed else null end,left(nullif(trim(p_anonymous_id),''),80),coalesce(p_result,'{}'::jsonb))
  returning id into v_id;
  perform public.track_event(p_tool || '_completed', p_tool, jsonb_build_object('submission_id',v_id), p_anonymous_id, p_claimed_email);
  return v_id;
end;
$$;

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
    'academy_total', (select count(*) from public.users where tier='academy'),
    'quiz_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='quiz' and completed_at >= now()-interval '30 days'),
    'audit_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='audit' and completed_at >= now()-interval '30 days'),
    'calculator_30d', (select count(distinct coalesce(user_email,claimed_email,anonymous_id,id::text)) from public.tool_submissions where tool='hourly_calculator' and completed_at >= now()-interval '30 days'),
    'recent_users', coalesce((select jsonb_agg(row_to_json(x)) from (select email,display_name,instagram,tier,account_status,created_at,last_seen_at from public.users order by created_at desc limit 8) x),'[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(row_to_json(x)) from (select event_name,coalesce(user_email,claimed_email) as email,source,created_at from public.analytics_events order by created_at desc limit 12) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_list_users_v2(p_search text default null, p_tier text default null, p_status text default null, p_limit int default 100, p_offset int default 0)
returns table(email text,display_name text,instagram text,tier text,role text,account_status text,created_at timestamptz,last_seen_at timestamptz,updated_at timestamptz,quiz_completed boolean,audit_completed boolean,calculator_completed boolean)
language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  return query select u.email,u.display_name,u.instagram,u.tier,u.role,u.account_status,u.created_at,u.last_seen_at,u.updated_at,
    coalesce(jsonb_array_length(coalesce(u.quiz->'passed','[]'::jsonb)) > 0,false),
    exists(select 1 from public.tool_submissions s where coalesce(s.user_email,s.claimed_email)=u.email and s.tool='audit'),
    exists(select 1 from public.tool_submissions s where coalesce(s.user_email,s.claimed_email)=u.email and s.tool='hourly_calculator')
  from public.users u
  where (coalesce(trim(p_search),'')='' or u.email ilike '%'||trim(p_search)||'%' or coalesce(u.display_name,'') ilike '%'||trim(p_search)||'%' or coalesce(u.instagram,'') ilike '%'||trim(p_search)||'%')
    and (coalesce(p_tier,'')='' or u.tier=p_tier)
    and (coalesce(p_status,'')='' or u.account_status=p_status)
  order by u.created_at desc limit least(greatest(p_limit,1),300) offset greatest(p_offset,0);
end $$;

create or replace function public.admin_get_user_v2(p_target text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  select jsonb_build_object(
    'user',row_to_json(u),
    'submissions',coalesce((select jsonb_agg(row_to_json(s) order by s.completed_at desc) from public.tool_submissions s where coalesce(s.user_email,s.claimed_email)=u.email),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(row_to_json(e) order by e.created_at desc) from (select event_name,source,properties,created_at from public.analytics_events where coalesce(user_email,claimed_email)=u.email order by created_at desc limit 50) e),'[]'::jsonb)
  ) into v_result from public.users u where lower(u.email)=lower(trim(p_target));
  return v_result;
end $$;

create or replace function public.admin_set_user_v2(p_target text,p_tier text default null,p_role text default null,p_status text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  if p_tier is not null and p_tier not in ('free','knihovna','academy') then raise exception 'Neplatny tier.'; end if;
  if p_role is not null and p_role not in ('member','moderator','admin') then raise exception 'Neplatna role.'; end if;
  if p_status is not null and p_status not in ('pending','active','paused','blocked') then raise exception 'Neplatny stav.'; end if;
  update public.users set tier=coalesce(p_tier,tier),role=coalesce(p_role,role),account_status=coalesce(p_status,account_status),updated_at=now() where lower(email)=lower(trim(p_target));
end $$;

create or replace function public.admin_list_tool_submissions(p_tool text default null,p_limit int default 100)
returns setof public.tool_submissions language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  return query select * from public.tool_submissions where coalesce(p_tool,'')='' or tool=p_tool order by completed_at desc limit least(greatest(p_limit,1),300);
end $$;

create or replace function public.admin_list_content(p_type text default null)
returns setof public.content_items language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  return query select * from public.content_items where coalesce(p_type,'')='' or type=p_type order by coalesce(starts_at,created_at) desc;
end $$;

create or replace function public.admin_upsert_content(p_id uuid,p_type text,p_title text,p_body text,p_status text,p_audience text,p_starts_at timestamptz,p_ends_at timestamptz,p_xp int,p_link_url text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(p_id,gen_random_uuid()); v_admin text := public.current_admin_email();
begin
  if v_admin is null then raise exception 'Jen pro admina.'; end if;
  insert into public.content_items(id,type,title,body,status,audience,starts_at,ends_at,xp,link_url,metadata,created_by)
  values(v_id,p_type,trim(p_title),nullif(trim(p_body),''),p_status,p_audience,p_starts_at,p_ends_at,coalesce(p_xp,0),nullif(trim(p_link_url),''),coalesce(p_metadata,'{}'::jsonb),v_admin)
  on conflict(id) do update set type=excluded.type,title=excluded.title,body=excluded.body,status=excluded.status,audience=excluded.audience,starts_at=excluded.starts_at,ends_at=excluded.ends_at,xp=excluded.xp,link_url=excluded.link_url,metadata=excluded.metadata,updated_at=now();
  return v_id;
end $$;

create or replace function public.admin_delete_content(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if; delete from public.content_items where id=p_id; end $$;

create or replace function public.list_published_content(p_type text)
returns table(id uuid,type text,title text,body text,audience text,starts_at timestamptz,ends_at timestamptz,xp int,link_url text,metadata jsonb)
language sql stable security definer set search_path = public as $$
  select c.id,c.type,c.title,c.body,c.audience,c.starts_at,c.ends_at,c.xp,c.link_url,c.metadata
  from public.content_items c where c.type=p_type and c.status in ('published','scheduled')
    and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>=now())
  order by c.starts_at desc nulls last;
$$;

create or replace function public.admin_list_coupons_v2()
returns setof public.coupons language plpgsql security definer set search_path = public as $$
begin if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if; return query select * from public.coupons order by created_at desc; end $$;

create or replace function public.admin_upsert_coupon_v2(p_code text,p_percent int,p_products text[] default '{}'::text[],p_active boolean default true,p_max_uses int default null,p_description text default null,p_valid_until timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  insert into public.coupons(code,description,percent_off,products,active,max_uses,valid_until)
  values(upper(trim(p_code)),nullif(trim(p_description),''),p_percent,coalesce(p_products,'{}'),coalesce(p_active,true),p_max_uses,p_valid_until)
  on conflict(code) do update set description=excluded.description,percent_off=excluded.percent_off,products=excluded.products,active=excluded.active,max_uses=excluded.max_uses,valid_until=excluded.valid_until;
end $$;

create or replace function public.admin_delete_coupon_v2(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if; delete from public.coupons where code=upper(trim(p_code)); end $$;

revoke all on function public.current_admin_email() from public,anon;
revoke all on function public.admin_overview() from public,anon;
revoke all on function public.admin_list_users_v2(text,text,text,int,int) from public,anon;
revoke all on function public.admin_get_user_v2(text) from public,anon;
revoke all on function public.admin_set_user_v2(text,text,text,text) from public,anon;
revoke all on function public.admin_list_tool_submissions(text,int) from public,anon;
revoke all on function public.admin_list_content(text) from public,anon;
revoke all on function public.admin_upsert_content(uuid,text,text,text,text,text,timestamptz,timestamptz,int,text,jsonb) from public,anon;
revoke all on function public.admin_delete_content(uuid) from public,anon;
revoke all on function public.admin_list_coupons_v2() from public,anon;
revoke all on function public.admin_upsert_coupon_v2(text,int,text[],boolean,int,text,timestamptz) from public,anon;
revoke all on function public.admin_delete_coupon_v2(text) from public,anon;

grant execute on function public.track_event(text,text,jsonb,text,text) to anon,authenticated;
grant execute on function public.record_tool_submission(text,jsonb,text,text) to anon,authenticated;
grant execute on function public.list_published_content(text) to anon,authenticated;
grant execute on function public.current_admin_email() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users_v2(text,text,text,int,int) to authenticated;
grant execute on function public.admin_get_user_v2(text) to authenticated;
grant execute on function public.admin_set_user_v2(text,text,text,text) to authenticated;
grant execute on function public.admin_list_tool_submissions(text,int) to authenticated;
grant execute on function public.admin_list_content(text) to authenticated;
grant execute on function public.admin_upsert_content(uuid,text,text,text,text,text,timestamptz,timestamptz,int,text,jsonb) to authenticated;
grant execute on function public.admin_delete_content(uuid) to authenticated;
grant execute on function public.admin_list_coupons_v2() to authenticated;
grant execute on function public.admin_upsert_coupon_v2(text,int,text[],boolean,int,text,timestamptz) to authenticated;
grant execute on function public.admin_delete_coupon_v2(text) to authenticated;
