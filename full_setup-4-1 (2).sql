-- DEAL Navotas: COMPLETE database setup (includes the live broker auction). Run this ONE file in Supabase > SQL Editor.
-- Works on a brand-new project, and is safe to run again on a project that already has parts of it.

-- ===== Tables =====
create table if not exists profiles(id uuid primary key references auth.users on delete cascade, role text not null check(role in('vendor','checker','broker')), ident text unique not null, station text, approved boolean not null default true, created_at timestamptz default now());
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;
alter table profiles alter column approved set default true;
update profiles set approved = true;

create table if not exists catches(id text primary key, name text not null, sci text, price numeric not null, start numeric not null, bid numeric not null, kg numeric not null, tubs int not null, claimed numeric not null default 0, verified boolean not null default false, src text, fresh numeric default 0, created_by uuid default auth.uid(), created_at timestamptz default now());
alter table catches add column if not exists photo text;
-- Pier checker no longer logs category or declared grade; drop them from existing databases.
alter table catches drop column if exists cat;
alter table catches drop column if exists grade;
-- A lot is 'closed' (hidden from the Fresh Catches Floor) once it is fully sold AND every escrow on it has been released.
alter table catches add column if not exists closed boolean not null default false;
-- Live auction. 'bid' is the top bid per kg; bid_by says who holds it. The first bid starts the closing clock (auction_ends).
-- When the clock ends, settle_lot() records the winner and the winning bid becomes the lot's price, so vendors claim portions at that price.
alter table catches add column if not exists bid_by uuid;
alter table catches add column if not exists bid_by_ident text;
alter table catches add column if not exists bid_count int not null default 0;
alter table catches add column if not exists min_step numeric not null default 1;   -- minimum raise, pesos per kg
alter table catches add column if not exists auction_ends timestamptz;
alter table catches add column if not exists winner_id uuid;
alter table catches add column if not exists winner_ident text;
alter table catches add column if not exists settled_at timestamptz;
alter table catches add column if not exists list_price numeric;                   -- the original base price, kept after the auction sets 'price'
create table if not exists passes(id text primary key, cid text references catches, name text, kg numeric, total numeric, status text default 'escrow', vendor_id uuid default auth.uid(), created_at timestamptz default now());
-- QR escrow pass: secret token (128-bit, unguessable) + scan audit trail. Existing rows get their own token.
alter table passes add column if not exists pass_token text not null default replace(gen_random_uuid()::text,'-','');
alter table passes add column if not exists scanned_at timestamptz;
alter table passes add column if not exists scanned_by uuid;
create unique index if not exists passes_token_key on passes(pass_token);
create table if not exists checks(id bigserial primary key, cid text, name text, res text, by_name text, by_id uuid default auth.uid(), created_at timestamptz default now());

-- Inspection evidence: three photos + the checker's freshness score (these photo columns used to be in photos_setup.sql)
alter table checks add column if not exists photo_top text;
alter table checks add column if not exists photo_mid text;
alter table checks add column if not exists photo_bot text;
alter table checks add column if not exists fresh numeric;
-- AI Suri-Isda Guard report (checklist results, notes, freshness score, verdict) kept with each inspection.
alter table checks add column if not exists ai_report jsonb;

-- Every bid ever placed (who, how much, when). Rows are written only by place_bid(), never directly.
create table if not exists bids(id bigserial primary key, cid text not null references catches on delete cascade, broker_id uuid not null, broker_ident text not null, amount numeric not null check(amount>0), created_at timestamptz not null default now());
create index if not exists bids_cid_idx on bids(cid,created_at desc);

-- ID format rules (checked by the database itself)
alter table profiles drop constraint if exists ident_format;
alter table profiles add constraint ident_format check(
 (role='vendor'  and ident ~ '^09[0-9]{2}-?[0-9]{3}-?[0-9]{4}$') or
 (role='checker' and ident ~ '^TC-NAV-[0-9]+$' and length(coalesce(station,''))>0) or
 (role='broker'  and ident ~ '^BKR-NAV-[0-9]+$')) not valid;

-- ===== Access rules =====
alter table profiles enable row level security;
alter table catches enable row level security;
alter table passes enable row level security;
alter table checks enable row level security;
alter table bids enable row level security;

create or replace function my_role() returns text language sql security definer stable set search_path=public as $$ select role from profiles where id=auth.uid() and approved $$;

