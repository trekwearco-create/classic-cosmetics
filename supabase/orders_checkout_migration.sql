-- Run this once in the Supabase SQL editor after schema.sql.
-- Adds the customer checkout fields and permits anonymous checkout inserts.
alter table public.orders
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists status text not null default 'Pending'
    check (status in ('Pending', 'Processing', 'Confirmed', 'Delivered', 'Cancelled'));

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod', 'easypaisa', 'jazzcash', 'card'));

-- Guest customers can create an order, but cannot read anyone's customer data.
drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders for insert with check (true);

-- Admin SELECT/UPDATE is enforced by the existing is_admin() policy in schema.sql.
