-- Apply before deploying the frontend that sends client_request_id.
-- Additive and safe for existing rows: PostgreSQL permits multiple NULL values
-- in this unique index, while retries with a real UUID conflict predictably.
begin;

alter table public.rides
  add column if not exists client_request_id uuid;

create unique index if not exists rides_user_client_request_id_idx
  on public.rides (user_id, client_request_id);

commit;
