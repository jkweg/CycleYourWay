import { useLayoutEffect, useRef } from 'react'
import { animate, createScope, stagger } from 'animejs'
import { LampContainer } from './ui/lamp'

const HERO_POINTS = [
  { label: 'Zaplanuj', value: 'Trasę dopasowaną do Ciebie' },
  { label: 'Sprawdź', value: 'Nawierzchnię i przewyższenia' },
  { label: 'Jedź', value: 'Z nawigacją w telefonie' },
]

const ROUTE_PATH =
  'M 8 31 C 88 31 96 10 162 18 C 234 28 275 42 345 25 C 418 7 452 16 552 8'

function LampHero({ onStartPlanning }) {
  const rootRef = useRef(null)
  const routePathRef = useRef(null)
  const routeDotRef = useRef(null)

  useLayoutEffect(() => {
    const routePath = routePathRef.current
    const routeDot = routeDotRef.current
    const pathLength = routePath?.getTotalLength() || 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (routePath && pathLength) {
      routePath.style.strokeDasharray = String(pathLength)
      routePath.style.strokeDashoffset = reduceMotion ? '0' : String(pathLength)
    }
    if (routeDot) {
      routeDot.style.opacity = reduceMotion ? '1' : '0'
      routeDot.style.offsetDistance = reduceMotion ? '100%' : '0%'
    }

    if (reduceMotion) return undefined

    let scope
    let splashObserver

    const revealHero = () => {
      if (scope || !rootRef.current) return

      scope = createScope({ root: rootRef }).add(() => {
        animate('[data-hero-reveal]', {
          opacity: { from: 0, to: 1 },
          y: { from: 26, to: 0 },
          duration: 760,
          delay: stagger(115, { start: 80 }),
          ease: 'out(3)',
        })

        if (routePath && pathLength) {
          animate(routePath, {
            strokeDashoffset: { from: pathLength, to: 0 },
            duration: 1900,
            delay: 720,
            ease: 'inOut(3)',
          })
        }

        if (routeDot) {
          animate(routeDot, {
            opacity: { from: 0, to: 1 },
            offsetDistance: { from: '0%', to: '100%' },
            duration: 1900,
            delay: 720,
            ease: 'inOut(3)',
          })
        }

        rootRef.current.querySelectorAll('[data-hero-point]').forEach((point, index) => {
          animate(point, {
            y: index % 2 === 0 ? -3 : 3,
            duration: 5000 + index * 700,
            delay: index * 350,
            loop: true,
            alternate: true,
            ease: 'inOutSine',
          })
        })
      })
    }

    if (document.querySelector('.loading-screen')) {
      splashObserver = new MutationObserver(() => {
        if (!document.querySelector('.loading-screen')) {
          splashObserver.disconnect()
          revealHero()
        }
      })
      splashObserver.observe(document.body, { childList: true, subtree: true })
    } else {
      revealHero()
    }

    return () => {
      splashObserver?.disconnect()
      scope?.revert()
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative w-full"
      aria-labelledby="landing-hero-title"
    >
      <LampContainer className="min-h-[min(92vh,760px)]">
        <div
          data-hero-reveal
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4a3226]/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4a3226]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-burnt-orange opacity-35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-burnt-orange" />
          </span>
          Twój kierunek. Twoje tempo.
        </div>

        <h1
          id="landing-hero-title"
          className="relative font-serif text-[clamp(3.8rem,10vw,8.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]"
        >
          <span className="block pb-[0.22em]">
            <span data-hero-reveal className="block text-[#4a2b20]">
              Cycle
            </span>
          </span>
          <span className="-mt-[0.18em] block pb-[0.34em]">
            <span
              data-hero-reveal
              className="block pb-[0.18em] leading-[1.08] text-[#4a3226]"
            >
              Your Way
            </span>
          </span>
        </h1>

        <div
          data-hero-reveal
          className="relative -mt-1 h-12 w-[min(78vw,34rem)]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 560 48" className="h-full w-full overflow-visible">
            <path
              d={ROUTE_PATH}
              fill="none"
              stroke="#e9c99e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 10"
            />
            <path
              ref={routePathRef}
              d={ROUTE_PATH}
              fill="none"
              stroke="#FC6C26"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              ref={routeDotRef}
              r="6"
              fill="#FC6C26"
              stroke="#FFF4D6"
              strokeWidth="3"
              style={{ offsetPath: `path('${ROUTE_PATH}')` }}
            />
          </svg>
        </div>

        <p
          data-hero-reveal
          className="mt-4 max-w-2xl text-lg font-medium leading-8 text-ink md:text-xl"
        >
          Nie wybieraj po prostu drogi. Wybierz przejazd, który pasuje do Ciebie.
        </p>
        <p
          data-hero-reveal
          className="mt-4 max-w-xl text-[15px] leading-7 text-ink-muted md:text-base"
        >
          Od spokojnej pętli po ambitny wyjazd — planowanie, analiza i nawigacja
          spotykają się w jednym eleganckim narzędziu.
        </p>

        <div
          data-hero-reveal
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={onStartPlanning}
            className="soft-button rounded-full bg-burnt-orange px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
          >
            Rozpocznij planowanie
          </button>
          <a
            href="#journey"
            className="soft-button rounded-full border border-[#4a3226]/40 px-8 py-3.5 text-sm font-semibold text-[#4a3226] transition hover:border-[#4a3226] hover:bg-[#4a3226]/5"
          >
            Zobacz, jak to działa
          </a>
        </div>

        <div
          data-hero-reveal
          className="mt-9 grid w-full max-w-4xl gap-2.5 pb-2 sm:grid-cols-3"
        >
          {HERO_POINTS.map((point, index) => (
            <div
              key={point.label}
              data-hero-point
              className="rounded-2xl border border-[#4a3226]/25 bg-[#FFFBF1] px-4 py-3.5 text-left"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-burnt-orange">
                0{index + 1} · {point.label}
              </p>
              <p className="mt-1.5 text-sm font-medium text-ink-muted">
                {point.value}
              </p>
            </div>
          ))}
        </div>
      </LampContainer>
    </section>
  )
}

export default LampHero
