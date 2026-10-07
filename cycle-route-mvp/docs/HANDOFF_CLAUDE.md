# Cycle Your Way — handoff dla kolejnego agenta

Stan na **07.10.2026**. Ten dokument służy do kontynuacji audytu i napraw przygotowujących MVP do kontrolowanej bety.

## 1. Cel i zasada pracy

Projekt przeszedł pełny audyt gotowości produkcyjnej. Raport bazowy znajduje się w [`../PRODUCTION_READINESS_AUDIT.md`](../PRODUCTION_READINESS_AUDIT.md), a wykonane pakiety w [`IMPLEMENTATION_PROGRESS.md`](IMPLEMENTATION_PROGRESS.md).

Audyt opisuje stan sprzed napraw. Nie należy kopiować jego historycznych wyników testów ani uznawać naprawionych punktów za nadal otwarte bez sprawdzenia aktualnego kodu. Nadal obowiązuje decyzja **NO-GO dla nieograniczonej publicznej bety**, ponieważ część blokad zależy od infrastruktury, dostawców, prawa i testów stagingowych.

Zmiany mają być wykonywane małymi, sprawdzalnymi pakietami. Nie wykonywać operacji na produkcyjnej bazie, deploymentu ani zmian kont dostawców bez wyraźnego polecenia użytkownika.

## 2. Stan Git i katalogów

- Katalog aplikacji: `D:\CycleYourWay\CycleYourWay\cycle-route-mvp`.
- Repozytorium Git zaczyna się katalog wyżej: `D:\CycleYourWay\CycleYourWay`.
- Gałąź: `main`.
- Commit bazowy: `7da22a3 Fix frontend CI by teaching ESLint to parse TypeScript.`
- Wszystkie prace audytowe i pakiety 1–4 są **niezatwierdzone**.
- Nie resetować ani nie czyścić working tree. Obecne zmiany stanowią jeden spójny zestaw prac.
- `git diff --check` przechodzi; komunikaty o konwersji LF → CRLF są ostrzeżeniami środowiska Windows.

Zmodyfikowane pliki śledzone:

- `backend/.env.example`
- `backend/lib/geocode.js`
- `backend/server.js`
- `docs/MOBILE.md`
- `docs/SUPABASE_VERCEL.md`
- `frontend/src/App.jsx`
- `frontend/src/RideView.jsx`
- `frontend/src/SavedRoutes.jsx`
- `frontend/src/components/LegalPage.tsx`
- `frontend/src/components/ProfileModal.jsx`
- `frontend/src/supabaseClient.ts`
- `frontend/src/types/geo.ts`
- `supabase/schema.sql`

Nowe, nieśledzone materiały i kod:

- `PRODUCTION_READINESS_AUDIT.md`
- `docs/IMPLEMENTATION_PROGRESS.md`
- `docs/HANDOFF_CLAUDE.md`
- `docs/audit/`
- `backend/lib/apiSafety.test.js`
- `backend/lib/providerBudget.js`
- `backend/lib/providerBudget.test.js`
- `frontend/src/lib/paginatedExport.js`
- `frontend/src/lib/paginatedExport.test.js`
- `frontend/src/lib/rideDraftStore.js`
- `frontend/src/lib/rideDraftStore.test.js`
- `frontend/src/lib/shareLinks.js`
- `frontend/src/lib/shareLinks.test.js`
- `supabase/migrations/`

## 3. Co zostało wykonane

### Pakiet 1 — granice API i dostawców

- Autocomplete używa tylko Pelias/ORS. Nominatim nie jest fallbackiem autocomplete.
- Usunięto cichy fallback OSRM z routingu.
- Odmowa lub niedostępność ORS kończy się kontrolowanym `503`.
- Retry profili ORS zachowują wszystkie waypointy.
- Dodano współdzielone w obrębie procesu budżety minute/day/concurrency dla Directions i Pelias.
- Cache hit nie zużywa budżetu dostawcy.
- CORS używa dokładnej allowlisty; usunięto dopasowanie dowolnych domen Vercel.
- Błędy parsera, CORS, limitu body i walidacji mają kontrolowane odpowiedzi JSON.
- Import aplikacji Express nie otwiera portu, co umożliwia testy HTTP z atrapami dostawców.

