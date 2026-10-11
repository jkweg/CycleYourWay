import { IconArrowRight } from '@tabler/icons-react'
import HeroPoster from './landing/HeroPoster'
import { AboutQuote, ClosingPoster, FeatureList, StatsBand } from './landing/PosterSections'
import RideStory from './landing/RideStory'

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

/** Krótki landing tylko w aplikacji natywnej (Capacitor). */
function CompactLanding({ onStartPlanning }) {
  return (
    <section
      className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-[max(5.5rem,calc(var(--safe-area-inset-top,env(safe-area-inset-top))+4.5rem))]"
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
      <HeroPoster onStartPlanning={onStartPlanning} />
      <RideStory />
      <StatsBand />
      <FeatureList onStartPlanning={onStartPlanning} />
      <AboutQuote />
      <ClosingPoster onStartPlanning={onStartPlanning} />
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
