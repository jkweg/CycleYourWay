# Cycle Your Way

Aplikacja webowa do planowania tras rowerowych. Umożliwia wyznaczanie tras punkt po punkcie, generowanie pętli treningowych, analizę profilu wysokościowego i nawierzchni oraz zapis tras na koncie użytkownika.

## Funkcje

- **Trasa A → B** — dwa punkty na mapie lub geokodowanie adresów, do trzech wariantów trasy
- **Pętla treningowa** — jeden punkt startowy i docelowy dystans (5–100 km)
- **Unikanie dróg głównych** — wybór trasy z mniejszym udziałem dróg o wyższej kategorii
- **Profil wysokościowy** — wykres elewacji na podstawie danych OpenRouteService
- **Nawierzchnia** — podział trasy według typu nawierzchni
- **Eksport** — Google Maps (przybliżenie) oraz plik GPX (pełna geometria)
- **Konta użytkowników** — rejestracja i logowanie przez Supabase Auth
- **Zapisane trasy** — lista, wczytywanie i usuwanie tras powiązanych z kontem

## Architektura

| Warstwa | Technologia | Rola |
|---------|-------------|------|
| Frontend | React, Vite, Tailwind, Leaflet, Recharts | Interfejs, mapa, wykresy |
| Auth i baza tras | Supabase (Auth + PostgreSQL) | Użytkownicy i tabela `saved_routes` |
| API tras | Node.js, Express | Proxy do OpenRouteService (geocode, route, loop) |

Klucz API OpenRouteService jest przechowywany wyłącznie po stronie backendu.

## Struktura repozytorium

```
CycleYourWay/
├── cycle-route-mvp/
│   ├── frontend/          # Aplikacja React
│   ├── backend/           # Serwer Express (ORS)
│   ├── supabase/          # Schemat SQL i opcjonalne rozszerzenia
│   └── docs/              # Instrukcje deployu (Supabase, Vercel, Render)
└── README.md
```

## Wymagania

- Node.js 20 lub nowszy
- Konto [OpenRouteService](https://openrouteservice.org/dev/#/signup) (klucz API)
- Projekt [Supabase](https://supabase.com) (URL projektu i Publishable key)

## Uruchomienie lokalne

### 1. Backend

```bash
cd cycle-route-mvp/backend
cp .env.example .env
# Uzupełnij ORS_API_KEY w pliku .env

npm install
npm run dev
```

Serwer nasłuchuje domyślnie na `http://localhost:5000`.

Na Windows, jeśli występują problemy z TLS przy połączeniu z ORS, skrypt `dev` używa `node --use-system-ca`.

### 2. Supabase

1. Utwórz projekt w Supabase.
2. W **SQL Editor** uruchom plik `cycle-route-mvp/supabase/schema.sql`.
3. W **Authentication → Providers** włącz logowanie e-mail.
4. Skopiuj **Project URL** i **Publishable key** z ustawień API.

### 3. Frontend

```bash
cd cycle-route-mvp/frontend
cp .env.example .env.local
```

Uzupełnij `.env.local`:

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=http://localhost:5000
```

**Project URL** musi być samym adresem projektu — bez `/rest/v1/` na końcu.

```bash
npm install
npm run dev
```

Aplikacja: `http://localhost:5173`

## Endpointy API (backend)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/health` | Status serwisu |
| GET | `/api/geocode?address=` | Geokodowanie adresu |
| POST | `/api/route` | Trasa między dwoma punktami |
| POST | `/api/loop` | Pętla o zadanym dystansie |

## Deploy

Szczegółowe instrukcje:

- **Backend (Render / Railway):** `cycle-route-mvp/docs/DEPLOY_BACKEND.md`
- **Supabase i Vercel:** `cycle-route-mvp/docs/SUPABASE_VERCEL.md`

Po wdrożeniu backendu ustaw `VITE_API_URL` na publiczny URL serwera i dodaj domenę frontendu do zmiennej `ALLOWED_ORIGINS` w backendzie.

## Zmienne środowiskowe

### Backend

| Zmienna | Opis |
|---------|------|
| `ORS_API_KEY` | Klucz OpenRouteService |
| `ALLOWED_ORIGINS` | Dozwolone originy CORS (np. localhost i domena Vercel) |
| `PORT` | Port serwera (ustawiany automatycznie na Render) |

### Frontend

| Zmienna | Opis |
|---------|------|
| `VITE_SUPABASE_URL` | URL projektu Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable key z Supabase |
| `VITE_API_URL` | URL backendu ORS |

## Licencja

Projekt prywatny / edukacyjny. OpenStreetMap, OpenRouteService i pozostałe usługi zewnętrzne podlegają własnym warunkom użytkowania.