Główne pliki: `backend/server.js`, `backend/lib/geocode.js`, `backend/lib/providerBudget.js`, `backend/lib/apiSafety.test.js`, `backend/lib/providerBudget.test.js`.

Ograniczenie: licznik jest w RAM jednego procesu. Restart go zeruje, a kilka instancji ma osobne limity. Publiczne proxy nadal wymaga docelowej kontroli konta/gościa/IP i wspólnego trwałego budżetu.

### Pakiet 2 — trwały zapis jazdy

- Aktywna jazda ma UUID sesji i checkpoint w IndexedDB co 10 sekund.
- Zapisywane są ślad, czas, pauza, liczniki i dane trasy.
- Po przeładowaniu aktywny draft wraca jako wstrzymany.
- Zakończona, niewysłana jazda wraca do podsumowania i może być ponowiona.
- Draft konta nie jest otwierany innemu kontu.
- Zapis do Supabase czeka na rzeczywisty wynik; błąd pozostawia lokalną kopię i przycisk retry.
- `client_request_id` oraz unikalność `(user_id, client_request_id)` zapewniają idempotencję retry.
- Jazda gościa zostaje lokalnie i może zostać zsynchronizowana po zalogowaniu.

Główne pliki: `frontend/src/App.jsx`, `frontend/src/RideView.jsx`, `frontend/src/lib/rideDraftStore.js`, `supabase/migrations/20261001_ride_idempotency.sql`.

Ograniczenie: brak ekranu zarządzania lokalnymi draftami i automatycznej retencji. Nie wykonano testu terenowego ani testu ubicia aplikacji na prawdziwym urządzeniu.

### Pakiet 3 — bezpieczniejsze udostępnianie tras

- Usunięto anonimową politykę tabeli opartą o `is_public=true`.
- Publiczny odbiorca korzysta z `get_shared_route(token)`.
- RPC zwraca tylko nazwę, tryb, geometrię, dystans i czas; nie zwraca właściciela, ID rekordu, tagów ani tokenu.
- `set_route_sharing` sprawdza właściciela, tworzy losowy token i usuwa go przy wyłączeniu.
- Ponowne włączenie generuje nowy link.
- Stare publiczne linki są zachowane migracyjnie przez początkowy token równy istniejącemu UUID trasy.
- `?ride=<id>` jest linkiem właściciela wymagającym zalogowania na właściwe konto.
- Teksty UI i prawne mówią o niepublicznym, odwoływalnym linku.

Główne pliki: `frontend/src/App.jsx`, `frontend/src/SavedRoutes.jsx`, `frontend/src/lib/shareLinks.js`, `frontend/src/components/LegalPage.tsx`, `supabase/migrations/20261001_unlisted_route_sharing.sql`.

Ograniczenie: RLS i RPC nie zostały przetestowane na prawdziwej bazie dla anon/konto A/konto B ani po rotacji tokenu.

### Pakiet 4 — kompletność danych i skalowanie list

- Eksport konta pobiera profil oraz wszystkie trasy i jazdy stronami po 500 rekordów.
- Eksport ma wersję formatu i jawnie przerywa się po błędzie lub przekroczeniu limitu 50 000 rekordów na zasób; nie generuje cicho niepełnego pliku.
- `get_own_account_stats()` liczy dokładne sumy w bazie.
- Osiem ostatnich tras i jazd w profilu jest tylko podglądem.
- Lista tras pobiera 20 lekkich rekordów na stronę.
- Wyszukiwanie po nazwie, filtrowanie i sortowanie wykonuje baza.
- Ciężkie `geojson` jest pobierane dopiero przy użyciu trasy.
- Dodano indeks `(user_id, created_at)` dla eksportu jazd.

Główne pliki: `frontend/src/components/ProfileModal.jsx`, `frontend/src/SavedRoutes.jsx`, `frontend/src/lib/paginatedExport.js`, `supabase/migrations/20261001_account_stats.sql`.

Ograniczenie: RPC i eksport nie zostały sprawdzone z dużym rzeczywistym kontem na staging.

## 4. Migracje — przygotowane, ale niewykonane

W katalogu `supabase/migrations/` jest pięć migracji:

