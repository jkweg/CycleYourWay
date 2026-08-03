# Cycle Your Way — Mobile (Android / Capacitor)

## Strategia

Aplikacja mobilna to **Capacitor wrapper** wokół istniejącego Vite/React SPA.
Backend (ORS proxy) i Supabase pozostają bez zmian.

Poziomy:
- **v1** — foreground GPS + keep-awake, deep links, Google auth, komercyjne kafelki, Play closed testing
- **v2** — background GPS (`VITE_ENABLE_BG_GPS` + plugin), analytics funnel, dłuższy track history
- **v3** — offline, IAP, iOS (po stabilnym Android)

## Wymagania

- Node.js ≥ 20
- Android Studio + SDK (API 24+)
- Konto Google Play (do closed testing)
- Opcjonalnie: `VITE_SENTRY_DSN`, `VITE_MAP_TILES_URL`, Google OAuth w Supabase

## Env (frontend)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=https://your-backend.onrender.com
VITE_SENTRY_DSN=
VITE_MAP_TILES_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY
VITE_MAP_TILES_ATTR=© MapTiler © OpenStreetMap
VITE_APP_ORIGIN=https://your-frontend.vercel.app
# v2: odblokuj background GPS po instalacji pluginu
# VITE_ENABLE_BG_GPS=true
```

Backend `ALLOWED_ORIGINS` musi zawierać m.in.:

```
capacitor://localhost,https://localhost,https://your-frontend.vercel.app
```

## Build Android

```bash
cd cycle-route-mvp/frontend
npm install
npm run icons
npm run build
npx cap add android   # tylko raz (już w repo)
npx cap sync android
npx cap open android
```

W Android Studio: Run na emulatorze / urządzeniu.

Skrypt pomocniczy: `npm run cap:sync`.

### Wersjonowanie

W `android/app/build.gradle` (`defaultConfig`):
- `versionCode` — integer rosnący przy każdym uploadzie do Play
- `versionName` — semver widoczny dla użytkownika

## Deep links (App Links)

1. Hostuj `/.well-known/assetlinks.json` na domenie produkcyjnej (już w `public/`).
2. Uzupełnij `sha256_cert_fingerprints` kluczem upload/signing.
3. W `android/app/src/main/AndroidManifest.xml` zamień `REPLACE_WITH_YOUR_DOMAIN` na host z `VITE_APP_ORIGIN`.
4. Ścieżki `/?ride=` i `/?share=` otwierają apkę (`appUrlOpen` + cold start).

Aplikacja nasłuchuje `appUrlOpen` i ustawia `pendingRideId` / `pendingShareId`.

## Uprawnienia lokalizacji

- Pierwszy start nawigacji / „moja lokalizacja” pokazuje `LocationPermissionGate`.
- v1: GPS **foreground** + keep-awake (ekran włączony, portrait lock).
- v2: zainstaluj `@capacitor-community/background-geolocation`, ustaw `VITE_ENABLE_BG_GPS=true`,
  uzasadnij background location w Play Console (Data safety + permission declaration).

## Auth

- Email/hasło: bez zmian.
- Google: włącz provider w Supabase Auth → Google, dodaj redirect URI Capacitor / Vercel.
- Przycisk „Kontynuuj z Google” wywołuje `signInWithOAuth({ provider: 'google' })`.

## Mapa

W produkcji ustaw `VITE_MAP_TILES_URL` (MapTiler/Stadia). Publiczne `tile.openstreetmap.org` tylko do developmentu.

## Analytics / Sentry

Eventy (CustomEvent `cyw:analytics` + opcjonalnie `gtag` / Sentry):

| Event | Kiedy |
| --- | --- |
| `app_open` | start SPA |
| `plan_complete` / `route_ok` / `route_fail` | wynik planowania |
| `ride_start` / `ride_prepare_ok` / `ride_prepare_fail` | nawigacja |
| `ride_saved` | zapis historii jazdy |
| `fg_gps_active` / `bg_gps_*` | tryb GPS |

## Testy terenowe (v1 checklist)

Przed closed testingem przejedź 2–3 trasy (miasto + podmiejska):

- [ ] A→B planowanie + start nawigacji
- [ ] Pętla 20–40 km start + manewry TTS
- [ ] Off-route → recalc wraca na trasę
- [ ] Keep-awake ≥ 30 min przy włączonym ekranie
- [ ] Deep link `?ride=` otwiera trasę w apce
- [ ] Zapis jazdy pojawia się w historii (track + metryki)
- [ ] Brak krytycznych crashy w Sentry

## Play Console checklist (closed testing)

- [ ] Signing key + `versionCode`
- [ ] Ikony / feature graphic / screenshoty
- [ ] Privacy policy URL
- [ ] Data safety (lokalizacja, konto)
- [ ] 5–10 testerów wewnętrznych
- [ ] Crash-free (Sentry)
- [ ] Uzasadnienie lokalizacji (foreground; background dopiero w v2)

## Znane ograniczenia v1

- Brak offline map
- Brak subskrypcji / IAP
- Tracking przy zgaszonym ekranie: keep-awake utrzymuje ekran; pełny background GPS = v2
- iOS w kolejnej fali

## Backlog iOS (po Android v1)

- `npx cap add ios`
- Apple Sign-In + Universal Links
- Testy TestFlight
