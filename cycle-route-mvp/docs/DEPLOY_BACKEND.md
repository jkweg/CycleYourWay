# Deploy backendu ORS (Render)

Backend to tylko proxy do OpenRouteService: `geocode`, `route`, `loop`.  
Konta i trasy są w **Supabase** — nie na tym serwerze.

---

## Krok 1 — Kod na GitHub

Upewnij się, że repozytorium `CycleYourWay` jest wypchnięte na GitHub (cały projekt, w tym `cycle-route-mvp/backend`).

---

## Krok 2 — Konto Render

1. Wejdź na [https://render.com](https://render.com) i zaloguj się (GitHub jest OK).
2. **New +** → **Web Service**.
3. Połącz repozytorium **CycleYourWay**.

---

## Krok 3 — Ustawienia serwisu

| Pole | Wartość |
|------|---------|
| **Name** | `cycleyourway-api` (dowolna) |
| **Region** | Frankfurt (EU) |
| **Branch** | `main` |
| **Root Directory** | `cycle-route-mvp/backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Plan:** Free (na start wystarczy; pierwsze żądanie po bezczynności może trwać ~30 s).

---

## Krok 4 — Zmienne środowiskowe

W Render: **Environment** → **Add Environment Variable**

| Klucz | Wartość |
|-------|---------|
| `ORS_API_KEY` | ten sam co w lokalnym `backend/.env` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` — na razie; po Vercel dopiszesz URL |

Przykład po deployu frontendu na Vercel:

```text
http://localhost:5173,https://twoja-app.vercel.app
```

**Nie ustawiaj** `PORT` — Render podaje go sam.

Kliknij **Create Web Service** i poczekaj na zielony status **Live**.

---

## Krok 5 — Sprawdź, czy działa

Skopiuj URL z Rendera, np. `https://cycleyourway-api.onrender.com`

W przeglądarce:

```text
https://TWOJ-URL.onrender.com/api/health
```

Oczekiwana odpowiedź:

```json
{ "ok": true, "orsConfigured": true }
```

Jeśli `orsConfigured: false` — brakuje `ORS_API_KEY` w Environment.

---

## Krok 6 — Podłącz frontend lokalnie

W `frontend/.env.local`:

```env
VITE_API_URL=https://TWOJ-URL.onrender.com
```

Zrestartuj frontend (`Ctrl+C` → `npm run dev`), wyznacz trasę — requesty idą na Render.

---

## Krok 7 — (Później) Vercel

Gdy wrzucisz frontend na Vercel:

1. W Render dodaj domenę Vercel do `ALLOWED_ORIGINS`.
2. W Vercel ustaw `VITE_API_URL=https://TWOJ-URL.onrender.com`.

---

## Typowe problemy

| Problem | Rozwiązanie |
|---------|-------------|
| CORS w przeglądarce | Dodaj dokładny origin (z `https://`, bez `/` na końcu) do `ALLOWED_ORIGINS` |
| 502 / timeout na Free | Pierwsze wejście po uśpieniu — odczekaj i odśwież |
| Trasa się nie liczy | Sprawdź `/api/health` i klucz ORS |
| TLS lokalnie na Windows | Lokalnie: `npm run dev` (z `--use-system-ca`); na Render zwykły `npm start` |

---

## Alternatywa: Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Ustaw **Root Directory**: `cycle-route-mvp/backend`.
3. Te same zmienne: `ORS_API_KEY`, `ALLOWED_ORIGINS`.
4. Start: `npm start`.