1. `20261001_ride_idempotency.sql`
2. `20261001_unlisted_route_sharing.sql`
3. `20261001_account_stats.sql`
4. `20261007_harden_sharing_and_rpc_grants.sql` (pakiet 5)
5. `20261007_r07_data_constraints.sql` (pakiet 6, R07) — przed nią `supabase/checks/r07_preflight.sql`; uruchomiona na stagingu 07.10.2026 (smoke 54 PASS / 0 FAIL / 0 GAP), na produkcji nie.

**Aktualizacja 07.10.2026 (pakiet 5):** punkty 3–7 poniżej mają już automaty: `supabase/tests/run-local.sh` (lokalny Postgres, wykonany: 63 PASS / 0 FAIL / 3 GAP) i `frontend/scripts/staging-rls-smoke.mjs` (staging, wykonany 07.10.2026 przez użytkownika: 44 PASS / 0 FAIL / 1 GAP R07). Instrukcja: `supabase/tests/README.md`. Szczegóły: `IMPLEMENTATION_PROGRESS.md`, pakiet 5.

Migracje 1–4 zostały uruchomione na osobnym projekcie staging (07.10.2026); żadna nie została uruchomiona na produkcji. `supabase/schema.sql` zawiera docelowy pełny stan schematu, ale nie zastępuje bezpiecznego procesu migracyjnego istniejącej bazy.

Przed wydaniem frontendu pakietów 2–4 należy:

1. utworzyć lub wskazać odseparowany projekt staging Supabase;
2. zrobić kopię i sprawdzić dane niezgodne z przyszłymi constraintami;
3. uruchomić migracje na staging;
4. przetestować RLS/RPC dla anon, właściciela i drugiego konta;
5. przetestować retry zapisu tej samej jazdy;
6. przetestować stary link share, wyłączenie, ponowne włączenie i stary token;
7. przetestować eksport konta mającego ponad 8 oraz ponad 500 rekordów;
8. dopiero po pozytywnym smoke teście planować wspólne okno migracji i frontendu.

Nie używać produkcyjnych danych do testów integracyjnych.

## 5. Ostatnia pełna weryfikacja lokalna

Wyniki uzyskane 01.10.2026 po pakiecie 4:

- frontend `npm test -- --run`: **24/24**, 6 plików;
- frontend `npm run lint`: sukces;
- frontend `npm run typecheck`: sukces;
- frontend `npm run build`: sukces;
- backend `npm test`: **31/31**;
- `git diff --check`: sukces.

Build nadal ostrzega o głównym chunku około **843 kB / 262 kB gzip**. To znane zadanie R23, a nie błąd kompilacji.

Na Windows Vite/Vitest mogą zakończyć się `spawn EPERM` w piaskownicy. W takim przypadku należy ponowić `npm test -- --run` lub `npm run build` z zatwierdzonym uruchomieniem poza piaskownicą. Nie interpretować `spawn EPERM` jako regresji aplikacji.

Przed dalszym pakietem uruchomić:

```powershell
cd D:\CycleYourWay\CycleYourWay\cycle-route-mvp\frontend
npm run lint
npm run typecheck
npm test -- --run
npm run build

cd D:\CycleYourWay\CycleYourWay\cycle-route-mvp\backend
npm test

cd D:\CycleYourWay\CycleYourWay\cycle-route-mvp
git diff --check
```

## 6. Najważniejsze otwarte blokady

### Nadal blokują publiczną betę

1. **B02 / R03 — trwały budżet i nadużycia API.** Obecny limiter działa tylko w jednym procesie i nie rozróżnia zalogowanego konta, gościa ani zaufanego klienta. Potrzebny wspólny licznik lub architektura gwarantująca jedną instancję, cap fan-out oraz kill switch kosztów.
2. **B06 / R02 — warunki przetwarzania lokalizacji.** Trzeba uzyskać pisemne ustalenie, czy aktualna pozycja i adresy mogą być wysyłane do używanego dostawcy, albo wybrać zgodnego dostawcę. To decyzja operatora/prawna, nie sama zmiana kodu.
3. **R12/R17 — staging i testy RLS/RPC.** Kod SQL nie jest dowodem wdrożenia. Potrzebne są testy anon/A/B, manipulacji UUID, cascade delete i bezpośrednich zapisów przez PostgREST.
4. **R13/R15 — dokumenty, retencja, odbiorcy i DPA.** Obecne teksty poprawiono tylko w zakresie linków. Nadal wymagają danych administratora, podstaw, okresów retencji, odbiorców, regionów i procedur praw użytkownika.
5. **R24–R26 — operacje.** Brak potwierdzonego staging/prod separation, backup/restore, SMTP, monitoringu quota/5xx/save, alertów i procedury incydentu.
6. **R18/R20 — E2E i urządzenia.** Nie wykonano pełnego plan → zapis → jazda → zakończenie, testu offline/retry ani jazdy Safari/Chrome Android/APK.

