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
  share_enabled boolean not null default false,
  share_token uuid,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Existing projects: add column if table already exists without it
alter table public.saved_routes
  add column if not exists is_public boolean not null default false;

alter table public.saved_routes
  add column if not exists share_enabled boolean not null default false;

alter table public.saved_routes
  add column if not exists share_token uuid;

alter table public.saved_routes
  add column if not exists is_favorite boolean not null default false;

alter table public.saved_routes
  add column if not exists tags text[] not null default '{}';

create index if not exists saved_routes_user_id_created_at_idx
  on public.saved_routes (user_id, created_at desc);

create index if not exists saved_routes_user_id_favorite_idx
  on public.saved_routes (user_id, is_favorite, created_at desc);

-- Preserve existing share URLs once, then retire table-wide public SELECT.
update public.saved_routes
set share_enabled = true,
    share_token = coalesce(share_token, id),
    is_public = false
where is_public = true;

drop index if exists public.saved_routes_public_id_idx;

create unique index if not exists saved_routes_share_token_idx
  on public.saved_routes (share_token)
  where share_token is not null;

alter table public.saved_routes enable row level security;

drop policy if exists "Users can read own routes" on public.saved_routes;
create policy "Users can read own routes"
  on public.saved_routes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read public routes" on public.saved_routes;

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

