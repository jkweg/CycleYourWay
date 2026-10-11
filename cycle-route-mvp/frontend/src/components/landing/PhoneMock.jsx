import { useEffect, useRef, useState } from 'react'
import { IconPlayerPlayFilled } from '@tabler/icons-react'
import { BikeShapes } from '../brand/BikeGlyph'
import { onIntroDone, prefersReducedMotion } from '../../lib/intro'
import { animateProgress, placeOnPath } from '../../lib/routeMotion'

const ROUTE = 'M 58 352 C 92 300 34 236 104 204 S 226 232 236 152 S 196 76 248 46'

/** The app's map screen in miniature: the loop draws itself and the bike rides it once. */
function PhoneMap({ start }) {
  const pathRef = useRef(null)
  const trailRef = useRef(null)
  const riderRef = useRef(null)
  const [riding, setRiding] = useState(false)
  const [arrived, setArrived] = useState(false)

  useEffect(() => {
    const place = (p) =>
      placeOnPath(pathRef.current, p, { rider: riderRef.current, trail: trailRef.current, rotate: false })
    place(0)
    if (!start) return undefined
    if (prefersReducedMotion()) {
      place(1)
      return undefined
    }
    let cancel = () => undefined
    const delay = window.setTimeout(() => {
      setRiding(true)
      cancel = animateProgress({
        duration: 3400,
        onFrame: place,
        onDone: () => {
          setRiding(false)
          setArrived(true)
        },
      })
    }, 1300)
    return () => {
      window.clearTimeout(delay)
      cancel()
    }
  }, [start])

  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="400" fill="#2A1A12" />
      <path d="M 170 250 C 210 236 280 248 300 290 L 300 400 L 190 400 C 160 360 150 300 170 250 Z" fill="#2F6F57" opacity="0.5" />
      <path d="M -10 300 C 60 286 110 320 170 304 S 260 270 310 290" fill="none" stroke="#7FB3C8" strokeOpacity="0.4" strokeWidth="9" strokeLinecap="round" />
      <g fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" strokeLinecap="round">
        <path d="M -10 140 C 80 130 150 180 310 120" />
        <path d="M 150 -10 C 140 120 170 260 150 410" />
      </g>
      <g fill="none" stroke="rgba(252,108,38,0.12)" strokeWidth="1">
        <ellipse cx="220" cy="300" rx="60" ry="34" />
        <ellipse cx="220" cy="300" rx="34" ry="18" />
      </g>
      <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
      <path ref={pathRef} d={ROUTE} fill="none" stroke="none" />
      <path ref={trailRef} d={ROUTE} pathLength="1000" fill="none" stroke="#FC6C26" strokeWidth="5" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000" />
      <circle cx="58" cy="352" r="7" fill="#FFFFFF" stroke="#FC6C26" strokeWidth="3" />
      {arrived && <circle className="cyw-ping" cx="248" cy="46" r="15" fill="none" stroke="#FC6C26" strokeWidth="2.5" />}
      <path d="M248 28 C 239 28 233 35 233 43 C 233 53 248 65 248 65 C 248 65 263 53 263 43 C 263 35 257 28 248 28 Z" fill="#FC6C26" />
      <circle cx="248" cy="43" r="5" fill="#FFFFFF" />
      <g ref={riderRef} className={riding ? undefined : 'cyw-paused'}>
        <circle r="24" fill="rgba(252,108,38,0.25)" />
        <circle r="18" fill="#FFFFFF" />
        <g transform="translate(-15 -11) scale(0.25)">
          <BikeShapes tire="#2A1A12" spoke="#8C6B52" frame="#FC6C26" hub="#FFFFFF" weight={1.2} spinning />
        </g>
      </g>
    </svg>
  )
}

/** A phone showing the planner: map up top, the route card below. */
function PhoneMock({ className = '' }) {
  const [start, setStart] = useState(false)
  useEffect(() => onIntroDone(() => setStart(true)), [])

  return (
    <div
      className={`relative aspect-[300/610] rounded-[46px] bg-ink p-[9px] shadow-[0_50px_90px_-20px_rgba(42,26,18,0.55),0_0_0_1px_rgba(42,26,18,0.08)] ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-[#EFE3C4]">
        <div className="absolute inset-x-0 top-0 h-[66%]">
          <PhoneMap start={start} />
          <span className="absolute left-1/2 top-2.5 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <span className="absolute left-3.5 top-12 rounded-full bg-burnt-orange px-2.5 py-1 text-[11px] font-bold text-ink">Pętla · Gravel</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-[37%] flex-col gap-2.5 rounded-t-[22px] bg-vanilla px-4 pt-2 shadow-[0_-10px_24px_rgba(42,26,18,0.18)]">
          <span className="mx-auto h-1 w-8 rounded-full bg-sand" />
          <div className="flex items-end justify-between">
            <p className="font-serif text-[30px] font-semibold leading-none text-ink">
              42,3<span className="text-[13px] font-medium"> km</span>
            </p>
            <p className="text-right text-[11px] leading-tight text-[#6B4E3D]">
              <strong className="block text-[13px] text-ink">2 h 05</strong>czas
            </p>
            <p className="text-right text-[11px] leading-tight text-[#6B4E3D]">
              <strong className="block text-[13px] text-ink">↗ 380 m</strong>podjazdy
            </p>
          </div>
          <svg aria-hidden="true" className="h-8 w-full" viewBox="0 0 256 32" preserveAspectRatio="none">
            <path d="M0 28 C 20 26 30 16 52 18 S 88 6 110 9 S 150 24 176 17 S 220 3 256 6 L 256 32 L 0 32 Z" fill="rgba(252,108,38,0.18)" />
            <path d="M0 28 C 20 26 30 16 52 18 S 88 6 110 9 S 150 24 176 17 S 220 3 256 6" fill="none" stroke="#E05518" strokeWidth="2" />
          </svg>
          <span className="mt-auto mb-4 flex h-10 items-center justify-center gap-1.5 rounded-full bg-burnt-orange text-[14px] font-bold text-ink">
            <IconPlayerPlayFilled size={13} aria-hidden="true" /> Jedź
          </span>
        </div>
      </div>
    </div>
  )
}

export default PhoneMock
