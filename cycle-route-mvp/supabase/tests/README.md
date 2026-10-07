# Testy bazy: migracje, dryf schematu, RLS/RPC

Dwa niezależne poziomy testów. Żaden nie dotyka produkcji.

## 1. Lokalnie / CI — `run-local.sh`

Tworzy **jednorazowy** klaster PostgreSQL (`initdb` w katalogu tymczasowym), emuluje fragmenty Supabase (`supabase_shim.sql`: role `anon` / `authenticated` / `service_role`, `auth.users`, `auth.uid()` z `request.jwt.claims`, domyślne granty Supabase także dla funkcji) i wykonuje:

1. baseline `fixtures/baseline_schema_7da22a3.sql` → dane legacy (`seed_legacy.sql`, m.in. trasa `is_public=true`) → wszystkie migracje z `../migrations/` w kolejności, a potem drugi raz (idempotencja);
2. `schema.sql` na czystej bazie, dwukrotnie (idempotencja);
3. porównanie katalogu (kolumny, indeksy, constrainty, polityki, funkcje + ACL, triggery, RLS) między ścieżką „baseline + migracje” a `schema.sql` — każdy dryf kończy test błędem;
4. `rls_rpc.test.sql` jako anon / konto A / konto B / service_role (role przełączane tak jak robi to PostgREST).

```bash
bash cycle-route-mvp/supabase/tests/run-local.sh
# albo na istniejącym, jednorazowym serwerze (superuser; skrypt tworzy własne bazy cyw_*):
PG_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres bash cycle-route-mvp/supabase/tests/run-local.sh
```

Wymaga Linux/WSL/macOS z `initdb`, `pg_ctl`, `psql` (PostgreSQL 15+). Działa w jobie `supabase-sql` w `.github/workflows/ci.yml`.

Statusy: `PASS`, `FAIL` (przerywa CI), `GAP` = znana, opisana w `docs/IMPLEMENTATION_PROGRESS.md` słabość, której jeszcze nie naprawiono. Po naprawie `GAP` zamienia się na zwykłą asercję.

Ograniczenia emulacji: brak prawdziwego GoTrue, PostgREST, Storage i ról wewnętrznych Supabase (`supabase_auth_admin` itd.). Dlatego wynik lokalny nie zastępuje testu stagingowego.

## 2. Staging — `frontend/scripts/staging-rls-smoke.mjs`

Uruchamia te same scenariusze przez prawdziwe API Supabase (supabase-js → PostgREST/GoTrue) na **osobnym projekcie staging**: tworzy dwa konta testowe przez admin API, sprawdza anon/A/B, cykl życia tokenów share (w tym stary link `?share=<id trasy>`), idempotentny zapis jazdy, eksport > 500 jazd i > 8 tras, statystyki konta i kaskadowe usunięcie konta; na końcu zawsze usuwa konta testowe.

1. Utwórz `cycle-route-mvp/.env.staging.local` (ignorowany przez `.env.*.local`):

   ```
   STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co
   STAGING_SUPABASE_ANON_KEY=...
   STAGING_SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. Na stagingu wykonaj migracje w kolejności nazw plików (SQL Editor albo `psql`):
   `20261001_ride_idempotency.sql`, `20261001_unlisted_route_sharing.sql`, `20261001_account_stats.sql`, `20261007_harden_sharing_and_rpc_grants.sql`, `20261007_r07_data_constraints.sql` (przed nią `../checks/r07_preflight.sql`, tylko odczyt), `20261008_api_quota.sql`.
3. Uruchom (PowerShell):

   ```powershell
   cd D:\CycleYourWay\CycleYourWay\cycle-route-mvp\frontend
   node scripts/staging-rls-smoke.mjs --confirm-staging
   ```

Bezpieczniki: bez `--confirm-staging` skrypt nic nie robi; odmawia, gdy URL stagingu jest równy `VITE_SUPABASE_URL` z `frontend/.env`, `.env.local`, `.env.production` lub `.env.production.local`. Nigdy nie wpisuj tu kluczy produkcyjnych.

Skrypt został zweryfikowany lokalnie na PostgREST 12.2.3 z atrapą GoTrue (wynik 44 PASS / 0 FAIL / 1 GAP), a 07.10.2026 na prawdziwym projekcie staging Supabase (44 PASS / 0 FAIL / 1 GAP R07).
