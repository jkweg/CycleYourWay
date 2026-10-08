# Polityka prywatności Cycle Your Way — SZKIC do uzupełnienia

> **Status:** szkic techniczny z 08.10.2026, przygotowany na podstawie kodu aplikacji. **Nie jest poradą prawną.** Przed publikacją: uzupełnij pola `[[…]]` (pytania w części A), a gotowy tekst przekaż do przeglądu prawnikowi. Po akceptacji tekst trafi do `frontend/src/components/LegalPage.tsx` (`/privacy`).
>
> Szkic opisuje stan po pakietach 1–9 i po usunięciu Google Fonts (pakiet 10). Jeśli zmieni się dostawca map, routingu, e-maili lub monitoringu, ten dokument trzeba zaktualizować razem z kodem.

**Aktualizacja 08.10.2026:** odpowiedzi operatora wprowadzone, tekst opublikowany w `LegalPage.tsx` (`/privacy`). Ustalenia: administrator Jakub Węgrzyniak (kontakt e-mail; adres pocztowy nie podany — do decyzji prawnika), Supabase `eu-west-1` (Irlandia), Render Frankfurt, kafelki MapTiler, Sentry wyłączony (brak `VITE_SENTRY_DSN` → sekcja raportów błędów usunięta; po włączeniu Sentry trzeba ją przywrócić), e-maile przez wbudowany SMTP Supabase, logowanie Google włączone, backup 30 dni, wiek 16 lat, bez analityki. B06: regulamin HeiGIT potwierdzony 08.10.2026 — zapytanie do wysłania w `HEIGIT_ZAPYTANIE_B06.md`.

---

## A. Pytania do Ciebie (bez odpowiedzi nie da się zamknąć tekstu)

| # | Pytanie | Gdzie sprawdzić / uwagi |
|---|---------|-------------------------|
| 1 | **Kto jest administratorem danych?** Imię i nazwisko albo firma (JDG/spółka), adres, NIP/KRS (jeśli jest), e-mail kontaktowy w sprawach danych. | Osoba fizyczna prowadząca darmowy projekt też jest administratorem — potrzebny adres do kontaktu. |
| 2 | **Region projektu Supabase (produkcja).** | Supabase → Project Settings → General → Region (np. `eu-central-1` Frankfurt). |
| 3 | **Region usługi Render.** | Render → usługa → Settings → Region (np. Frankfurt / Oregon). |
| 4 | **Dostawca kafelków mapy w produkcji.** | Vercel → Environment Variables → `VITE_MAP_TILES_URL` (MapTiler / Stadia / brak = publiczne OSM). |
| 5 | **Czy Sentry jest włączony i w jakim regionie** (US / EU)? | Vercel `VITE_SENTRY_DSN`; region w ustawieniach organizacji Sentry. |
| 6 | **Dostawca SMTP** (Resend, Brevo, …) albo wbudowany e-mail Supabase. | Supabase → Authentication → SMTP. |
| 7 | **Czy logowanie Google jest włączone na produkcji?** | Supabase → Authentication → Providers → Google. |
| 8 | **B06: decyzja o routingu.** Czy HeiGIT potwierdził, że wolno przesyłać współrzędne/adresy użytkowników, czy zmieniamy dostawcę? | Bez tej odpowiedzi sekcja „Odbiorcy” jest niepewna (patrz `PRODUCTION_READINESS_AUDIT.md`, B06). |
| 9 | **Jak długo trzymasz kopie zapasowe bazy?** | Propozycja z `OPS_LAUNCH.md` §7.4: 30 dni. |
| 10 | **Minimalny wiek użytkownika.** | Propozycja: 16 lat (w Polsce wiek zgody cyfrowej). |
| 11 | **Czy planujesz analitykę lub reklamy?** | Dziś ich nie ma (brak skryptów analitycznych). Jeśli dojdą — potrzebna zgoda i aktualizacja polityki. |

---

## B. Tekst polityki (projekt)

### 1. Administrator

Administratorem Twoich danych osobowych jest [[imię i nazwisko / nazwa firmy]], [[adres]], [[NIP/KRS, jeśli dotyczy]] („my”). W sprawach danych osobowych napisz na [[e-mail]]. Nie powołaliśmy inspektora ochrony danych.

### 2. Jakie dane przetwarzamy

