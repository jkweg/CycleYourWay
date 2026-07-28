-- Cycle Your Way — schema for Supabase (PostgreSQL)
-- Run in: Supabase Dashboard → SQL Editor → New query

create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  mode text not null check (mode in ('AtoB', 'Loop')),
  geojson jsonb not null,
  distance_km numeric(10, 2),
  duration_seconds integer,
  is_public boolean not null default false,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Existing projects: add column if table already exists without it
alter table public.saved_routes
  add column if not exists is_public boolean not null default false;

alter table public.saved_routes
  add column if not exists is_favorite boolean not null default false;

alter table public.saved_routes
  add column if not exists tags text[] not null default '{}';

create index if not exists saved_routes_user_id_created_at_idx
  on public.saved_routes (user_id, created_at desc);

create index if not exists saved_routes_user_id_favorite_idx
  on public.saved_routes (user_id, is_favorite, created_at desc);

create index if not exists saved_routes_public_id_idx
  on public.saved_routes (id)
  where is_public = true;

alter table public.saved_routes enable row level security;

drop policy if exists "Users can read own routes" on public.saved_routes;
create policy "Users can read own routes"
  on public.saved_routes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read public routes" on public.saved_routes;
create policy "Anyone can read public routes"
  on public.saved_routes
  for select
  using (is_public = true);

drop policy if exists "Users can insert own routes" on public.saved_routes;
create policy "Users can insert own routes"
  on public.saved_routes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own routes" on public.saved_routes;
create policy "Users can delete own routes"
  on public.saved_routes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own routes" on public.saved_routes;
create policy "Users can update own routes"
  on public.saved_routes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Profiles + preferences
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  prefer_avoid_main_roads boolean not null default false,
  default_loop_distance_km integer not null default 30
    check (default_loop_distance_km between 5 and 100),
  ride_style text not null default 'gravel'
    check (ride_style in ('road', 'gravel', 'mtb', 'city', 'trekking')),
  fitness_level text not null default 'regular'
    check (fitness_level in ('beginner', 'regular', 'advanced')),
  preferred_distance_km integer not null default 30
    check (preferred_distance_km between 5 and 250),
  max_distance_km integer not null default 80
    check (max_distance_km between 5 and 300),
  preferred_duration_min integer not null default 120
    check (preferred_duration_min between 15 and 1440),
  surface_preference text not null default 'mixed'
    check (surface_preference in ('asphalt', 'mixed', 'gravel', 'offroad')),
  climb_preference text not null default 'normal'
    check (climb_preference in ('easy', 'normal', 'hard')),
  prefer_asphalt boolean not null default false,
  avoid_unpaved boolean not null default false,
  avoid_dark_routes boolean not null default false,
  home_area text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists prefer_avoid_main_roads boolean not null default false;

alter table public.profiles
  add column if not exists default_loop_distance_km integer not null default 30;

alter table public.profiles
  add column if not exists ride_style text not null default 'gravel';

alter table public.profiles
  add column if not exists fitness_level text not null default 'regular';

alter table public.profiles
  add column if not exists preferred_distance_km integer not null default 30;

alter table public.profiles
  add column if not exists max_distance_km integer not null default 80;

alter table public.profiles
  add column if not exists preferred_duration_min integer not null default 120;

alter table public.profiles
  add column if not exists surface_preference text not null default 'mixed';

alter table public.profiles
  add column if not exists climb_preference text not null default 'normal';

alter table public.profiles
  add column if not exists prefer_asphalt boolean not null default false;

alter table public.profiles
  add column if not exists avoid_unpaved boolean not null default false;

alter table public.profiles
  add column if not exists avoid_dark_routes boolean not null default false;

alter table public.profiles
  add column if not exists home_area text;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Deletes the signed-in user and cascaded app data (routes, profile).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Ride history
-- ---------------------------------------------------------------------------

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  route_id uuid references public.saved_routes (id) on delete set null,
  route_name text,
  mode text check (mode in ('AtoB', 'Loop')),
  status text not null default 'completed'
    check (status in ('completed', 'cancelled', 'imported')),
  distance_meters numeric(12, 2) not null default 0,
  duration_seconds integer not null default 0,
  avg_speed_kmh numeric(6, 2),
  max_speed_kmh numeric(6, 2),
  elevation_gain_m numeric(10, 2),
  off_route_events integer not null default 0,
  recalculations integer not null default 0,
  track_geojson jsonb,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists rides_user_id_completed_at_idx
  on public.rides (user_id, completed_at desc);

create index if not exists rides_route_id_idx
  on public.rides (route_id);

alter table public.rides enable row level security;

drop policy if exists "Users can read own rides" on public.rides;
create policy "Users can read own rides"
  on public.rides
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own rides" on public.rides;
create policy "Users can insert own rides"
  on public.rides
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own rides" on public.rides;
create policy "Users can update own rides"
  on public.rides
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own rides" on public.rides;
create policy "Users can delete own rides"
  on public.rides
  for delete
  using (auth.uid() = user_id);
