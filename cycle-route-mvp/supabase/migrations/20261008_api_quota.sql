-- B02 / R03: persistent, shared quota for provider (ORS) calls, 2026-10-08.
-- Apply after 20261007_r07_data_constraints.sql. Additive and idempotent.
--
-- Only the backend calls consume_api_quota(), with the service_role key. Counters
-- live in schema `private`, which PostgREST does not expose. Daily windows are UTC
-- days. Every actual provider call (retries and loop fan-out included) costs 1.
--
-- Kill switch (SQL Editor, takes effect on the next call, no redeploy):
--   insert into private.api_kill_switch (kind, enabled, note)
--   values ('all', true, 'incident') -- or 'directions' / 'geocode'
--   on conflict (kind) do update set enabled = excluded.enabled, note = excluded.note;
begin;

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

commit;
