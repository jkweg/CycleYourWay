import { useEffect, useRef, useState } from 'react'
import { IconArrowRight, IconArrowBearRight, IconRepeat, IconRoute, IconVolume } from '@tabler/icons-react'
import { BikeShapes } from '../brand/BikeGlyph'
import { onIntroDone, prefersReducedMotion } from '../../lib/intro'
import { animateProgress, placeOnPath } from '../../lib/routeMotion'

const ROUTE = 'M 70 380 C 120 300 90 220 170 190 S 320 230 360 150 S 420 60 500 90'

/** Illustrative map: a loop draws itself and the bike rides it once, after the intro. */
function HeroMap() {
  const pathRef = useRef(null)
  const trailRef = useRef(null)
  const riderRef = useRef(null)
  const [arrived, setArrived] = useState(false)
  const [riding, setRiding] = useState(false)

  useEffect(() => {
    const place = (p) =>
      placeOnPath(pathRef.current, p, { rider: riderRef.current, trail: trailRef.current, rotate: false })
    place(0)
    let cancel = () => undefined
    let observer = null
    // Ride once the intro is gone AND the map is on screen (below the fold on phones).
    const whenVisible = (callback) => {
      if (!('IntersectionObserver' in window)) return callback()
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect()
            callback()
          }
        },
        { threshold: 0.45 },
      )
      observer.observe(pathRef.current.ownerSVGElement)
    }
    const stopWaiting = onIntroDone(() => whenVisible(() => {
      if (prefersReducedMotion()) {
        place(1)
        setArrived(true)
        return
      }
      const delay = window.setTimeout(() => {
        setRiding(true)
        cancel = animateProgress({
          duration: 3000,
          onFrame: place,
          onDone: () => {
            setRiding(false)
            setArrived(true)
          },
        })
      }, 350)
      cancel = () => window.clearTimeout(delay)
    }))
    return () => {
      stopWaiting()
      observer?.disconnect()
      cancel()
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-ink shadow-[0_40px_80px_rgba(42,26,18,0.28)]">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 560 560" preserveAspectRatio="xMidYMid slice">
        <path d="M 300 330 C 360 300 470 320 520 380 C 560 440 500 520 420 520 C 340 520 280 460 280 400 Z" fill="#2F6F57" opacity="0.45" />
        <path d="M -10 470 C 90 450 160 500 250 480 S 420 430 580 470" fill="none" stroke="#7FB3C8" strokeOpacity="0.35" strokeWidth="12" strokeLinecap="round" />
        <g fill="none" stroke="rgba(252,108,38,0.13)" strokeWidth="1.2">
          <path d="M-20 90 C 120 30 260 150 580 60" />
          <path d="M-20 130 C 120 70 260 190 580 100" />
          <path d="M-20 170 C 120 110 260 230 580 140" />
          <ellipse cx="420" cy="260" rx="90" ry="54" />
          <ellipse cx="420" cy="260" rx="56" ry="32" />
          <ellipse cx="420" cy="260" rx="24" ry="13" />
        </g>
        <g fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="9" strokeLinecap="round">
          <path d="M-10 260 C 120 240 220 320 330 280 S 480 200 580 230" />
          <path d="M240 -10 C 230 140 280 320 250 580" />
        </g>
        <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" />
        <path ref={pathRef} d={ROUTE} fill="none" stroke="none" />
        <path
          ref={trailRef}
          d={ROUTE}
          pathLength="1000"
          fill="none"
          stroke="#FC6C26"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset="1000"
        />
        <circle cx="70" cy="380" r="10" fill="#FFFFFF" stroke="#FC6C26" strokeWidth="4" />
        {arrived && <circle className="cyw-ping" cx="500" cy="90" r="22" fill="none" stroke="#FC6C26" strokeWidth="3" />}
        <path d="M500 64 C 487 64 478 74 478 86 C 478 101 500 118 500 118 C 500 118 522 101 522 86 C 522 74 513 64 500 64 Z" fill="#FC6C26" />
        <circle cx="500" cy="86" r="7" fill="#FFFFFF" />
        <g ref={riderRef} className={riding ? undefined : 'cyw-paused'}>
          <circle r="40" fill="rgba(252,108,38,0.22)" />
          <circle r="31" fill="#FFFFFF" />
          <g transform="translate(-26 -19) scale(0.44)">
            <BikeShapes tire="#2A1A12" spoke="#8C6B52" frame="#FC6C26" hub="#FFFFFF" weight={1.15} spinning />
          </g>
        </g>
      </svg>
      <div className="absolute left-5 top-5 flex gap-2 sm:left-6 sm:top-6">
        <span className="rounded-full bg-white/15 px-3 py-2 text-[13px] font-semibold text-white">Gravel</span>
        <span className="rounded-full bg-burnt-orange px-3 py-2 text-[13px] font-bold text-ink">Pętla</span>
      </div>
    </div>
  )
}

