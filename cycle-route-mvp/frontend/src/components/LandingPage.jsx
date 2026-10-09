import { IconArrowRight } from '@tabler/icons-react'
import HeroAtlas from './landing/HeroAtlas'

const STEPS = [
  {
    n: '01',
    title: 'Zaplanuj',
    text: 'Wpisz start i cel albo wybierz długość pętli. Ustaw styl jazdy, nawierzchnię i to, czy omijać główne drogi.',
    tone: 'light',
    number: 'text-burnt-orange-dark',
  },
  {
    n: '02',
    title: 'Jedź',
    text: 'Nawigacja głosowa prowadzi Cię po trasie, a gdy z niej zjedziesz, wyznacza drogę powrotu.',
    tone: 'light',
    number: 'text-sage',
  },
  {
    n: '03',
    title: 'Zapisz',
    text: 'Ślad, dystans i czas trafiają do historii jazd. Ulubione trasy udostępnisz jednym linkiem.',
    tone: 'dark',
    number: 'text-burnt-orange',
  },
]

const FEATURES = [
  {
    eyebrow: 'Planowanie',
    title: 'Trasy, które mają sens',
    description:
      'Wyznaczaj przejazdy A → B albo generuj pętle o konkretnym dystansie. Dodawaj punkty pośrednie i porównuj warianty.',
  },
  {
    eyebrow: 'Świadomy wybór',
    title: 'Wiesz, co czeka po drodze',
    description:
      'Profil wysokości, przewyższenia, stromizny i nawierzchnia pokazują charakter trasy, zanim ruszysz z domu.',
  },
  {
    eyebrow: 'W terenie',
    title: 'Nawigacja, która jedzie z Tobą',
    description:
      'Głosowe wskazówki, podążająca mapa i automatyczne przeliczenie pomagają wrócić na właściwy kierunek.',
  },
  {
    eyebrow: 'Twoje konto',
    title: 'Trasy i jazdy w jednym miejscu',
    description:
      'Zapisuj ulubione trasy, oznaczaj je tagami, wracaj do historii przejazdów i ustaw własne preferencje.',
  },
]

const RIDE_STYLES = ['Szosa', 'Gravel', 'MTB', 'Miasto', 'Trekking']

