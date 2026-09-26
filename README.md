# Classic Cosmetics

Premium, responsive storefront implemented from the supplied PRD, UI/UX, technical, flow, and Supabase schema documents.

## Local run

```bash
npm install
npm run dev
```

## Production handoff

1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor.
2. Create a `product-images` Storage bucket, set its public read and admin-only write policies, and create the single admin user in Supabase Auth.
3. Copy `.env.example` to `.env.local` and add the public Supabase project URL and anon key. Keep all service-role and payment gateway keys solely in Vercel environment variables.
4. Import the repository into Vercel. The included `vercel.json` uses Vite's `dist` build output.
5. Before enabling EasyPaisa or JazzCash, add approved merchant credentials and verify gateway webhook signatures. COD can be enabled immediately.

## Notes

The product catalogue is currently polished demo content. The cart persists locally until the Supabase checkout RPC and real catalogue are connected.
