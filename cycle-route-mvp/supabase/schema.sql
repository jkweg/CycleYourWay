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
  created_at timestamptz not null default now()
);

-- Existing projects: add column if table already exists without it
alter table public.saved_routes
  add column if not exists is_public boolean not null default false;

create index if not exists saved_routes_user_id_created_at_idx
  on public.saved_routes (user_id, created_at desc);

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
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists prefer_avoid_main_roads boolean not null default false;

alter table public.profiles
  add column if not exists default_loop_distance_km integer not null default 30;

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
