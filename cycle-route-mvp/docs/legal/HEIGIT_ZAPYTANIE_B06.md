# B06 — zapytanie do HeiGIT (do wysłania przez operatora)

**Stan na 08.10.2026:** regulamin HeiGIT (https://account.heigit.org/info/tos, odczyt 08.10.2026) w sekcji *Prohibited Conduct* zabrania: „Transmit personal data (apart from the data required by the HeiGIT account management)”.

Cycle Your Way wysyła do HeiGIT (przez własny backend, bez IP, e-maila i identyfikatora użytkownika):
- współrzędne punktów trasy (start, cel, punkty pośrednie, środek pętli),
- w trakcie jazdy bieżącą pozycję użytkownika przy przeliczaniu trasy po zejściu z niej,
- tekst wpisywany w polu adresu (podpowiedzi Pelias).

Same współrzędne bez identyfikatora mogą, ale nie muszą być danymi osobowymi w rękach HeiGIT (np. punkt startu = adres domowy). Dlatego potrzebne jest **pisemne** stanowisko HeiGIT. Do tego czasu publiczna beta pozostaje NO-GO; zamknięta beta z poinformowanymi testerami to decyzja operatora.

Kontakt: formularz/adres z https://account.heigit.org/info/contact (sprawdź aktualny adres na stronie).

---

**Temat:** Use of openrouteservice Directions/Geocoding in a cycling navigation app — personal data clause

Dear HeiGIT team,

I run Cycle Your Way (https://www.cycleyourway.pl), a small, non-commercial cycling route planner and navigation app in Poland. It uses openrouteservice Directions v2 (cycling profiles) and Pelias geocoding/autocomplete through my HeiGIT account (Standard plan).

Your Terms of Service list "Transmit personal data (apart from the data required by the HeiGIT account management)" as prohibited conduct. I would like to confirm that my use is compliant, or adjust it:

1. All requests are sent server-side from my backend. They never contain the end user's IP address, name, e-mail or any user/account identifier.
2. Directions requests contain route coordinates chosen by the user (start, destination, waypoints, loop centre). During navigation, when the rider leaves the route, the app recalculates the route from the rider's current position.
3. Autocomplete requests contain the text the user types into an address field.

Questions:
- Do you consider such coordinates and address strings, sent without any identifier, as "personal data" in the sense of your Terms?
- If yes, is there a plan, agreement (e.g. a data processing agreement under Art. 28 GDPR) or a configuration under which this use is permitted?
- Do you log or retain request coordinates/texts, and for how long?

I am happy to apply additional minimisation you recommend (e.g. not sending the live position during navigation).

Kind regards,
Jakub Węgrzyniak
jakub.wegrzyniak1239@gmail.com
