import { IconArrowRight, IconArrowUpRight } from '@tabler/icons-react'
import CountUp from '../CountUp'
import SpinBadge from './SpinBadge'

const STATS = [
  { value: 200, unit: 'km', label: 'Najdłuższa pętla, jaką wyznaczysz jednym suwakiem' },
  { value: 5, unit: 'stylów', label: 'Szosa, gravel, MTB, miasto i trekking — trasa pod Twój rower' },
  { value: 1, unit: 's', label: 'Tyle trwa odświeżenie pozycji w nawigacji' },
]

const FEATURES = [
  {
    title: 'Trasy, które mają sens',
    text: 'Przejazdy A → B albo pętle o konkretnym dystansie. Punkty pośrednie i kilka wariantów do porównania.',
  },
  {
    title: 'Wiesz, co czeka po drodze',
    text: 'Profil wysokości, przewyższenia i nawierzchnia pokazują charakter trasy, zanim ruszysz z domu.',
  },
  {
    title: 'Nawigacja, która jedzie z Tobą',
    text: 'Głosowe wskazówki, podążająca mapa i przeliczenie trasy, gdy zjedziesz z kursu.',
  },
  {
    title: 'Trasy i jazdy w jednym miejscu',
    text: 'Zapisane trasy, historia przejazdów i Twoje preferencje — na komputerze i w telefonie.',
  },
]

export function StatsBand() {
  return (
    <section aria-label="Cycle Your Way w liczbach" className="bg-ink text-vanilla">
      <div className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.unit} className="flex flex-col gap-4 bg-ink px-5 py-14 md:px-10 md:py-20">
            <p className="font-display text-[clamp(5rem,10vw,8.5rem)] leading-[0.85]">
              <CountUp to={stat.value} />
              <span className="ml-2 text-[0.42em] normal-case text-burnt-orange">{stat.unit}</span>
            </p>
            <p className="max-w-[18rem] text-lg leading-relaxed text-vanilla-deep">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FeatureList({ onStartPlanning }) {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 bg-vanilla">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2
            id="features-title"
            className="max-w-3xl font-serif text-[clamp(2.4rem,5vw,4.5rem)] font-medium leading-[1] tracking-[-0.02em] text-ink"
          >
            Od pierwszego punktu do <span className="italic text-rust">ostatniego zakrętu</span>.
          </h2>
          <button
            type="button"
            onClick={onStartPlanning}
            className="press inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-ink px-6 text-[15px] font-semibold text-white hover:bg-ink-muted md:self-auto"
          >
            Przejdź do planera
            <IconArrowRight size={18} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
          </button>
        </div>
        <ol className="border-b border-ink/15">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className="group grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 gap-y-2 border-t border-ink/15 py-8 transition-colors duration-200 md:grid-cols-[6rem_1fr_1.1fr_2.5rem] md:gap-x-8 md:py-10 [@media(hover:hover)]:hover:bg-cream"
            >
              <span className="font-display text-4xl leading-none text-burnt-orange md:text-5xl">0{index + 1}</span>
              <h3 className="font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] font-medium leading-tight text-ink">
                {feature.title}
              </h3>
              <p className="col-start-2 text-lg leading-relaxed text-ink-muted md:col-start-auto">{feature.text}</p>
              <IconArrowUpRight
                size={28}
                stroke={2}
                aria-hidden="true"
                className="hidden text-ink/30 transition-[transform,color] duration-200 ease-[var(--ease-out)] md:block [@media(hover:hover)]:group-hover:-translate-y-1 [@media(hover:hover)]:group-hover:translate-x-1 [@media(hover:hover)]:group-hover:text-burnt-orange"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function AboutQuote() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-20 bg-vanilla">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-24 md:grid-cols-[14rem_1fr] md:px-10 md:pb-32">
        <p id="about-title" className="text-xs font-bold uppercase tracking-[0.2em] text-rust md:pt-4">
          O aplikacji
        </p>
        <blockquote className="font-serif text-[clamp(1.9rem,3.8vw,3.4rem)] font-medium leading-[1.12] tracking-[-0.015em] text-ink">
          Cycle Your Way powstało dla rowerzystów, którzy chcą planować świadomie, a nie walczyć z interfejsem. Trasa ma
          być <span className="italic text-rust">czytelna przed startem</span>, dostępna w telefonie i łatwa do
          odnalezienia po powrocie.
        </blockquote>
      </div>
    </section>
  )
}

// Torn paper edge on top of the closing poster.
const POSTER_EDGE =
  'M0 60 V30 L44 44 L90 26 L138 48 L180 30 L228 52 L276 34 L320 50 L372 28 L416 46 L466 32 L512 54 L560 36 L604 50 L652 30 L700 48 L748 34 L792 56 L842 38 L888 52 L936 30 L984 46 L1030 34 L1080 54 L1126 36 L1172 50 L1222 28 L1268 46 L1314 34 L1362 52 L1404 38 L1440 48 V60 Z'

export function ClosingPoster({ onStartPlanning }) {
  return (
    <section id="start-planning" aria-labelledby="closing-title" className="relative bg-vanilla">
      <svg aria-hidden="true" className="block h-[60px] w-full" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d={POSTER_EDGE} fill="#FC6C26" />
      </svg>
      <div className="cyw-grain relative bg-burnt-orange">
        <div className="relative z-[2] mx-auto flex max-w-[1440px] flex-col gap-10 px-5 pb-16 pt-10 md:px-10 md:pb-24">
          <h2 id="closing-title" className="font-display text-[clamp(3.6rem,11vw,11rem)] leading-[0.86] text-ink">
            Gdzie jedziesz
            <br />
            <span className="text-vanilla">w ten weekend?</span>
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p className="max-w-md text-lg leading-relaxed text-ink/80">
              Wybierz start i dystans — pętlę wyznaczymy w kilka sekund. Bez zakładania konta.
            </p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={onStartPlanning}
                className="press inline-flex min-h-14 items-center gap-2.5 rounded-full bg-ink px-7 text-[17px] font-bold text-white hover:bg-ink-muted"
              >
                Otwórz planer
                <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
              </button>
              <SpinBadge onClick={onStartPlanning} className="hidden md:grid" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
