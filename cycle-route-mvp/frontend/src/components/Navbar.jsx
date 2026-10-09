import { BrandMark } from './brand/BikeGlyph'

const LINKS = [
  { id: 'journey', label: 'Jak to działa' },
  { id: 'features', label: 'Funkcje' },
  { id: 'about', label: 'O aplikacji' },
]

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
    <header
      className="absolute inset-x-0 top-0 z-50 text-ink"
      style={{ paddingTop: 'var(--safe-area-inset-top,env(safe-area-inset-top))' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 md:px-10 md:py-6">
        <button
          type="button"
          onClick={onGoHome}
          className="flex min-h-11 min-w-0 items-center gap-2.5 text-left text-xs font-bold uppercase tracking-[0.16em] text-ink transition hover:text-rust sm:text-[13px]"
        >
          <BrandMark />
          <span className="truncate">Cycle Your Way</span>
        </button>

        <nav className="hidden items-center gap-7 text-[15px] font-medium lg:flex" aria-label="Sekcje strony">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-md px-1 py-1 text-ink transition hover:text-rust"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-sm text-ink-muted xl:inline" title={userEmail}>
                {userEmail}
              </span>
              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-11 rounded-full border-[1.5px] border-ink px-4 text-sm font-semibold text-ink transition hover:bg-white"
              >
                <span className="md:hidden">Konto</span>
                <span className="hidden md:inline">Moje konto</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="hidden min-h-11 rounded-full px-3 text-sm font-semibold text-ink-muted transition hover:text-rust sm:inline-flex sm:items-center"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-11 rounded-full border-[1.5px] border-ink px-4 text-sm font-semibold text-ink transition hover:bg-white"
            >
              Konto
            </button>
          )}

          {view === 'landing' ? (
            <button
              type="button"
              onClick={onStartPlanning}
              className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-muted"
            >
              Planuj
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoHome}
              className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-muted"
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
