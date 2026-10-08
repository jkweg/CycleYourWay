# Przygotowanie do produkcji — postęp

Dokument przekazania z bieżącym stanem Git, migracjami i kolejnością dalszych prac: [HANDOFF_CLAUDE.md](HANDOFF_CLAUDE.md).

## Pakiet 1 — granice API i dostawców (27.09.2026)

Zmiany lokalne, bez deploymentu i bez operacji na produkcyjnej bazie. Punktem odniesienia jest [audyt](../PRODUCTION_READINESS_AUDIT.md).

| Obszar | Zmiana | Status względem audytu |
|---|---|---|
| B01 / R01 | Autocomplete wywołuje wyłącznie istniejący endpoint Pelias/ORS. Pusta odpowiedź, brak klucza i awaria nie uruchamiają Nominatim. Ręczne wyszukiwanie i reverse działają dotychczasową ścieżką. | Usunięte niedozwolone użycie Nominatim do sugestii; warunki danych dostawców nadal otwarte |
| B04 / R04 | Usunięty fallback OSRM. Odmowa ORS daje 503 z polskim komunikatem; dotychczasowe próby innych profili rowerowych ORS zachowują wszystkie waypointy. | Naprawione w kodzie, sprawdzone lokalnie |
| B02 / R03 | Faktyczne żądania Directions/Pelias rezerwują limity przed wysłaniem; retry i równoległe pętle dzielą budżet. Przekroczenie daje 429 i Retry-After, bez kolejki. Cache hit nie zużywa limitu. | Częściowo: tylko jeden proces, stan w RAM |
| CORS | Wyłącznie dokładne originy. `ALLOWED_ORIGINS` zastępuje domyślne. Obcy Vercel i dopisane domeny odrzucane 403 JSON. | Naprawione lokalnie; konfiguracja hostingu wymaga osobnego wdrożenia |
| Błędy i walidacja | JSON dla błędów parsera/CORS, 413 dla zbyt dużego body; puste i poza zakresem współrzędne reverse dają 400 przed kontaktem z dostawcą. | Sprawdzone lokalnie |
| Env / testowalność | dotenv ładowany przed modułami konfiguracji. Import Express nie otwiera portu; `node server.js` nadal uruchamia serwer. | Gotowe |

### Konfiguracja i ograniczenia

- Domyślne budżety Directions: 40/min, 2000/kroczące 24 h, 4 równoczesne żądania. Pelias: 100/min, 3000/24 h, 6 równoczesnych. Wszystkie wysłane próby, także nieudane, liczą się do budżetu.
- Parametry w `backend/.env.example`; nieprawidłowa dodatnia liczba całkowita zatrzymuje start. Dopasować limity do rzeczywiście przyznanego planu i współdzielenia klucza.
- **Restart resetuje liczniki; wiele procesów ma osobne liczniki.** Przed publiczną betą potrzebny trwały, wspólny budżet i kontrola nadużyć/uwierzytelnienia. Ten pakiet nie zamyka B02.
- CORS nie jest uwierzytelnianiem. Żądania bez Origin nadal są dozwolone. Ustawiona lista musi zawierać wszystkie potrzebne domeny produkcyjne, preview i originy Capacitor; wildcardy nie działają.
- Autocomplete dalej przekazuje wpisywany tekst do dotychczasowego dostawcy ORS. Zmiana nie rozstrzyga B06: dopuszczalności przetwarzania danych osobowych ani wymaganej informacji dla użytkownika. Nie wdrażać jako gotowej do publicznego uruchomienia usługi.
- Kolejka Nominatim, przerwanie pracy po rozłączeniu klienta i retry klienta pozostają do dopracowania.

### Weryfikacja

Backend `npm test`: **31/31**. Nowe testy obejmują HTTP Express z atrapami dostawców, CORS/preflight, błędne JSON/body/GPS, Pelias bez fallbacku, zachowanie waypointów, cache oraz wspólny limit route/loop. Testy zegara sprawdzają kroczące okna, liczenie błędnych prób i zwalnianie slotów. Brak wywołań prawdziwych dostawców i użycia prawdziwych kluczy w testach.

## Pakiet 2 — odporny zapis jazdy (01.10.2026)

| Obszar | Zmiana | Status względem audytu |
|---|---|---|
| B05 / R06 | Aktywna jazda ma UUID sesji i checkpoint w IndexedDB co 10 sekund. Zapisywany jest ślad, czas, pauza, liczniki oraz dane trasy. | Naprawione lokalnie; wymaga testu terenowego i migracji DB |
| Odzyskiwanie | Po przeładowaniu zgodny draft jest automatycznie odzyskiwany i otwierany w stanie wstrzymanym. Zakończona, niewysłana jazda wraca do ekranu podsumowania. Draft przypisany do konta nie otworzy się innemu kontu. | Gotowe w kodzie |
| Potwierdzenie zapisu | Podsumowanie czeka na wynik Supabase. Przy błędzie pozostaje otwarte z retry; można wrócić do planera z lokalną kopią. `ride_saved` jest wysyłane wyłącznie po sukcesie DB. Błąd brakującej kolumny nie jest już sukcesem. | Naprawione lokalnie |
| Idempotencja | `client_request_id` jest UUID sesji; zapis używa upsert na unikalnym `(user_id, client_request_id)`. Niepewna odpowiedź sieciowa może być ponowiona bez drugiej aktywności. | Kod i migracja gotowe, niewdrożone |
| Gość → konto | Jazda gościa pozostaje lokalna; zakończenie otwiera logowanie. Po zalogowaniu lokalne podsumowanie wraca i może zostać zsynchronizowane. | Gotowe w kodzie |

