-- DEAL Navotas: workflow upgrade (Diagram 1 supply chain + Diagram 2 inventory split).
-- Run ONCE in Supabase SQL Editor AFTER full_setup. Safe to re-run.
-- Lot lifecycle (catches.lot_status):
--   live_bidding -> won_unpaid -> pending_acceptance -> accepted -> on_floor -> sold_out
--   checker REJECT sends the lot from pending_acceptance back to live_bidding (re-bid).
-- MARGIN RULES (edit here): resale price = winning bid x 1.10; bids are capped at 1.25 x the base price.

alter table catches add column if not exists lot_status text not null default 'live_bidding';
alter table catches add column if not exists total_kg numeric;
alter table catches add column if not exists remaining_kg numeric;
alter table catches add column if not exists resale_price numeric;
alter table catches add column if not exists handed_over_at timestamptz;
alter table passes add column if not exists order_id text;
alter table passes add column if not exists payment_method text;
alter table passes add column if not exists paid_at timestamptz;

update catches set total_kg=kg*tubs where total_kg is null;
update catches set remaining_kg=greatest(total_kg-claimed,0) where remaining_kg is null;
-- existing lots keep working: anything already settled is treated as on the floor
update catches set lot_status=case when sold_out then 'sold_out' when settled_at is not null and winner_id is not null then 'on_floor' else 'live_bidding' end
 where lot_status='live_bidding';

