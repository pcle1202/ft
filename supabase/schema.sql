-- friendkeeper schema
-- Run this in your Supabase SQL editor (or via `npx supabase db push`)
--
-- Note on auth: this app uses Clerk, not Supabase Auth.
-- RLS policies use (auth.jwt() ->> 'sub') to read the Clerk user ID from the JWT.
-- Before RLS will work you must:
--   1. In Clerk dashboard → JWT Templates → create a "Supabase" template
--   2. In Supabase dashboard → Auth → JWT Settings → set the JWT secret to
--      Clerk's JWKS endpoint  (or paste Clerk's PEM public key)
-- Until Step 3 (Clerk setup), you can temporarily disable RLS for local testing:
--   ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;

-- ─── friends ────────────────────────────────────────────────────────────────

create table if not exists friends (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null,
  name                  text not null,
  notes                 text,
  category              text not null default 'other',
  last_texted           timestamptz,
  last_hung_out         timestamptz,
  text_frequency_days   integer not null default 14,
  hangout_frequency_days integer not null default 30,
  created_at            timestamptz not null default now()
);

alter table friends enable row level security;

create policy "friends: users see only their own rows"
  on friends for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create index if not exists friends_user_id_idx on friends (user_id);

-- ─── interactions ────────────────────────────────────────────────────────────

create table if not exists interactions (
  id         uuid primary key default gen_random_uuid(),
  friend_id  uuid not null references friends (id) on delete cascade,
  user_id    text not null,
  type       text not null check (type in ('text', 'hangout')),
  date       timestamptz not null,
  notes      text,
  location   text,
  created_at timestamptz not null default now()
);

alter table interactions enable row level security;

create policy "interactions: users see only their own rows"
  on interactions for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create index if not exists interactions_friend_id_idx on interactions (friend_id);
create index if not exists interactions_user_id_idx   on interactions (user_id);