Przed wdrożeniem frontendu trzeba wykonać addytywną migrację [`supabase/migrations/20261001_ride_idempotency.sql`](../supabase/migrations/20261001_ride_idempotency.sql). Bez niej zapis celowo pokazuje błąd i zachowuje draft lokalnie. Nie uruchomiono migracji na żadnej bazie.

Ograniczenia: IndexedDB zależy od dostępnego miejsca i polityki przeglądarki; aplikacja pokazuje błąd checkpointu. Lokalne dane GPS nie mają jeszcze ekranu zarządzania ani automatycznej retencji. Checkpoint 10 s ogranicza stratę, ale nie daje gwarancji zapisu każdego ostatniego punktu przy natychmiastowym ubiciu procesu. Background GPS nadal zależy od platformy.

### Weryfikacja pakietu 2

- Frontend: **20/20 testów**, lint bez ostrzeżeń, typecheck i production build przeszły.
- Nowe testy sprawdzają format UUID oraz granicę właściciela lokalnego draftu.
- Production build nadal ostrzega o głównym chunku około 839 kB / 260 kB gzip; to istniejące zadanie performance.
- Backend: **31/31 testów** po zmianach; brak regresji pakietu 1.
- Nie wykonano testu realnego GPS, rzeczywistej awarii sieci ani integracji z bazą Supabase. Te kontrole pozostają wymagane przed betą.

## Pakiet 3 — niepubliczne, odwoływalne udostępnianie tras (01.10.2026)

| Obszar | Zmiana | Status względem audytu |
|---|---|---|
| B03 / R05 | Usunięta polityka anonimowego `SELECT is_public=true`. Odbiorca wywołuje `get_shared_route(token)`, które zwraca jedną trasę i tylko pola potrzebne do jej pokazania, bez `user_id`, tagów i wewnętrznego ID. | Kod i migracja gotowe, niewdrożone |
| Token i odwołanie | `set_route_sharing` sprawdza `auth.uid()`, generuje losowy UUID i przy wyłączeniu kasuje go. Ponowne udostępnienie daje nowy link. | Gotowe w SQL/UI |
| Migracja linków | Trasy z dawnym `is_public=true` otrzymują początkowy token równy istniejącemu losowemu UUID trasy, więc dotychczasowe `?share=<id>` nadal działa. Kolumna `is_public` zostaje wyzerowana. | Zachowanie kompatybilne po migracji |
| Link telefonu | `?ride=<id>` jest wyłącznie linkiem właściciela i wymaga zalogowania na to samo konto. Automatycznie zapisana trasa nie jest już upubliczniana. | Naprawione w kodzie |
| UX/prawo | Interfejs mówi „link aktywny” i „unieważnij link”; tekst prawny opisuje niepubliczny link i odwołanie. Nieprawidłowy token UUID jest odrzucany przed RPC. | Gotowe lokalnie |

Przed wdrożeniem tego frontendu trzeba wykonać [`supabase/migrations/20261001_unlisted_route_sharing.sql`](../supabase/migrations/20261001_unlisted_route_sharing.sql). Migracja i frontend powinny zostać wydane w jednym oknie: po usunięciu starej polityki wcześniejszy frontend nie wczyta udostępnionej trasy bez RPC. Nie uruchomiono SQL na żadnej bazie.

### Weryfikacja pakietu 3

- Testy frontendu obejmują walidację tokenu i budowanie kanonicznego linku.
- Statycznie potwierdzono brak ponownego utworzenia polityki `Anyone can read public routes`; pełny test anon/konto A/konto B wymaga izolowanej bazy Supabase.
- Funkcja odczytu nie zwraca `user_id`, tagów, `share_token` ani ID rekordu. Znajomość UUID tokenu pozostaje poświadczeniem dostępu; link może zostać dalej przekazany przez odbiorcę.

### Nadal otwarte po pakiecie 4

1. Testy integracyjne migracji i RLS na staging: anon, właściciel, inne konto, wyłączony i obrócony token.
2. B02/B06: trwały budżet i decyzja dotycząca warunków dostawcy danych lokalizacyjnych.
3. Retencja i ekran zarządzania lokalnymi draftami jazd.

## Pakiet 4 — kompletność danych i skalowanie list (01.10.2026)

