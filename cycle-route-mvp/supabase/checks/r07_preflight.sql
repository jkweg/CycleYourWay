-- R07 preflight: READ-ONLY. Lists existing rows that would break the constraints of
-- migrations/20261007_r07_data_constraints.sql. Run in Supabase SQL Editor (staging
-- first, then production) BEFORE that migration.
--
-- Every row of the first query should show violations = 0. Non-zero rows are not a
-- blocker for the migration itself (the constraint then stays NOT VALID and is still
-- enforced for new writes), but they must be fixed before it can be validated.
-- sample_ids lists up to 20 offending ids per rule (no route/track contents are selected).

with checks (rule, tbl, id, bad) as (
  select 'saved_routes_name_length_check', 'saved_routes', id,
         char_length(name) > 200
  from public.saved_routes
  union all
  select 'saved_routes_metrics_check', 'saved_routes', id,
         coalesce(distance_km < 0, false) or coalesce(duration_seconds < 0, false)
  from public.saved_routes
  union all
  select 'saved_routes_tags_check', 'saved_routes', id,
         not coalesce(cardinality(tags) <= 8
           and array_position(tags, null) is null
           and array_position(tags, '') is null
           and array_to_string(tags, '') !~ '[[:cntrl:]]'
           and array_to_string(tags, E'\n') !~ '[^\n]{41}', false)
  from public.saved_routes
  union all
  select 'saved_routes_geojson_check', 'saved_routes', id,
         not coalesce(jsonb_typeof(geojson) = 'object'
           and geojson ->> 'type' in ('FeatureCollection', 'Feature')
           and (geojson ->> 'type' <> 'FeatureCollection'
                or jsonb_typeof(geojson -> 'features') = 'array')
           and octet_length(geojson::text) <= 6291456, false)
  from public.saved_routes
  union all
  select 'rides_route_name_length_check', 'rides', id,
         coalesce(char_length(route_name) > 200, false)
  from public.rides
  union all
  select 'rides_metrics_check', 'rides', id,
         not coalesce(distance_meters >= 0
           and duration_seconds >= 0
           and off_route_events >= 0
           and recalculations >= 0
           and (avg_speed_kmh is null or avg_speed_kmh >= 0)
           and (max_speed_kmh is null or max_speed_kmh >= 0)
           and (elevation_gain_m is null or elevation_gain_m >= 0), false)
  from public.rides
  union all
  select 'rides_track_geojson_check', 'rides', id,
         track_geojson is not null
           and not coalesce(jsonb_typeof(track_geojson) = 'object'
             and track_geojson ->> 'type' in
               ('Feature', 'FeatureCollection', 'LineString', 'MultiLineString')
             and octet_length(track_geojson::text) <= 6291456, false)
  from public.rides
  union all
  select 'profiles_text_length_check', 'profiles', id,
         coalesce(char_length(display_name) > 100, false)
           or coalesce(char_length(home_area) > 200, false)
  from public.profiles
  union all
  -- Not a constraint: the new trigger unlinks these only when the row is next written.
  select 'rides_route_id_foreign_owner', 'rides', ride.id,
         ride.route_id is not null and not exists (
           select 1 from public.saved_routes as route
           where route.id = ride.route_id and route.user_id = ride.user_id)
  from public.rides as ride
)
select rule, tbl,
       count(*) filter (where bad) as violations,
       count(*) as rows_checked,
       (array_agg(id order by id) filter (where bad))[1:20] as sample_ids
from checks
group by rule, tbl
order by rule;

-- Optional, after review (WRITES; staging first): unlink cross-account ride links.
-- update public.rides as ride set route_id = null
-- where ride.route_id is not null and not exists (
--   select 1 from public.saved_routes as route
--   where route.id = ride.route_id and route.user_id = ride.user_id);

-- Size overview, useful to sanity-check the 6 MiB GeoJSON limit against real data.
select 'saved_routes.geojson' as col,
       max(octet_length(geojson::text)) as max_bytes,
       percentile_disc(0.99) within group (order by octet_length(geojson::text)) as p99_bytes
from public.saved_routes
union all
select 'rides.track_geojson',
       max(octet_length(track_geojson::text)),
       percentile_disc(0.99) within group (order by octet_length(track_geojson::text))
from public.rides
where track_geojson is not null;
