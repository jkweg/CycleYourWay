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
    <header className="absolute inset-x-0 top-0 z-50 border-b border-[#4a3226]/10 bg-transparent text-[#4a3226]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 md:px-10">
        <button
          type="button"
          onClick={onGoHome}
          className="min-w-0 truncate text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a3226] transition hover:text-burnt-orange sm:text-sm sm:tracking-[0.18em]"
        >
          Cycle Your Way
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#4a3226]/75 md:flex">
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
                className="hidden max-w-[8rem] truncate text-xs text-[#4a3226]/65 lg:inline"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={onOpenProfile}
                className="rounded-lg border border-[#4a3226] bg-[#4a3226] px-3 py-2 text-xs font-semibold text-vanilla transition hover:bg-[#352219]"
              >
                Moje konto
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-[#4a3226]/35 bg-vanilla px-3 py-2 text-xs font-semibold text-[#4a3226] transition hover:border-burnt-orange hover:text-burnt-orange"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg border border-[#4a3226]/35 bg-vanilla px-3 py-2 text-xs font-semibold text-[#4a3226] transition hover:border-burnt-orange hover:text-burnt-orange"
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
              className="soft-button rounded-lg border border-[#4a3226] bg-[#4a3226] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-vanilla transition hover:bg-[#352219]"
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
