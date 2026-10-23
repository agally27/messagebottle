-- Message in a Bottle — scheduled delivery of the gift link by email.
-- Rows are created, claimed and updated by the server (service role) only;
-- owners may read their own. Removed with the gift. Safe to run more than once.
create table if not exists public.scheduled_deliveries (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  to_email text not null check (char_length(to_email) <= 254),
  note text not null default '' check (char_length(note) <= 300),
  send_on date not null,
  send_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  email_id uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deliveries_due_idx on public.scheduled_deliveries (status, send_at);
create index if not exists deliveries_gift_idx on public.scheduled_deliveries (gift_id, created_at desc);
alter table public.scheduled_deliveries enable row level security;
drop policy if exists "deliveries: owner read" on public.scheduled_deliveries;
create policy "deliveries: owner read" on public.scheduled_deliveries for select using (auth.uid() = owner_id);

drop trigger if exists touch_scheduled_deliveries on public.scheduled_deliveries;
create trigger touch_scheduled_deliveries before update on public.scheduled_deliveries for each row execute procedure public.touch_updated_at();
