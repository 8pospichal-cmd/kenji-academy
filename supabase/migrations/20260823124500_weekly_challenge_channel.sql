-- Public weekly challenge channel for every verified tier.
-- Participation, comments and likes still require a signed Supabase session.

create or replace function public.can_access_community_category(p_email text, p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where lower(u.email) = public.community_email(p_email)
      and (
        u.tier = 'academy'
        or p_category in ('foto-feedback', 'tydenni-vyzva')
      )
  );
$$;

create or replace function public.create_post(
  p_email text,
  p_ig text,
  p_category text,
  p_body text,
  p_media_url text,
  p_media_type text,
  p_link_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := public.community_email(p_email);
  v_tier text;
begin
  if v_email is null then raise exception 'Nejdriv over svuj e-mail.'; end if;
  select tier into v_tier from public.users where lower(email) = v_email;
  if not public.can_access_community_category(v_email, p_category) then
    raise exception 'Tento komunitni kanal je soucasti Kenji Academy.';
  end if;
  if p_category not in ('foto-feedback','tydenni-vyzva','novinky','slevy','dotazy','fotka-mesice','predstav-se','uspechy','second-shooting') then
    raise exception 'Neplatna kategorie.';
  end if;
  if p_category in ('novinky','slevy') and not public.is_admin(v_email) then
    raise exception 'Do teto rubriky muze prispivat jen Kenji.';
  end if;
  if coalesce(nullif(trim(p_body),''), nullif(trim(p_media_url),''), nullif(trim(p_link_url),'')) is null then
    raise exception 'Prispevek je prazdny.';
  end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'Prispevek je prilis dlouhy.'; end if;
  if coalesce(v_tier, 'free') <> 'academy' and (
    select count(*) from public.posts where author_email = v_email and created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Dosahl jsi denniho limitu 5 prispevku.';
  end if;

  insert into public.posts(author_email, author_ig, category, body, media_url, media_type, link_url)
  values (v_email, nullif(trim(p_ig),''), p_category, nullif(trim(p_body),''),
          nullif(trim(p_media_url),''), nullif(trim(p_media_type),''), nullif(trim(p_link_url),''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.can_access_community_category(text,text) from public, anon;
revoke all on function public.create_post(text,text,text,text,text,text,text) from public, anon;

grant execute on function public.create_post(text,text,text,text,text,text,text) to authenticated;
