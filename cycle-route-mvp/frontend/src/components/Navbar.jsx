import CircularText from './CircularText'

function Navbar({
  view,
  onGoHome,
  onStartPlanning,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  isAuthenticated,
  userEmail,
}) {
  const scrollToSection = (id) => {
    if (view !== 'landing') {
      onGoHome()
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-burnt-orange/25 bg-[#4a3226]/95 text-vanilla/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 md:px-10">
        <button
          type="button"
          onClick={onGoHome}
          className="min-w-0 truncate text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-vanilla/90 transition hover:text-burnt-orange sm:text-sm sm:tracking-[0.18em]"
        >
          Cycle Your Way
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-vanilla/80 md:flex">
          <button
            type="button"
            onClick={() => scrollToSection('about')}
            className="transition hover:text-burnt-orange"
          >
            O aplikacji
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="transition hover:text-burnt-orange"
          >
            Funkcje
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('journey')}
            className="transition hover:text-burnt-orange"
          >
            Jak to działa
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[8rem] truncate text-xs text-vanilla/70 lg:inline"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={onOpenProfile}
                className="rounded-lg border border-burnt-orange/25 bg-burnt-orange px-3 py-2 text-xs font-semibold text-vanilla transition hover:bg-burnt-orange-dark"
              >
                Moje konto
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-burnt-orange/25 bg-vanilla px-3 py-2 text-xs font-semibold text-ink transition hover:bg-vanilla-deep"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg border border-burnt-orange/25 bg-vanilla px-3 py-2 text-xs font-semibold text-ink transition hover:bg-vanilla-deep"
            >
              Konto
            </button>
          )}

          {view === 'landing' ? (
            <button
              type="button"
              onClick={onStartPlanning}
              className="soft-button rounded-lg bg-burnt-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
            >
              Planer
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoHome}
              className="soft-button rounded-lg border-2 border-burnt-orange bg-vanilla px-4 py-2 text-xs font-semibold uppercase tracking-wide text-burnt-orange transition hover:bg-burnt-orange/10"
            >
              Strona główna
            </button>
          )}

          <button
            type="button"
            onClick={onGoHome}
            aria-label="Przejdź do strony głównej"
            className="flex shrink-0 items-center pl-0.5 sm:pl-1"
          >
            <CircularText
              text="CYCLE*YOUR*WAY*"
              onHover="speedUp"
              spinDuration={18}
              className="navbar-circular-text"
            />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
