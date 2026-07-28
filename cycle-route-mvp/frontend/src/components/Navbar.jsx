import CircularText from './CircularText'

function Navbar({
  view,
  onGoHome,
  onStartPlanning,
  onOpenAuth,
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <button
          type="button"
          onClick={onGoHome}
          className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-vanilla/90 transition hover:text-burnt-orange"
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
            onClick={() => scrollToSection('how-it-works')}
            className="transition hover:text-burnt-orange"
          >
            Jak to działa
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-xs text-vanilla/70 sm:inline"
                title={userEmail}
              >
                {userEmail}
              </span>
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
            className="hidden items-center pl-1 lg:flex"
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
