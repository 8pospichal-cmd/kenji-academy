-- Admin: přehled zájemců z „plánu na míru" a změna jejich stavu / poznámky.
-- Stejný vzor jako ostatní admin_* funkce: security definer + kontrola current_admin_email().

create or replace function public.admin_list_plan_requests(p_status text default null, p_limit int default 300)
returns setof public.plan_requests language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  return query
    select * from public.plan_requests
    where coalesce(p_status, '') = '' or status = p_status
    order by created_at desc
    limit least(greatest(p_limit, 1), 1000);
end $$;

create or replace function public.admin_update_plan_request(p_id bigint, p_status text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_admin_email() is null then raise exception 'Jen pro admina.'; end if;
  if p_status is not null and p_status not in ('novy', 'kontaktovan', 'koupil', 'nezajem') then raise exception 'Neplatny stav.'; end if;
  update public.plan_requests
    set status = coalesce(p_status, status),
        note = case when p_note is null then note else nullif(left(trim(p_note), 2000), '') end
    where id = p_id;
end $$;

revoke all on function public.admin_list_plan_requests(text, int) from public, anon;
revoke all on function public.admin_update_plan_request(bigint, text, text) from public, anon;
grant execute on function public.admin_list_plan_requests(text, int) to authenticated;
grant execute on function public.admin_update_plan_request(bigint, text, text) to authenticated;
