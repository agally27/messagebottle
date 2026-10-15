-- Message in a Bottle — initial schema.
-- Apply with: supabase db push   (or paste into the SQL editor)
-- Every table has RLS enabled. Senders see only their own rows. Recipients never
-- touch the database directly: the server resolves public tokens with the
-- service role and returns a projection.

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  is_admin boolean not null default false,
  kind text not null default 'supabase' check (kind in ('supabase', 'demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: owner read" on public.profiles for select using (auth.uid() = id);
create policy "profiles: owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

-- Create a profile row automatically for new auth users.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email)) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- ── gifts ───────────────────────────────────────────────────────────────────
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'active', 'revoked', 'failed')),
  input jsonb not null,
  story jsonb,
  audio jsonb not null default '[]'::jsonb,
  public_token text not null unique,
  product_id text,
  open_count integer not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gifts_owner_updated_idx on public.gifts (owner_id, updated_at desc);
create index if not exists gifts_status_idx on public.gifts (status);
alter table public.gifts enable row level security;
-- Senders may READ their gifts directly; every write (status, story, token…) goes
-- through the server with the service role so payment and validation cannot be bypassed.
create policy "gifts: owner read" on public.gifts for select using (auth.uid() = owner_id);

-- ── generation_jobs ─────────────────────────────────────────────────────────
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  step text not null default 'brief',
  completed_steps jsonb not null default '[]'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  lease_until timestamptz,
  next_run_at timestamptz,
  last_error jsonb,
  usage jsonb not null default '[]'::jsonb,
  progress_message text not null default '',
  mode text not null default 'demo' check (mode in ('live', 'demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists jobs_gift_created_idx on public.generation_jobs (gift_id, created_at desc);
create index if not exists jobs_due_idx on public.generation_jobs (status, next_run_at, lease_until);
create index if not exists jobs_owner_created_idx on public.generation_jobs (owner_id, created_at desc);
alter table public.generation_jobs enable row level security;
create policy "jobs: owner read" on public.generation_jobs for select using (auth.uid() = owner_id);
-- Jobs are created and advanced by the server (service role) only.

-- Atomic claim used by the worker: succeeds only when the job is runnable and unleased.
create or replace function public.claim_generation_job(p_job_id uuid, p_lease_until timestamptz, p_now timestamptz)
returns setof public.generation_jobs language sql security definer set search_path = public as $$
  update public.generation_jobs
     set lease_until = p_lease_until,
         status = 'running',
         started_at = coalesce(started_at, p_now),
         updated_at = p_now
   where id = p_job_id
     and status in ('queued', 'running')
     and (lease_until is null or lease_until <= p_now)
     and (next_run_at is null or next_run_at <= p_now)
  returning *;
$$;
-- Server-only: Supabase grants EXECUTE to anon/authenticated by default; remove it.
revoke execute on function public.claim_generation_job(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_generation_job(uuid, timestamptz, timestamptz) to service_role;

-- ── orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Paid orders block gift deletion at the application layer; cascade only ever
  -- removes pending/cancelled orders.
  gift_id uuid not null references public.gifts (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilling', 'dispatched', 'delivered', 'cancelled', 'refunded')),
  items jsonb not null,
  currency text not null default 'GBP',
  subtotal_minor integer not null,
  shipping_minor integer not null default 0,
  total_minor integer not null,
  payment_provider text check (payment_provider in ('stripe', 'demo')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  shipping_address jsonb,
  fulfilment jsonb not null default '{"status":"not_required","notes":"","carrier":"","trackingNumber":"","dispatchedAt":null,"deliveredAt":null}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_owner_created_idx on public.orders (owner_id, created_at desc);
create index if not exists orders_gift_idx on public.orders (gift_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_intent_idx on public.orders (stripe_payment_intent_id);
alter table public.orders enable row level security;
create policy "orders: owner read" on public.orders for select using (auth.uid() = owner_id);
-- Orders are created/updated by the server (checkout + webhooks) only.

-- ── payment_events (webhook idempotency) ────────────────────────────────────
create table if not exists public.payment_events (
  id text primary key,                 -- provider event id
  provider text not null,
  type text not null,
  order_id uuid references public.orders (id) on delete set null,
  amount_minor integer,
  currency text,
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;  -- service role only

-- ── audit_events ────────────────────────────────────────────────────────────
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  subject_type text not null,
  subject_id text,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists audit_at_idx on public.audit_events (at desc);
alter table public.audit_events enable row level security;  -- service role only

-- ── email_deliveries ────────────────────────────────────────────────────────
create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references public.gifts (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  "to" text not null,
  template text not null,
  provider text not null,
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.email_deliveries enable row level security;  -- service role only

-- ── rate_limits ─────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;  -- service role only

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_ms integer, p_now timestamptz)
returns table (allowed boolean, remaining integer, reset_at timestamptz) language plpgsql security definer set search_path = public as $$
declare r public.rate_limits%rowtype;
begin
  select * into r from public.rate_limits where key = p_key for update;
  if not found or r.reset_at <= p_now then
    insert into public.rate_limits (key, count, reset_at) values (p_key, 1, p_now + (p_window_ms || ' milliseconds')::interval)
      on conflict (key) do update set count = 1, reset_at = excluded.reset_at;
    return query select true, p_limit - 1, p_now + (p_window_ms || ' milliseconds')::interval;
    return;
  end if;
  if r.count >= p_limit then
    return query select false, 0, r.reset_at; return;
  end if;
  update public.rate_limits set count = count + 1 where key = p_key;
  return query select true, p_limit - r.count - 1, r.reset_at;
end $$;
revoke execute on function public.rate_limit_hit(text, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer, timestamptz) to service_role;

-- Atomic open counter (called by the server when the recipient taps "Open").
create or replace function public.record_gift_open(p_gift_id uuid, p_at timestamptz)
returns void language sql security definer set search_path = public as $$
  update public.gifts
     set open_count = open_count + 1,
         first_opened_at = coalesce(first_opened_at, p_at),
         last_opened_at = p_at
   where id = p_gift_id;
$$;
revoke execute on function public.record_gift_open(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.record_gift_open(uuid, timestamptz) to service_role;

-- ── storage ─────────────────────────────────────────────────────────────────
-- Private bucket for generated media; the server issues signed URLs.
insert into storage.buckets (id, name, public) values ('gift-assets', 'gift-assets', false) on conflict (id) do nothing;

-- ── updated_at maintenance ──────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['profiles', 'gifts', 'generation_jobs', 'orders'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute procedure public.touch_updated_at()', t);
  end loop;
end $$;
