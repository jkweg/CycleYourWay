import { motion } from 'motion/react'
import LampHero from './LampHero'
import ScrollJourney from './ScrollJourney'

const STEPS = [
  { n: '01', title: 'Wybierz punkty', text: 'A → B albo pętla' },
  { n: '02', title: 'Wyznacz trasę', text: 'Porównaj warianty' },
  { n: '03', title: 'Jedź', text: 'Nawigacja w telefonie' },
]

const FEATURES = [
  {
    eyebrow: 'Planowanie',
    title: 'Trasy, które mają sens',
    description:
      'Wyznaczaj przejazdy A → B albo generuj pętle o konkretnym dystansie. Dodawaj punkty pośrednie i porównuj warianty.',
    accent: '↝',
  },
  {
    eyebrow: 'Świadomy wybór',
    title: 'Wiesz, co czeka po drodze',
    description:
      'Profil wysokości, przewyższenia, stromizny i nawierzchnia pokazują charakter trasy, zanim ruszysz z domu.',
    accent: '⌁',
  },
  {
    eyebrow: 'W terenie',
    title: 'Nawigacja, która jedzie z Tobą',
    description:
      'Głosowe wskazówki, podążająca mapa i automatyczne przeliczenie pomagają wrócić na właściwy kierunek.',
    accent: '◎',
  },
  {
    eyebrow: 'Twoje konto',
    title: 'Trasy i jazdy w jednym miejscu',
    description:
      'Zapisuj ulubione trasy, oznaczaj je tagami, wracaj do historii przejazdów i ustaw własne preferencje.',
    accent: '✦',
  },
]

const ABOUT_VALUES = [
  {
    number: '01',
    title: 'Czytelnie',
    text: 'Najważniejsze dane są zawsze na pierwszym planie.',
  },
  {
    number: '02',
    title: 'Po Twojemu',
    text: 'Styl jazdy i preferencje naprawdę wpływają na trasę.',
  },
  {
    number: '03',
    title: 'Od planu do jazdy',
    text: 'Jedno miejsce zamiast kilku przypadkowych narzędzi.',
  },
]

/** Krótki landing tylko w aplikacji natywnej (Capacitor). */
function CompactLanding({ onStartPlanning }) {
  return (
    <section
      className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))]"
      aria-labelledby="mobile-landing-title"
    >
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-burnt-orange">
          Cycle Your Way
        </p>
        <h1
          id="mobile-landing-title"
          className="mt-3 font-serif text-[2.65rem] font-semibold leading-[1.05] tracking-tight text-[#4a3226]"
        >
          Planuj i jedź.
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-6 text-[#4a3226]/80">
          Trasy rowerowe, pętle i nawigacja — w jednym miejscu.
        </p>

        <button
          type="button"
          onClick={onStartPlanning}
          className="soft-button mt-8 w-full rounded-2xl bg-burnt-orange px-6 py-4 text-sm font-semibold uppercase tracking-wide text-vanilla"
        >
          Otwórz planer
        </button>

        <ul className="mt-10 space-y-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex items-center gap-3 rounded-2xl border border-[#4a3226]/20 bg-[#FFFBF1] px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4a3226] text-xs font-bold text-vanilla">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#4a3226]">{step.title}</p>
                <p className="text-xs text-ink-muted">{step.text}</p>
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
      <LampHero onStartPlanning={onStartPlanning} />

      <ScrollJourney onStartPlanning={onStartPlanning} />

      <section id="features" className="relative scroll-mt-20 py-16 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[#4a3226]/28 bg-vanilla-deep/45 p-6 md:rounded-[2rem] md:p-12">
            <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-burnt-orange">
                  Funkcje
                </p>
                <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-[#4a3226] md:text-5xl">
                  Wszystko, czego potrzebujesz od pierwszego punktu do ostatniego zakrętu.
                </h2>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted md:text-base">
                  Mniej przełączania między aplikacjami. Więcej czasu na samą jazdę.
                </p>
              </div>
              <button
                type="button"
                onClick={onStartPlanning}
                className="soft-button self-start rounded-full bg-[#4a3226] px-6 py-3 text-sm font-semibold text-vanilla transition hover:bg-[#352219]"
              >
                Przejdź do planera
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 0.55, delay: index * 0.08, ease: 'easeOut' }}
                  whileHover={{ y: -5 }}
                  className="group relative overflow-hidden rounded-2xl border border-[#4a3226]/25 bg-[#FFFBF1] p-6 transition-colors hover:border-burnt-orange/50 md:p-7"
                >
                  <span className="absolute -right-3 -top-6 font-serif text-8xl text-burnt-orange/[0.07] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                    {feature.accent}
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-burnt-orange">
                      0{index + 1} · {feature.eyebrow}
                    </p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-burnt-orange/30 bg-vanilla text-lg text-burnt-orange">
                      {feature.accent}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#4a3226]">{feature.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-ink-muted">{feature.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="relative scroll-mt-20 bg-[#4a3226] py-16 text-vanilla md:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12% 0px' }}
              transition={{ duration: 0.65 }}
              className="max-w-3xl"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-burnt-orange">
                O aplikacji
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-vanilla md:text-5xl">
                Od pomysłu na wyjazd do gotowej trasy — bez przełączania narzędzi.
              </h2>
              <p className="mt-6 text-base leading-8 text-vanilla/85">
                Cycle Your Way powstało dla rowerzystów, którzy chcą planować
                świadomie, ale nie chcą walczyć z interfejsem. Trasa ma być
                czytelna przed startem, dostępna w telefonie i łatwa do
                odnalezienia po powrocie.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-[#E8D5B5]">
                Łączymy dane mapowe z prostym językiem, spokojnym designem i
                narzędziami, które pomagają zarówno podczas krótkiej przejażdżki,
                jak i całodniowego wypadu.
              </p>
            </motion.div>

            <div className="grid gap-4">
              {ABOUT_VALUES.map((value, index) => (
                <motion.div
                  key={value.number}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-12% 0px' }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex gap-4 rounded-2xl border border-vanilla/25 bg-vanilla/[0.06] p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-burnt-orange text-xs font-bold text-vanilla">
                    {value.number}
                  </span>
                  <div>
                    <h3 className="font-semibold text-vanilla">{value.title}</h3>
                    <p className="mt-1 text-[15px] leading-6 text-[#E8D5B5]">{value.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="start-planning" className="relative py-16 md:py-28">
        <div className="mx-auto max-w-4xl px-5 text-center md:px-10">
          <div className="rounded-3xl border border-[#4a3226]/28 bg-[#FFFBF1] px-6 py-10 md:px-12 md:py-12">
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#4a3226] md:text-5xl">
              Gotowy na pierwszą trasę?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-ink-muted">
              Wyznacz trasę w kilka sekund, porównaj warianty i zabierz nawigację ze sobą.
            </p>
            <button
              type="button"
              onClick={onStartPlanning}
              className="soft-button mt-8 rounded-full bg-burnt-orange px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
            >
              Rozpocznij planowanie
            </button>
          </div>
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