| Obszar | Zmiana | Status względem audytu |
|---|---|---|
| R14 / eksport | Eksport pobiera profil oraz wszystkie trasy i jazdy stronami po 500 rekordów. Plik zawiera wersję formatu i podstawowe metadane konta; błąd lub limit bezpieczeństwa przerywa operację zamiast tworzyć niepełny plik. | Naprawione lokalnie; wymaga migracji i testu z rzeczywistym kontem |
| Statystyki profilu | `get_own_account_stats()` liczy trasy, ulubione, jazdy, dystans i czas w bazie. Osiem ostatnich elementów służy już tylko jako podgląd. | Kod i migracja gotowe, niewdrożone |
| R21 / lista tras | Lista pobiera po 20 lekkich rekordów, a wyszukiwanie, filtry i sortowanie wykonuje baza. Duże `geojson` jest pobierane dopiero przy wczytaniu trasy, rozpoczęciu jazdy lub przygotowaniu widoku telefonu. | Naprawione lokalnie |
| Indeksy | Dodany indeks `(user_id, created_at)` dla stronicowanego eksportu jazd. Istniejące indeksy tras i historii wspierają listy oraz sumowanie dla jednego konta. | Gotowe w SQL |

Przed wdrożeniem trzeba wykonać [`supabase/migrations/20261001_account_stats.sql`](../supabase/migrations/20261001_account_stats.sql), oprócz migracji z pakietów 2 i 3. Migracja nie została uruchomiona na żadnej bazie.

### Weryfikacja pakietu 4

- Frontend: **24/24 testy**, lint i typecheck przeszły.
- Test eksportu potwierdza pobranie kolejnych stron oraz jawne przerwanie po osiągnięciu limitu zamiast cichego obcięcia danych.
- Pełny test wydajności i poprawności RPC wymaga stagingowej bazy z większym zbiorem danych. Funkcja statystyk wymaga zalogowania i nie jest przyznana roli `anon`.
- Limit eksportu wynosi 50 000 rekordów na zasób, żeby przeglądarka nie zużyła nieograniczonej pamięci. Po jego przekroczeniu użytkownik dostaje błąd i plik nie jest pobierany.

## Pakiet 5 — automatyczne testy migracji i RLS/RPC (07.10.2026)

Dostęp do projektu staging jest zadeklarowany, ale `*.supabase.co` jest zablokowane przez allowlistę ruchu wychodzącego środowiska agenta. Dlatego pakiet dostarcza dwa poziomy testów: lokalny (wykonany) i stagingowy (gotowy, niewykonany).

| Obszar | Zmiana | Status względem audytu |
|---|---|---|
| R12/R17 lokalnie | [`supabase/tests/run-local.sh`](../supabase/tests/run-local.sh): jednorazowy PostgreSQL z emulacją ról i domyślnych grantów Supabase; baseline `7da22a3` + dane legacy → migracje (dwukrotnie) → 63 asercje anon/A/B/service_role. | Wykonane lokalnie: **63 PASS / 0 FAIL / 3 GAP** |
| Dryf schematu | Ten sam skrypt porównuje katalog bazy „baseline + migracje” z bazą z `schema.sql` (kolumny, indeksy, constrainty, polityki, funkcje z ACL, triggery, RLS). | Brak dryfu |
| R12/R17 staging | [`frontend/scripts/staging-rls-smoke.mjs`](../frontend/scripts/staging-rls-smoke.mjs): supabase-js przez prawdziwe API, konta A/B tworzone i usuwane przez admin API, bezpieczniki `--confirm-staging` i odmowa przy URL równym `VITE_SUPABASE_URL`. | Zweryfikowany na PostgREST 12.2.3 + atrapie GoTrue: **44 PASS / 0 FAIL / 1 GAP**; **nie uruchomiony na stagingu** |
| Uprawnienia RPC (nowe) | Supabase nadaje `EXECUTE` na funkcje w `public` bezpośrednio roli `anon`, więc `revoke ... from public` jej go nie odbierał. Stwierdzenie z pakietu 4 („nie jest przyznana roli anon”) było nieprawdziwe dla Supabase. Funkcje i tak odrzucały anon przez `auth.uid() is null`. Migracja [`20261007_harden_sharing_and_rpc_grants.sql`](../supabase/migrations/20261007_harden_sharing_and_rpc_grants.sql) odbiera `EXECUTE` anon dla `set_route_sharing`, `get_own_account_stats`, `delete_own_account`. | Naprawione w SQL, niewdrożone |
| Token share (nowe) | Klient mógł przez bezpośredni `PATCH saved_routes` ustawić własny, przewidywalny `share_token`, włączyć `share_enabled` albo `is_public` z pominięciem RPC. Trigger `saved_routes_guard_share_columns` blokuje zmianę tych kolumn przez `anon`/`authenticated`; RPC i `service_role` działają. Frontend nie zapisuje tych kolumn bezpośrednio. | Naprawione w SQL, niewdrożone |
| Stronicowanie | Eksport konta i lista tras dostały unikalny drugi klucz sortowania `id`. Przy równych `created_at`/`distance_km` stronicowanie `range` mogło teoretycznie dublować lub pomijać rekordy (lokalnie nie odtworzono). | Naprawione lokalnie |
| R19 (część) | CI: `npm run typecheck` we froncie i nowy job `supabase-sql` uruchamiający `run-local.sh`. | Gotowe, niesprawdzone na GitHub Actions |

