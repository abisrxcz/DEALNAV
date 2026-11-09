-- Upgrade an existing Supabase database to record each pass's payment method (cash / cashless demo).
-- Run once in the Supabase SQL editor.

-- ===== Payment method on escrow passes (cash / cashless demo) =====
alter table passes add column if not exists payment_method text;
alter table passes add column if not exists payment_ref text;
alter table passes add column if not exists paid_at timestamptz;
create or replace function set_pass_payment(p_id text,p_method text,p_ref text) returns void language plpgsql security definer set search_path=public as $$
begin
 if my_role() is distinct from 'vendor' then raise exception 'Vendors only'; end if;
 if p_method not in('cash','cashless') then raise exception 'Invalid payment method'; end if;
 update passes set payment_method=p_method, payment_ref=left(coalesce(p_ref,''),40), paid_at=now()
  where id=p_id and vendor_id=auth.uid() and payment_method is null;
end $$;
revoke execute on function set_pass_payment(text,text,text) from public, anon;
grant execute on function set_pass_payment(text,text,text) to authenticated;
