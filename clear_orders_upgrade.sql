-- Run after deal_workflow_upgrade.sql in the Supabase SQL Editor.
begin;
create table if not exists public.hidden_orders (
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null references public.orders(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, order_id)
);
alter table public.hidden_orders enable row level security;
revoke all on public.hidden_orders from anon, authenticated;

create or replace function public.my_hidden_orders() returns setof text
language sql security definer stable set search_path = public as $$
  select h.order_id from public.hidden_orders h where h.user_id = auth.uid()
$$;

create or replace function public.clear_completed_orders() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.hidden_orders(user_id, order_id)
  select auth.uid(), o.id from public.orders o
  where auth.uid() in (o.checker_id, o.broker_id, o.vendor_id)
    and o.status in ('completed', 'rejected')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.my_hidden_orders() from public, anon;
revoke all on function public.clear_completed_orders() from public, anon;
grant execute on function public.my_hidden_orders() to authenticated;
grant execute on function public.clear_completed_orders() to authenticated;
commit;
