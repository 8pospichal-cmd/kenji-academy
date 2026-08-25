-- Transitional AI quota for verified accounts and free lead sessions.
-- Verified users use their auth UUID. Unverified leads use an opaque,
-- server-derived key and never gain access to profile data or paid tiers.

alter table public.ai_question_usage
  add column if not exists identity_key text;

update public.ai_question_usage
set identity_key = 'user:' || user_id::text
where identity_key is null;

alter table public.ai_question_usage
  alter column identity_key set not null,
  alter column user_id drop not null;

create index if not exists ai_question_usage_identity_asked_idx
  on public.ai_question_usage (identity_key, asked_at desc);

create or replace function public.get_ai_identity_quota(
  p_identity_key text,
  p_limit integer default 5
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_used integer;
  v_oldest timestamptz;
begin
  if nullif(trim(p_identity_key), '') is null or char_length(p_identity_key) > 100 or p_limit < 1 then
    raise exception 'invalid quota arguments';
  end if;

  select count(*)::integer, min(asked_at)
    into v_used, v_oldest
  from public.ai_question_usage
  where identity_key = p_identity_key
    and asked_at > v_now - interval '24 hours';

  return query select
    v_used < p_limit,
    v_used,
    greatest(p_limit - v_used, 0),
    case when v_oldest is null then null else v_oldest + interval '24 hours' end;
end;
$$;

create or replace function public.consume_ai_identity_question(
  p_identity_key text,
  p_limit integer default 5
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_used integer;
  v_oldest timestamptz;
begin
  if nullif(trim(p_identity_key), '') is null or char_length(p_identity_key) > 100 or p_limit < 1 then
    raise exception 'invalid quota arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_identity_key, 0));

  select count(*)::integer, min(asked_at)
    into v_used, v_oldest
  from public.ai_question_usage
  where identity_key = p_identity_key
    and asked_at > v_now - interval '24 hours';

  if v_used >= p_limit then
    return query select false, v_used, 0, v_oldest + interval '24 hours';
    return;
  end if;

  insert into public.ai_question_usage (identity_key, asked_at)
  values (p_identity_key, v_now);

  v_used := v_used + 1;
  if v_oldest is null then v_oldest := v_now; end if;

  return query select true, v_used, greatest(p_limit - v_used, 0), v_oldest + interval '24 hours';
end;
$$;

revoke all on function public.get_ai_identity_quota(text, integer) from public, anon, authenticated;
revoke all on function public.consume_ai_identity_question(text, integer) from public, anon, authenticated;
grant execute on function public.get_ai_identity_quota(text, integer) to service_role;
grant execute on function public.consume_ai_identity_question(text, integer) to service_role;
