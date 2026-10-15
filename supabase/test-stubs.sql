-- Minimal stand-ins for what a Supabase project provides (auth/storage schemas, roles, default grants).
-- Used only by scripts/test-supabase-local.sh to run the migration and store tests on plain Postgres.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
-- Supabase's default: anon/authenticated can execute new functions in public
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.test'), ('22222222-2222-2222-2222-222222222222', 'b@example.test');
