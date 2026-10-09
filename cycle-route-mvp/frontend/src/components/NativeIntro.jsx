import { useCallback, useEffect, useRef, useState } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'
import { BikeShapes } from './brand/BikeGlyph'
import { prefersReducedMotion } from '../lib/intro'

// Android app launch animation: the bike rides in from the left, pauses in the
// middle, rides off to the right leaving an orange trail that turns into the
// brand mark and the wordmark. Plays on every cold start; a tap skips it.
// The system splash (app icon on ink) fades out first, then the ride starts.
const SPLASH_FADE_MS = 250
const TOTAL_MS = 2900 + SPLASH_FADE_MS
const REDUCED_MS = 700
const EXIT_MS = 380

function NativeIntro({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const [reduced] = useState(prefersReducedMotion)
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    setExiting(true)
    window.setTimeout(() => onCompleteRef.current?.(), EXIT_MS)
  }, [])

  useEffect(() => {
    SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_MS }).catch(() => undefined)
    const timer = window.setTimeout(finish, reduced ? REDUCED_MS : TOTAL_MS)
    return () => window.clearTimeout(timer)
  }, [finish, reduced])

  return (
    <div
      role="status"
      aria-label="Ładowanie Cycle Your Way"
      onClick={finish}
      className={`native-intro fixed inset-0 z-[3000] overflow-hidden bg-ink text-white ${exiting ? 'native-intro--exit' : ''} ${
        reduced ? 'native-intro--static' : ''
      }`}
    >
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="rgba(252,108,38,0.12)" strokeWidth="1">
          <path d="M-20 160 C 90 110 200 220 410 150" />
          <path d="M-20 196 C 90 146 200 256 410 186" />
          <path d="M-20 700 C 120 640 250 760 410 690" />
        </g>
      </svg>
      <div className="absolute left-1/2 top-1/2 h-[200px] w-[390px] -translate-x-1/2 -translate-y-1/2">
        <svg aria-hidden="true" className="absolute inset-0" width="390" height="200" viewBox="0 0 390 200">
          <line className="ni-road" x1="-10" y1="142" x2="400" y2="142" stroke="rgba(255,244,214,0.18)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
          <path className="ni-trail" pathLength="1000" d="M 195 140 L 420 140" fill="none" stroke="#FC6C26" strokeWidth="5" strokeLinecap="round" />
          <circle className="ni-ring" pathLength="1000" cx="195" cy="62" r="50" fill="none" stroke="#FC6C26" strokeWidth="8" transform="rotate(90 195 62)" />
          <path className="ni-squiggle" pathLength="1000" d="M 168 76 C 182 48 206 90 222 52" fill="none" stroke="#FFF4D6" strokeWidth="8" strokeLinecap="round" />
        </svg>
        <div className="ni-bike absolute left-[135px] top-[74px] h-[76px] w-[120px]">
          <svg className="ni-squat" width="120" height="76" viewBox="0 0 120 76" aria-hidden="true">
            <BikeShapes tire="#FFFFFF" spoke="rgba(255,244,214,0.55)" hub="#2A1A12" spinning />
          </svg>
        </div>
        <p className="ni-word absolute inset-x-0 top-[132px] m-0 text-center font-serif text-[34px] font-medium">
          Cycle Your <span className="italic text-burnt-orange">Way</span>
        </p>
      </div>
    </div>
  )
}

export default NativeIntro
