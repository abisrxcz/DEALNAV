-- Run after the existing DEAL Navotas setup and workflow migrations in Supabase SQL Editor.
-- Back up the database first. Existing staff accounts retain their IDs and access.
begin;
create or replace function public.request_phone_staff_profile(p_role text, p_phone text, p_name text, p_station text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare v_id text; v_email text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_role not in ('checker','broker') then raise exception 'Invalid role'; end if;
  if p_phone !~ '^09[0-9]{9}$' then raise exception 'Invalid phone number'; end if;
  select email into v_email from auth.users where id = auth.uid();
  if v_email is distinct from p_phone || '@deal-navotas.app' then raise exception 'Phone does not match account'; end if;
  if length(trim(coalesce(p_name,''))) < 3 then raise exception 'Enter your full name'; end if;
  if p_role = 'checker' and length(trim(coalesce(p_station,''))) = 0 then raise exception 'Choose a station'; end if;
  if exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Account already has a profile'; end if;
  v_id := public.new_badge(p_role);
  update public.issued_badges set claimed=true where ident=v_id;
  insert into public.profiles(id, role, ident, station, full_name, phone, approved)
  values(auth.uid(), p_role, v_id, p_station, trim(p_name), p_phone, true);
  return 'active';
end $$;
revoke all on function public.request_phone_staff_profile(text,text,text,text) from public, anon;
grant execute on function public.request_phone_staff_profile(text,text,text,text) to authenticated;
-- Keep legacy staff creation endpoints disabled; new registrations use the function above.
revoke execute on function public.new_badge(text) from public, anon, authenticated;
revoke execute on function public.create_staff_profile(text,text,text,text,text) from public, anon, authenticated;
commit;

-- Accounts that were already inactive remain inactive. If a specific pending account
-- should be activated, locate it and update only its UUID:
-- SELECT id, full_name, phone, role FROM public.profiles WHERE approved = false;
-- UPDATE public.profiles SET approved = true WHERE id = 'ACCOUNT-UUID'::uuid;
-- Existing staff use the legacy ID sign-in. Migrating them to phone sign-in requires
-- independently verifying their phone, resolving duplicates, and changing their Auth email.