Kolejność migracji na stagingu: `20261001_ride_idempotency.sql` → `20261001_unlisted_route_sharing.sql` → `20261001_account_stats.sql` → `20261007_harden_sharing_and_rpc_grants.sql`. Instrukcja: [`supabase/tests/README.md`](../supabase/tests/README.md).

### Weryfikacja pakietu 5

- `run-local.sh` na PostgreSQL 16: 63 PASS / 0 FAIL / 3 GAP, także jako użytkownik bez uprawnień root (jak w CI). Test mutacyjny (usunięcie `drop policy` i sprawdzenia właściciela w `set_route_sharing`) daje 3 FAIL, a dryf jest wykrywany.
- Frontend: lint, typecheck, **24/24 testy**, build (chunk ~843 kB / 262 kB gzip, R23 bez zmian).
- Backend: **31/31 testów**.
- `git diff --check` z `core.autocrlf=true`: sukces.

### Znane luki (GAP), do pakietu R07

1. `rides.route_id` może wskazywać trasę innego konta (FK bez sprawdzenia właściciela; także wyrocznia istnienia UUID).
2. Ujemne `distance_meters`/`duration_seconds` są akceptowane.
3. Nazwa trasy o długości 5000 znaków i `geojson` niebędący obiektem są akceptowane.

### Nadal otwarte po pakiecie 5

1. ~~Uruchomić 4 migracje i `staging-rls-smoke.mjs` na prawdziwym stagingu~~ — wykonane 07.10.2026, patrz niżej.
2. Trigger `on_auth_user_created` i kaskada usunięcia konta zostały potwierdzone na prawdziwym GoTrue (smoke), ale nie wykonano ręcznego E2E aplikacji wskazującej na staging.
3. R07, retencja draftów, B02/B06 i pozostałe pozycje z handoffu bez zmian.

### Staging Supabase — wynik (07.10.2026)

- Osobny projekt staging (nie produkcja). Baseline: `supabase/tests/fixtures/baseline_schema_7da22a3.sql`, następnie 4 migracje w kolejności nazw, uruchomione przez użytkownika w SQL Editorze bez błędów.
- `node scripts/staging-rls-smoke.mjs --confirm-staging` uruchomiony przez użytkownika z PowerShella: **44 PASS / 0 FAIL / 1 GAP**.
- Potwierdzone na prawdziwym PostgREST/GoTrue: brak dostępu anon do tabel i RPC właściciela; izolacja A/B (odczyt, UPDATE, DELETE, INSERT i przeniesienie na cudze konto); pełny cykl tokenów share (rotacja, wyłączenie, losowy token, migrowany link legacy `?share=<id>` i jego wygaśnięcie po rotacji); guard RPC-only dla `share_token`; idempotencja `(user_id, client_request_id)` przy 3 ponowieniach; eksport 521 jazd i 11 tras bez duplikatów; dokładne `get_own_account_stats`; kaskadowe `delete_own_account` bez wpływu na konto B.
- Jedyny GAP: R07 — `rides.route_id` może wskazywać trasę innego konta.
- Nie wykonano: ręcznego E2E aplikacji na stagingu, migracji na kopii danych produkcyjnych, zapytań wykrywających dane niezgodne z przyszłymi constraintami R07.

## Pakiet 6 — R07: walidacja danych w bazie (07.10.2026)

### Zakres

| Obszar | Zmiana |
| --- | --- |
| Własność `route_id` | Trigger `rides_enforce_route_owner` (SECURITY DEFINER): jazda może wskazywać tylko trasę tego samego konta. Obca lub nieistniejąca trasa jest **odłączana** (`route_id = null`, `route_name` zostaje), a nie odrzucana — offline draft jazdy nie utknie w nieskończonym retry, a identyczny wynik dla „obca” i „nie istnieje” usuwa wyrocznię istnienia UUID. |
| Metryki | `saved_routes`: dystans i czas ≥ 0; `rides`: dystans, czas, prędkości, przewyższenie, liczniki ≥ 0. |
| Teksty | Nazwa trasy i `rides.route_name` ≤ 200 znaków; `display_name` ≤ 100; `home_area` ≤ 200. |
| Tagi | ≤ 8, bez NULL/pustych, bez znaków sterujących, każdy ≤ 40 znaków. |
| GeoJSON | `saved_routes.geojson`: obiekt typu `FeatureCollection` (z tablicą `features`) lub `Feature`, ≤ 6 MiB (`jsonb::text`). `rides.track_geojson`: NULL albo obiekt `Feature`/`FeatureCollection`/`LineString`/`MultiLineString`, ≤ 6 MiB. Wyrażenia są w `coalesce(..., false)`, bo NULL w CHECK oznacza „spełnione” — błąd wykryty testem (brak `type` przechodził). |
| Frontend | `frontend/src/lib/dataLimits.js`: limity UI ciaśniejsze od bazy (nazwa 120, 8 tagów × 40, nazwa wyświetlana 80, okolica 160, GeoJSON 4 MiB). Tagi normalizowane i deduplikowane; za duża trasa traci najpierw alternatywy, a dopiero potem zapis jest odmawiany; za długi ślad GPS jest przerzedzany (pierwszy i ostatni punkt zostają, dystans/czas liczone wcześniej) zamiast blokować zapis jazdy. `23514` → polski komunikat; jazda zostaje lokalnie. |

