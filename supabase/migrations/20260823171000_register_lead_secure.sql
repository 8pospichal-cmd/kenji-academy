-- Zabezpečení register_lead: identita se bere VÝHRADNĚ z ověřeného JWT (auth.jwt()->>'email'),
-- ne z e-mailu poslaného klientem. Tím se zavře díra, kde šlo zadáním cizího e-mailu
-- vyčíst/změnit tier, progres i Instagram jiného uživatele.
--
-- Chování:
--  • Ověřený uživatel (magic-link session) → upsert jeho řádku + vrátí jeho tier/read/quiz.
--  • Neověřený volající (anon / bez session) → auth.jwt()->>'email' je NULL → nic nevrací
--    a nic nezakládá. Free lead je do ověření pouze lokální; placený tier jen pro ověřené.
--
-- Parametr p_email zůstává v podpisu kvůli kompatibilitě s klientem, ale pro identitu
-- se IGNORUJE. p_instagram se použije jen pro vlastní (JWT) řádek.

create or replace function public.register_lead(p_email text, p_instagram text)
returns table(tier text, read jsonb, quiz jsonb)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
  v_ig text := nullif(trim(p_instagram), '');
begin
  -- Bez ověřené session nevracíme žádná data ani nic nezakládáme.
  if v_email is null then
    return;
  end if;

  insert into public.users(email, instagram, instagram_history)
  values (
    v_email,
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
    select u.tier, u.read, u.quiz from public.users u where u.email = v_email;
end;
$function$;
