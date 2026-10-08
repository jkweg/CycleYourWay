-- RLS / RPC suite for anon, account A and account B.
-- Runs against a throwaway local DB after: shim -> baseline 7da22a3 -> seed -> migrations.
-- Roles are switched the same way PostgREST does it: SET ROLE + request.jwt.claims.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ===========================================================================
-- 0. Migration effects on legacy data (superuser view)
-- ===========================================================================
reset role;
select t.ok(
  (select share_enabled and share_token = id and not is_public
     from public.saved_routes where id = '10000000-0000-4000-8000-0000000000a1'),
  'migration: legacy public route keeps link (share_token = id, is_public cleared)');
select t.ok(
  (select not share_enabled and share_token is null
     from public.saved_routes where id = '10000000-0000-4000-8000-0000000000a2'),
  'migration: private route stays unshared');
select t.ok(
  not exists (select 1 from pg_policies where tablename = 'saved_routes'
                and policyname = 'Anyone can read public routes'),
  'migration: anonymous table-wide SELECT policy removed');
select t.ok(
  (select count(*) = 1 from public.rides where client_request_id is null),
  'migration: legacy ride without client_request_id preserved');

-- ===========================================================================
-- 1. Anonymous visitor
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon;

select t.is(t.row_count('select * from public.saved_routes'), 0::bigint,
  'anon: cannot list saved_routes (incl. legacy public route)');
select t.is(t.row_count('select * from public.rides'), 0::bigint, 'anon: cannot list rides');
select t.is(t.row_count('select * from public.profiles'), 0::bigint, 'anon: cannot list profiles');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', 'x', 'AtoB', '{}')$$,
  'anon: cannot insert route impersonating A', '42501');
select t.is(t.row_count($$update public.saved_routes set name = 'pwned' returning 1$$), 0::bigint,
  'anon: UPDATE affects no rows');
select t.is(t.row_count($$delete from public.saved_routes returning 1$$), 0::bigint,
  'anon: DELETE affects no rows');

select t.is(t.row_count($$select * from public.get_shared_route('10000000-0000-4000-8000-0000000000a1')$$),
  1::bigint, 'anon: legacy share link (?share=<route id>) still resolves via RPC');
select t.is(
  (select string_agg(k, ',' order by k) from jsonb_object_keys(to_jsonb(r)) as k),
  'distance_km,duration_seconds,geojson,mode,name',
  'anon: RPC exposes only name/mode/geojson/distance/duration (no owner, id, tags, token)')
from public.get_shared_route('10000000-0000-4000-8000-0000000000a1') r;
select t.is(t.row_count($$select * from public.get_shared_route(gen_random_uuid())$$), 0::bigint,
  'anon: random token resolves nothing');
select t.is(t.row_count($$select * from public.get_shared_route('10000000-0000-4000-8000-0000000000a2')$$),
  0::bigint, 'anon: private route id is not a share token');
select t.is(t.row_count($$select * from public.get_shared_route(null)$$), 0::bigint,
  'anon: null token resolves nothing');

select t.throws($$select public.set_route_sharing('10000000-0000-4000-8000-0000000000a2', true)$$,
  'anon: set_route_sharing rejected');
select t.throws($$select public.get_own_account_stats()$$, 'anon: get_own_account_stats rejected');
select t.throws($$select public.delete_own_account()$$, 'anon: delete_own_account rejected');

-- Defence in depth: on Supabase, default privileges grant EXECUTE on public
-- functions directly to anon, so `revoke ... from public` alone does not remove it
-- (fixed by 20261007_harden_sharing_and_rpc_grants.sql).
select t.ok(not has_function_privilege('anon', 'public.set_route_sharing(uuid,boolean)', 'execute'),
  'anon: holds no EXECUTE on set_route_sharing');
select t.ok(not has_function_privilege('anon', 'public.get_own_account_stats()', 'execute'),
  'anon: holds no EXECUTE on get_own_account_stats');
select t.ok(not has_function_privilege('anon', 'public.delete_own_account()', 'execute'),
  'anon: holds no EXECUTE on delete_own_account');
select t.ok(has_function_privilege('anon', 'public.get_shared_route(uuid)', 'execute'),
  'anon: keeps EXECUTE on get_shared_route');

-- ===========================================================================
-- 2. Account A
-- ===========================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', false);
set role authenticated;

