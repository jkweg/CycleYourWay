import BlurText from './BlurText'
import LampHero from './LampHero'

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
    title: 'Eksport i zapis',
    description:
      'Pobierz GPX, otwórz w Google Maps lub zapisz trasę na koncie i wróć do niej później.',
  },
]

const STEPS = [
  {
    label: 'Krok 1',
    text: 'Wybierz tryb: trasa A → B albo pętla treningowa.',
  },
  {
    label: 'Krok 2',
    text: 'Ustaw punkty na mapie lub wpisz adresy i wyznacz trasę.',
  },
  {
    label: 'Krok 3',
    text: 'Sprawdź statystyki, elewację i nawierzchnię, potem eksportuj lub zapisz.',
  },
]

function LandingPage({ onStartPlanning }) {
  return (
    <main className="relative z-10">
      <LampHero onStartPlanning={onStartPlanning} />

      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a6248]">
              Dla każdego typu jazdy
            </p>
            <BlurText
              text="Od miasta po szlak."
              delay={120}
              animateBy="words"
              direction="top"
              className="text-3xl font-semibold leading-tight text-[#2e5f43] md:text-5xl"
            />
            <p className="mt-8 max-w-xl text-base leading-8 text-stone-700 md:text-lg">
              Geokodowanie z podpowiedziami, alternatywne warianty trasy, unikanie dróg głównych
              i eksport do Google Maps lub GPX.
            </p>
          </div>

          <div className="soft-panel relative min-h-[320px] overflow-hidden rounded-3xl border border-[#e6dccb] bg-[rgba(247,242,233,0.82)] p-8 shadow-[0_18px_45px_rgba(95,74,53,0.12)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(111,160,124,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(165,130,90,0.14),transparent_50%)]" />
            <div className="relative flex h-full flex-col justify-end">
              <h2 className="text-2xl font-semibold leading-tight text-[#2e5f43] md:text-3xl">
                Trasy dopasowane do Twoich kół.
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-700">
                Wyznacz trasę, sprawdź profil wysokościowy i zapisz ją na koncie — bez
                przełączania między aplikacjami.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-[#e8e2d6] bg-white/70 py-20">
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

      <section id="features" className="py-20">
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
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="soft-panel rounded-2xl border border-[#ece3d4] bg-[#fcfaf5] p-6"
              >
                <h3 className="text-lg font-semibold text-[#2e5f43]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[#e8e2d6] bg-[#f4efe6]/60 py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6248]">
            Jak to działa
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#2e5f43] md:text-4xl">
            Trzy kroki do gotowej trasy.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.label}
                className="rounded-2xl border border-[#e3d9c8] bg-white/85 p-6"
              >
                <p className="text-4xl font-light text-[#c5d8c8]">{String(index + 1).padStart(2, '0')}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {step.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-700">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={onStartPlanning}
              className="soft-button rounded-full bg-[#7a6248] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#6c563f]"
            >
              Rozpocznij planowanie
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
