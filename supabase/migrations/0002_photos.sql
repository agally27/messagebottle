-- Message in a Bottle — photos ("Memory in a Bottle").
-- Photo metadata lives on the gift; the files live in the private `gift-assets`
-- bucket under gifts/<gift id>/photos/<photo id>.jpg and are served only through
-- the app's token- or owner-checked routes. Safe to run more than once.
alter table public.gifts add column if not exists photos jsonb not null default '[]'::jsonb;
