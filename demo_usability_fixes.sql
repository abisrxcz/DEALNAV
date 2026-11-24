-- Run after the existing DEAL setup and workflow upgrades.
-- Take a database backup first. Existing order totals are not changed.
begin;

alter table public.orders add column if not exists cancelled_at timestamptz;

create table if not exists public.claim_request_results (
  user_id uuid not null,
  request_id uuid not null,
  arguments jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.claim_request_results enable row level security;
revoke all on public.claim_request_results from public, anon, authenticated;

create or replace function public.claim_from_floor_once(
  p_request_id uuid, p_cid text, p_kg numeric, p_method text,
  p_fulfillment text, p_market text, p_note text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  args jsonb := jsonb_build_array(p_cid,p_kg,p_method,p_fulfillment,p_market,p_note);
  saved public.claim_request_results%rowtype;
  result jsonb;
begin
  if auth.uid() is null or my_role() is distinct from 'vendor' or p_request_id is null then
    return jsonb_build_object('success',false,'message','A vendor and request ID are required.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_request_id::text, 0));
  select * into saved from claim_request_results where user_id=auth.uid() and request_id=p_request_id;
  if found then
    if saved.arguments is distinct from args then
      return jsonb_build_object('success',false,'message','This request ID was already used for different details.');
    end if;
    return saved.result;
  end if;
  result := claim_from_floor(p_cid,p_kg,p_method,p_fulfillment,p_market,p_note);
  if coalesce((result->>'success')::boolean,false) then
    insert into claim_request_results(user_id,request_id,arguments,result) values(auth.uid(),p_request_id,args,result);
    if p_method = 'cash' then
      update passes set paid_at=null where order_id=result->>'order_id';
    end if;
  end if;
  return result;
end $$;

create or replace function public.broker_pay_won_lot(p_cid text,p_method text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; o orders; ref text; amount numeric;
begin
  if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
  if p_method not in ('cash','cashless') then return jsonb_build_object('success',false,'message','Choose Cash or Cashless'); end if;
  select * into c from catches where id=p_cid for update;
  if not found or c.winner_id is distinct from auth.uid() or c.lot_status<>'won_unpaid' then
    return jsonb_build_object('success',false,'message','Nothing to pay for this lot.');
  end if;
  amount := round(c.bid*c.total_kg*1.05 + 4*c.total_kg,2);
  ref := case when p_method='cashless' then 'DEMO-' else 'CASH-' end || upper(substr(md5(random()::text),1,6));
  insert into orders(kind,cid,kg,price_per_kg,total,checker_id,broker_id,payment_method,payment_ref)
    values('pier',c.id,c.total_kg,c.bid,amount,c.created_by,auth.uid(),p_method,ref) returning * into o;
  update catches set lot_status='pending_acceptance' where id=c.id;
  return jsonb_build_object('success',true,'order_id',o.id,'payment_ref',ref,
    'message',case when p_method='cashless' then 'Demo payment recorded. Show your QR to the Pier Checker.' else 'Cash payment due. Show your QR to the Pier Checker.' end);
end $$;

create or replace function public.cancel_pending_order(p_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders;
begin
  select * into o from orders where id=p_id for update;
  if not found or o.status <> 'pending_acceptance' or
     not ((o.kind='vendor' and o.vendor_id=auth.uid() and my_role()='vendor') or
          (o.kind='pier' and o.broker_id=auth.uid() and my_role()='broker')) then
    return jsonb_build_object('success',false,'message','Only the creator can cancel an order before it is accepted.');
  end if;
  update orders set status='rejected',cancelled_at=now(),updated_at=now() where id=o.id;
  if o.kind='vendor' then
    update passes set status='cancelled' where order_id=o.id;
    update catches set remaining_kg=remaining_kg+o.kg, claimed=total_kg-(remaining_kg+o.kg),
      lot_status='on_floor',sold_out=false,sold_out_at=null where id=o.cid;
  else
    update catches set lot_status='won_unpaid' where id=o.cid and lot_status='pending_acceptance';
  end if;
  return jsonb_build_object('success',true,'message','Order cancelled.');
end $$;

revoke execute on function public.claim_from_floor_once(uuid,text,numeric,text,text,text,text), public.cancel_pending_order(text) from public, anon;
grant execute on function public.claim_from_floor_once(uuid,text,numeric,text,text,text,text), public.cancel_pending_order(text) to authenticated;
notify pgrst, 'reload schema';
commit;
