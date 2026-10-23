-- Message in a Bottle — replies: a short private note from the recipient back to the sender.
-- Written by the server only (the recipient has no account); the sender may read their own.
-- Removed with the gift. Safe to run more than once.
create table if not exists public.gift_replies (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists replies_gift_idx on public.gift_replies (gift_id, created_at desc);
create index if not exists replies_owner_unread_idx on public.gift_replies (owner_id) where read_at is null;
alter table public.gift_replies enable row level security;
drop policy if exists "replies: owner read" on public.gift_replies;
create policy "replies: owner read" on public.gift_replies for select using (auth.uid() = owner_id);
