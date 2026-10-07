-- R07: database-side validation for client-written rows, 2026-10-07.
-- Apply after 20261007_harden_sharing_and_rpc_grants.sql.
-- Run supabase/checks/r07_preflight.sql first: it lists legacy rows that break these rules.
--
-- Additive and idempotent. Constraints are added NOT VALID (enforced for every new
-- INSERT/UPDATE immediately) and then validated against existing rows. If legacy
-- rows violate a rule, validation is skipped with a WARNING instead of aborting the
-- migration; fix those rows and re-run this file to validate.
--
-- Limits are deliberately looser than the UI (frontend/src/lib/dataLimits.js), so a
-- valid app write never hits them; they only stop direct PostgREST abuse.
begin;

-- 1. A ride may only link to a route owned by the same account. A foreign or
--    unknown route_id is silently unlinked (route_name is kept): rejecting it would
--    leave an offline ride draft stuck in retry forever (e.g. route deleted while
--    riding), and an identical outcome for "foreign" and "missing" removes the
--    UUID existence oracle the plain FK provided.
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

-- 2. Shape, size and range checks.
do $$
declare
  c record;
begin
  for c in
    select *
    from (values
      ('public.saved_routes', 'saved_routes_name_length_check',
       $c$check (char_length(name) <= 200)$c$),
      ('public.saved_routes', 'saved_routes_metrics_check',
       $c$check ((distance_km is null or distance_km >= 0)
         and (duration_seconds is null or duration_seconds >= 0))$c$),
      ('public.saved_routes', 'saved_routes_tags_check',
       -- <= 8 tags, no NULL/empty tag, no control characters, each tag <= 40 chars
       $c$check (cardinality(tags) <= 8
         and array_position(tags, null) is null
         and array_position(tags, '') is null
         and array_to_string(tags, '') !~ '[[:cntrl:]]'
         and array_to_string(tags, E'\n') !~ '[^\n]{41}')$c$),
      ('public.saved_routes', 'saved_routes_geojson_check',
       $c$check (coalesce(jsonb_typeof(geojson) = 'object'
         and geojson ->> 'type' in ('FeatureCollection', 'Feature')
         and (geojson ->> 'type' <> 'FeatureCollection'
              or jsonb_typeof(geojson -> 'features') = 'array')
         and octet_length(geojson::text) <= 6291456, false))$c$),
      ('public.rides', 'rides_route_name_length_check',
       $c$check (char_length(route_name) <= 200)$c$),
      ('public.rides', 'rides_metrics_check',
       $c$check (distance_meters >= 0
         and duration_seconds >= 0
         and off_route_events >= 0
         and recalculations >= 0
         and (avg_speed_kmh is null or avg_speed_kmh >= 0)
         and (max_speed_kmh is null or max_speed_kmh >= 0)
         and (elevation_gain_m is null or elevation_gain_m >= 0))$c$),
      ('public.rides', 'rides_track_geojson_check',
       $c$check (track_geojson is null
         or coalesce(jsonb_typeof(track_geojson) = 'object'
             and track_geojson ->> 'type' in
               ('Feature', 'FeatureCollection', 'LineString', 'MultiLineString')
             and octet_length(track_geojson::text) <= 6291456, false))$c$),
      ('public.profiles', 'profiles_text_length_check',
       $c$check (char_length(display_name) <= 100
         and char_length(home_area) <= 200)$c$)
    ) as v(tbl, name, def)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = c.name and conrelid = c.tbl::regclass
    ) then
      execute format('alter table %s add constraint %I %s not valid', c.tbl, c.name, c.def);
    end if;

    begin
      execute format('alter table %s validate constraint %I', c.tbl, c.name);
    exception when check_violation then
      raise warning 'R07: % on % left NOT VALID (legacy rows violate it; see supabase/checks/r07_preflight.sql)',
        c.name, c.tbl;
    end;
  end loop;
end;
$$;

commit;