select t.is(t.row_count('select * from public.saved_routes'), 2::bigint, 'A: sees exactly own 2 routes');
select t.is(t.row_count($$select * from public.saved_routes where id = '10000000-0000-4000-8000-0000000000b1'$$),
  0::bigint, 'A: cannot read B route by guessed UUID');
select t.is(t.row_count('select * from public.rides'), 0::bigint, 'A: cannot see B rides');
select t.is(t.row_count('select * from public.profiles'), 1::bigint, 'A: sees only own profile');

select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000b', 'spoof', 'AtoB', '{}')$$,
  'A: cannot insert route owned by B', '42501');
select t.is(t.row_count($$update public.saved_routes set name = 'pwned'
  where id = '10000000-0000-4000-8000-0000000000b1' returning 1$$), 0::bigint,
  'A: UPDATE of B route affects no rows');
select t.throws($$update public.saved_routes set user_id = '00000000-0000-4000-8000-00000000000b'
  where id = '10000000-0000-4000-8000-0000000000a2'$$,
  'A: cannot move own route to B (WITH CHECK)', '42501');
select t.is(t.row_count($$delete from public.saved_routes
  where id = '10000000-0000-4000-8000-0000000000b1' returning 1$$), 0::bigint,
  'A: DELETE of B route affects no rows');
select t.is(t.row_count($$update public.rides set distance_meters = 0 returning 1$$), 0::bigint,
  'A: UPDATE of B ride affects no rows');
select t.is(t.row_count($$update public.profiles set display_name = 'pwned'
  where id = '00000000-0000-4000-8000-00000000000b' returning 1$$), 0::bigint,
  'A: UPDATE of B profile affects no rows');
select t.throws($$insert into public.profiles (id) values ('00000000-0000-4000-8000-00000000000b')$$,
  'A: cannot insert profile for B');

-- Sharing lifecycle
select t.throws($$select public.set_route_sharing('10000000-0000-4000-8000-0000000000b1', true)$$,
  'A: cannot enable sharing on B route', '42501');
select t.throws($$select public.set_route_sharing('10000000-0000-4000-8000-0000000000b1', false)$$,
  'A: cannot disable sharing on B route', '42501');

create temporary table share_tokens (label text primary key, token uuid);
grant all on share_tokens to authenticated, anon;

insert into share_tokens
  select 'a1_first', public.set_route_sharing('10000000-0000-4000-8000-0000000000a1', true);
select t.ok((select token is not null and token <> '10000000-0000-4000-8000-0000000000a1'
               from share_tokens where label = 'a1_first'),
  'A: re-enabling legacy route rotates token away from route id');
select t.is(t.row_count($$select * from public.get_shared_route('10000000-0000-4000-8000-0000000000a1')$$),
  0::bigint, 'A: old legacy link (route id) dead after rotation');
select t.is(t.row_count($$select * from public.get_shared_route((select token from share_tokens where label = 'a1_first'))$$),
  1::bigint, 'A: new token resolves');

insert into share_tokens
  select 'a1_second', public.set_route_sharing('10000000-0000-4000-8000-0000000000a1', true);
select t.ok((select count(distinct token) = 2 from share_tokens), 'A: each enable yields a new token');
select t.is(t.row_count($$select * from public.get_shared_route((select token from share_tokens where label = 'a1_first'))$$),
  0::bigint, 'A: previous token dead after second rotation');

select t.ok(public.set_route_sharing('10000000-0000-4000-8000-0000000000a1', false) is null,
  'A: disabling returns null');
select t.is(t.row_count($$select * from public.get_shared_route((select token from share_tokens where label = 'a1_second'))$$),
  0::bigint, 'A: token dead after disabling');
select t.ok((select not share_enabled and share_token is null from public.saved_routes
               where id = '10000000-0000-4000-8000-0000000000a1'),
  'A: disabled route has no stored token');

-- Direct table writes bypassing the RPC (PostgREST PATCH / POST)
select t.throws($$update public.saved_routes set share_enabled = true,
    share_token = '99999999-0000-4000-8000-000000000001'
  where id = '10000000-0000-4000-8000-0000000000a2'$$,
  'A: cannot pick own share_token via direct UPDATE (RPC-only)', '42501');
select t.throws($$update public.saved_routes set is_public = true
  where id = '10000000-0000-4000-8000-0000000000a2'$$,
  'A: cannot flip retired is_public column', '42501');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson, share_enabled, share_token)
  values ('00000000-0000-4000-8000-00000000000a', 'pre-shared', 'AtoB', '{}', true, gen_random_uuid())$$,
  'A: cannot insert an already-shared route', '42501');