drop policy if exists p_sel on profiles;  create policy p_sel on profiles for select using(id=auth.uid());
drop policy if exists p_ins on profiles;  create policy p_ins on profiles for insert with check(id=auth.uid() and role='vendor' and approved);
drop policy if exists c_sel on catches;   create policy c_sel on catches for select using(my_role() is not null);
drop policy if exists c_ins on catches;   create policy c_ins on catches for insert with check(my_role()='checker' and verified=false and claimed=0 and bid_count=0 and bid_by is null and winner_id is null and settled_at is null and auction_ends is null);
drop policy if exists c_upd on catches;   create policy c_upd on catches for update using(my_role() in('checker','broker'));
drop policy if exists pa_sel on passes;   create policy pa_sel on passes for select using(my_role()='broker' or vendor_id=auth.uid());
drop policy if exists k_sel on checks;    create policy k_sel on checks for select using(my_role() in('checker','broker'));
drop policy if exists k_ins on checks;    create policy k_ins on checks for insert with check(my_role()='checker');
drop policy if exists b_sel on bids;      create policy b_sel on bids for select using(my_role()='broker');

-- Bids and prices can no longer be edited straight from the browser. Signed-in users may update ONLY these two columns of a lot
-- (the checker's inspection result); everything about bidding goes through place_bid(), set_start_bid() and settle_lot().
revoke update on catches from anon, authenticated;
grant update(verified,fresh) on catches to authenticated;
revoke insert, update, delete on bids from anon, authenticated;
grant select on bids to authenticated;

-- ===== Safe actions =====
-- Return type changed (void -> jsonb), and CREATE OR REPLACE cannot do that, so drop first. Grants are re-applied below.
drop function if exists claim_portion(text,numeric);
create function claim_portion(p_cid text,p_kg numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; pr passes;
begin
 if my_role() is distinct from 'vendor' then raise exception 'Vendors only'; end if;
 select * into c from catches where id=p_cid for update;
 if not found or not c.verified then raise exception 'Lot not available'; end if;
 if c.settled_at is null and c.auction_ends is not null then   -- bidding has started: wait until it closes
  perform settle_lot(p_cid);
  select * into c from catches where id=p_cid;
  if c.settled_at is null then raise exception 'Auction in progress. Portions open when bidding closes.'; end if;
 end if;
 if p_kg<=0 or p_kg>c.kg-c.claimed then raise exception 'Only % kg open',c.kg-c.claimed; end if;
 update catches set claimed=case when claimed+p_kg>=kg and tubs>1 then 0 else claimed+p_kg end, tubs=case when claimed+p_kg>=kg and tubs>1 then tubs-1 else tubs end where id=p_cid;
 insert into passes(id,cid,name,kg,total) values('QR-DEAL-'||lpad((floor(random()*90000)+10000)::int::text,5,'0'),p_cid,c.name,p_kg,c.price*p_kg*1.05+4*p_kg) returning * into pr;
 return to_jsonb(pr);
end $$;

create or replace function close_lot_if_sold(p_cid text) returns void language plpgsql security definer set search_path=public as $$
begin
 update catches set closed=true
 where id=p_cid and tubs<=1 and claimed>=kg
  and exists(select 1 from passes where cid=p_cid)
  and not exists(select 1 from passes where cid=p_cid and status='escrow');
end $$;

create or replace function release_escrow(p_id text) returns void language plpgsql security definer set search_path=public as $$
begin
 if my_role() is distinct from 'broker' then raise exception 'Brokers only'; end if;
 if not exists(select 1 from passes p join catches c on c.id=p.cid where p.id=p_id and c.verified) then raise exception 'Suri-Isda inspection still pending'; end if;
 update passes set status='released' where id=p_id;
 perform close_lot_if_sold((select cid from passes where id=p_id));
end $$;

-- Broker scans a vendor's QR pass. Business failures return success=false (no exception) so the scanner can show a clean message.
create or replace function verify_and_release_pass(p_pass_id text,p_scanned_token text) returns jsonb language plpgsql security definer set search_path=public as $$
declare p passes; c catches; v text;
begin
 if my_role() is distinct from 'broker' then
  return jsonb_build_object('success',false,'code','forbidden','message','Brokers only');
 end if;
 select * into p from passes where id=p_pass_id for update;
 if not found or p.pass_token is distinct from p_scanned_token then
  return jsonb_build_object('success',false,'code','invalid','message','Pass not found or code does not match.');
 end if;
 if p.status<>'escrow' then
  return jsonb_build_object('success',false,'code','already_released','message','Pass already released.');
 end if;
 if p.created_at < now()-interval '48 hours' then  -- tune the expiry window here
  return jsonb_build_object('success',false,'code','expired','message','Pass expired. Ask the vendor to claim again.');
 end if;
 select * into c from catches where id=p.cid;
 if not found or not c.verified then
  return jsonb_build_object('success',false,'code','pending_inspection','message','Suri-Isda inspection still pending');
 end if;
 select ident into v from profiles where id=p.vendor_id;
 update passes set status='released',scanned_at=now(),scanned_by=auth.uid() where id=p.id returning * into p;
 perform close_lot_if_sold(p.cid);
 return jsonb_build_object('success',true,'code','released','message','Verified pickup. Escrow released.',
  'pass',jsonb_build_object('id',p.id,'catch_id',p.cid,'catch_name',p.name,'kg',p.kg,'total',p.total,'status',p.status,
   'vendor_ident',case when v is null then null else left(v,4)||'***'||right(v,3) end,'released_at',p.scanned_at));
end $$;

-- Any signed-in user (vendor, checker, broker) can read the latest inspection of a lot, so buyers can see the proof before paying.
-- The checks table itself stays checker/broker-only.
create or replace function get_inspection(p_cid text) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare k checks;
begin
 if my_role() is null then raise exception 'Not signed in'; end if;
 select * into k from checks where cid=p_cid order by created_at desc limit 1;
 if not found then return null; end if;
 return jsonb_build_object('id',k.id,'cid',k.cid,'name',k.name,'res',k.res,'by_name',k.by_name,'fresh',k.fresh,'created_at',k.created_at,'photo_top',k.photo_top,'photo_mid',k.photo_mid,'photo_bot',k.photo_bot,'ai_report',k.ai_report);
end $$;

-- ===== Live auction =====
-- Closes a finished auction: the highest bid wins and becomes the lot's price. Safe to call any time (does nothing if the clock is still running).
create or replace function settle_lot(p_cid text) returns void language plpgsql security definer set search_path=public as $$
declare c catches;
begin
 select * into c from catches where id=p_cid for update;
 if not found or c.settled_at is not null or c.auction_ends is null or c.auction_ends>now() then return; end if;
 update catches set winner_id=bid_by, winner_ident=bid_by_ident, settled_at=now(), list_price=coalesce(list_price,price), price=bid where id=p_cid;
end $$;

-- Settles every lot whose clock has run out. The app calls this when a countdown reaches zero.
create or replace function settle_due_auctions() returns int language plpgsql security definer set search_path=public as $$
declare r record; n int:=0;
begin
 if my_role() is null then raise exception 'Not signed in'; end if;
 for r in select id from catches where settled_at is null and auction_ends<=now() loop
  perform settle_lot(r.id); n:=n+1;
 end loop;
 return n;
end $$;

-- One atomic bid. The lot row is locked, so two brokers can never overwrite each other.
-- Business failures return success=false (no exception) so the app can show a clean message.
create or replace function place_bid(p_cid text,p_amount numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; amt numeric; need numeric; me text;
begin
 if my_role() is distinct from 'broker' then
  return jsonb_build_object('success',false,'code','forbidden','message','Brokers only');
 end if;
 amt:=round(coalesce(p_amount,0),2);
 if amt<=0 then return jsonb_build_object('success',false,'code','invalid','message','Enter a bid above 0.'); end if;
 select * into c from catches where id=p_cid for update;
 if not found or not c.verified or c.closed then
  return jsonb_build_object('success',false,'code','unavailable','message','Lot not open for bidding.');
 end if;
 perform settle_lot(p_cid);
 select * into c from catches where id=p_cid;
 if c.settled_at is not null then
  return jsonb_build_object('success',false,'code','closed','message','Auction closed.');
 end if;
 if exists(select 1 from passes where cid=p_cid) then
  return jsonb_build_object('success',false,'code','sold','message','Portions were already claimed at the listed price.');
 end if;
 if c.bid_by=auth.uid() then
  return jsonb_build_object('success',false,'code','already_top','message','You already hold the top bid.');
 end if;
 need:=case when c.bid_count=0 then c.start else c.bid+c.min_step end;   -- first bid may equal the starting price
 if amt<need then
  return jsonb_build_object('success',false,'code','too_low','message','Bid is too low.','min',need);
 end if;
 select ident into me from profiles where id=auth.uid();
 insert into bids(cid,broker_id,broker_ident,amount) values(p_cid,auth.uid(),me,amt);
 -- The first bid starts a hard 2-minute clock; later bids do not extend it.
 update catches set bid=amt, bid_by=auth.uid(), bid_by_ident=me, bid_count=bid_count+1,
  auction_ends=case when auction_ends is null then now()+interval '2 minutes'
                    else auction_ends end
 where id=p_cid returning * into c;
 return jsonb_build_object('success',true,'code','placed','message','Bid placed.','bid',c.bid,'bid_count',c.bid_count,'auction_ends',c.auction_ends);
end $$;

-- The starting price can change only before the first bid.
create or replace function set_start_bid(p_cid text,p_start numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare c catches; v numeric;
begin
 if my_role() is distinct from 'broker' then
  return jsonb_build_object('success',false,'code','forbidden','message','Brokers only');
 end if;
 v:=round(coalesce(p_start,0),2);
 if v<=0 then return jsonb_build_object('success',false,'code','invalid','message','Enter a bid above 0.'); end if;
 select * into c from catches where id=p_cid for update;
 if not found then return jsonb_build_object('success',false,'code','unavailable','message','Lot not open for bidding.'); end if;
 if c.bid_count>0 or c.settled_at is not null or exists(select 1 from passes where cid=p_cid) then
  return jsonb_build_object('success',false,'code','locked','message','Starting bid is locked once bidding has started.');
 end if;
 if v>c.price then return jsonb_build_object('success',false,'code','too_high','message','Starting bid cannot exceed the base price.','max',c.price); end if;
 update catches set start=v, bid=v where id=p_cid;
 return jsonb_build_object('success',true,'code','updated','message','Starting bid updated.');
end $$;

-- ===== Badge IDs issued by the system (checkers TC-NAV-1001+, brokers BKR-NAV-5001+) =====
create sequence if not exists seq_checker start 1001;
create sequence if not exists seq_broker start 5001;
create table if not exists issued_badges(ident text primary key, role text not null, claimed boolean not null default false, issued_at timestamptz default now());
alter table issued_badges enable row level security;

create or replace function new_badge(p_role text) returns text language plpgsql security definer set search_path=public as $$
declare v text;
begin
 if p_role not in('checker','broker') then raise exception 'bad role'; end if;
 loop
  v:=case when p_role='checker' then 'TC-NAV-'||nextval('seq_checker') else 'BKR-NAV-'||nextval('seq_broker') end;
  exit when not exists(select 1 from profiles where ident=v) and not exists(select 1 from issued_badges where ident=v);
 end loop;
 insert into issued_badges(ident,role) values(v,p_role);
 return v;
end $$;

create or replace function create_staff_profile(p_role text,p_ident text,p_name text,p_station text,p_phone text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Not signed in'; end if;
 update issued_badges set claimed=true where ident=p_ident and role=p_role and not claimed;
 if not found then raise exception 'Badge not issued'; end if;
 insert into profiles(id,role,ident,station,full_name,phone,approved) values(auth.uid(),p_role,p_ident,p_station,trim(p_name),p_phone,true);
end $$;

-- Clean up lots that were already sold out and released before this rule existed
update catches c set closed=true where tubs<=1 and claimed>=kg and exists(select 1 from passes where cid=c.id) and not exists(select 1 from passes where cid=c.id and status='escrow');

-- =====================================================================
-- Sold-out history stored in Supabase (safe to run more than once)
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- 1. Permanent record on each lot: is it sold out, and since when.
alter table catches add column if not exists sold_out boolean not null default false;
alter table catches add column if not exists sold_out_at timestamptz;

-- 2. The database itself marks a lot as sold out the moment its last tub is fully claimed.
--    This runs on every insert/update, so it works for claim_portion() and any future path.
--    Once true it stays true, so the lot can never drift back onto the Fresh Catches floor.
create or replace function mark_sold_out() returns trigger language plpgsql as $$
begin
 if new.kg>0 and new.tubs<=1 and new.claimed>=new.kg then
  new.sold_out:=true;
  if new.sold_out_at is null then new.sold_out_at:=now(); end if;
 end if;
 return new;
end $$;

drop trigger if exists trg_mark_sold_out on catches;
create trigger trg_mark_sold_out before insert or update on catches
 for each row execute function mark_sold_out();

-- 3. Back-fill lots that were already sold out before this change (uses the time of their last claim).
update catches c set sold_out=true,
 sold_out_at=coalesce(c.sold_out_at,(select max(p.created_at) from passes p where p.cid=c.id),now())
where c.kg>0 and c.tubs<=1 and c.claimed>=c.kg and not c.sold_out;

-- 4. Fast lookups for the Sold Out / Closed page and the Fresh Catches floor.
create index if not exists catches_sold_out_idx on catches(sold_out, sold_out_at desc);

-- Browsers still cannot edit these columns directly: only the trigger sets them.

-- =====================================================================
-- "Remember this device" + per-user settings stored in Supabase
-- Safe to run more than once. Run in: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1. Trusted devices: one row per signed-in user per browser/device that ticked "Remember this device".
create table if not exists trusted_devices(
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 device_id text not null check(length(device_id) between 6 and 64),
 label text,
 remembered_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 primary key(user_id,device_id));
alter table trusted_devices enable row level security;
drop policy if exists td_sel on trusted_devices;
create policy td_sel on trusted_devices for select using(user_id=auth.uid());

-- 2. Per-user settings that should follow the account to any device.
create table if not exists user_prefs(
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 lang text check(lang in('EN','TL','TAGLISH')),
 dark boolean,
 mute boolean,
 tutorial_done boolean not null default false,
 updated_at timestamptz not null default now());
alter table user_prefs enable row level security;
drop policy if exists up_sel on user_prefs;
create policy up_sel on user_prefs for select using(user_id=auth.uid());

-- Browsers can only read these tables; every change goes through the functions below.
revoke all on trusted_devices, user_prefs from anon, authenticated;
grant select on trusted_devices, user_prefs to authenticated;

create or replace function remember_device(p_device text,p_label text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into trusted_devices(user_id,device_id,label) values(auth.uid(),left(p_device,64),left(coalesce(p_label,''),80))
 on conflict(user_id,device_id) do update set label=excluded.label,last_seen_at=now();
 -- keep only the 10 most recently used devices per user
 delete from trusted_devices where user_id=auth.uid() and device_id not in
  (select device_id from trusted_devices where user_id=auth.uid() order by last_seen_at desc limit 10);
end $$;

create or replace function forget_device(p_device text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 delete from trusted_devices where user_id=auth.uid() and device_id=left(p_device,64);
end $$;

create or replace function touch_device(p_device text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return; end if;
 update trusted_devices set last_seen_at=now() where user_id=auth.uid() and device_id=left(p_device,64);
end $$;

create or replace function save_prefs(p_lang text,p_dark boolean,p_mute boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into user_prefs(user_id,lang,dark,mute) values(auth.uid(),case when p_lang in('EN','TL','TAGLISH') then p_lang end,p_dark,p_mute)
 on conflict(user_id) do update set lang=excluded.lang,dark=excluded.dark,mute=excluded.mute,updated_at=now();
end $$;

create or replace function finish_tutorial() returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into user_prefs(user_id,tutorial_done) values(auth.uid(),true)
 on conflict(user_id) do update set tutorial_done=true,updated_at=now();
end $$;

revoke execute on function remember_device(text,text), forget_device(text), touch_device(text), save_prefs(text,boolean,boolean), finish_tutorial() from public, anon;
grant execute on function remember_device(text,text), forget_device(text), touch_device(text), save_prefs(text,boolean,boolean), finish_tutorial() to authenticated;

do $$ begin
 begin alter publication supabase_realtime add table user_prefs; exception when others then null; end;
end $$;


-- ===== Permissions =====
revoke execute on function close_lot_if_sold(text) from public, anon, authenticated;
revoke execute on function claim_portion(text,numeric), release_escrow(text), verify_and_release_pass(text,text), get_inspection(text), new_badge(text), create_staff_profile(text,text,text,text,text) from public, anon;
grant execute on function claim_portion(text,numeric), release_escrow(text), verify_and_release_pass(text,text), get_inspection(text), create_staff_profile(text,text,text,text,text) to authenticated;
grant execute on function new_badge(text) to anon, authenticated;
revoke execute on function settle_lot(text) from public, anon, authenticated;
revoke execute on function place_bid(text,numeric), set_start_bid(text,numeric), settle_due_auctions() from public, anon;
grant execute on function place_bid(text,numeric), set_start_bid(text,numeric), settle_due_auctions() to authenticated;

-- ===== Live updates =====
do $$ begin
 begin alter publication supabase_realtime add table catches; exception when others then null; end;
 begin alter publication supabase_realtime add table passes;  exception when others then null; end;
 begin alter publication supabase_realtime add table checks;  exception when others then null; end;
 begin alter publication supabase_realtime add table bids;    exception when others then null; end;
end $$;

notify pgrst, 'reload schema';
