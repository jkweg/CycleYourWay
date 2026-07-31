function Footer({ onStartPlanning, onGoHome, onOpenPrivacy, onOpenTerms }) {
  return (
    <footer className="relative z-10 border-t border-burnt-orange/25 bg-[#4a3226] text-vanilla/80">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-burnt-orange">
              Cycle Your Way
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-[#E8D5B5]">
              Planer tras rowerowych z analizą wysokości, nawierzchni i eksportem do nawigacji.
              Twórz trasy dopasowane do Twojego stylu jazdy.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-burnt-orange">
              Nawigacja
            </p>
            <ul className="mt-4 space-y-2 text-sm text-vanilla/85">
              <li>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="transition hover:text-vanilla"
                >
                  Strona główna
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onStartPlanning}
                  className="transition hover:text-vanilla"
                >
                  Planer tras
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-burnt-orange">
              Informacje
            </p>
            <ul className="mt-4 space-y-2 text-sm text-vanilla/85">
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="transition hover:text-vanilla"
                >
                  Polityka prywatności
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="transition hover:text-vanilla"
                >
                  Regulamin
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-vanilla/20 pt-8 text-xs text-[#E8D5B5]/80 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cycle Your Way. Projekt portfolio / edukacyjny.</p>
          <p>Dane map: OpenStreetMap · Routing: OpenRouteService</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
