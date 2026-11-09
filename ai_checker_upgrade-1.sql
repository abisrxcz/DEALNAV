-- Upgrade an existing Supabase database for the AI Suri-Isda Quality Guard.
-- Run once in the Supabase SQL editor.
alter table checks add column if not exists ai_report jsonb;

create or replace function get_inspection(p_cid text) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare k checks;
begin
 if my_role() is null then raise exception 'Not signed in'; end if;
 select * into k from checks where cid=p_cid order by created_at desc limit 1;
 if not found then return null; end if;
 return jsonb_build_object('id',k.id,'cid',k.cid,'name',k.name,'res',k.res,'by_name',k.by_name,'fresh',k.fresh,'created_at',k.created_at,'photo_top',k.photo_top,'photo_mid',k.photo_mid,'photo_bot',k.photo_bot,'ai_report',k.ai_report);
end $$;
