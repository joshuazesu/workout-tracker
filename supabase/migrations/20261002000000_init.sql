-- Cloud copy of the workout store (src/lib/workouts.ts), synced by src/lib/sync.ts.
--
-- The phone keeps the full state locally and syncs in the background, so every table has:
--   updated_at  set by the server on every write; the app pulls rows changed since its last pull.
--   deleted_at  a tombstone, so a delete on one phone reaches the others (except profiles).
-- Row Level Security limits every row to the signed-in user.

-- Settings, profile and challenge: one row per user.
create table public.profiles (
  user_id       uuid primary key default auth.uid() references auth.users on delete cascade,
  name          text not null default '',
  height_cm     numeric,
  weight_kg     numeric,
  onboarded     boolean not null default false,
  appearance    text not null default 'system' check (appearance in ('system', 'light', 'dark')),
  units         text not null default 'metric' check (units in ('metric', 'imperial')),
  weight_colors jsonb not null default '{"gain": "red", "loss": "green"}',
  rest_seconds  integer not null default 90,
  challenge     jsonb,
  trophies      jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);

-- Finished workouts. Exercises and sets are stored as JSON because a workout is saved whole
-- and never edited set by set after it's finished.
create table public.workouts (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  name       text,
  started_at timestamptz not null,
  ended_at   timestamptz,
  exercises  jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- Workout templates, in the user's order.
create table public.routines (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  name       text not null,
  exercises  text[] not null default '{}',
  sets       jsonb,
  position   integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- Body-weight log: one reading per local day.
create table public.weights (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  day        date not null,
  kg         numeric not null check (kg > 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, day)
);

-- Pulls ask for "rows changed since", per user.
create index workouts_user_updated on public.workouts (user_id, updated_at);
create index routines_user_updated on public.routines (user_id, updated_at);
create index weights_user_updated on public.weights (user_id, updated_at);

-- The server clock decides updated_at, so phones with wrong clocks can't skip a pull.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch before insert or update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.workouts for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.routines for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.weights  for each row execute function public.touch_updated_at();

-- Each user sees and writes only their own rows. Deletes are tombstones (an update), and
-- deleting the account cascades, so no delete policy is needed.
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.routines enable row level security;
alter table public.weights  enable row level security;

create policy "own rows" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.workouts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.routines for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.weights  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- New Supabase projects don't expose tables to the API until they're granted.
grant select, insert, update on public.profiles, public.workouts, public.routines, public.weights to authenticated;
