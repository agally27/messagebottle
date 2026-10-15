# Supabase

1. Create a project. Copy the project URL and the **publishable** key into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the **secret** key into `SUPABASE_SECRET_KEY` (server-only).
2. Apply `migrations/0001_init.sql` (SQL editor or `supabase db push`).
3. Enable **Email** under Authentication → Providers (magic links). Set the Site URL to your app URL and add `https://<app>/auth/callback` to the redirect allow-list.
4. Add admin email addresses to `ADMIN_EMAILS`.

The app's server uses the secret key for background jobs, webhooks and recipient-token lookups; browser-side code never receives it. RLS keeps senders to their own rows.
