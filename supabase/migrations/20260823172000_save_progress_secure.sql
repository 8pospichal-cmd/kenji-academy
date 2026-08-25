-- Zabezpečení save_progress: identita se bere výhradně z ověřeného JWT (auth.jwt()->>'email'),
-- ne z klientského p_email. Tím se zavře díra, kde šlo přepsat progres (read/quiz) cizího účtu
-- zadáním jeho e-mailu. Neověřený volající nic nezapíše.

create or replace function public.save_progress(p_email text, p_read jsonb, p_quiz jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(nullif(trim(auth.jwt() ->> 'email'), ''));
begin
  if v_email is null then return; end if;
  update public.users
     set read = coalesce(p_read, read),
         quiz = coalesce(p_quiz, quiz),
         updated_at = now()
   where email = v_email;
end;
$function$;
