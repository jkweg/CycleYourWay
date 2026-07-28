import { motion } from 'motion/react'
import LampHero from './LampHero'
import PhoneShowcase from './PhoneShowcase'
import ScrollJourney from './ScrollJourney'
import RouteConstellationBackdrop from './RouteConstellationBackdrop'

const FEATURES = [
  {
    title: 'Trasy A → B i pętle',
    description:
      'Wyznaczaj klasyczne trasy między dwoma punktami albo generuj pętle treningowe o wybranym dystansie.',
  },
  {
    title: 'Profil i nawierzchnia',
    description:
      'Analizuj wysokość i rozkład nawierzchni jeszcze przed wyjazdem — bez zgadywania po drodze.',
  },
  {
    title: 'Nawigacja i zapis',
    description:
      'Porównaj warianty, pobierz GPX, otwórz trasę na telefonie z QR albo udostępnij publiczny link.',
  },
]

function LandingPage({ onStartPlanning }) {
  return (
    <main className="relative z-10">
      <RouteConstellationBackdrop />

      <div className="relative z-10">
        <LampHero onStartPlanning={onStartPlanning} />

        <ScrollJourney onStartPlanning={onStartPlanning} />

        <PhoneShowcase onStartPlanning={onStartPlanning} />

        <section id="features" className="relative py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="rounded-3xl border border-burnt-orange/20 bg-vanilla/90 p-8 shadow-[0_20px_50px_-30px_rgba(252,108,38,0.35)] backdrop-blur-sm md:p-12">
              <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-burnt-orange">
                    Funkcje
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                    Wszystko, czego potrzebujesz przed startem.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onStartPlanning}
                  className="soft-button self-start rounded-full border-2 border-burnt-orange px-6 py-2.5 text-sm font-semibold text-burnt-orange transition hover:bg-burnt-orange/10"
                >
                  Przejdź do planera
                </button>
              </div>

              <div className="grid gap-8 md:grid-cols-3 md:gap-10">
                {FEATURES.map((feature, index) => (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ duration: 0.55, delay: index * 0.08, ease: 'easeOut' }}
                    className="border-t border-burnt-orange/25 pt-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-burnt-orange">
                      0{index + 1}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink-muted">{feature.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="relative bg-vanilla/82 py-20 backdrop-blur-sm md:py-28"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#3d2a20]/22 to-transparent" />
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-burnt-orange">
                O aplikacji
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink md:text-4xl">
                Od pomysłu na wyjazd do gotowej trasy — bez przełączania narzędzi.
              </h2>
              <p className="mt-6 text-base leading-8 text-ink-muted">
                Cycle Your Way powstało z myślą o rowerzystach, którzy chcą planować sensownie:
                widzieć przewyższenia, wiedzieć co jechać pod kołem i mieć trasę pod ręką w telefonie
                lub na zegarku. Interfejs jest prosty, a dane — konkretne.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
            <div className="rounded-3xl border border-burnt-orange/20 bg-vanilla/90 px-8 py-12 shadow-[0_20px_50px_-30px_rgba(252,108,38,0.35)] backdrop-blur-sm md:px-12">
              <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
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
    </main>
  )
}

export default LandingPage
