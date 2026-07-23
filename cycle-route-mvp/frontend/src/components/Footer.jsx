function Footer({ onStartPlanning, onGoHome, onOpenPrivacy, onOpenTerms }) {
  return (
    <footer className="relative z-10 border-t border-[#e3d9c8] bg-[#2a241d] text-stone-300">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Cycle Your Way
            </p>
            <p className="mt-4 max-w-md text-sm leading-7 text-stone-400">
              Planer tras rowerowych z analizą wysokości, nawierzchni i eksportem do nawigacji.
              Twórz trasy dopasowane do Twojego stylu jazdy.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Nawigacja
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="transition hover:text-white"
                >
                  Strona główna
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onStartPlanning}
                  className="transition hover:text-white"
                >
                  Planer tras
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Informacje
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="transition hover:text-white"
                >
                  Polityka prywatności
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="transition hover:text-white"
                >
                  Regulamin
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-stone-700 pt-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cycle Your Way. Projekt portfolio / edukacyjny.</p>
          <p>Dane map: OpenStreetMap · Routing: OpenRouteService</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
