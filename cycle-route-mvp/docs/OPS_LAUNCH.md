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
- Monitoring: patrz sekcja 7 (UptimeRobot na `/api/health` i `/api/health/quota`)

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

## 7. Monitoring, backup, e-mail (minimum przed betą)

### 7.1 Monitory dostępności (UptimeRobot, darmowy plan, interwał 5 min)

| Monitor | Adres | Alarm, gdy |
|---------|-------|------------|
| API żyje | `https://cycleyourway-api.onrender.com/api/health` (typ *Keyword*, słowo `"ok":true`) | brak słowa / timeout |
| Limit ORS | `https://cycleyourway-api.onrender.com/api/health/quota` (typ *HTTP(s)*) | kod ≠ 200 |
| Strona | `https://www.cycleyourway.pl/` | kod ≠ 200 |

`/api/health/quota` zwraca **503**, gdy dzisiejsze globalne zużycie ORS przekroczy `QUOTA_ALERT_PERCENT` (domyślnie 80%), gdy włączony jest wyłącznik awaryjny albo gdy limit w Supabase jest nieosiągalny/nieskonfigurowany. Odpowiedź zawiera tylko procenty (`percentUsed`), bez danych użytkowników.
Ping co 5 min utrzymuje też darmową instancję Render w stanie aktywnym (brak 30 s zimnego startu; jedna usługa 24/7 mieści się w darmowych godzinach).

### 7.2 Błędy frontendu (Sentry)

1. sentry.io → projekt *React* → skopiuj DSN.
2. Vercel → Environment Variables: `VITE_SENTRY_DSN` → redeploy.
3. Sentry → Alerts: e-mail przy nowym typie błędu.

Frontend ma ErrorBoundary (cała aplikacja i osobno nawigacja); błędy trafiają do Sentry z `where: root|ride`. Po nowym wdrożeniu stara karta, która nie znajdzie pliku JS, przeładowuje się automatycznie (najwyżej raz na minutę).

### 7.3 Wyłącznik awaryjny ORS (SQL Editor, produkcja)

```sql
-- wyłącz: 'all' | 'directions' | 'geocode'
insert into private.api_kill_switch (kind, enabled, note) values ('all', true, 'incydent')
on conflict (kind) do update set enabled = excluded.enabled, note = excluded.note, updated_at = now();
-- włącz z powrotem
update private.api_kill_switch set enabled = false, updated_at = now() where kind = 'all';
-- dzisiejsze zużycie
select bucket, used from private.api_usage
where window_start = date_trunc('day', now() at time zone 'utc') at time zone 'utc'
order by used desc limit 20;
```

### 7.4 Backup i próba odtworzenia

Darmowy plan Supabase nie daje kopii do pobrania ani PITR. Minimum: kopia przed każdą migracją i raz w tygodniu.

```bash
npx supabase db dump --db-url "<PROD connection string>" -f backup-schema.sql
npx supabase db dump --db-url "<PROD connection string>" --data-only -f backup-data.sql
```

- Pliki zawierają dane osobowe: trzymaj je poza repo, zaszyfrowane (np. archiwum 7-Zip z hasłem w menedżerze haseł), usuwaj kopie starsze niż 30 dni.
- **Raz przed betą wykonaj próbę odtworzenia** na stagingu (`psql "<STAGING connection string>" -f backup-schema.sql`, potem `-f backup-data.sql`) i sprawdź logowanie, listę tras i `staging-rls-smoke.mjs`. Kopia, której nie odtworzono, nie jest dowodem.
- Sprawdź, czy dump zawiera konta (`auth.users`); jeśli nie, dodaj `--schema auth` do zrzutu danych.

### 7.5 E-mail logowania (SMTP)

Wbudowany SMTP Supabase wysyła tylko kilka wiadomości na godzinę — rejestracja testerów utknie.

1. Konto u dostawcy transakcyjnego (np. Resend lub Brevo, darmowe plany wystarczą na betę).
2. Domena nadawcy `cycleyourway.pl`: rekordy SPF i DKIM z panelu dostawcy w DNS.
3. Supabase → Authentication → SMTP Settings: host/port/użytkownik/hasło, nadawca np. `no-reply@cycleyourway.pl`.
4. Supabase → Authentication → Rate Limits: podnieś limit e-maili/h.
5. Test: rejestracja i reset hasła na adres spoza zespołu (Gmail + Outlook), sprawdź folder spam.
