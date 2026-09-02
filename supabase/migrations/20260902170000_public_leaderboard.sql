-- Public community leaderboard for signed-in users.
-- Exposes only safe profile fields; e-mails stay private.

alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists role text not null default 'member';
alter table public.users add column if not exists account_status text not null default 'active';
alter table public.users add column if not exists profile jsonb not null default '{}'::jsonb;

create or replace function public.community_leaderboard(p_limit int default 50)
returns table(
  display_name text,
  instagram text,
  tier text,
  xp integer,
  level integer,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if v_email is null then
    return;
  end if;

  return query
    select
      coalesce(
        nullif(trim(u.display_name), ''),
        nullif(trim(u.profile ->> 'displayName'), ''),
        nullif(trim(u.instagram), ''),
        'Tvůrce'
      ) as display_name,
      nullif(regexp_replace(coalesce(u.instagram, ''), '^@+', ''), '') as instagram,
      coalesce(u.tier, 'free') as tier,
      greatest(coalesce(u.xp, 0), 0) as xp,
      case
        when greatest(coalesce(u.xp, 0), 0) >= 23000 then 10
        when greatest(coalesce(u.xp, 0), 0) >= 17000 then 9
        when greatest(coalesce(u.xp, 0), 0) >= 12000 then 8
        when greatest(coalesce(u.xp, 0), 0) >= 8000 then 7
        when greatest(coalesce(u.xp, 0), 0) >= 5000 then 6
        when greatest(coalesce(u.xp, 0), 0) >= 3000 then 5
        when greatest(coalesce(u.xp, 0), 0) >= 1500 then 4
        when greatest(coalesce(u.xp, 0), 0) >= 500 then 3
        when greatest(coalesce(u.xp, 0), 0) >= 100 then 2
        else 1
      end as level,
      lower(u.email) = v_email as is_me
    from public.users u
    where coalesce(u.account_status, 'active') = 'active'
      and greatest(coalesce(u.xp, 0), 0) > 0
    order by greatest(coalesce(u.xp, 0), 0) desc, u.updated_at desc
    limit v_limit;
end;
$function$;

revoke all on function public.community_leaderboard(int) from public, anon;
grant execute on function public.community_leaderboard(int) to authenticated;