function HeroAtlas({ onStartPlanning }) {
  const scrollToJourney = () =>
    document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section
      id="top"
      className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-28 md:px-10 md:pt-36 lg:grid-cols-[1fr_1.05fr] lg:pb-20"
    >
      <div className="flex min-w-0 flex-col gap-6 md:gap-7">
        <span className="cyw-rise inline-flex items-center gap-2 self-start rounded-full border border-[#EADBB5] bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6B3A1E] md:text-[13px]">
          <span className="h-2 w-2 rounded-full bg-sage" />
          Twój rower, twoje tempo
        </span>
        <h1 className="cyw-rise cyw-rise--2 font-serif text-[clamp(3rem,5vw,4.6rem)] font-medium leading-[1] tracking-[-0.025em] text-ink">
          Nie wybieraj drogi.
          <br />
          Wybierz{' '}
          <span className="relative inline-block italic text-rust">
            przejazd.
            <svg
              aria-hidden="true"
              className="absolute -bottom-2 left-0 h-[18px] w-full"
              viewBox="0 0 300 18"
              preserveAspectRatio="none"
            >
              <path d="M2 12 C 60 2 110 18 170 8 S 260 4 298 10" fill="none" stroke="#FC6C26" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="cyw-rise cyw-rise--3 max-w-xl text-lg leading-relaxed text-ink-muted md:text-[21px]">
          Od spokojnej pętli po ambitny wyjazd — wyznacz trasę pod swój rower i formę, a potem jedź z
          nawigacją głosową, która prowadzi zakręt po zakręcie.
        </p>
        <div className="cyw-rise cyw-rise--3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStartPlanning}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-[17px] font-bold text-white shadow-[0_12px_28px_rgba(42,26,18,0.22)] transition hover:-translate-y-px hover:bg-ink-muted sm:w-auto"
          >
            Zaplanuj trasę
            <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={scrollToJourney}
            className="min-h-14 rounded-full px-6 text-[17px] font-semibold text-ink transition hover:bg-white"
          >
            Zobacz, jak to działa
          </button>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-[15px] text-ink-muted">
          <li className="flex items-center gap-2">
            <IconRepeat size={18} className="text-burnt-orange-dark" aria-hidden="true" />
            Pętle 5–200 km
          </li>
          <li className="flex items-center gap-2">
            <IconRoute size={18} className="text-sage" aria-hidden="true" />
            Trasy z punktu A do B
          </li>
          <li className="flex items-center gap-2">
            <IconVolume size={18} className="text-burnt-orange-dark" aria-hidden="true" />
            Nawigacja głosowa
          </li>
        </ul>
      </div>

      <div className="relative h-[440px] min-w-0 sm:h-[540px] lg:h-[600px]">
        <div className="absolute inset-0 bottom-10 sm:left-10">
          <HeroMap />
        </div>

        <div className="cyw-float absolute bottom-0 left-3 right-3 flex flex-col gap-3 rounded-[1.4rem] bg-white p-5 shadow-[0_24px_60px_rgba(42,26,18,0.2)] sm:left-0 sm:right-auto sm:w-[310px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B4E3D]">Przykładowa trasa</span>
            <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-bold text-[#1F5A43]">Spokojne drogi</span>
          </div>
          <div className="flex items-baseline gap-5">
            <span className="font-serif text-[40px] font-semibold leading-none text-ink">
              42,3<span className="text-lg font-medium"> km</span>
            </span>
            <span className="text-[15px] leading-snug text-ink-muted">
              ↗ 380 m
              <br />2 h 05 min
            </span>
          </div>
          <svg role="img" aria-label="Profil wysokości przykładowej trasy" className="hidden h-14 w-full sm:block" viewBox="0 0 256 56" preserveAspectRatio="none">
            <path d="M0 48 C 20 44 30 30 52 32 S 88 14 110 18 S 150 40 176 30 S 220 6 256 12 L 256 56 L 0 56 Z" fill="rgba(252,108,38,0.16)" />
            <path d="M0 48 C 20 44 30 30 52 32 S 88 14 110 18 S 150 40 176 30 S 220 6 256 12" fill="none" stroke="#E05518" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="cyw-float cyw-float--late absolute -right-2 bottom-24 hidden items-center gap-3 rounded-[1.1rem] bg-white px-4 py-3.5 shadow-[0_18px_40px_rgba(42,26,18,0.18)] sm:flex">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink">
            <IconArrowBearRight size={22} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <strong className="text-[15px] text-ink">Za 250 m w prawo</strong>
            <span className="text-[13px] text-[#6B4E3D]">ul. Leśna · szuter</span>
          </span>
        </div>
      </div>
    </section>
  )
}

export default HeroAtlas