Pliki: `supabase/migrations/20261007_r07_data_constraints.sql`, `supabase/schema.sql`, `supabase/checks/r07_preflight.sql`, `supabase/tests/rls_rpc.test.sql`, `supabase/tests/run-local.sh`, `frontend/scripts/staging-rls-smoke.mjs`, `frontend/src/lib/dataLimits.js` (+ test), `App.jsx`, `SaveRouteModal.jsx`, `SavedRoutes.jsx`, `components/ProfileModal.jsx`.

### Wdrożenie na istniejącą bazę

1. `supabase/checks/r07_preflight.sql` — tylko odczyt; pokazuje liczbę naruszeń na regułę, do 20 przykładowych ID i rozmiary GeoJSON (max, p99).
2. Migracja dodaje constrainty jako `NOT VALID` (od razu egzekwowane dla nowych zapisów), potem próbuje `VALIDATE`. Jeśli stare dane łamią regułę, migracja **nie przerywa się**: constraint zostaje `NOT VALID` z `WARNING`. Po poprawieniu danych wystarczy uruchomić migrację ponownie.
3. Istniejące jazdy z obcym `route_id` nie są zmieniane automatycznie; opcjonalny `UPDATE` jest w preflight jako komentarz.

### Weryfikacja pakietu 6

- `run-local.sh` nie mógł zostać uruchomiony na tej maszynie: `initdb.exe` jest zablokowany przez zasady kontroli aplikacji Windows, a WSL nie ma PostgreSQL. Blokady nie obchodzono.
- Zamiast tego te same pliki (shim, baseline, seed, wszystkie migracje ×2, `schema.sql` ×2, identyczne zapytanie dryfu z `run-local.sh`, `rls_rpc.test.sql`) wykonano na PGlite 0.5.8 (PostgreSQL w WASM) skryptem tymczasowym poza repo: **84 PASS / 0 FAIL / 0 GAP**, brak dryfu (138 faktów katalogu), migracje idempotentne.
- Scenariusz danych legacy (PGlite): preflight wskazał dokładnie wstawione złe rekordy; migracja przeszła; łamane constrainty zostały `NOT VALID`, pozostałe `VALID`; nowy zły zapis odrzucony z `23514`.
- Frontend: lint, typecheck, **29/29 testów** (7 plików), build (ostrzeżenie R23 bez zmian). Backend: **31/31**. `git diff --check`: sukces.
- `staging-rls-smoke.mjs`: dawny GAP zamieniony na asercję + sekcja „R07 data constraints”.
- **Staging (07.10.2026, uruchomione przez użytkownika):** migracja `20261007_r07_data_constraints.sql` wykonana, smoke **54 PASS / 0 FAIL / 0 GAP** — w tym odłączanie obcego `route_id`, odrzucenie ujemnych metryk, złego GeoJSON, za długich nazw i tagów oraz akceptacja trasy na granicach limitów.

### Ograniczenia

- Brak limitu liczby punktów jako osobnej reguły — limit bajtów jest praktycznym odpowiednikiem (ślad co ≥ 8 m: 4 MiB ≈ 90–100 tys. punktów).
- Limity rozmiaru (6 MiB) przyjęto bez danych produkcyjnych; potwierdzić zapytaniem rozmiarów z preflight.
- Zapis jazdy nadal może przekroczyć `numeric(6,2)` dla prędkości przy skrajnym błędzie GPS (istniejące ograniczenie typu, poza R07).
- CI job `supabase-sql` uruchomi `run-local.sh` z nową migracją dopiero po wypchnięciu zmian.

### Następne kroki

1. ~~Staging: preflight → migracja → smoke~~ — wykonane, 54/0/0.
2. Produkcja (tylko odczyt): `r07_preflight.sql`, aby zaplanować ewentualne poprawki danych przed oknem migracji.
3. ~~Retencja lokalnych draftów jazd~~ — pakiet 7.

## Pakiet 7 — retencja i zarządzanie lokalnymi draftami jazd (07.10.2026)

Decyzja użytkownika (07.10.2026): niewysłane jazdy są przechowywane na urządzeniu **30 dni od ostatniej zmiany**.

