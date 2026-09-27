-- Run this in the Supabase SQL editor to create the sections table.
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  section_type text not null default 'products_by_category', -- 'products_by_category', 'products_by_brand', 'featured_collection'
  category text,
  brand text,
  max_items integer not null default 6,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sections enable row level security;

create policy "public read sections" on public.sections for select using (true);
create policy "admin manage sections" on public.sections for all using (public.is_admin()) with check (public.is_admin());

-- Enable Realtime for sections table
alter publication supabase_realtime add table public.sections;