### Ważne prace możliwe lokalnie

- ~~**R07**~~ — wykonane w kodzie (pakiet 6, 07.10.2026); pozostaje uruchomienie na stagingu i preflight na produkcji. Szczegóły: `IMPLEMENTATION_PROGRESS.md`, pakiet 6.
- ~~**Retencja draftów**~~ — wykonane (pakiet 7): 30 dni, automatyczne czyszczenie i ekran w Profil → Prywatność.
- **R09:** deadline całego żądania, anulowanie upstream po rozłączeniu klienta, inflight dedupe i ograniczona kolejka.
- **R10:** ponowny online audit zależności i małe, kontrolowane aktualizacje; historyczny wynik audytu szybko się starzeje.
- **R11:** ErrorBoundary i pełne testy cleanup watch GPS przy szybkim wejściu/wyjściu.
- **R16:** `THIRD_PARTY_NOTICES`, komplet attribution i decyzje licencyjne dla assetów.
- **R19:** dodać typecheck, testy polityk/migracji, secret scan i dependency audit do CI; sprawdzić branch protection.
- **R22:** wykres wysokości z pełnych współrzędnych przed downsamplingiem.
- **R23:** pomiar i podział głównego chunku, skrócenie stałego splash, limity cache według bajtów.
- **R27:** wersjonowanie Service Workera, recovery po niezgodnym deployu i test Android release.
- **R28/R29:** polskie komunikaty sieciowe, accessibility modali/comboboxów, focus trap, Escape i reduced motion.

## 7. Rekomendowany kolejny pakiet

Jeśli nie ma dostępu do staging Supabase ani decyzji operatora o dostawcy, następny sensowny pakiet lokalny to **R07 + retencja lokalnych draftów**, w tej kolejności:

1. zinwentaryzować wszystkie zapisy `saved_routes`, `rides` i `profiles` z frontendu;
2. przygotować addytywną migrację z constraintami i funkcjami walidującymi JSONB;
3. przed dodaniem constraintów opisać zapytania wykrywające stare niezgodne rekordy;
4. dodać testy SQL uruchamiane wyłącznie na izolowanej bazie albo przynajmniej kontraktowe testy payloadów po stronie aplikacji;
5. dodać listę lokalnych draftów/pending rides z datą, statusem, retry i usunięciem;
6. ustalić w kodzie jawny, udokumentowany okres retencji, ale nie wymyślać okresu prawnego bez decyzji operatora;
7. po zmianach ponownie wykonać pełny zestaw kontroli z sekcji 5.

Jeżeli dostęp do staging jest dostępny, wyższy priorytet ma **R12/R17**: uruchomienie obecnych trzech migracji i automatyczne testy RLS/RPC. Nie łączyć tych testów z produkcyjnym Supabase.

## 8. Reguły bezpieczeństwa kontynuacji

- Nie usuwać istniejących zmian i nie wykonywać `git reset --hard`.
- Nie uruchamiać migracji na produkcji ani nie wdrażać aplikacji bez wyraźnego polecenia.
- Nie używać prawdziwych kluczy dostawców w testach.
- Testy backendu mają korzystać z atrap; nie wykonywać load testu publicznego ORS/Nominatim.
- Nie uznawać CORS za uwierzytelnianie.
- Nie deklarować gotowości produkcyjnej na podstawie samego przejścia unit testów.
- Każdy kolejny pakiet dopisać do `docs/IMPLEMENTATION_PROGRESS.md`, wraz z ograniczeniami i faktycznie wykonanymi testami.
