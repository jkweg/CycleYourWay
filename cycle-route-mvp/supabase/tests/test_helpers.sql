-- Tiny assertion helpers (pgTAP-like) for the local RLS/RPC suite.
-- Every assertion is recorded in t.results; the runner fails if any row is 'FAIL'.
-- 'GAP' marks a known, documented weakness that is not yet fixed (does not fail the run).

create schema if not exists t;

create table if not exists t.results (
  id serial primary key,
  status text not null check (status in ('PASS', 'FAIL', 'GAP')),
  message text not null,
  detail text
);

create or replace function t.record(p_status text, p_message text, p_detail text default null)
returns void language sql as $$
  insert into t.results (status, message, detail) values (p_status, p_message, p_detail);
$$;

create or replace function t.ok(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  perform t.record(case when coalesce(p_condition, false) then 'PASS' else 'FAIL' end, p_message);
end;
$$;

create or replace function t.is(p_got anyelement, p_expected anyelement, p_message text)
returns void language plpgsql as $$
begin
  if p_got is not distinct from p_expected then
    perform t.record('PASS', p_message);
  else
    perform t.record('FAIL', p_message, format('got %s, expected %s', p_got, p_expected));
  end if;
end;
$$;

-- Expects the statement to raise. Optional SQLSTATE check.
create or replace function t.throws(p_sql text, p_message text, p_errcode text default null)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_errcode is null or sqlstate = p_errcode then
      perform t.record('PASS', p_message, sqlstate || ': ' || sqlerrm);
    else
      perform t.record('FAIL', p_message,
        format('raised %s (%s), expected %s', sqlstate, sqlerrm, p_errcode));
    end if;
    return;
  end;
  perform t.record('FAIL', p_message, 'statement did not raise');
end;
$$;

-- Expects the statement to succeed (side effects are kept).
create or replace function t.lives(p_sql text, p_message text)
returns void language plpgsql as $$
begin
  execute p_sql;
  perform t.record('PASS', p_message);
exception when others then
  perform t.record('FAIL', p_message, sqlstate || ': ' || sqlerrm);
end;
$$;

-- Number of rows returned by a query, evaluated as the CURRENT role.
create or replace function t.row_count(p_sql text)
returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('with q as (%s) select count(*) from q', p_sql) into n;
  return n;
end;
$$;

-- Known gap: p_gap_present = true means the weakness still exists.
create or replace function t.gap(p_gap_present boolean, p_message text)
returns void language plpgsql as $$
begin
  perform t.record(case when coalesce(p_gap_present, true) then 'GAP' else 'PASS' end,
                   p_message,
                   case when p_gap_present then 'known gap, tracked in IMPLEMENTATION_PROGRESS.md' end);
end;
$$;

grant usage on schema t to anon, authenticated, service_role;
grant all on all tables in schema t to anon, authenticated, service_role;
grant all on all sequences in schema t to anon, authenticated, service_role;
grant execute on all functions in schema t to anon, authenticated, service_role;