select t.is(t.row_count($$update public.saved_routes set name = 'A private renamed', is_favorite = true
  where id = '10000000-0000-4000-8000-0000000000a2' returning 1$$), 1::bigint,
  'A: ordinary UPDATE (name, favourite) still works with the share guard');
select t.is(t.row_count($$update public.saved_routes set name = 'A private', is_favorite = false
  where id = '10000000-0000-4000-8000-0000000000a2' returning 1$$), 1::bigint,
  'A: ordinary UPDATE restored');

-- Rides: idempotent retry exactly like PostgREST upsert(onConflict: user_id,client_request_id)
\set upsert_a 'insert into public.rides (user_id, client_request_id, route_id, route_name, mode, status, distance_meters, duration_seconds, completed_at) values (''00000000-0000-4000-8000-00000000000a'', ''30000000-0000-4000-8000-0000000000a1'', ''10000000-0000-4000-8000-0000000000a2'', ''A private'', ''Loop'', ''completed'', 30100, 5500, now()) on conflict (user_id, client_request_id) do update set user_id = excluded.user_id, client_request_id = excluded.client_request_id, route_id = excluded.route_id, route_name = excluded.route_name, mode = excluded.mode, status = excluded.status, distance_meters = excluded.distance_meters, duration_seconds = excluded.duration_seconds, completed_at = excluded.completed_at'
:upsert_a;
:upsert_a;
:upsert_a;
select t.is(t.row_count($$select * from public.rides where client_request_id = '30000000-0000-4000-8000-0000000000a1'$$),
  1::bigint, 'A: three retries of the same ride produce exactly one row');

select t.throws($$insert into public.rides (user_id, client_request_id, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000b', gen_random_uuid(), 1, 1)$$,
  'A: cannot insert ride owned by B', '42501');
select t.throws($$update public.rides set user_id = '00000000-0000-4000-8000-00000000000b'
  where client_request_id = '30000000-0000-4000-8000-0000000000a1'$$,
  'A: cannot move own ride to B (WITH CHECK)', '42501');

-- R07: a ride links only to a route of the same account; anything else is unlinked
-- (same outcome for foreign and unknown ids, so no UUID existence oracle).
with ins as (insert into public.rides (user_id, route_id, route_name, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000b1', 'r07', 1, 1) returning route_id)
select t.is((select route_id from ins), null::uuid, 'A: R07 ride.route_id pointing to B route is stored unlinked');
with ins as (insert into public.rides (user_id, route_id, route_name, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000a', 'ffffffff-0000-4000-8000-000000000000', 'r07', 1, 1) returning route_id)
select t.is((select route_id from ins), null::uuid, 'A: R07 unknown route_id is unlinked (no FK error = no existence oracle)');
with ins as (insert into public.rides (user_id, route_id, route_name, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-0000000000a2', 'r07', 1, 1) returning route_id)
select t.is((select route_id from ins), '10000000-0000-4000-8000-0000000000a2'::uuid, 'A: R07 own route_id keeps the link');
select t.is(t.row_count($$update public.rides set route_id = '10000000-0000-4000-8000-0000000000b1'
    where route_id = '10000000-0000-4000-8000-0000000000a2' and route_name = 'r07'
    returning route_id$$), 1::bigint, 'A: R07 UPDATE of own ride is allowed');
select t.ok(not exists (select 1 from public.rides
    where route_id = '10000000-0000-4000-8000-0000000000b1' and route_name = 'r07'),
  'A: R07 UPDATE cannot relink own ride to B route');
delete from public.rides where route_name = 'r07';

-- R07: metrics, lengths, tags and GeoJSON shape/size (23514 = check_violation)
select t.throws($$insert into public.rides (user_id, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000a', -5, -10)$$,
  'A: R07 negative ride metrics rejected', '23514');
select t.throws($$insert into public.rides (user_id, distance_meters, duration_seconds, max_speed_kmh)
  values ('00000000-0000-4000-8000-00000000000a', 1, 1, -1)$$,
  'A: R07 negative ride speed rejected', '23514');
select t.throws($$insert into public.rides (user_id, distance_meters, duration_seconds, track_geojson)
  values ('00000000-0000-4000-8000-00000000000a', 1, 1, '"not geojson"')$$,
  'A: R07 non-object track_geojson rejected', '23514');
select t.throws($$insert into public.rides (user_id, distance_meters, duration_seconds, route_name)
  values ('00000000-0000-4000-8000-00000000000a', 1, 1, repeat('x', 201))$$,
  'A: R07 201-char ride route_name rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', repeat('x', 5000), 'AtoB',
          '{"type":"FeatureCollection","features":[]}')$$,
  'A: R07 5000-char route name rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB', '"not geojson"')$$,
  'A: R07 non-object geojson rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB', '{"type":"FeatureCollection"}')$$,
  'A: R07 FeatureCollection without features array rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB', '{"features":[]}')$$,
  'A: R07 geojson without type rejected', '23514');
select t.throws($$insert into public.rides (user_id, distance_meters, duration_seconds, track_geojson)
  values ('00000000-0000-4000-8000-00000000000a', 1, 1, '{"coordinates":[]}')$$,
  'A: R07 track_geojson without type rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB',
          jsonb_build_object('type', 'FeatureCollection', 'features', '[]'::jsonb,
                             'pad', repeat('x', 6291456)))$$,
  'A: R07 geojson over 6 MiB rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson, distance_km)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB',
          '{"type":"FeatureCollection","features":[]}', -1)$$,
  'A: R07 negative route distance rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson, tags)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB',
          '{"type":"FeatureCollection","features":[]}', '{a,b,c,d,e,f,g,h,i}')$$,
  'A: R07 nine tags rejected', '23514');
select t.throws(format($$insert into public.saved_routes (user_id, name, mode, geojson, tags)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB',
          '{"type":"FeatureCollection","features":[]}', array['ok', %L])$$, repeat('x', 41)),
  'A: R07 41-char tag rejected', '23514');
