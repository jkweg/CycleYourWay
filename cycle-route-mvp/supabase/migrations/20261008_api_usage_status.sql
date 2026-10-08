-- Ops: read-only status of today's provider quota for monitoring, 2026-10-08.
-- Apply after 20261008_api_quota.sql. Additive and idempotent.
-- Backend-only (service_role); exposed to monitors as GET /api/health/quota,
-- which reports percentages, never per-user buckets.
begin;

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

commit;