-- Anonymous access is available only through an unlisted, revocable token.
create or replace function public.get_shared_route(p_share_token uuid)
returns table (
  name text,
  mode text,
  geojson jsonb,
  distance_km numeric,
  duration_seconds integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select route.name, route.mode, route.geojson,
         route.distance_km, route.duration_seconds
  from public.saved_routes as route
  where route.share_enabled = true
    and route.share_token = p_share_token
  limit 1;
$$;

revoke all on function public.get_shared_route(uuid) from public;
grant execute on function public.get_shared_route(uuid) to anon, authenticated;

create or replace function public.set_route_sharing(p_route_id uuid, p_enabled boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  token uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_enabled then
    update public.saved_routes
    set share_enabled = true,
        share_token = gen_random_uuid(),
        is_public = false
    where id = p_route_id and user_id = auth.uid()
    returning share_token into token;
  else
    update public.saved_routes
    set share_enabled = false,
        share_token = null,
        is_public = false
    where id = p_route_id and user_id = auth.uid()
    returning null::uuid into token;
  end if;

  if not found then
    raise exception 'Route not found or not owned by current user' using errcode = '42501';
  end if;
  return token;
end;
$$;

revoke all on function public.set_route_sharing(uuid, boolean) from public;
grant execute on function public.set_route_sharing(uuid, boolean) to authenticated;
-- Supabase default privileges grant EXECUTE directly to anon; remove it explicitly.
revoke execute on function public.set_route_sharing(uuid, boolean) from anon;

-- Sharing state may change only through set_route_sharing() (or service_role).
create or replace function public.guard_route_share_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Inside SECURITY DEFINER RPCs current_user is the function owner, so the
  -- official path (set_route_sharing) and service_role maintenance pass.
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.share_enabled or new.share_token is not null or new.is_public then
        raise exception 'Route sharing can only be changed with set_route_sharing()'
          using errcode = '42501';
      end if;
    elsif new.share_enabled is distinct from old.share_enabled
       or new.share_token is distinct from old.share_token
       or new.is_public is distinct from old.is_public then
      raise exception 'Route sharing can only be changed with set_route_sharing()'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists saved_routes_guard_share_columns on public.saved_routes;
create trigger saved_routes_guard_share_columns
  before insert or update on public.saved_routes
  for each row
  execute function public.guard_route_share_columns();

-- ---------------------------------------------------------------------------
-- Profiles + preferences
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  prefer_avoid_main_roads boolean not null default false,
  default_loop_distance_km integer not null default 30
    check (default_loop_distance_km between 5 and 200),
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
revoke execute on function public.delete_own_account() from anon;

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

-- Stable client-generated key makes offline retry safe after an ambiguous timeout.
alter table public.rides
  add column if not exists client_request_id uuid;

create unique index if not exists rides_user_client_request_id_idx
  on public.rides (user_id, client_request_id);

create index if not exists rides_user_id_completed_at_idx
  on public.rides (user_id, completed_at desc);

create index if not exists rides_user_id_created_at_idx
  on public.rides (user_id, created_at);

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

-- Dashboard totals are calculated in the database so recent-list pagination does
-- not undercount accounts with more than a handful of routes or rides.
create or replace function public.get_own_account_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'routes', (select count(*) from public.saved_routes where user_id = uid),
    'favoriteRoutes', (
      select count(*) from public.saved_routes where user_id = uid and is_favorite = true
    ),
    'rides', (select count(*) from public.rides where user_id = uid),
    'rideDistanceMeters', (
      select coalesce(sum(distance_meters), 0) from public.rides where user_id = uid
    ),
    'rideDurationSeconds', (
      select coalesce(sum(duration_seconds), 0) from public.rides where user_id = uid
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_own_account_stats() from public;
grant execute on function public.get_own_account_stats() to authenticated;
revoke execute on function public.get_own_account_stats() from anon;

-- Allow longer training loops (ORS waypoint-ellipse path for 101–200 km)
do $$
begin
  alter table public.profiles
    drop constraint if exists profiles_default_loop_distance_km_check;
exception
  when undefined_object then null;
end $$;

alter table public.profiles
  add constraint profiles_default_loop_distance_km_check
  check (default_loop_distance_km between 5 and 200);

-- ---------------------------------------------------------------------------
-- R07: data constraints (mirrors migrations/20261007_r07_data_constraints.sql).
-- Limits are looser than the UI (frontend/src/lib/dataLimits.js).
-- ---------------------------------------------------------------------------

-- A ride may only link to a route of the same account; anything else is unlinked.
create or replace function public.enforce_ride_route_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.route_id is not null and not exists (
    select 1
    from public.saved_routes as route
    where route.id = new.route_id
      and route.user_id = new.user_id
  ) then
    new.route_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists rides_enforce_route_owner on public.rides;
create trigger rides_enforce_route_owner
  before insert or update of route_id, user_id on public.rides
  for each row
  execute function public.enforce_ride_route_owner();

alter table public.saved_routes drop constraint if exists saved_routes_name_length_check;
alter table public.saved_routes add constraint saved_routes_name_length_check
  check (char_length(name) <= 200);

alter table public.saved_routes drop constraint if exists saved_routes_metrics_check;
alter table public.saved_routes add constraint saved_routes_metrics_check
  check ((distance_km is null or distance_km >= 0)
    and (duration_seconds is null or duration_seconds >= 0));

-- <= 8 tags, no NULL/empty tag, no control characters, each tag <= 40 chars
alter table public.saved_routes drop constraint if exists saved_routes_tags_check;
alter table public.saved_routes add constraint saved_routes_tags_check
  check (cardinality(tags) <= 8
    and array_position(tags, null) is null
    and array_position(tags, '') is null
    and array_to_string(tags, '') !~ '[[:cntrl:]]'
    and array_to_string(tags, E'\n') !~ '[^\n]{41}');

alter table public.saved_routes drop constraint if exists saved_routes_geojson_check;
alter table public.saved_routes add constraint saved_routes_geojson_check
  check (coalesce(jsonb_typeof(geojson) = 'object'
    and geojson ->> 'type' in ('FeatureCollection', 'Feature')
    and (geojson ->> 'type' <> 'FeatureCollection'
         or jsonb_typeof(geojson -> 'features') = 'array')
    and octet_length(geojson::text) <= 6291456, false));

alter table public.rides drop constraint if exists rides_route_name_length_check;
alter table public.rides add constraint rides_route_name_length_check
  check (char_length(route_name) <= 200);

alter table public.rides drop constraint if exists rides_metrics_check;
alter table public.rides add constraint rides_metrics_check
  check (distance_meters >= 0
    and duration_seconds >= 0
    and off_route_events >= 0
    and recalculations >= 0
    and (avg_speed_kmh is null or avg_speed_kmh >= 0)
    and (max_speed_kmh is null or max_speed_kmh >= 0)
    and (elevation_gain_m is null or elevation_gain_m >= 0));

alter table public.rides drop constraint if exists rides_track_geojson_check;
alter table public.rides add constraint rides_track_geojson_check
  check (track_geojson is null
    or coalesce(jsonb_typeof(track_geojson) = 'object'
        and track_geojson ->> 'type' in
          ('Feature', 'FeatureCollection', 'LineString', 'MultiLineString')
        and octet_length(track_geojson::text) <= 6291456, false));

alter table public.profiles drop constraint if exists profiles_text_length_check;
alter table public.profiles add constraint profiles_text_length_check
  check (char_length(display_name) <= 100
    and char_length(home_area) <= 200);

-- ---------------------------------------------------------------------------
-- B02: persistent provider quota (mirrors migrations/20261008_api_quota.sql).
-- Called only by the backend with service_role; kill switch in private.api_kill_switch.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.api_usage (
  bucket text not null,
  window_start timestamptz not null,
  used integer not null check (used >= 0),
  primary key (bucket, window_start)
);
alter table private.api_usage enable row level security;

create table if not exists private.api_kill_switch (
  kind text primary key check (kind in ('all', 'directions', 'geocode')),
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);
alter table private.api_kill_switch enable row level security;

create or replace function public.consume_api_quota(
  p_kind text,
  p_actor text,
  p_actor_day_limit integer,
  p_global_day_limit integer,
  p_cost integer default 1
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  retry_after integer := ceil(extract(epoch from (day_start + interval '1 day' - now())))::integer;
  b record;
  used_now integer;
begin
  if p_kind not in ('directions', 'geocode')
     or coalesce(char_length(p_actor), 0) not between 1 and 200
     or coalesce(p_cost, 0) not between 1 and 50
     or coalesce(p_actor_day_limit, 0) < 1
     or coalesce(p_global_day_limit, 0) < 1 then
    raise exception 'Invalid quota request' using errcode = '22023';
  end if;

  if exists (
    select 1 from private.api_kill_switch
    where enabled and kind in ('all', p_kind)
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'disabled', 'retry_after', 300);
  end if;

  -- Both buckets are charged or neither: a denial rolls back the subtransaction.
  begin
    for b in
      select *
      from (values
        ('global:' || p_kind, p_global_day_limit, 'global'),
        ('actor:' || p_actor || ':' || p_kind, p_actor_day_limit, 'actor')
      ) as v(name, day_limit, scope)
    loop
      insert into private.api_usage as usage (bucket, window_start, used)
      select b.name, day_start, p_cost
      where p_cost <= b.day_limit
      on conflict (bucket, window_start) do update
        set used = usage.used + p_cost
        where usage.used + p_cost <= b.day_limit
      returning usage.used into used_now;

      if not found then
        raise exception using errcode = 'P0001', message = 'quota:' || b.scope;
      end if;
    end loop;
  exception when sqlstate 'P0001' then
    return jsonb_build_object(
      'allowed', false,
      'reason', split_part(sqlerrm, ':', 2),
      'retry_after', retry_after
    );
  end;

  -- Occasional housekeeping keeps the table at a few days of windows.
  if random() < 0.01 then
    delete from private.api_usage where window_start < day_start - interval '7 days';
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.consume_api_quota(text, text, integer, integer, integer) from public;
revoke execute on function public.consume_api_quota(text, text, integer, integer, integer) from anon, authenticated;
grant execute on function public.consume_api_quota(text, text, integer, integer, integer) to service_role;

-- Ops: today's global provider usage for /api/health/quota (mirrors migrations/20261008_api_usage_status.sql).
create or replace function public.get_api_usage_today()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'usage', coalesce((
      select jsonb_object_agg(split_part(usage.bucket, ':', 2), usage.used)
      from private.api_usage as usage
      where usage.bucket like 'global:%'
        and usage.window_start = date_trunc('day', now() at time zone 'utc') at time zone 'utc'
    ), '{}'::jsonb),
    'disabled', coalesce((
      select jsonb_agg(switch.kind order by switch.kind)
      from private.api_kill_switch as switch
      where switch.enabled
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_api_usage_today() from public;
revoke execute on function public.get_api_usage_today() from anon, authenticated;
grant execute on function public.get_api_usage_today() to service_role;
