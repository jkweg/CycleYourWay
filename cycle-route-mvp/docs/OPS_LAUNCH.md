# Co musicie zrobić sami (poza kodem)

Kod launchowy jest gotowy w repo. Poniżej tylko operacje w panelach / kontach / testach.

## 1. Frontend (Vercel / hosting `cycleyourway.pl`)

Ustaw i **redeploy**:

| Zmienna | Przykład / uwagi |
|---------|------------------|
| `VITE_API_URL` | URL backendu Render/Railway **bez** `/` na końcu |
| `VITE_SUPABASE_URL` | Project URL z Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable / anon key |
| `VITE_APP_ORIGIN` | `https://cycleyourway.pl` |
| `VITE_MAP_TILES_URL` | MapTiler/Stadia (wymagane na prod — nie OSM.org) |
| `VITE_MAP_TILES_ATTR` | np. `© MapTiler © OpenStreetMap contributors` |
| `VITE_SENTRY_DSN` | opcjonalnie, mocno zalecane |

Po deploy sprawdź:

- `https://cycleyourway.pl/privacy` i `/terms`
- `https://cycleyourway.pl/.well-known/assetlinks.json` → JSON (nie HTML)

## 2. Backend (Render / Railway)

- `ORS_API_KEY` z limitem na realny ruch
- Redeploy po pullu (CORS domeny jest już w kodzie)
- Unikaj cold startu 30 s (paid / always-on) albo świadomie akceptujcie na start
- Monitoring: UptimeRobot (lub podobny) na `GET /api/health`

## 3. Supabase Auth

- **Site URL** = `https://cycleyourway.pl`
- **Redirect URLs**: `https://cycleyourway.pl/**` (+ lokalne jeśli trzeba)
- Google provider (Client ID/Secret), jeśli ma działać „Kontynuuj z Google”
- Test: rejestracja, potwierdzenie e-mail, reset hasła na prod domenie

## 4. Android App Links

1. Weź SHA-256 z Play Console (App integrity) lub `keytool -list -v`
2. Wklej do `frontend/public/.well-known/assetlinks.json` zamiast `REPLACE_WITH_UPLOAD_KEY_SHA256`
3. Commit + redeploy frontu
4. Instrukcja: `frontend/public/.well-known/README.md`

## 5. Build APK/AAB + Play Console

- Env w buildzie = te same `VITE_*` co prod web
- `npm run cap:sync` → Android Studio → Signed Bundle
- Keystore w bezpiecznym backupie
- Play: aplikacja `com.cycleyourway.app`
- Privacy policy URL = `https://cycleyourway.pl/privacy`
- Data safety: lokalizacja **foreground**, konto — **bez** background location
- Closed testing + 5–10 testerów
- Przy każdym uploadzie zwiększ `versionCode` w `android/app/build.gradle`

## 6. Smoke test (Wam, nie kodowi)

**Web:** landing, A→B, pętla, zapis, nawigacja + GPS, share/`?ride=`, kafelki nie-OSM, brak CORS.

**Telefon:** instalacja, planer, jazda ≥ 15–30 min (keep-awake), permission gate, Google login, deep link `https://cycleyourway.pl/?ride=<id>`, brak krytycznych crashy.

## 7. Świadomie później

Stripe, Play Billing, background GPS, offline, iOS — poza darmowym launchem.
