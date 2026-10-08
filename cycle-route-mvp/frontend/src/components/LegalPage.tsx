export type LegalDocType = 'privacy' | 'terms'

type LegalSection = {
  heading: string
  body?: string
  items?: string[]
}

type LegalDoc = {
  title: string
  updated?: string
  sections: LegalSection[]
}

const CONTACT_EMAIL = 'jakub.wegrzyniak1239@gmail.com'

// Source draft and open questions: docs/legal/POLITYKA_PRYWATNOSCI_SZKIC.md.
const PRIVACY: LegalDoc = {
  title: 'Polityka prywatności',
  updated: '8 października 2026',
  sections: [
    {
      heading: '1. Administrator',
      body: `Administratorem Twoich danych osobowych jest Jakub Węgrzyniak, twórca aplikacji Cycle Your Way. W sprawach danych osobowych napisz na ${CONTACT_EMAIL}.`,
    },
    {
      heading: '2. Jakie dane przetwarzamy',
      items: [
        'Konto: adres e-mail, zaszyfrowane hasło i identyfikator konta; przy logowaniu przez Google — adres e-mail i identyfikator konta Google.',
        'Profil: wyświetlana nazwa, okolica startowa i preferencje jazdy.',
        'Trasy: punkty startu i końca, przebieg trasy, nazwa, tagi, oznaczenie ulubionych i stan udostępnienia.',
        'Jazdy: ślad GPS, czas, dystans, prędkości i liczba zejść z trasy — gdy zakończysz i wyślesz jazdę.',
        'Lokalizacja: bieżąca pozycja urządzenia, tylko w trybie nawigacji i po udzieleniu zgody w systemie lub przeglądarce.',
        'Wyszukiwane adresy: wpisywany tekst i wybrane miejsca.',
        'Dane techniczne: adres IP (dla IPv6 — jego prefiks) i identyfikator konta w dziennych licznikach limitów usługi oraz logi serwerów (adres IP, czas, wywołany adres).',
      ],
    },
    {
      heading: '3. Cele i podstawy prawne',
      items: [
        'Prowadzenie konta, zapis tras i jazd, nawigacja i udostępnianie tras linkiem — wykonanie umowy (art. 6 ust. 1 lit. b RODO).',
        'Wyznaczanie tras i wyszukiwanie adresów przez zewnętrzne usługi — wykonanie umowy (art. 6 ust. 1 lit. b RODO).',
        'Ochrona usługi przed nadużyciami (dzienne limity zapytań) i bezpieczeństwo — prawnie uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO).',
        'Obsługa Twoich żądań dotyczących danych i ewentualnych roszczeń — obowiązek prawny i prawnie uzasadniony interes (art. 6 ust. 1 lit. c i f RODO).',
      ],
      body: 'Nie podejmujemy decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, nie profilujemy Cię, nie używamy analityki ani reklam i nie sprzedajemy danych.',
    },
    {
      heading: '4. Odbiorcy danych',
      items: [
        'Supabase Inc. — baza danych, logowanie i e-maile logowania (potwierdzenie konta, reset hasła); serwery w Irlandii (UE).',
        'Render Services, Inc. — serwer API aplikacji; serwery we Frankfurcie (UE).',
        'Vercel Inc. — hosting strony; globalna sieć serwerów.',
        'HeiGIT gGmbH (openrouteservice, Niemcy) — wyznaczanie tras i podpowiedzi adresów. Otrzymuje współrzędne punktów trasy, w trakcie jazdy także bieżącą pozycję przy przeliczaniu trasy, oraz wpisywany tekst adresu. Zapytania wysyła nasz serwer, więc HeiGIT nie otrzymuje Twojego adresu IP, e-maila ani identyfikatora konta.',
        'OpenStreetMap Foundation (Nominatim, Wielka Brytania) — wyszukanie adresu i nazwy miejsca po współrzędnych; również bez Twojego adresu IP i e-maila.',
        'MapTiler AG (Szwajcaria) — kafelki mapy. Twoja przeglądarka pobiera je bezpośrednio, więc MapTiler widzi adres IP i oglądany obszar mapy.',
        'Google LLC — logowanie przez Google, jeśli je wybierzesz.',
      ],
      body: 'Udostępniona trasa jest widoczna dla każdego, kto ma aktywny link (nazwa, tryb, przebieg, dystans, czas — bez Twojego e-maila i identyfikatora). Wyłączenie udostępnienia unieważnia link.',
    },
    {
      heading: '5. Przekazywanie danych poza EOG',
      body: 'Szwajcaria i Wielka Brytania mają decyzje Komisji Europejskiej stwierdzające odpowiedni poziom ochrony. Dostawcy z USA (Supabase, Render, Vercel, Google) mogą mieć dostęp do danych, np. w ramach wsparcia technicznego; odbywa się to na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję Europejską lub decyzji w sprawie EU-US Data Privacy Framework — zgodnie z umowami powierzenia tych dostawców.',
    },
    {
      heading: '6. Jak długo przechowujemy dane',
      items: [
        'Konto, profil, trasy i jazdy — do czasu ich usunięcia przez Ciebie albo usunięcia konta.',
        'Liczniki limitów zapytań — do 7 dni.',
        'Logi serwerów — krótko, zgodnie z ustawieniami dostawców hostingu, nie dłużej niż 30 dni.',
        'Kopie zapasowe bazy — do 30 dni; usunięte dane znikają z kopii najpóźniej po tym czasie.',
        'Niewysłane jazdy na Twoim urządzeniu — do wysłania, ręcznego usunięcia albo automatycznie po 30 dniach od ostatniej zmiany.',
        'Historia wyszukiwanych adresów na urządzeniu (najwyżej 8 ostatnich) — do wyczyszczenia.',
      ],
    },
    {
      heading: '7. Dane zapisywane na Twoim urządzeniu',
      body: 'Nie używamy plików cookie reklamowych ani analitycznych. W pamięci przeglądarki lub aplikacji (localStorage, IndexedDB) zapisujemy tylko to, co jest niezbędne do działania usługi: sesję logowania, niewysłane jazdy (aby nie przepadły po przeładowaniu lub utracie sieci), ostatnio wyszukiwane adresy, ustawienia planera i informację o ukończonym samouczku. Możesz je usunąć w Profil → Prywatność albo czyszcząc dane witryny w przeglądarce.',
    },
    {
      heading: '8. Twoje prawa',
      items: [
        'Dostęp do danych i ich kopia — Profil → Prywatność → Eksportuj dane (plik JSON z profilem, trasami i jazdami).',
        'Sprostowanie — edycja profilu, nazw tras i tagów w aplikacji.',
        'Usunięcie — usuwanie tras i jazd albo całego konta (Profil → Prywatność → Usuń konto); usunięcie konta kasuje profil, trasy i jazdy.',
        'Ograniczenie przetwarzania i przenoszenie danych (eksport JSON).',
        'Sprzeciw wobec przetwarzania opartego na naszym prawnie uzasadnionym interesie.',
        'Skarga do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).',
      ],
      body: `Pozostałe żądania wyślij na ${CONTACT_EMAIL}. Odpowiemy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.`,
    },
    {
      heading: '9. Dobrowolność',
      body: 'Korzystanie z aplikacji i założenie konta jest dobrowolne. Bez konta możesz planować trasy, ale nie zapiszesz ich na koncie. Bez dostępu do lokalizacji nie zadziała nawigacja w trakcie jazdy. Usługa jest przeznaczona dla osób, które ukończyły 16 lat.',
    },
    {
      heading: '10. Zmiany polityki',
      body: 'O istotnych zmianach poinformujemy w aplikacji. Aktualna wersja jest zawsze dostępna pod adresem cycleyourway.pl/privacy.',
    },
  ],
}