create table if not exists orders(
 id text primary key default 'ORD-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,6)),
 kind text not null check(kind in('pier','vendor')),
 cid text not null references catches,
 kg numeric not null, price_per_kg numeric not null, total numeric not null,
 checker_id uuid, broker_id uuid, vendor_id uuid,
 status text not null default 'pending_acceptance' check(status in('pending_acceptance','accepted','completed','rejected')),
 stage text not null default 'placed' check(stage in('placed','on_delivery','delivered')),
 payment_method text check(payment_method in('cash','cashless')), payment_ref text,
 fulfillment text check(fulfillment in('pickup','delivery')), market text,
 instruction text,
 qr_token text not null default replace(gen_random_uuid()::text,'-',''),
 qr_scanned_at timestamptz, ratings jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table orders enable row level security;
revoke all on orders from anon, authenticated;   -- no direct access: the QR secret never leaves the server except to its owner
create index if not exists orders_cid_idx on orders(cid);

-- Orders each person may see (private by role). The QR payload is returned ONLY to the party who must present it
-- (broker for pier orders, vendor for vendor orders); scanners never receive the secret.
create or replace function my_orders() returns setof jsonb language sql security definer stable set search_path=public as $$
 select (to_jsonb(o)-'qr_token') || jsonb_build_object('catch_name',c.name,'src',c.src,
   'broker_ident',c.winner_ident,
   'vendor_ident',(select left(ident,4)||'***'||right(ident,3) from profiles where id=o.vendor_id),
   'qr_payload',case when (o.kind='pier' and o.broker_id=auth.uid()) or (o.kind='vendor' and o.vendor_id=auth.uid())
                     then 'DEAL2|'||o.id||'|'||o.qr_token end)
 from orders o join catches c on c.id=o.cid
 where auth.uid() in (o.checker_id,o.broker_id,o.vendor_id) order by o.created_at desc $$;

-- ===== triggers =====
create or replace function lot_defaults() returns trigger language plpgsql as $$
begin
 if tg_op='INSERT' then new.total_kg:=coalesce(new.total_kg,new.kg*new.tubs); new.remaining_kg:=coalesce(new.remaining_kg,new.total_kg); end if;
 if tg_op='UPDATE' and old.settled_at is null and new.settled_at is not null and new.winner_id is not null and new.lot_status='live_bidding' then
  new.lot_status:='won_unpaid'; end if;
 return new;
end $$;
drop trigger if exists trg_lot_defaults on catches;
create trigger trg_lot_defaults before insert or update on catches for each row execute function lot_defaults();

create or replace function bid_ceiling() returns trigger language plpgsql as $$
declare base numeric;
begin
 select coalesce(list_price,price) into base from catches where id=new.cid;
 if new.amount>round(base*1.25,2) then raise exception 'Bid is above the margin ceiling of % per kg (keeps broker resale viable).',round(base*1.25,2); end if;
 return new;
end $$;
drop trigger if exists trg_bid_ceiling on bids;
create trigger trg_bid_ceiling before insert on bids for each row execute function bid_ceiling();

-- ===== Broker: pay for the won lot (Cash/Cashless) -> unique QR + "Pending Acceptance" order =====
create or replace function broker_pay_won_lot(p_cid text,p_method text) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; o orders; ref text;
begin
 if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
 if p_method not in('cash','cashless') then return jsonb_build_object('success',false,'message','Choose Cash or Cashless'); end if;
 select * into c from catches where id=p_cid for update;
 if not found or c.winner_id is distinct from auth.uid() or c.lot_status<>'won_unpaid' then
  return jsonb_build_object('success',false,'message','Nothing to pay for this lot.'); end if;
 ref:=case when p_method='cashless' then 'DEMO-' else 'CASH-' end||upper(substr(md5(random()::text),1,6));
 insert into orders(kind,cid,kg,price_per_kg,total,checker_id,broker_id,payment_method,payment_ref)
  values('pier',c.id,c.total_kg,c.bid,round(c.bid*c.total_kg,2),c.created_by,auth.uid(),p_method,ref) returning * into o;
 update catches set lot_status='pending_acceptance' where id=c.id;
 return jsonb_build_object('success',true,'order_id',o.id,'payment_ref',ref,'message','Payment recorded. Show your QR to the Pier Checker.');
end $$;

-- ===== Pier Checker: accept / reject the winning bid =====
create or replace function checker_decide_bid(p_cid text,p_accept boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches;
begin
 if my_role() is distinct from 'checker' then return jsonb_build_object('success',false,'message','Pier Checkers only'); end if;
 select * into c from catches where id=p_cid for update;
 if not found or c.created_by is distinct from auth.uid() or c.lot_status<>'pending_acceptance' then
  return jsonb_build_object('success',false,'message','This bid is not waiting for your decision.'); end if;
 if p_accept then
  update orders set status='accepted',updated_at=now() where cid=p_cid and kind='pier' and status='pending_acceptance';
  update catches set lot_status='accepted' where id=p_cid;
  return jsonb_build_object('success',true,'message','Bid accepted. Scan the Broker QR at handover.');
 end if;
 update orders set status='rejected',updated_at=now() where cid=p_cid and kind='pier' and status='pending_acceptance';
 update catches set lot_status='live_bidding',settled_at=null,auction_ends=null,bid_by=null,bid_by_ident=null,winner_id=null,winner_ident=null,
   bid_count=0,bid=start,price=coalesce(list_price,price),list_price=null where id=p_cid;   -- back to Live Bids for re-bidding
 return jsonb_build_object('success',true,'message','Bid rejected. The catch is back on Live Bids.');
end $$;

-- ===== Pier Checker: scan Broker QR at handover -> lot unlocks on Fresh Catches Floor =====
create or replace function checker_scan_broker_qr(p_payload text) returns jsonb language plpgsql security definer set search_path=public as $$
declare parts text[]; o orders;
begin
 if my_role() is distinct from 'checker' then return jsonb_build_object('success',false,'message','Pier Checkers only'); end if;
 parts:=string_to_array(coalesce(p_payload,''),'|');
 select * into o from orders where id=parts[2] and kind='pier' and checker_id=auth.uid() for update;
 if not found or parts[1]<>'DEAL2' or o.qr_token is distinct from parts[3] then return jsonb_build_object('success',false,'message','QR code does not match any of your orders.'); end if;
 if o.status<>'accepted' then return jsonb_build_object('success',false,'message','Accept the bid first (status: '||o.status||').'); end if;
 update orders set status='completed',stage='delivered',qr_scanned_at=now(),updated_at=now() where id=o.id;
 update catches set lot_status='on_floor',handed_over_at=now(),resale_price=round(o.price_per_kg*1.10,2),price=round(o.price_per_kg*1.10,2),
   kg=total_kg,tubs=1,claimed=0,remaining_kg=total_kg where id=o.cid;
 return jsonb_build_object('success',true,'message','Handover verified. The catch is now on the Fresh Catches Floor.');
end $$;

-- ===== Micro-Vendor: claim a portion / everything (atomic remaining_kg split) =====
create or replace function claim_from_floor(p_cid text,p_kg numeric,p_method text,p_fulfillment text,p_market text,p_note text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; o orders; rem numeric; tot numeric;
begin
 if my_role() is distinct from 'vendor' then return jsonb_build_object('success',false,'message','Vendors only'); end if;
 if p_method not in('cash','cashless') or p_fulfillment not in('pickup','delivery') then return jsonb_build_object('success',false,'message','Pick a payment method and fulfillment option.'); end if;
 select * into c from catches where id=p_cid for update;
 if not found or c.lot_status<>'on_floor' then return jsonb_build_object('success',false,'message','This catch is not on the floor.'); end if;
 if p_kg is null or p_kg<=0 or p_kg>c.remaining_kg then return jsonb_build_object('success',false,'message','Only '||c.remaining_kg||' kg left.'); end if;
 rem:=c.remaining_kg-p_kg; tot:=round(c.price*p_kg*1.05+4*p_kg,2);
 update catches set remaining_kg=rem,claimed=total_kg-rem,kg=total_kg,tubs=1,lot_status=case when rem=0 then 'sold_out' else 'on_floor' end where id=p_cid;
 insert into orders(kind,cid,kg,price_per_kg,total,broker_id,vendor_id,payment_method,payment_ref,fulfillment,market,instruction)
  values('vendor',p_cid,p_kg,c.price,tot,c.winner_id,auth.uid(),p_method,case when p_method='cashless' then 'DEMO-' else 'CASH-' end||upper(substr(md5(random()::text),1,6)),
   p_fulfillment,p_market,coalesce(nullif(trim(p_note),''),case when p_fulfillment='pickup' then 'Please pick up at the pier' else 'Please wait until your order is delivered' end)) returning * into o;
 insert into passes(id,cid,name,kg,total,order_id,payment_method,paid_at) values('QR-DEAL-'||substr(o.id,5),p_cid,c.name,p_kg,tot,o.id,p_method,now());
 return jsonb_build_object('success',true,'order_id',o.id,'remaining_kg',rem,'sold_out',rem=0,'message',case when rem=0 then 'You took the last stock. Lot is Sold Out.' else 'Portion claimed. Waiting for the Broker to accept.' end);
end $$;

-- ===== Broker: accept / reject micro-vendor order; update fulfillment note; mark On Delivery =====
create or replace function broker_decide_vendor_order(p_id text,p_accept boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders;
begin
 if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
 select * into o from orders where id=p_id and kind='vendor' and broker_id=auth.uid() and status='pending_acceptance' for update;
 if not found then return jsonb_build_object('success',false,'message','Order not waiting for approval.'); end if;
 if p_accept then update orders set status='accepted',updated_at=now() where id=p_id;
 else
  update orders set status='rejected',updated_at=now() where id=p_id;
  update passes set status='cancelled' where order_id=p_id;
  update catches set remaining_kg=remaining_kg+o.kg,claimed=total_kg-(remaining_kg+o.kg),lot_status='on_floor',sold_out=false,sold_out_at=null where id=o.cid;  -- stock returns to the floor
 end if;
 return jsonb_build_object('success',true,'message',case when p_accept then 'Order accepted.' else 'Order rejected. Stock returned to the floor.' end);
end $$;

create or replace function broker_set_order(p_id text,p_stage text,p_instruction text default null) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
 if p_stage not in('placed','on_delivery') then return jsonb_build_object('success',false,'message','Delivered is set by scanning the vendor QR.'); end if;
 update orders set stage=p_stage,instruction=coalesce(nullif(trim(p_instruction),''),instruction),updated_at=now()
  where id=p_id and kind='vendor' and broker_id=auth.uid() and status='accepted';
 return jsonb_build_object('success',found,'message',case when found then 'Order updated.' else 'Accept the order first.' end);
end $$;

-- ===== Broker: scan Micro-Vendor QR on completion =====
create or replace function broker_scan_vendor_qr(p_payload text) returns jsonb language plpgsql security definer set search_path=public as $$
declare parts text[]; o orders;
begin
 if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
 parts:=string_to_array(coalesce(p_payload,''),'|');
 select * into o from orders where id=parts[2] and kind='vendor' and broker_id=auth.uid() for update;
 if not found or parts[1]<>'DEAL2' or o.qr_token is distinct from parts[3] then return jsonb_build_object('success',false,'message','QR code does not match any of your orders.'); end if;
 if o.status<>'accepted' then return jsonb_build_object('success',false,'message','Accept the order first (status: '||o.status||').'); end if;
 update orders set status='completed',stage='delivered',qr_scanned_at=now(),updated_at=now() where id=o.id;
 update passes set status='released',scanned_at=now(),scanned_by=auth.uid() where order_id=o.id;
 return jsonb_build_object('success',true,'message','Order completed. You can now rate the vendor.');
end $$;

-- ===== Rate & Feedback (only after completion, only by a party to the order) =====
create or replace function rate_order(p_id text,p_stars int,p_comment text) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; r text:=my_role();
begin
 select * into o from orders where id=p_id and status='completed' and auth.uid() in(checker_id,broker_id,vendor_id) for update;
 if not found or p_stars not between 1 and 5 then return jsonb_build_object('success',false,'message','Cannot rate this order.'); end if;
 update orders set ratings=ratings||jsonb_build_object(r,jsonb_build_object('stars',p_stars,'comment',left(coalesce(p_comment,''),300),'at',now())),updated_at=now() where id=p_id;
 return jsonb_build_object('success',true,'message','Thanks for your feedback.');
end $$;

-- ===== Permissions: the old direct claim path is closed so nobody can bypass the checker scan =====
revoke execute on function claim_portion(text,numeric) from authenticated;
revoke execute on function my_orders(), broker_pay_won_lot(text,text), checker_decide_bid(text,boolean), checker_scan_broker_qr(text),
 claim_from_floor(text,numeric,text,text,text,text), broker_decide_vendor_order(text,boolean), broker_set_order(text,text,text),
 broker_scan_vendor_qr(text), rate_order(text,int,text) from public, anon;
grant execute on function my_orders(), broker_pay_won_lot(text,text), checker_decide_bid(text,boolean), checker_scan_broker_qr(text),
 claim_from_floor(text,numeric,text,text,text,text), broker_decide_vendor_order(text,boolean), broker_set_order(text,text,text),
 broker_scan_vendor_qr(text), rate_order(text,int,text) to authenticated;
notify pgrst, 'reload schema';
