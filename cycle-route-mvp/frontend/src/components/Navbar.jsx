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
    <header className="sticky top-0 z-50 border-b border-[#e8e2d6]/80 bg-[#f7f5ef]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <button
          type="button"
          onClick={onGoHome}
          className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-[#2e5f43] transition hover:text-[#356b4b]"
        >
          Cycle Your Way
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-stone-700 md:flex">
          <button
            type="button"
            onClick={() => scrollToSection('about')}
            className="transition hover:text-[#2e5f43]"
          >
            O aplikacji
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('features')}
            className="transition hover:text-[#2e5f43]"
          >
            Funkcje
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="transition hover:text-[#2e5f43]"
          >
            Jak to działa
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-xs text-stone-600 sm:inline"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
            >
              Konto
            </button>
          )}

          {view === 'landing' ? (
            <button
              type="button"
              onClick={onStartPlanning}
              className="soft-button rounded-lg bg-[#2e5f43] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#356b4b]"
            >
              Planer
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoHome}
              className="soft-button rounded-lg border border-[#2e5f43] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#2e5f43] transition hover:bg-[#f4faf4]"
            >
              Strona główna
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
