-- ============================================================================
-- DEAL Navotas — clear ALL history / order records in the database.
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- DELETES: bids, passes (orders / escrow / payments), inspection checks, catches
-- KEEPS:   profiles & logins, issued_badges, trusted_devices, user_prefs
--
-- This cannot be undone. Take a backup first if you might need the data.
-- ============================================================================

begin;

-- order matters: passes reference catches, bids reference catches
delete from public.bids    where true;
delete from public.passes  where true;
delete from public.checks  where true;
delete from public.catches where true;

-- start the numeric ids over
alter sequence if exists public.bids_id_seq   restart with 1;
alter sequence if exists public.checks_id_seq restart with 1;

commit;

-- Should all return 0:
select (select count(*) from public.catches) as catches,
       (select count(*) from public.passes)  as passes,
       (select count(*) from public.bids)    as bids,
       (select count(*) from public.checks)  as checks;
