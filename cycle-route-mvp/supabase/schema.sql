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
