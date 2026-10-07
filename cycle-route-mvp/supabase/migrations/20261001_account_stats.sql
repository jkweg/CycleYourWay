-- Exact private dashboard totals without downloading full route or ride rows.
alter table public.saved_routes
  add column if not exists is_favorite boolean not null default false;

create index if not exists rides_user_id_created_at_idx
  on public.rides (user_id, created_at);

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
