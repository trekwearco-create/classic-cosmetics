-- Run after schema.sql in the Supabase SQL editor.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.brands add column if not exists logo_url text;
alter table public.brands enable row level security;

create policy "public read brands" on public.brands for select using (true);
create policy "admin manage brands" on public.brands for all using (public.is_admin()) with check (public.is_admin());

-- Storefront query / management data load needs this relationship exposed.
alter table public.products drop constraint if exists products_brand_category_consistency;

-- Run this only once. It is safe to ignore duplicate-publication errors if already enabled.
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.products;