| Obszar | Zmiana |
| --- | --- |
| Retencja | `RIDE_DRAFT_RETENTION_DAYS = 30` w `frontend/src/lib/rideDraftStore.js`. `isRideDraftExpired` liczy od `updatedAt` (odświeżane przy każdym checkpoincie). Pozostałości `synced` i rekordy bez czytelnej daty wygasają od razu. |
| Automatyczne czyszczenie | `purgeExpiredRideDrafts()` przy starcie aplikacji, przed próbą odzyskania draftu (`App.jsx`). Błąd czyszczenia nie blokuje odzyskiwania. |
| Ekran | Profil → Prywatność → „Jazdy na tym urządzeniu” (`components/LocalRideDrafts.jsx`): nazwa, status (przerwana / zakończona niewysłana), data startu, dystans, data automatycznego usunięcia; „Wznów” / „Otwórz i wyślij” (istniejący ekran jazdy i retry) oraz „Usuń” z potwierdzeniem. Widoczne tylko drafty, które bieżące konto może otworzyć (własne i gościa). |
| Dokumenty | Polityka prywatności (`LegalPage.tsx`): sekcja „Dane na tym urządzeniu” z okresem 30 dni. |

### Weryfikacja pakietu 7

- Frontend: lint, typecheck, **31/31 testów** (nowe: granice retencji 29/30/30,01 dnia, `synced`, brak/zła data), build.
- Nie wykonano ręcznego testu UI w przeglądarce (ekran wymaga zalogowania) ani testu na urządzeniu z prawdziwym IndexedDB.

### Ograniczenia

- Czyszczenie działa tylko przy uruchomieniu aplikacji; drafty innych kont na wspólnym urządzeniu też są czyszczone po 30 dniach, ale nie są pokazywane na liście.
- Okres 30 dni jest decyzją produktową; pełna polityka retencji (R13/R15) nadal wymaga decyzji operatora/prawnika.

## Wdrożenie produkcyjne pakietów 1–7 (08.10.2026)

