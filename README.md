# Classic Cosmetics

Premium, responsive storefront implemented from the supplied PRD, UI/UX, technical, flow, and Supabase schema documents.

## Local run

```bash
npm install
npm run dev
```

## Production handoff

1. Create a Supabase project and run `supabase/schema.sql`, `supabase/brands_migration.sql`, and `supabase/storage_and_realtime.sql` in the SQL Editor.
2. The storage script creates the public `product-images` bucket with admin-only write policies. Create the single admin user in Supabase Auth and grant that user access through `admin_users`.
3. Copy `.env.example` to `.env.local` and add the public Supabase project URL and anon key. Keep all service-role and payment gateway keys solely in Vercel environment variables.
4. Import the repository into Vercel. The included `vercel.json` uses Vite's `dist` build output.
5. Before enabling EasyPaisa or JazzCash, add approved merchant credentials and verify gateway webhook signatures. COD can be enabled immediately.

## Notes

The storefront starts with polished demo content when Supabase is not configured. Admin-added products and uploaded images are stored in Supabase when configured; otherwise, local development stores admin data in the browser.
