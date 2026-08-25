-- Persist the business context used by Kenji AI across devices.
-- Profile fields remain in their existing columns; this JSON contains only
-- onboarding/business preferences and lightweight progress signals.

alter table public.users
  add column if not exists ai_context jsonb not null default '{}'::jsonb;

comment on column public.users.ai_context is
  'Sanitized Kenji AI personalization context: industries, stage, goals, blockers and current progress.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_ai_context_is_object'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_ai_context_is_object
      check (jsonb_typeof(ai_context) = 'object');
  end if;
end;
$$;
