# Kenji AI — nasazení (Supabase Edge Function)

Frontend (chat stránka `kenji-ai.html`) je hotový a volá Supabase Edge Function
`kenji-ai`. Dokud funkci nenasadíš, chat hlásí, že se AI připravuje. Tohle je
návod, jak ji rozjet. Klíče dáváš JEN do Supabase secrets, nikdy do webu.

## 1) SQL — globální denní limit (ochrana nákladů)
Supabase → SQL Editor → New query → vlož a **Run**:

```sql
create table if not exists public.ai_usage_global (
  day   date primary key default current_date,
  count int  not null default 0
);
alter table public.ai_usage_global enable row level security;
-- žádné policy → sahá na to jen service role (Edge Function)

create or replace function public.increment_ai_usage_global(p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  select count into v_count from public.ai_usage_global where day = current_date;
  if v_count is null then v_count := 0; end if;
  if v_count >= p_limit then return -1; end if;
  insert into public.ai_usage_global (day, count) values (current_date, 1)
    on conflict (day) do update set count = ai_usage_global.count + 1
    returning count into v_count;
  return v_count;
end; $$;
revoke all on function public.increment_ai_usage_global(int) from public, anon, authenticated;
```

## 2) Klíče (zdarma) a secrets
- **Groq** (hlavní, zdarma, rychlé): založ účet na <https://console.groq.com> → API Keys → vytvoř klíč.
- **OpenRouter** (fallback, má free modely): <https://openrouter.ai/keys>.

Pak v terminálu (v tomhle projektu, s nainstalovaným `supabase` CLI a přihlášeným `supabase login`):

```bash
supabase secrets set GROQ_API_KEY=tvuj_groq_klic
supabase secrets set OPENROUTER_API_KEY=tvuj_openrouter_klic
# volitelně (jinak se použijí výchozí):
supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
supabase secrets set OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
supabase secrets set KENJI_AI_GLOBAL_LIMIT=2000
```

## 3) Deploy funkce
```bash
supabase functions deploy kenji-ai --no-verify-jwt
```
`--no-verify-jwt` proto, že Kenji zatím nemá přihlašování — chat je zdarma a volá
se přes anon klíč. (Globální limit chrání před zneužitím. Až přidáme Google login,
můžeme přidat i limit na uživatele.)

## 4) Hotovo
Frontend volá `supabase.functions.invoke('kenji-ai', { body: { message, history, context } })`
— jakmile je funkce nasazená a secrets nastavené, chat začne odpovídat.

## Pozn.
- Personalitu AI upravíš v `SYSTEM_PROMPT` v `supabase/functions/kenji-ai/index.ts`.
- Historie chatu se drží v prohlížeči uživatele (localStorage). Strukturovaný kontext
  z onboardingu se přihlášenému uživateli ukládá do `users.ai_context`, takže Kenji AI
  zná jeho obory, fázi, cíl a prioritu i na dalším zařízení. Jméno, bio, Instagram a tier
  načítá Edge Function přímo z ověřeného profilu; e-mail ani avatar se do AI promptu neposílají.
- API klíče, co bys posílal kamkoliv do chatu/kódu, ber jako prozrazené a přegeneruj je.
