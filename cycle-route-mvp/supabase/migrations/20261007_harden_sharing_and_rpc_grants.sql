-- Hardening found by supabase/tests (local RLS/RPC suite), 2026-10-07.
-- Apply after 20261001_unlisted_route_sharing.sql and 20261001_account_stats.sql.
-- Additive, idempotent, no data rewrite.
begin;

-- 1. Supabase grants EXECUTE on every new function in schema public directly to
--    anon (default privileges), so `revoke ... from public` did not remove it.
--    These RPCs already reject anon via auth.uid() IS NULL; this is defence in depth.
revoke execute on function public.set_route_sharing(uuid, boolean) from anon;
revoke execute on function public.get_own_account_stats() from anon;
revoke execute on function public.delete_own_account() from anon;

-- 2. Sharing state may change only through set_route_sharing(). Without this a
--    client could PATCH saved_routes and pick its own (guessable) share_token,
--    or flip the retired is_public column.
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

commit;