function StyleMarquee() {
  const items = [...RIDE_STYLES, ...RIDE_STYLES]
  return (
    <div className="overflow-hidden bg-ink py-5 text-white" aria-label="Style jazdy: szosa, gravel, MTB, miasto, trekking">
      <div className="cyw-marquee flex w-max gap-10 whitespace-nowrap font-serif text-2xl italic md:gap-12 md:text-[34px]" aria-hidden="true">
        {items.map((style, index) => (
          <span key={`${style}-${index}`} className="flex items-center gap-10 md:gap-12">
            {style}
            <span className={index % 2 ? 'text-sage-light' : 'text-burnt-orange'}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Krótki landing tylko w aplikacji natywnej (Capacitor). */
function CompactLanding({ onStartPlanning }) {
  return (
    <section
      className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))]"
      aria-labelledby="mobile-landing-title"
    >
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rust">Cycle Your Way</p>
        <h1
          id="mobile-landing-title"
          className="mt-3 font-serif text-[2.65rem] font-medium leading-[1.05] tracking-tight text-ink"
        >
          Planuj i <span className="italic text-rust">jedź.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink-muted">
          Trasy rowerowe, pętle i nawigacja — w jednym miejscu.
        </p>
        <button
          type="button"
          onClick={onStartPlanning}
          className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-bold text-white"
        >
          Otwórz planer
          <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
        </button>

        <ul className="mt-10 space-y-3">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-center gap-3 rounded-2xl border border-[#EADBB5] bg-cream px-4 py-3">
              <span className={`font-serif text-2xl ${step.number}`}>{step.n}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Pełny marketingowy landing — web (desktop i telefon w przeglądarce). */
function FullLanding({ onStartPlanning }) {
  return (
    <div className="relative z-10">
      <HeroAtlas onStartPlanning={onStartPlanning} />

      <StyleMarquee />

      <section id="journey" className="mx-auto flex max-w-7xl scroll-mt-20 flex-col gap-11 px-5 py-20 md:px-10 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="max-w-2xl font-serif text-4xl font-medium leading-[1.02] tracking-[-0.02em] text-ink md:text-[56px]">
            Trzy kroki od mapy do <span className="italic text-rust">kilometrów</span>.
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-ink-muted">
            Planujesz na komputerze, jedziesz z telefonem, a każda jazda zostaje w Twojej historii.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.n}
              className={`flex flex-col gap-3.5 rounded-3xl p-7 md:p-8 ${
                step.tone === 'dark'
                  ? 'bg-ink text-white'
                  : 'border border-[#EADBB5] bg-white shadow-[0_10px_30px_rgba(42,26,18,0.06)]'
              }`}
            >
              <span className={`font-serif text-5xl leading-none ${step.number}`}>{step.n}</span>
              <h3 className="text-2xl font-bold">{step.title}</h3>
              <p className={`text-[17px] leading-relaxed ${step.tone === 'dark' ? 'text-vanilla-deep' : 'text-ink-muted'}`}>
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-20 pb-20 md:pb-24">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="rounded-[2rem] border border-[#EADBB5] bg-vanilla-deep/50 p-6 md:p-12">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-rust">Funkcje</p>
                <h2 className="mt-3 max-w-2xl font-serif text-3xl font-medium tracking-tight text-ink md:text-5xl">
                  Od pierwszego punktu do ostatniego zakrętu.
                </h2>
              </div>
              <button
                type="button"
                onClick={onStartPlanning}
                className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink-muted"
              >
                Przejdź do planera
                <IconArrowRight size={18} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#EADBB5] bg-cream p-6 transition hover:-translate-y-0.5 hover:border-burnt-orange/50 md:p-7"
                >
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${index % 2 ? 'text-sage' : 'text-rust'}`}>
                    0{index + 1} · {feature.eyebrow}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2.5 text-[15px] leading-7 text-ink-muted">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 bg-ink py-20 text-white md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-burnt-orange">O aplikacji</p>
            <h2 className="mt-4 font-serif text-3xl font-medium leading-tight tracking-tight md:text-5xl">
              Od pomysłu na wyjazd do gotowej trasy — bez przełączania narzędzi.
            </h2>
          </div>
          <p className="text-base leading-8 text-vanilla-deep">
            Cycle Your Way powstało dla rowerzystów, którzy chcą planować świadomie, ale nie chcą walczyć z
            interfejsem. Trasa ma być czytelna przed startem, dostępna w telefonie i łatwa do odnalezienia
            po powrocie.
          </p>
        </div>
      </section>

      <section id="start-planning" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
        <div className="relative flex flex-wrap items-center justify-between gap-7 overflow-hidden rounded-[2rem] bg-burnt-orange p-8 md:p-14">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-35" viewBox="0 0 1200 260" preserveAspectRatio="none">
            <path d="M-10 200 C 200 120 360 260 600 170 S 1000 60 1210 140" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
          </svg>
          <h2 className="relative max-w-2xl font-serif text-3xl font-medium leading-tight text-ink md:text-5xl">
            Gdzie jedziesz w ten weekend?
          </h2>
          <button
            type="button"
            onClick={onStartPlanning}
            className="relative inline-flex min-h-14 items-center gap-2.5 rounded-full bg-ink px-7 text-[17px] font-bold text-white transition hover:bg-ink-muted"
          >
            Otwórz planer
            <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}

/**
 * @param {{ onStartPlanning: () => void, variant?: 'full' | 'compact' }} props
 * - full: marketingowa strona (web, także telefon w przeglądarce)
 * - compact: uproszczony start (tylko aplikacja Android / Capacitor)
 */
function LandingPage({ onStartPlanning, variant = 'full' }) {
  return (
    <main className="relative z-10 bg-vanilla">
      {variant === 'compact' ? (
        <CompactLanding onStartPlanning={onStartPlanning} />
      ) : (
        <FullLanding onStartPlanning={onStartPlanning} />
      )}
    </main>
  )
}

export default LandingPage
