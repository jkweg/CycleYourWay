-- Legacy data as it could exist on a database created from baseline 7da22a3,
-- BEFORE the 2026-10-01 migrations. Fixed UUIDs keep assertions readable.
--   A = ...0a, B = ...0b
--   route a1 = A, legacy public (is_public = true)  -> must keep working via ?share=<id>
--   route a2 = A, private
--   route b1 = B, private
--   ride  rb1 = B, legacy ride without client_request_id

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'user.a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'user.b@example.test');

insert into public.saved_routes (id, user_id, name, mode, geojson, distance_km, duration_seconds, is_public, tags)
values
  ('10000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a',
   'A legacy public', 'AtoB',
   '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[19.94,50.06],[19.95,50.07]]}}]}',
   1.5, 300, true, '{secret-tag}'),
  ('10000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a',
   'A private', 'Loop',
   '{"type":"FeatureCollection","features":[]}', 30, 5400, false, '{}'),
  ('10000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b',
   'B private', 'AtoB',
   '{"type":"FeatureCollection","features":[]}', 12.3, 2400, false, '{}');

insert into public.rides (id, user_id, route_id, route_name, mode, distance_meters, duration_seconds)
values
  ('20000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b',
   '10000000-0000-4000-8000-0000000000b1', 'B private', 'AtoB', 12000, 2500);