- `r07_preflight.sql` na produkcji: największa trasa ~107 KB (limit 6 MiB), brak jazd ze śladem GPS.
- Użytkownik uruchomił migracje 1–5 na produkcji, następnie merge [jkweg/CycleYourWay#3](https://github.com/jkweg/CycleYourWay/pull/3) (`2cc83fe`).
- CI na `main`: `frontend`, `backend`, `supabase-sql` — sukces (pierwsze wykonanie `run-local.sh` na prawdziwym PostgreSQL).
- Sprawdzone z zewnątrz: www.cycleyourway.pl serwuje nowy bundle (drafty, `get_shared_route`, `client_request_id`); `/api/health` OK; CORS wpuszcza `https://www.cycleyourway.pl`, odrzuca obcy `*.vercel.app` (403).
- Ręczny test funkcji w przeglądarce wykonał użytkownik („wszystko działa”).

## Pakiet 8 — B02/R03: trwały, wspólny budżet dostawcy (08.10.2026)

| Obszar | Zmiana |
| --- | --- |
| Baza | Migracja `20261008_api_quota.sql`: schemat `private` (niewystawiony przez PostgREST), `private.api_usage` (liczniki dzienne UTC per bucket), `private.api_kill_switch`, RPC `public.consume_api_quota()` — SECURITY DEFINER, EXECUTE tylko `service_role`. Obciąża atomowo bucket globalny i bucket aktora (wszystko albo nic), nigdy nie przekracza limitu, zwraca `retry_after` do północy UTC. Sprzątanie okien starszych niż 7 dni. |
| Backend | `lib/persistentQuota.js`: każdy faktyczny call ORS (retry i fan-out pętli też) wywołuje RPC przed wysłaniem; cache hit nie jest liczony. Odmowa zwalnia lokalny slot i nie dociera do ORS. `QUOTA_FAIL_MODE=open` (domyślnie; przy awarii Supabase zostaje limit w RAM) lub `closed` (503). Bez `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` warstwa jest wyłączona z ostrzeżeniem w logu, a `/api/health` pokazuje `quotaConfigured`. |
| Tożsamość | `lib/requestActor.js`: token Supabase z nagłówka `Authorization` weryfikowany przez `/auth/v1/user` (cache 5 min, także odrzuceń); nieweryfikowalny token = gość. Gość = IP, IPv6 grupowane per /64. |
| Proxy | `trust proxy` = `TRUST_PROXY_HOPS` (domyślnie 1). Wcześniej `req.ip` na Renderze był prawdopodobnie adresem proxy, więc limit 60/min „per IP” mógł być wspólny dla wszystkich. Pierwsze żądanie loguje liczbę wpisów `X-Forwarded-For` (bez adresów) do weryfikacji. |
| Limity domyślne | Directions: globalnie = `ORS_DIRECTIONS_PER_DAY` (2000), konto 300, gość 60 / dzień. Geocode: globalnie = `ORS_GEOCODE_PER_DAY` (3000), konto 800, gość 200 / dzień. Wszystko przez env. |
| Wyłącznik | `insert into private.api_kill_switch (kind, enabled) values ('all', true) on conflict (kind) do update set enabled = excluded.enabled;` — działa od następnego wywołania, bez redeployu; `kind` = `all` / `directions` / `geocode`. Odpowiedź 503 z polskim komunikatem. |
| Frontend | `fetchApi()` w `api.ts` dołącza token sesji do wszystkich wywołań backendu (route, loop, geocode, autocomplete, reverse, przeliczenia w trakcie jazdy). |

### Weryfikacja pakietu 8

- SQL (PGlite, wszystkie migracje ×2, `schema.sql` ×2, dryf, pełny zestaw): **102 PASS / 0 FAIL / 0 GAP** — w tym brak dostępu anon/authenticated do RPC i schematu `private`, limit aktora i globalny, rozliczanie wszystko-albo-nic, odmowa kosztu ponad limit, walidacja argumentów, wyłącznik per rodzaj.
- Backend: **39/39** (nowe: jednostkowe quota/aktor/IPv6/cache tokenów oraz test HTTP: gość vs konto vs zły token, 429 z `Retry-After` i komunikatem, 503 przy wyłączniku, brak wywołania ORS po odmowie, cache hit nieliczony).
- Frontend: lint, typecheck, **31/31**, build.
- `staging-rls-smoke.mjs`: nowa sekcja „B02 provider quota”; na stagingu jeszcze nie uruchomiona.

### Wdrożenie (kolejność dowolna, każdy stan pośredni jest bezpieczny)

1. Staging: migracja `20261008_api_quota.sql` → smoke.
2. Produkcja: ta sama migracja w SQL Editorze.
3. Merge kodu (backend bez nowych zmiennych działa jak dotąd).
4. Render → Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (produkcyjne). Po restarcie `/api/health` → `quotaConfigured: true`; w logu sprawdzić `x-forwarded-for entries` (oczekiwane 1 przy `TRUST_PROXY_HOPS=1`).

### Ograniczenia

- Okno dzienne jest stałe (UTC), nie kroczące; limity minutowe i współbieżność nadal w RAM procesu.
- Każde wywołanie ORS dodaje jedno zapytanie do Supabase (~kilkadziesiąt ms); weryfikacja tokenu raz na 5 min na token.
- Gość za NAT (np. sieć komórkowa, firma) dzieli limit z innymi; IPv6 per /64.
- `/api/reverse` (Nominatim) nie jest objęty tym limitem — ma własny throttle.
- Limity domyślne są szacunkiem; dopasować do realnego ruchu po pierwszych dniach (`select * from private.api_usage order by window_start desc`).

### Wdrożenie pakietu 8 (08.10.2026)

- Migracja `20261008_api_quota.sql` na produkcji, merge [jkweg/CycleYourWay#4](https://github.com/jkweg/CycleYourWay/pull/4) (`dd74b4b`), zmienne `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` na Render; `/api/health` → `quotaConfigured: true`.
- `private.api_usage` po ruchu testowym: osobne buckety konta (`actor:user:<uuid>`) i gości, sumy zgodne z bucketami globalnymi.
- Proxy: z `TRUST_PROXY_HOPS=1` goście byli liczeni po wewnętrznych adresach Render (`10.x`), a log pokazał `x-forwarded-for entries=3`. Po ustawieniu `TRUST_PROXY_HOPS=3` na Render gość jest liczony po publicznym IP klienta; zapytanie z podrobionym `X-Forwarded-For: 1.2.3.4` zostało przypisane do prawdziwego IP (brak bucketu `1.2.3.4`).
- Obserwacja: jednorazowy błąd `Parse Error: Expected HTTP/` przy geocodingu ~24 s po starcie usługi (błąd połączenia z dostawcą, nie quota). Jeśli się powtórzy — jedno ponowienie dla błędów połączenia (razem z R09).
- **B02 zamknięte** dla jednego backendu na Render. Pozostaje: limity minutowe w RAM procesu, dostrojenie limitów dziennych do ruchu.

## Pakiet 9 — minimum operacyjne: monitoring limitu, odporność, ErrorBoundary (08.10.2026)

| Obszar | Zmiana |
| --- | --- |
| Monitoring limitu | Migracja `20261008_api_usage_status.sql`: RPC `get_api_usage_today()` (tylko `service_role`) zwraca globalne zużycie dnia i aktywne wyłączniki. Backend: `GET /api/health/quota` → 200 albo 503 (`quota_high` ≥ `QUOTA_ALERT_PERCENT`, domyślnie 80; `kill_switch`; `quota_unreachable`; `not_configured`). Tylko procenty, bez bucketów użytkowników. |
| R09 (część) | Jedno ponowienie dla błędów połączenia bez odpowiedzi HTTP (`ECONNRESET`, `EPIPE`, `ECONNREFUSED`, `EAI_AGAIN`, `HPE_*`, „Parse Error”, „socket hang up”) w Directions i Pelias; każda próba jest osobno liczona w limicie. Timeouty i błędy HTTP nie są ponawiane. Odpowiedź na błąd `Parse Error: Expected HTTP/` z logu Render. |
| R11 (część) | `components/ErrorBoundary.tsx`: cała aplikacja i osobno nawigacja. Błąd w nawigacji pokazuje „Wróć do planera” (draft jazdy zostaje w IndexedDB i nie otwiera się ponownie automatycznie w tej sesji); błąd gdzie indziej — „Odśwież aplikację”. Zgłoszenie do Sentry z `where`. Nieaktualny chunk po wdrożeniu → automatyczne przeładowanie, najwyżej raz na minutę (`lib/chunkReload.ts`, część R27). |
| Dokumentacja | `docs/OPS_LAUNCH.md` §7: monitory UptimeRobot (API, limit, strona), Sentry, polecenia wyłącznika, backup + próba odtworzenia na stagingu, SMTP. |

### Weryfikacja pakietu 9

- SQL (PGlite, wszystkie 7 migracji ×2, `schema.sql` ×2, dryf): **104 PASS / 0 FAIL / 0 GAP**.
- Backend: **41/41** (nowe: klasyfikacja błędów przejściowych, dokładnie jedno ponowienie i podwójne naliczenie, brak ponowienia HTTP 403, statusy `/api/health/quota`, test HTTP 503 przy 95% zużycia).
- Frontend: lint, typecheck, **32/32**, build.
- Nie sprawdzono wizualnie ekranu ErrorBoundary w przeglądarce.

### Ograniczenia

- Alarm 5xx backendu nadal tylko pośrednio (monitor `/api/health`); brak Sentry/APM po stronie backendu.
- Deadline całego żądania, anulowanie upstream po rozłączeniu klienta i inflight dedupe (reszta R09) — otwarte.
- Testy cleanup GPS (reszta R11) — otwarte.

## Pakiet 10 — R13/R15/R16: szkic polityki prywatności i mniej odbiorców danych (08.10.2026)

| Obszar | Zmiana |
| --- | --- |
| Szkic polityki | `docs/legal/POLITYKA_PRYWATNOSCI_SZKIC.md`: pełny projekt tekstu (administrator, kategorie danych, cele i podstawy, odbiorcy z lokalizacją, transfery, retencja, dane na urządzeniu, prawa i sposób realizacji w aplikacji, UODO) oraz 11 pytań do operatora i notatki dla prawnika (B06, role dostawców, art. 399 PKE). Nie jest jeszcze w `/privacy`. |
| Google Fonts → własny hosting | Fonty (Fraunces Variable z osią opsz, Great Vibes, Source Sans 3 400–700) z pakietów `@fontsource` w bundlu; usunięte `<link>` do fonts.googleapis.com. Google nie dostaje już IP każdego odwiedzającego. Sprawdzone w przeglądarce: fonty załadowane, 0 żądań do Google, `dist` bez odwołań. |
| Oznaczenie routingu (R16) | `ROUTING_ATTR` w `lib/mapTiles.ts`: „Trasy © openrouteservice.org by HeiGIT” na mapie planera i nawigacji (wymóg CC BY-SA 4.0 wyników ORS). Sprawdzone w przeglądarce. |
| Regulamin | Usunięta nieaktualna wzmianka o awaryjnym OSRM; licencje OSM (ODbL) i ORS (CC BY-SA 4.0), Nominatim. |
| Dane na urządzeniu (R15) | Profil → Prywatność: licznik i przycisk „Wyczyść historię” wyszukiwanych adresów (`clearAddressHistory`). |

### Weryfikacja pakietu 10

- Frontend: lint, typecheck, **32/32**, build; podgląd w przeglądarce (landing + planer).

### Do zrobienia po odpowiedziach operatora

- Uzupełnić pola `[[…]]` w szkicu, przegląd prawny, przeniesienie tekstu do `LegalPage.tsx`.
- B06 nadal blokuje publiczną betę niezależnie od treści polityki.

## Pakiet 11 — R28: polskie komunikaty błędów sieci (08.10.2026)

- `frontend/src/lib/userMessages.js`: `toUserMessage()` zamienia „Failed to fetch” (Chrome), „NetworkError when attempting…” (Firefox), „Load failed” (Safari) na „Brak połączenia z serwerem…”, a stronę błędu HTML parsowaną jako JSON na „Serwer odpowiedział nieprawidłowo…”; komunikaty serwera/aplikacji przechodzą bez zmian.
- Użyte przy wyznaczaniu trasy, pętli, wyszukiwaniu adresu, zapisie trasy, linku na telefon i zapisie jazdy (z informacją, że jazda została na urządzeniu). Usunięte angielskie fallbacki („Unexpected route error.”) i deweloperski komunikat „Uruchom backend: npm run dev” w `api.ts`.
- Weryfikacja: lint, typecheck, **35/35** (nowe 3 testy), build.
- Otwarte z R28/R29: stany offline/empty w listach, dostępność modali (focus trap, Escape), reduced motion.
