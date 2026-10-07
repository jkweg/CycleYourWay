# Materiały audytu — 27.09.2026

Raport: [PRODUCTION_READINESS_AUDIT.md](../../PRODUCTION_READINESS_AUDIT.md).
Badany commit: `7da22a3`. Materiały nie zmieniają kodu aplikacji, lockfile ani danych produkcyjnych.

## Weryfikacja lokalna

- Frontend: `npm test` — 18/18; `npm run typecheck`, `npm run lint` i `npm run build` — sukces.
- Backend: `npm test` — 21/21.
- W obu katalogach wykonano online `npm audit --json --prefer-online` oraz `npm outdated --json --prefer-online`; odpowiadające pliki JSON zachowują wyniki z dnia audytu. Niezerowy kod tych poleceń oznacza znalezione problemy lub aktualizacje, nie automatycznie awarię odczytu.
- `DEPENDENCIES.md` zawiera inwentarz bezpośrednich zależności.
- `planner-api-failure.png` pokazuje lokalny planer z niedostępnym API. To obraz desktopowy, nie dowód testu urządzenia mobilnego.
- `heigit-terms-snapshot.txt` zawiera skrót odczytu warunków i planów ze stron HeiGIT, nie pełną kopię regulaminu.

## Odtwarzanie diagnozy backendu

Po instalacji zależności backendu, z katalogu aplikacji:

```powershell
node docs/audit/backend-probe.cjs
```

Skrypt uruchamia rzeczywisty Express na losowym porcie localhost. Podmienia Axios i ładowanie dotenv w swoim procesie, używa fikcyjnego klucza i nie wysyła zapytań do dostawców ani bazy. Po zakończeniu zamyka serwer.

Probe zaktualizowano po pierwszym pakiecie napraw: oczekuje odrzucenia obcego origin Vercel, błędów JSON, braku wywołania dostawcy dla nieprawidłowej trasy, braku fallbacku OSRM i osiągnięcia limitu 429. Pełniejsze testy regresji HTTP są w `backend/lib/apiSafety.test.js`, uruchamianym przez `npm test` w backendzie. Logowane błędy atrap ORS są celowe. Wyniki i JSON-y audytu powyżej pozostają historycznym stanem sprzed napraw.

Nie wykonano pełnego E2E z kontem, testów RLS na żywej bazie, testów terenowych GPS ani odczytu konfiguracji kont hostingowych. Zakres i ograniczenia opisuje raport.
