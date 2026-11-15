-- DEAL Navotas: workflow upgrade part 2 (dispatch details + order chat). Run AFTER deal_workflow_upgrade.sql. Safe to re-run.

alter table orders add column if not exists vehicle jsonb;   -- {driverName, vehicleType, plateNo, contactNo}

-- broker_set_order now also saves the dispatch form; old 3-argument version is replaced.
drop function if exists broker_set_order(text,text,text);
create or replace function broker_set_order(p_id text,p_stage text,p_instruction text default null,p_vehicle jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if my_role() is distinct from 'broker' then return jsonb_build_object('success',false,'message','Brokers only'); end if;
 if p_stage not in('placed','on_delivery') then return jsonb_build_object('success',false,'message','Delivered is set by scanning the vendor QR.'); end if;
 if p_instruction is not null and p_instruction not in('Please pick up at the pier','Please wait until your order is delivered') then
  return jsonb_build_object('success',false,'message','Choose one of the two fulfillment instructions.'); end if;
 update orders set stage=p_stage,instruction=coalesce(p_instruction,instruction),vehicle=coalesce(p_vehicle,vehicle),updated_at=now()
  where id=p_id and kind='vendor' and broker_id=auth.uid() and status='accepted';
 if not found then return jsonb_build_object('success',false,'message','Accept the order first.'); end if;
 return jsonb_build_object('success',true,'message','Order updated.');
end $$;

-- Chat between the two parties of an order (checker<->broker for pier orders, broker<->vendor for vendor orders).
create table if not exists order_messages(
 id bigserial primary key, order_id text not null references orders on delete cascade, sender_id uuid not null default auth.uid(),
 role text not null, sender text, body text not null check(length(body) between 1 and 500), created_at timestamptz not null default now());
alter table order_messages enable row level security;
revoke all on order_messages from anon, authenticated;
create index if not exists order_messages_oid_idx on order_messages(order_id,created_at);

create or replace function send_order_message(p_id text,p_body text) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; nm text;
begin
 select * into o from orders where id=p_id and auth.uid() in(checker_id,broker_id,vendor_id);
 if not found or length(trim(coalesce(p_body,''))) = 0 then return jsonb_build_object('success',false,'message','Cannot send this message.'); end if;
 select coalesce(nullif(full_name,''),left(ident,4)||'***') into nm from profiles where id=auth.uid();
 insert into order_messages(order_id,role,sender,body) values(p_id,my_role(),nm,left(trim(p_body),500));
 return jsonb_build_object('success',true,'message','Sent.');
end $$;

create or replace function my_order_messages() returns setof jsonb language sql security definer stable set search_path=public as $$
 select jsonb_build_object('order_id',m.order_id,'role',m.role,'sender',m.sender,'body',m.body,'created_at',m.created_at)
 from order_messages m join orders o on o.id=m.order_id where auth.uid() in(o.checker_id,o.broker_id,o.vendor_id) order by m.created_at $$;

revoke execute on function broker_set_order(text,text,text,jsonb), send_order_message(text,text), my_order_messages() from public, anon;
grant execute on function broker_set_order(text,text,text,jsonb), send_order_message(text,text), my_order_messages() to authenticated;
notify pgrst, 'reload schema';
