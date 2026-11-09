-- Upgrade an existing Supabase database to a hard two-minute bidding window.
-- The first bid starts the clock; later bids do not extend it.
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
 update catches set bid=amt, bid_by=auth.uid(), bid_by_ident=me, bid_count=bid_count+1,
  auction_ends=case when auction_ends is null then now()+interval '2 minutes'
                    else auction_ends end
 where id=p_cid returning * into c;
 return jsonb_build_object('success',true,'code','placed','message','Bid placed.','bid',c.bid,'bid_count',c.bid_count,'auction_ends',c.auction_ends);
end $$;
