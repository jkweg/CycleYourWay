export type LegalDocType = 'privacy' | 'terms'

type LegalSection = {
  heading: string
  body: string
}

type LegalDoc = {
  title: string
  sections: LegalSection[]
}

const PRIVACY: LegalDoc = {
  title: 'Polityka prywatności',
  sections: [
    {
      heading: 'Jakie dane zbieramy',
      body: 'Adres e-mail i hasło (przez Supabase Auth), profil rowerzysty, preferencje planowania, zapisane trasy, tagi tras oraz historię zakończonych jazd. Lokalizacja GPS jest używana w trybie jazdy i może być zapisana w historii tylko wtedy, gdy aplikacja włączy taki zapis.',
    },
    {
      heading: 'Do czego używamy danych',
      body: 'Do logowania, zapisu i udostępniania tras oraz wywołania API routingu (OpenRouteService) przez nasz backend. Nie sprzedajemy danych osobowych.',
    },
    {
      heading: 'Udostępnianie',
      body: 'Dane konta, tras i jazd przechowuje Supabase. Punkty start/koniec i geometria tras są przekazywane do OpenRouteService w celu wyznaczenia trasy. Publiczne linki share pokazują trasę osobom, które mają link.',
    },
    {
      heading: 'Twoje prawa',
      body: 'Możesz usuwać zapisane trasy, eksportować dane konta oraz usunąć konto w panelu profilu. Usunięcie konta usuwa profil, trasy i historię jazd powiązane z użytkownikiem.',
    },
    {
      heading: 'Prywatność tras',
      body: 'Trasy są domyślnie prywatne. Oznaczenie trasy jako publicznej powoduje, że każdy posiadacz linku może zobaczyć jej przebieg.',
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
      body: 'Mapy pochodzą z OpenStreetMap. Routing z OpenRouteService (oraz awaryjnie OSRM). Obowiązują warunki tych usług.',
    },
    {
      heading: 'Konta użytkowników',
      body: 'Jesteś odpowiedzialny za bezpieczeństwo swojego hasła. Nie udostępniaj konta osobom trzecim. Publiczne udostępnianie trasy oznacza, że każdy z linkiem może zobaczyć jej przebieg.',
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
          <p className="mt-1">{section.body}</p>
        </section>
      ))}
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
