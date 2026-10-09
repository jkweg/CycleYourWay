import { useEffect, useRef, useState } from 'react'
import { BikeShapes, BrandMark } from './brand/BikeGlyph'
import { prefersReducedMotion } from '../lib/intro'
import { BIKE_SIZE, easeInOutCubic, placeOnPath } from '../lib/routeMotion'

// First-run intro ("atlas trasy"). The route line is the progress bar: it draws
// as the app loads and the bike rides on its tip. Shown once per device (Root).
const MIN_MS = 2600
const FINISH_MS = 450
const EXIT_MS = 450
const WAITING_CAP = 0.92
const PATH_START = 0.06
const PATH_PARKED = 0.8

const ROUTES = {
  wide: {
    viewBox: '0 0 1440 300',
    d: 'M -110 196 C 60 196 220 96 380 112 S 600 236 760 196 S 980 70 1120 100 S 1340 220 1550 150',
    waypoints: [[380, 112], [760, 196], [1120, 100]],
    bikeScale: 0.95,
  },
  narrow: {
    viewBox: '0 0 390 220',
    d: 'M -70 160 C 70 160 100 60 180 70 S 290 200 460 110',
    waypoints: [[180, 70]],
    bikeScale: 0.72,
  },
}

function pageReady() {
  const loaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }))
  const fonts = document.fonts?.ready ?? Promise.resolve()
  return Promise.all([loaded, fonts.catch(() => undefined)])
}

