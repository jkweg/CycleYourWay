import { motion } from 'motion/react'
import LampHero from './LampHero'
import PhoneShowcase from './PhoneShowcase'
import ScrollJourney from './ScrollJourney'

const FEATURES = [
  {
    title: 'Trasy A → B i pętle',
    description:
      'Wyznaczaj klasyczne trasy między dwoma punktami albo generuj pętle treningowe o wybranym dystansie.',
    icon: '🧭',
  },
  {
    title: 'Profil i nawierzchnia',
    description:
      'Analizuj wysokość i rozkład nawierzchni jeszcze przed wyjazdem — bez zgadywania po drodze.',
    icon: '⛰️',
  },
  {
    title: 'Eksport i zapis',
    description:
      'Pobierz GPX, otwórz na telefonie z kodem QR lub zapisz trasę na koncie i wróć do niej później.',
    icon: '💾',
  },
]

function LandingPage({ onStartPlanning }) {
  return (
    <main className="relative z-10">
      <LampHero onStartPlanning={onStartPlanning} />

      <ScrollJourney onStartPlanning={onStartPlanning} />

      <PhoneShowcase onStartPlanning={onStartPlanning} />

      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6248]">
                Funkcje
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2e5f43] md:text-4xl">
                Wszystko, czego potrzebujesz przed startem.
              </h2>
            </div>
            <button
              type="button"
              onClick={onStartPlanning}
              className="soft-button self-start rounded-full border border-[#2e5f43] px-6 py-2.5 text-sm font-semibold text-[#2e5f43] transition hover:bg-[#f4faf4]"
            >
              Przejdź do planera
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                className="soft-panel rounded-2xl border border-[#ece3d4] bg-[#fcfaf5] p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ea] text-2xl">
                  {feature.icon}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#2e5f43]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-[#e8e2d6] bg-white/70 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6248]">
              O aplikacji
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#2e5f43] md:text-4xl">
              Od pomysłu na wyjazd do gotowej trasy — bez przełączania narzędzi.
            </h2>
            <p className="mt-6 text-base leading-8 text-stone-700">
              Cycle Your Way powstało z myślą o rowerzystach, którzy chcą planować sensownie:
              widzieć przewyższenia, wiedzieć co jechać pod kołem i mieć trasę pod ręką w telefonie
              lub na zegarku. Interfejs jest prosty, a dane — konkretne.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
          <h2 className="text-3xl font-semibold leading-tight text-[#2e5f43] md:text-5xl">
            Gotowy na pierwszą trasę?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-stone-700">
            Wyznacz trasę w kilka sekund, sprawdź profil i zabierz nawigację ze sobą.
          </p>
          <button
            type="button"
            onClick={onStartPlanning}
            className="soft-button mt-8 rounded-full bg-[#2e5f43] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#356b4b]"
          >
            Rozpocznij planowanie
          </button>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
