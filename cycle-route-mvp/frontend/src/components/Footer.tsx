import type { MouseEvent } from 'react'

type FooterProps = {
  onStartPlanning?: () => void
  onGoHome?: () => void
  onOpenPrivacy?: () => void
  onOpenTerms?: () => void
}

function Footer({ onStartPlanning, onGoHome, onOpenPrivacy, onOpenTerms }: FooterProps) {
  return (
    <footer
      className="relative z-10 border-t border-burnt-orange/25 bg-[#4a3226] text-vanilla/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-14">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-4 md:gap-10">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-burnt-orange">
              Cycle Your Way
            </p>
            <p className="mt-2 hidden max-w-md text-[15px] leading-7 text-[#E8D5B5] md:mt-4 md:block">
              Planer tras rowerowych z analizą wysokości, nawierzchni i eksportem do nawigacji.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-vanilla/85 md:block md:space-y-2">
            <p className="mb-0 hidden text-xs font-semibold uppercase tracking-wide text-burnt-orange md:mb-4 md:block">
              Nawigacja
            </p>
            <button type="button" onClick={onGoHome} className="transition hover:text-vanilla">
              Start
            </button>
            <button
              type="button"
              onClick={onStartPlanning}
              className="transition hover:text-vanilla md:mt-2 md:block"
            >
              Planer
            </button>
            <a
              href="/privacy"
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                if (onOpenPrivacy) {
                  e.preventDefault()
                  onOpenPrivacy()
                }
              }}
              className="transition hover:text-vanilla md:mt-2 md:block"
            >
              Prywatność
            </a>
            <a
              href="/terms"
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                if (onOpenTerms) {
                  e.preventDefault()
                  onOpenTerms()
                }
              }}
              className="transition hover:text-vanilla md:mt-2 md:block"
            >
              Regulamin
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-vanilla/20 pt-4 text-[11px] text-[#E8D5B5]/80 md:mt-12 md:pt-8 md:text-xs">
          <p>© {new Date().getFullYear()} Cycle Your Way</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
