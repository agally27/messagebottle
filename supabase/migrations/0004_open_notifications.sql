-- Message in a Bottle — "opened" notification to the sender.
-- notify_on_open: the sender's choice (on by default).
-- open_notified_at: set once by a conditional update, so the email is sent only once.
-- Safe to run more than once.
alter table public.gifts add column if not exists notify_on_open boolean not null default true;
alter table public.gifts add column if not exists open_notified_at timestamptz;
