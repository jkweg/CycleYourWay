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
VITE_APP_ORIGIN=https://cycleyourway.pl
# v2: odblokuj background GPS po instalacji pluginu (+ uprawnienia w AndroidManifest)
# VITE_ENABLE_BG_GPS=true
```

Backend `ALLOWED_ORIGINS` musi zawierać m.in. poniższe originy oraz używane domeny produkcyjne. Ustawiona lista zastępuje wszystkie domyślne originy z `server.js`:

```
capacitor://localhost,https://localhost,https://cycleyourway.pl,https://www.cycleyourway.pl
```

## Build Android

```bash
cd cycle-route-mvp/frontend
npm install
npm run cap:sync      # vite build --mode android + npx cap sync android
npx cap open android  # albo: cd android && ./gradlew assembleDebug
```

- Tryb `android` (`.env.android`, w repo): produkcyjne `VITE_API_URL` i `VITE_APP_ORIGIN`. Supabase z `.env.local`, klucz MapTiler w `.env.android.local` (git-ignored). Zwykłe `npm run build` z `.env.local` wskazuje `localhost` — nie nadaje się do APK.
- Gradle 8.14 wymaga **JDK 17 lub 21**. JBR z najnowszego Android Studio to Java 25 („Unsupported class file major version 69”). W Android Studio: Settings → Build Tools → Gradle → Gradle JDK → JDK 21; z wiersza poleceń ustaw `JAVA_HOME` na JDK 21.
- Ikona i splash: `node scripts/generate-app-assets.mjs` (logo marki na atramencie, źródła w `assets/`), potem `npx capacitor-assets generate --android --iconBackgroundColor "#2A1A12" --splashBackgroundColor "#2A1A12"` (cofnij kosmetyczne zmiany generatora w `AndroidManifest.xml`).

### Wersjonowanie

W `android/app/build.gradle` (`defaultConfig`):
- `versionCode` — integer rosnący przy każdym uploadzie do Play
- `versionName` — semver widoczny dla użytkownika

## Deep links (App Links)

1. Hostuj `/.well-known/assetlinks.json` na `https://cycleyourway.pl` (już w `public/`).
2. Uzupełnij `sha256_cert_fingerprints` kluczem upload/signing (Play App Signing / keystore).
3. `AndroidManifest.xml` ma już `android:host="cycleyourway.pl"` (+ `www`).
4. Ścieżki `/?ride=` i `/?share=` otwierają apkę (`appUrlOpen` + cold start).

Publiczne dokumenty: `https://cycleyourway.pl/privacy`, `https://cycleyourway.pl/terms`.

`capacitor.config.json` ma `server.allowNavigation` dla Supabase/Google (OAuth w WebView).

Aplikacja nasłuchuje `appUrlOpen` i ustawia `pendingRideId` / `pendingShareId`.

## Uprawnienia lokalizacji

- Pierwszy start nawigacji / „moja lokalizacja” pokazuje `LocationPermissionGate`.
- v1: GPS **foreground** + keep-awake (ekran włączony, portrait lock).
- v2: zainstaluj `@capacitor-community/background-geolocation`, ustaw `VITE_ENABLE_BG_GPS=true`,
  uzasadnij background location w Play Console (Data safety + permission declaration).

## Auth

- Email/hasło: bez zmian.
- Google (web): `signInWithOAuth` z powrotem na `https://cycleyourway.pl/`.
- Google (aplikacja): Google blokuje OAuth we wbudowanym WebView, więc `lib/nativeAuth.ts` otwiera logowanie w systemowej przeglądarce (`@capacitor/browser`, Custom Tabs) z `redirectTo = com.cycleyourway.app://auth-callback`; powrót obsługuje listener `appUrlOpen` w `AuthContext` (`exchangeCodeForSession` albo `setSession`). **Wymagane:** Supabase → Authentication → URL Configuration → Redirect URLs: `com.cycleyourway.app://auth-callback`. WebView nie nawiguje już do domen Google (`allowNavigation`).

## Powłoka Androida

- Przycisk/gest wstecz (`lib/backButton.js`): zamyka najwyższe okno lub panel (dokumenty, uprawnienia, logowanie, zapis, profil, samouczek, menu, zapisane trasy); gdy nic nie jest otwarte — aplikacja idzie w tło (jazda się nie przerywa).
- Paski systemowe: Capacitor 8 `SystemBars` (`insetsHandling: css`) wstrzykuje `--safe-area-inset-*`; CSS używa `var(--safe-area-inset-*, env(...))`. Ikony pasków jasne na ciemnym intro i w nawigacji, ciemne na waniliowej aplikacji (`lib/systemBars.ts`).
- Splash: atramentowe tło `#2A1A12` z logo (Android 12+: `windowSplashScreenBackground`), potem pierwsze uruchomienie pokazuje intro z rowerem, kolejne — od razu planer.

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