function LoadingScreen({ onComplete }) {
  const [percent, setPercent] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [narrow] = useState(() => window.matchMedia?.('(max-width: 640px)').matches ?? false)
  const pathRef = useRef(null)
  const trailRef = useRef(null)
  const riderRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  const route = narrow ? ROUTES.narrow : ROUTES.wide

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const minMs = reduced ? 500 : MIN_MS
    const started = performance.now()
    let ready = false
    let finishFrom = null
    let finishStart = 0
    let frame = 0
    let exitTimer = 0
    let lastPercent = -1

    pageReady().then(() => {
      ready = true
    })

    // The route starts and ends off-screen: while loading, the bike rides the
    // visible stretch (START..PARKED); finishing carries it out of the frame.
    const toPath = (p) =>
      p <= WAITING_CAP
        ? PATH_START + (PATH_PARKED - PATH_START) * (p / WAITING_CAP)
        : PATH_PARKED + (1 - PATH_PARKED) * ((p - WAITING_CAP) / (1 - WAITING_CAP))

    const draw = (p) => {
      if (pathRef.current) {
        placeOnPath(pathRef.current, toPath(p), {
          rider: riderRef.current,
          trail: trailRef.current,
          scale: route.bikeScale,
          anchor: [BIKE_SIZE.width / 2, BIKE_SIZE.groundY],
        })
      }
      const next = Math.round(p * 100)
      if (next !== lastPercent) {
        lastPercent = next
        setPercent(next)
      }
    }

    const tick = (now) => {
      const elapsed = now - started
      const waiting = easeInOutCubic(Math.min(1, elapsed / minMs)) * WAITING_CAP
      if (ready && elapsed >= minMs && finishFrom === null) {
        finishFrom = waiting
        finishStart = now
      }
      if (finishFrom !== null) {
        const t = Math.min(1, (now - finishStart) / FINISH_MS)
        draw(finishFrom + (1 - finishFrom) * easeInOutCubic(t))
        if (t >= 1) {
          setExiting(true)
          exitTimer = window.setTimeout(() => onCompleteRef.current?.(), EXIT_MS)
          return
        }
      } else {
        draw(waiting)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(exitTimer)
    }
  }, [route])

  const skip = () => {
    setExiting(true)
    window.setTimeout(() => onCompleteRef.current?.(), EXIT_MS)
  }

  return (
    <div
      className={`intro-screen fixed inset-0 z-[10000] flex flex-col overflow-hidden bg-ink text-vanilla ${
        exiting ? 'intro-screen--exit cyw-paused' : ''
      }`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Ładowanie Cycle Your Way"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="rgba(252,108,38,0.14)" strokeWidth="1">
          <path d="M-40 140 C 220 60 420 220 700 150 S 1180 40 1500 130" />
          <path d="M-40 180 C 230 100 430 260 700 190 S 1190 80 1500 170" />
          <path d="M-40 222 C 240 142 440 300 700 232 S 1200 122 1500 212" />
          <path d="M-40 690 C 260 610 520 780 820 700 S 1240 600 1500 680" />
          <path d="M-40 732 C 270 652 530 822 830 742 S 1250 642 1500 722" />
          <path d="M-40 776 C 280 696 540 866 840 786 S 1260 686 1500 766" />
        </g>
        <g fill="none" stroke="rgba(143,198,168,0.16)" strokeWidth="1">
          <ellipse cx="1180" cy="330" rx="150" ry="70" />
          <ellipse cx="1180" cy="330" rx="96" ry="42" />
          <ellipse cx="1180" cy="330" rx="44" ry="18" />
        </g>
      </svg>

      <header
        className="relative flex items-center justify-between px-6 pb-4 sm:px-16"
        style={{ paddingTop: 'max(2rem, calc(var(--safe-area-inset-top,env(safe-area-inset-top)) + 1rem))' }}
      >
        <div className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-white">
          <BrandMark color="#FC6C26" />
          <span className="hidden sm:inline">Cycle Your Way</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-vanilla/80">
          <span className="cyw-breathe h-2 w-2 rounded-full bg-sage-light" />
          Przygotowujemy mapę
        </div>
      </header>

      <main className="relative flex flex-1 flex-col justify-center gap-4 px-7 sm:items-center sm:text-center">
        <p className="cyw-rise text-xs font-semibold uppercase tracking-[0.32em] text-burnt-orange sm:text-sm">
          Witaj w drodze
        </p>
        <h1 className="cyw-rise cyw-rise--2 font-serif text-[clamp(4rem,10vw,8rem)] font-medium leading-[0.95] tracking-[-0.02em] text-white">
          Cycle <br className="sm:hidden" />
          Your <span className="italic text-burnt-orange">Way</span>
        </h1>
        <p className="cyw-rise cyw-rise--3 max-w-[32rem] text-[17px] leading-relaxed text-vanilla/80 sm:text-xl">
          Planer i nawigacja rowerowa — trasa skrojona pod Twoje tempo.
        </p>
      </main>

      <div className={`relative w-full ${narrow ? 'h-[200px]' : 'h-[clamp(180px,24vw,300px)]'}`}>
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox={route.viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d={route.d}
            fill="none"
            stroke="rgba(255,244,214,0.18)"
            strokeWidth="3"
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          <path
            ref={pathRef}
            d={route.d}
            fill="none"
            stroke="none"
          />
          <path
            ref={trailRef}
            d={route.d}
            pathLength="1000"
            fill="none"
            stroke="#FC6C26"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          />
          {route.waypoints.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="#FFFFFF" stroke="#FC6C26" strokeWidth="3" />
          ))}
          <g ref={riderRef}>
            <BikeShapes
              tire="#FFFFFF"
              spoke="rgba(255,244,214,0.55)"
              frame="#FC6C26"
              hub="#2A1A12"
              spinning
            />
          </g>
        </svg>
      </div>

      <footer
        className="relative flex items-end justify-between gap-4 px-7 sm:px-16"
        style={{ paddingBottom: 'max(2.25rem, calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom)) + 1.25rem))' }}
      >
        <button
          type="button"
          onClick={skip}
          className="min-h-11 rounded-full px-1 text-xs font-semibold uppercase tracking-[0.18em] text-vanilla/70 transition hover:text-white"
        >
          Pomiń
        </button>
        <div className="flex items-baseline gap-2.5">
          <span className="text-xs uppercase tracking-[0.18em] text-vanilla/80">Ładowanie</span>
          <span className="font-serif text-4xl font-semibold tabular-nums text-white sm:text-[44px]">
            {percent}%
          </span>
        </div>
      </footer>
    </div>
  )
}

export default LoadingScreen
