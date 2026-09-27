-- Run after schema.sql and orders_checkout_migration.sql in Supabase SQL Editor.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public view product images" on storage.objects;
create policy "public view product images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and is_admin());
drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects for update using (bucket_id = 'product-images' and is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and is_admin());

-- Required once: enables browser Realtime INSERT/UPDATE events for admin order list.
alter publication supabase_realtime add table public.orders;
