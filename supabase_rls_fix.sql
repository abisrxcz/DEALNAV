-- ============================================================================
-- DEAL Navotas — Fix "new row violates row-level security policy for table catches"
-- Run this in Supabase Dashboard -> SQL Editor if an approved Pier Checker
-- still gets an RLS error when logging incoming catches.
-- ============================================================================

begin;

-- Ensure my_role() cleanly reads approved role from profiles
create or replace function public.my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and approved = true;
$$;

-- Ensure Pier Checker insert policy on catches allows clean inserts
drop policy if exists c_ins on public.catches;
create policy c_ins on public.catches
for insert
with check (
  public.my_role() = 'checker'
  and verified = false
  and claimed = 0
  and coalesce(bid_count, 0) = 0
  and bid_by is null
  and winner_id is null
  and settled_at is null
  and auction_ends is null
);

-- Ensure Pier Checker update policy on catches allows AI verification score update
drop policy if exists c_upd on public.catches;
create policy c_upd on public.catches
for update
using (public.my_role() in ('checker', 'broker'))
with check (public.my_role() in ('checker', 'broker'));

commit;
