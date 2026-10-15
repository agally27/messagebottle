# Supabase

Setup steps are in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#1-supabase-about-10-minutes). In short: create a project, run `migrations/0001_init.sql` in the SQL editor, configure auth URLs, and put the URL and keys in Vercel.

The server uses the secret key for background jobs, webhooks and recipient-token lookups; browser code never receives it. RLS keeps senders to reading their own rows; every write goes through the server.

`test-stubs.sql` stands in for the parts of a Supabase project that plain Postgres lacks, so `pnpm test:supabase` can verify the migration and the store locally.