const TERMS: LegalDoc = {
  title: 'Regulamin',
  sections: [
    {
      heading: 'Charakter usługi',
      body: 'Cycle Your Way pomaga planować i zapisywać trasy rowerowe. Nie gwarantujemy ciągłej dostępności ani bezpieczeństwa na drodze — zawsze stosuj się do przepisów, oznakowania i warunków terenowych.',
    },
    {
      heading: 'Dane map i routingu',
      body: 'Dane mapy: © współtwórcy OpenStreetMap (ODbL). Trasy i podpowiedzi adresów: openrouteservice.org by HeiGIT — wyniki na licencji CC BY-SA 4.0. Wyszukiwanie adresu i nazwy miejsca: Nominatim (OpenStreetMap). Obowiązują warunki tych usług; gdy usługa routingu jest niedostępna, aplikacja nie wyznacza trasy zastępczej.',
    },
    {
      heading: 'Konta użytkowników',
      body: 'Konto może założyć osoba, która ukończyła 16 lat. Jesteś odpowiedzialny za bezpieczeństwo swojego hasła. Nie udostępniaj konta osobom trzecim. Link do trasy traktuj jak dostęp do jej przebiegu; możesz go unieważnić w ustawieniach trasy.',
    },
    {
      heading: 'Odpowiedzialność',
      body: 'Autor nie ponosi odpowiedzialności za decyzje podjęte na podstawie wygenerowanych tras, błędów map ani niedostępności usług zewnętrznych.',
    },
  ],
}

