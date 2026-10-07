-- Replaces broad anonymous SELECT of every is_public route with token RPCs.
-- Existing public links keep working because their first token equals route id.
begin;

alter table public.saved_routes
  add column if not exists share_enabled boolean not null default false;
alter table public.saved_routes
  add column if not exists share_token uuid;

update public.saved_routes
set share_enabled = true,
    share_token = coalesce(share_token, id),
    is_public = false
where is_public = true;

drop policy if exists "Anyone can read public routes" on public.saved_routes;
drop index if exists public.saved_routes_public_id_idx;
create unique index if not exists saved_routes_share_token_idx
  on public.saved_routes (share_token)
  where share_token is not null;

create or replace function public.get_shared_route(p_share_token uuid)
returns table (
  name text, mode text, geojson jsonb,
  distance_km numeric, duration_seconds integer
)
language sql stable security definer set search_path = ''
as $$
  select route.name, route.mode, route.geojson,
         route.distance_km, route.duration_seconds
  from public.saved_routes as route
  where route.share_enabled = true and route.share_token = p_share_token
  limit 1;
$$;
revoke all on function public.get_shared_route(uuid) from public;
grant execute on function public.get_shared_route(uuid) to anon, authenticated;

create or replace function public.set_route_sharing(p_route_id uuid, p_enabled boolean)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare token uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_enabled then
    update public.saved_routes
    set share_enabled = true, share_token = gen_random_uuid(), is_public = false
    where id = p_route_id and user_id = auth.uid()
    returning share_token into token;
  else
    update public.saved_routes
    set share_enabled = false, share_token = null, is_public = false
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

commit;