select t.throws($$insert into public.saved_routes (user_id, name, mode, geojson, tags)
  values ('00000000-0000-4000-8000-00000000000a', 'r07', 'AtoB',
          '{"type":"FeatureCollection","features":[]}', array['ok', ''])$$,
  'A: R07 empty tag rejected', '23514');
select t.throws($$update public.profiles set display_name = repeat('x', 101)
  where id = '00000000-0000-4000-8000-00000000000a'$$,
  'A: R07 101-char display_name rejected', '23514');
select t.lives(format($$insert into public.saved_routes (user_id, name, mode, geojson, tags, distance_km, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000a', %L, 'Loop',
          '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[19.94,50.06],[19.95,50.07]]}}]}',
          array['gravel', 'Żółć', %L, 'h', 'e', 'f', 'g', 'z'], 0, 0)$$,
  repeat('ą', 200), repeat('t', 40)),
  'A: R07 limits accept app-shaped route at the edges (200-char name, 8 tags, 40-char tag, zero metrics)');
delete from public.saved_routes where name = repeat('ą', 200);

-- Stats are exact and scoped
select t.is(public.get_own_account_stats(),
  '{"rides": 1, "routes": 2, "favoriteRoutes": 0, "rideDistanceMeters": 30100.00, "rideDurationSeconds": 5500}'::jsonb,
  'A: account stats exact and scoped to A');

-- ===========================================================================
-- 3. Account B — same client_request_id is independent per user
-- ===========================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', false);
set role authenticated;

select t.lives($$insert into public.rides (user_id, client_request_id, distance_meters, duration_seconds)
  values ('00000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-0000000000a1', 100, 60)$$,
  'B: may reuse a client_request_id used by A (uniqueness is per user)');
select t.is(t.row_count('select * from public.rides'), 2::bigint, 'B: sees exactly own 2 rides');
select t.is((public.get_own_account_stats() ->> 'rides')::int, 2, 'B: stats count own rides only');

-- ===========================================================================
-- 4. Account deletion cascades only own data
-- ===========================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', false);
set role authenticated;
select t.lives('select public.delete_own_account()', 'A: delete_own_account succeeds');

reset role;
select set_config('request.jwt.claims', '', false);
select t.is((select count(*) from auth.users where id = '00000000-0000-4000-8000-00000000000a'), 0::bigint,
  'delete: A auth user removed');
select t.is((select count(*) from public.saved_routes where user_id = '00000000-0000-4000-8000-00000000000a'),
  0::bigint, 'delete: A routes cascaded');
select t.is((select count(*) from public.rides where user_id = '00000000-0000-4000-8000-00000000000a'),
  0::bigint, 'delete: A rides cascaded');