function LegalContent({ doc }: { doc: LegalDoc }) {
  return (
    <div className="space-y-5 text-sm leading-7 text-stone-700">
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="font-semibold text-[#FC6C26]">{section.heading}</h3>
          {section.items && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.body && <p className="mt-1">{section.body}</p>}
        </section>
      ))}
      {doc.updated && <p className="text-xs text-stone-500">Wersja z dnia {doc.updated}.</p>}
    </div>
  )
}

/** Pełna strona pod /privacy i /terms (sklep, SEO, bezpośrednie linki). */
export function LegalStandalone({ type }: { type: LegalDocType }) {
  const doc = type === 'terms' ? TERMS : PRIVACY
  const otherHref = type === 'terms' ? '/privacy' : '/terms'
  const otherLabel = type === 'terms' ? 'Polityka prywatności' : 'Regulamin'

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#fff8f1] to-[#f5ebe0] px-4 py-10 text-stone-800">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FC6C26]">
          Cycle Your Way
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#FC6C26]">{doc.title}</h1>
        <div className="mt-8">
          <LegalContent doc={doc} />
        </div>
        <nav className="mt-10 flex flex-wrap gap-4 border-t border-[#f0d4b8] pt-6 text-sm">
          <a href="/" className="text-[#FC6C26] underline-offset-2 hover:underline">
            Strona główna
          </a>
          <a href={otherHref} className="text-stone-600 underline-offset-2 hover:underline">
            {otherLabel}
          </a>
        </nav>
      </article>
    </div>
  )
}

type LegalPageProps = {
  type: LegalDocType
  onClose: () => void
}

function LegalPage({ type, onClose }: LegalPageProps) {
  const doc = type === 'terms' ? TERMS : PRIVACY

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-sm">
      <div
        className="soft-panel max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#f0d4b8] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="legal-title" className="text-2xl font-semibold text-[#FC6C26]">
            {doc.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
        <LegalContent doc={doc} />
        <p className="mt-6 text-xs text-stone-500">
          Stały adres:{' '}
          <a
            href={type === 'terms' ? '/terms' : '/privacy'}
            className="text-[#FC6C26] underline-offset-2 hover:underline"
          >
            {type === 'terms' ? '/terms' : '/privacy'}
          </a>
        </p>
      </div>
    </div>
  )
}

export default LegalPage
