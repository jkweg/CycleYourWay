# Checklist: darmowy launch (web + Android)

Cel: **działająca, darmowa** aplikacja na `https://cycleyourway.pl` + APK/closed testing na Androidzie.  
**Poza zakresem na razie:** Stripe, Play Billing, offline mapy, iOS, background GPS (v2).

Status: `[ ]` do zrobienia · `[x]` odhaczajcie w miarę postępu.

**Ops (poza kodem):** pełna lista w [`OPS_LAUNCH.md`](./OPS_LAUNCH.md).

---

## 0. Już macie

- [x] Domena **cycleyourway.pl**
- [x] Strona / SPA dostępna pod domeną
- [x] MVP: planer A→B, pętle, nawigacja, zapis tras, auth
- [x] Capacitor Android (szkielet w repo)

---

## 1. Produkcja web — kod vs ops

### Kod (zrobione w repo)

- [x] CORS: `https://cycleyourway.pl` + www w `DEFAULT_ALLOWED_ORIGINS`
- [x] Publiczne `/privacy`, `/terms` (+ aliasy PL)
- [x] Share / OAuth / reset hasła używają `VITE_APP_ORIGIN` (`lib/appOrigin.js`)
- [x] Ostrzeżenia prod przy braku env / OSM tiles / Sentry
- [x] `vercel.json`: nagłówki + ochrona `/.well-known/assetlinks.json`
- [x] Health `/api/health` poza rate limitem

### Env frontend (Vercel) — **zróbcie sami**

- [ ] `VITE_API_URL`
- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_APP_ORIGIN=https://cycleyourway.pl`
- [ ] `VITE_MAP_TILES_URL` + `VITE_MAP_TILES_ATTR`
- [ ] `VITE_SENTRY_DSN` (zalecane)
- [ ] Redeploy frontendu

### Env backend — **zróbcie sami**

- [ ] `ORS_API_KEY`
- [ ] Redeploy backendu (żeby dostał CORS z kodu)
- [ ] Always-on / akceptacja cold startu
- [ ] Uptime na `/api/health`

### Supabase — **zróbcie sami**

- [ ] Site URL + Redirect URLs na `cycleyourway.pl`
- [ ] Google provider (opcjonalnie)
- [ ] Test e-mail / reset na prod

### Smoke test web — **zróbcie sami**

- [ ] Landing, A→B, pętla, zapis, GPS, share, kafelki, CORS

---

## 2. Stabilność

- [ ] Sentry DSN ustawiony na prod
- [ ] Monitoring health
- [ ] ORS usage w pierwszym tygodniu
- [x] Privacy/Regulamin w kodzie
- [ ] Po deploy: `https://cycleyourway.pl/privacy` działa
- [ ] Play Privacy policy URL = ten adres

---

## 3. Android

### Kod (zrobione)

- [x] App Links host `cycleyourway.pl` (+ www)
- [x] Bez `ACCESS_BACKGROUND_LOCATION` / `FOREGROUND_SERVICE` na v1
- [x] Capacitor `allowNavigation` (Supabase / Google)
- [x] `versionName` `1.0.0` (`versionCode` 1 — bump przy każdym uploadzie)
- [x] Instrukcja SHA: `frontend/public/.well-known/README.md`

### Ops — **zróbcie sami**

- [ ] Wkleić prawdziwy SHA-256 do `assetlinks.json` + redeploy
- [ ] Sprawdzić `https://cycleyourway.pl/.well-known/assetlinks.json`
- [ ] Build AAB z prod `VITE_*`
- [ ] Play Console + closed testing + Data safety (foreground only)
- [ ] Smoke na telefonie (≥ 15–30 min jazdy)

---

## 4. Świadomie później

- [ ] Stripe / IAP / BG GPS / offline / iOS / public Play

---

## Kryteria „gotowe”

1. Na `cycleyourway.pl` planujesz, zapisujesz i jedziesz bez CORS/map errors.  
2. APK robi to samo ≥ 15 min przy włączonym ekranie.  
3. Privacy URL na własnej domenie.  
4. Closed testing bez krytycznych crashy.  
5. Płatności = 0 (celowo).