| Kategoria | Dane | Kiedy |
|-----------|------|-------|
| Konto | adres e-mail, zaszyfrowane hasło (przechowuje Supabase Auth), identyfikator konta; przy logowaniu Google — e-mail i identyfikator konta Google | gdy zakładasz konto |
| Profil | wyświetlana nazwa, okolica startowa, preferencje jazdy (styl, dystans, nawierzchnia itp.) | gdy uzupełnisz profil |
| Trasy | punkty startu/końca, przebieg trasy, nazwa, tagi, ulubione, stan udostępnienia | gdy zapiszesz trasę |
| Jazdy | ślad GPS jazdy, czas, dystans, prędkości, liczba zejść z trasy | gdy zakończysz i wyślesz jazdę |
| Lokalizacja w trakcie jazdy | bieżąca pozycja z urządzenia | tylko w trybie nawigacji, po udzieleniu zgody w systemie/przeglądarce |
| Wyszukiwane adresy | wpisywany tekst i wybrane miejsca | podczas planowania trasy |
| Dane techniczne | adres IP (lub jego prefiks dla IPv6) i identyfikator konta w licznikach limitów usługi; logi serwera (adres IP, czas, wywołany adres) | przy każdym zapytaniu do naszego serwera |
| Raporty błędów | opis błędu, przeglądarka/system, widok aplikacji — bez danych formularzy | gdy aplikacja napotka błąd [[tylko jeśli Sentry włączony — pytanie 5]] |

### 3. Cele i podstawy prawne

| Cel | Podstawa (RODO) |
|-----|-----------------|
| Założenie i prowadzenie konta, zapis tras i jazd, nawigacja, udostępnianie tras linkiem | art. 6 ust. 1 lit. b — wykonanie umowy (regulaminu) |
| Wyznaczanie tras i wyszukiwanie adresów przez zewnętrzne usługi | art. 6 ust. 1 lit. b |
| Ochrona usługi przed nadużyciami (dzienne limity zapytań, blokada nadmiernego ruchu) | art. 6 ust. 1 lit. f — nasz prawnie uzasadniony interes w dostępności i bezpieczeństwie usługi |
| Wykrywanie i naprawa błędów aplikacji | art. 6 ust. 1 lit. f |
| Obsługa Twoich żądań dotyczących danych i ewentualnych roszczeń | art. 6 ust. 1 lit. c i f |

Nie podejmujemy decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu i nie profilujemy Cię w celach marketingowych.

### 4. Odbiorcy danych

Korzystamy z dostawców, którzy przetwarzają dane w naszym imieniu lub świadczą usługi potrzebne do działania aplikacji:

| Odbiorca | Rola | Jakie dane | Lokalizacja |
|----------|------|-----------|-------------|
| Supabase Inc. | baza danych i logowanie | konto, profil, trasy, jazdy, liczniki limitów | [[region — pytanie 2]] |
| Render Services, Inc. | serwer pośredniczący (API) | zapytania o trasy i adresy, adres IP, logi | [[region — pytanie 3]] |
| Vercel Inc. | hosting strony | adres IP, logi dostępu | globalna sieć CDN |
| HeiGIT gGmbH (openrouteservice) | wyznaczanie tras i wyszukiwanie adresów | współrzędne punktów trasy, bieżąca pozycja przy przeliczaniu trasy w trakcie jazdy, wpisywany adres — **bez** Twojego e-maila i adresu IP (zapytania wysyła nasz serwer) | Niemcy [[potwierdzić po decyzji B06 — pytanie 8]] |
| OpenStreetMap Foundation (Nominatim) | wyszukiwanie adresu i nazwy miejsca po współrzędnych | wpisany adres lub współrzędne punktu — bez e-maila i adresu IP | Wielka Brytania (decyzja KE o adekwatności) |
| [[dostawca kafelków — pytanie 4]] | wyświetlanie mapy | Twoja przeglądarka pobiera fragmenty mapy bezpośrednio: dostawca widzi adres IP i oglądany obszar | [[…]] |
| Google LLC | logowanie przez Google (jeśli wybierzesz) | dane konta Google potrzebne do logowania | USA [[pytanie 7]] |
| [[dostawca SMTP — pytanie 6]] | wysyłka e-maili (potwierdzenie konta, reset hasła) | adres e-mail | [[…]] |
| Functional Software, Inc. (Sentry) | raporty błędów | jak w tabeli w pkt 2 | [[US/EU — pytanie 5]] |

Udostępniona trasa jest widoczna dla każdej osoby, która ma aktywny link (nazwa, tryb, przebieg, dystans, czas — bez Twojego e-maila i identyfikatora). Wyłączenie udostępnienia unieważnia link.

### 5. Przekazywanie danych poza EOG

Część dostawców (Supabase, Render, Vercel, Google, Sentry) to firmy z USA. Jeśli dane trafiają poza Europejski Obszar Gospodarczy, odbywa się to na podstawie [[decyzji KE w sprawie EU-US Data Privacy Framework i/lub standardowych klauzul umownych — potwierdzić w DPA każdego dostawcy]]. Kopię zabezpieczeń możesz otrzymać, pisząc na [[e-mail]].

### 6. Jak długo przechowujemy dane

