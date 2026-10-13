import Sheet from './ui/Sheet'
import { BrandMark } from './brand/BikeGlyph'
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
    <div className="space-y-6 text-[15px] leading-7 text-ink-muted">
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="font-serif text-xl font-medium text-ink">{section.heading}</h3>
          {section.items && (
            <ul className="mt-2 space-y-1.5">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-burnt-orange" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.body && <p className="mt-2">{section.body}</p>}
        </section>
      ))}
      {doc.updated && <p className="text-xs text-[#8C6B52]">Wersja z dnia {doc.updated}.</p>}
    </div>
  )
}

/** Pełna strona pod /privacy i /terms (sklep, SEO, bezpośrednie linki). */
export function LegalStandalone({ type }: { type: LegalDocType }) {
  const doc = type === 'terms' ? TERMS : PRIVACY
  const otherHref = type === 'terms' ? '/privacy' : '/terms'
  const otherLabel = type === 'terms' ? 'Polityka prywatności' : 'Regulamin'

  return (
    <div className="min-h-dvh bg-vanilla px-5 pb-16 pt-10 text-ink">
      <article className="mx-auto max-w-2xl">
        <a href="/" className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-ink">
          <BrandMark />
          Cycle Your Way
        </a>
        <h1 className="mt-10 font-serif text-[clamp(2.4rem,7vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.02em]">
          {doc.title}
        </h1>
        <div className="mt-10 rounded-[28px] bg-white p-6 shadow-[0_20px_50px_-30px_rgba(42,26,18,0.35)] sm:p-9">
          <LegalContent doc={doc} />
        </div>
        <nav className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
          <a href="/" className="press inline-flex h-11 items-center rounded-full bg-ink px-5 text-white">
            Strona główna
          </a>
          <a href={otherHref} className="press inline-flex h-11 items-center rounded-full border-[1.5px] border-ink/20 px-5 text-ink">
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
  const href = type === 'terms' ? '/terms' : '/privacy'

  return (
    <Sheet open onClose={onClose} eyebrow="Dokumenty" title={doc.title} size="lg">
      <LegalContent doc={doc} />
      <p className="mt-6 text-sm text-[#8C6B52]">
        Stały adres:{' '}
        <a href={href} className="font-semibold text-rust underline-offset-4 hover:underline">
          cycleyourway.pl{href}
        </a>
      </p>
    </Sheet>
  )
}

export default LegalPage