select t.is((select count(*) from public.profiles where id = '00000000-0000-4000-8000-00000000000a'),
  0::bigint, 'delete: A profile cascaded');
select t.is((select count(*) from public.saved_routes where user_id = '00000000-0000-4000-8000-00000000000b'),
  1::bigint, 'delete: B routes intact');
select t.is((select count(*) from public.rides where user_id = '00000000-0000-4000-8000-00000000000b'),
  2::bigint, 'delete: B rides intact');

-- service_role maintenance (dashboard / scripts) is not blocked by the share guard
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
set role service_role;
select t.is(t.row_count($$update public.saved_routes set share_enabled = true, share_token = id
  where user_id = '00000000-0000-4000-8000-00000000000b' returning 1$$), 1::bigint,
  'service_role: may maintain share columns');
reset role;

-- ===========================================================================
-- 5. B02: persistent provider quota (backend-only RPC)
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon;
select t.throws($$select public.consume_api_quota('directions', 'ip:x', 10, 10)$$,
  'anon: cannot call consume_api_quota', '42501');
select t.throws($$select * from private.api_usage$$,
  'anon: cannot read private.api_usage', '42501');

reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', false);
set role authenticated;
select t.throws($$select public.consume_api_quota('directions', 'user:b', 10, 10)$$,
  'B: cannot call consume_api_quota (could burn or reset quotas)', '42501');
select t.throws($$insert into private.api_kill_switch (kind, enabled) values ('all', true)$$,
  'B: cannot flip the kill switch', '42501');

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
set role service_role;
select t.is(public.consume_api_quota('directions', 'ip:1', 2, 3) ->> 'allowed', 'true', 'quota: 1st call allowed');
select t.is(public.consume_api_quota('directions', 'ip:1', 2, 3) ->> 'allowed', 'true', 'quota: 2nd call allowed');
select t.is(public.consume_api_quota('directions', 'ip:1', 2, 3) ->> 'reason', 'actor',
  'quota: actor daily limit denies 3rd call');
select t.is(public.consume_api_quota('directions', 'ip:2', 2, 3) ->> 'allowed', 'true',
  'quota: another actor still allowed (global 3/3 used)');
select t.is(public.consume_api_quota('directions', 'ip:3', 2, 3) ->> 'reason', 'global',
  'quota: global daily limit denies everyone');
select t.ok((public.consume_api_quota('directions', 'ip:3', 2, 3) ->> 'retry_after')::int between 1 and 86400,
  'quota: denial carries retry_after until next UTC day');
select t.is(public.consume_api_quota('geocode', 'ip:3', 2, 3) ->> 'allowed', 'true',
  'quota: kinds are counted separately');
reset role;
select t.is((select used from private.api_usage where bucket = 'actor:ip:3:directions'), null::integer,
  'quota: denied call charged no bucket (all-or-nothing)');
select t.is((select used from private.api_usage where bucket = 'global:directions'), 3,
  'quota: global bucket never exceeds its limit');

set role service_role;
select t.is(public.consume_api_quota('directions', 'ip:9', 5, 100, 6) ->> 'allowed', 'false',
  'quota: cost above limit denied without inserting');
select t.throws($$select public.consume_api_quota('routes', 'ip:9', 5, 5)$$,
  'quota: unknown kind rejected', '22023');
select t.throws($$select public.consume_api_quota('geocode', '', 5, 5)$$,
  'quota: empty actor rejected', '22023');
reset role;
insert into private.api_kill_switch (kind, enabled, note) values ('geocode', true, 'test');
set role service_role;
select t.is(public.consume_api_quota('geocode', 'ip:5', 50, 50) ->> 'reason', 'disabled',
  'quota: kill switch blocks its kind');
select t.is(public.consume_api_quota('directions', 'ip:5', 50, 50) ->> 'allowed', 'true',
  'quota: kill switch leaves other kinds running');
reset role;

-- Ops status RPC: backend-only, reports global usage and active kill switches
set role service_role;
select t.is(public.get_api_usage_today(),
  '{"usage": {"directions": 4, "geocode": 1}, "disabled": ["geocode"]}'::jsonb,
  'ops: get_api_usage_today reports global usage and kill switches only');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon;
select t.throws('select public.get_api_usage_today()', 'anon: cannot call get_api_usage_today', '42501');
reset role;