| Dane | Okres |
|------|-------|
| Konto, profil, trasy, jazdy | do czasu ich usunięcia przez Ciebie albo usunięcia konta |
| Liczniki limitów zapytań (IP / identyfikator konta) | do 7 dni |
| Logi serwerów | [[zgodnie z retencją Render/Vercel dla planu — np. do 7–30 dni]] |
| Kopie zapasowe bazy | do [[30]] dni od wykonania kopii; usunięte dane znikają z kopii najpóźniej po tym czasie |
| Niewysłane jazdy na Twoim urządzeniu | do wysłania, ręcznego usunięcia albo automatycznie 30 dni od ostatniej zmiany |
| Historia wyszukiwanych adresów na urządzeniu | do wyczyszczenia (Profil → Prywatność) lub wyczyszczenia danych przeglądarki; najwyżej 8 ostatnich adresów |
| Raporty błędów | [[90 dni — domyślnie w Sentry, potwierdzić]] |

### 7. Dane zapisywane na Twoim urządzeniu

Aplikacja nie używa plików cookie reklamowych ani analitycznych. W pamięci przeglądarki/aplikacji (localStorage, IndexedDB) zapisuje tylko to, co jest niezbędne do działania usługi, o którą prosisz:

- sesję logowania (Supabase),
- niewysłane jazdy (ślad GPS i liczniki) — aby jazda nie przepadła po przeładowaniu lub utracie sieci,
- ostatnio wyszukiwane adresy (do 8), ustawienia planera i informację o ukończonym samouczku.

Możesz je usunąć w Profil → Prywatność albo czyszcząc dane witryny w przeglądarce.

### 8. Twoje prawa

Masz prawo do:

- **dostępu** do danych i ich kopii — w aplikacji: Profil → Prywatność → Eksportuj dane (plik JSON z profilem, trasami i jazdami),
- **sprostowania** — edycja profilu, nazw tras i tagów w aplikacji,
- **usunięcia** — usunięcie tras, jazd lub całego konta (Profil → Prywatność → Usuń konto); usunięcie konta kasuje profil, trasy i jazdy,
- **ograniczenia przetwarzania** i **przenoszenia danych** (eksport JSON),
- **sprzeciwu** wobec przetwarzania opartego na naszym prawnie uzasadnionym interesie (pkt 3),
- **skargi do Prezesa Urzędu Ochrony Danych Osobowych** (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).

Pozostałe żądania zgłoś na [[e-mail]]. Odpowiemy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.

### 9. Dobrowolność

Korzystanie z aplikacji i założenie konta jest dobrowolne. Bez konta możesz planować trasy, ale nie zapiszesz ich na koncie. Bez dostępu do lokalizacji nie zadziała nawigacja w trakcie jazdy. Usługa jest przeznaczona dla osób, które ukończyły [[16]] lat.

### 10. Zmiany polityki

O istotnych zmianach poinformujemy w aplikacji. Aktualna wersja jest zawsze dostępna pod adresem cycleyourway.pl/privacy. Wersja z dnia [[data publikacji]].

---

## C. Notatki dla prawnika / do weryfikacji

- **B06 (HeiGIT):** regulamin HeiGIT (odczyt 27.09.2026) zabrania przesyłania danych osobowych poza danymi konta. Aplikacja przesyła współrzędne, w tym bieżącą pozycję przy przeliczaniu trasy w trakcie jazdy, oraz wpisywane adresy. Wymaga pisemnego potwierdzenia lub zmiany dostawcy; deklaracja w polityce nie rozwiązuje tego problemu.
- **Nominatim (OSMF):** używany do wyszukania adresu (po zatwierdzeniu) i nazwy miejsca po współrzędnych, nie do podpowiedzi przy pisaniu. Polityka OSMF ogranicza ruch do 1 zapytania/s dla całej aplikacji.
- **Role:** ustalić, którzy dostawcy są podmiotami przetwarzającymi (DPA: Supabase, Render, Vercel, Sentry, SMTP), a którzy samodzielnymi administratorami (np. Google przy logowaniu, dostawcy map/routingu w zależności od ich warunków).
- **Art. 399 PKE:** zapis w localStorage/IndexedDB opisany w pkt 7 jest niezbędny do świadczenia usługi żądanej przez użytkownika — według audytu nie wymaga zgody, do potwierdzenia przez prawnika.
- **Mapa:** jeśli `VITE_MAP_TILES_URL` nie jest ustawione, produkcja używa publicznych kafelków OSM — tylko do niewielkiego ruchu, z widocznym oznaczeniem OSM.
- **Licencje wyników:** wyniki openrouteservice są na CC BY-SA 4.0 — oznaczenie HeiGIT/OSM jest w regulaminie i w stopce mapy.
