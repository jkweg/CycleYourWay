import { useEffect, useRef, useState } from 'react'
import LoadingCyclist from './LoadingCyclist'

const MIN_MS = 3000
const FADE_MS = 700

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const start = performance.now()
    let pageReady = document.readyState === 'complete'
    let readyElapsed = pageReady ? 0 : null
    let rafId = 0
    let fadeTimer = 0

    const markReady = () => {
      if (readyElapsed === null) {
        readyElapsed = performance.now() - start
        pageReady = true
      }
    }

    window.addEventListener('load', markReady)
    if (pageReady) markReady()

    const finish = () => {
      if (completedRef.current) return
      completedRef.current = true
      setProgress(100)
      setIsExiting(true)
      fadeTimer = window.setTimeout(() => {
        onCompleteRef.current?.()
      }, FADE_MS)
    }

    const frame = (now) => {
      const elapsed = now - start

      if (pageReady && readyElapsed === null) {
        readyElapsed = elapsed
      }

      const duration =
        readyElapsed === null
          ? Math.max(MIN_MS, elapsed / 0.9)
          : Math.max(MIN_MS, readyElapsed)

      const next = Math.min(100, (elapsed / duration) * 100)
      setProgress(next)

      if (readyElapsed !== null && elapsed >= duration) {
        finish()
        return
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('load', markReady)
      cancelAnimationFrame(rafId)
      window.clearTimeout(fadeTimer)
    }
  }, [])

  const percent = Math.round(progress)
  const progressRatio = progress / 100

  return (
    <div
      className={`loading-screen fixed inset-0 z-[5000] flex flex-col overflow-hidden ${
        isExiting ? 'loading-screen--exit' : ''
      }`}
      style={{
        backgroundColor: 'var(--color-vanilla)',
        color: 'var(--color-burnt-orange)',
        '--loading-progress': String(progressRatio),
      }}
      role="status"
      aria-live="polite"
      aria-busy={!isExiting}
      aria-label={`Ładowanie Cycle Your Way, ${percent}%`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -left-1/4 top-[-20%] h-[55%] w-[70%] rounded-full blur-3xl"
          style={{ background: 'rgba(252, 108, 38, 0.12)' }}
        />
        <div
          className="absolute -right-1/4 bottom-[-10%] h-[50%] w-[60%] rounded-full blur-3xl"
          style={{ background: 'rgba(252, 108, 38, 0.1)' }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-burnt-orange)]/70">
          Witaj
        </p>
        <h1 className="mt-3 text-center font-serif text-5xl font-semibold tracking-tight text-[color:var(--color-burnt-orange)] md:text-7xl">
          Cycle Your Way
        </h1>
        <p className="mt-4 max-w-sm text-center text-base leading-6 text-[color:var(--color-burnt-orange)]/75 md:text-lg">
          Planer i nawigacja rowerowa
        </p>

        <div className="loading-screen__track relative mt-14 h-24 w-full max-w-xl md:mt-16 md:h-28">
          <div
            className="absolute bottom-2 left-0 right-0 h-px"
            style={{ background: 'rgba(252, 108, 38, 0.25)' }}
          />
          <div className="loading-screen__cyclist-rail">
            <div className="loading-screen__cyclist">
              <LoadingCyclist
                progress={progress}
                className="h-24 w-auto text-[color:var(--color-burnt-orange)] md:h-28"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full px-6 pb-10 md:px-10 md:pb-12">
        <div className="mx-auto flex w-full max-w-xl items-end justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-burnt-orange)]/70">
            Ładowanie
          </span>
          <span className="font-serif text-2xl font-semibold tabular-nums text-[color:var(--color-burnt-orange)]">
            {percent}%
          </span>
        </div>
        <div
          className="mx-auto mt-3 h-2 w-full max-w-xl overflow-hidden rounded-full"
          style={{ background: 'rgba(252, 108, 38, 0.18)' }}
        >
          <div
            className="loading-screen__bar h-full origin-right rounded-full will-change-transform"
            style={{ backgroundColor: 'var(--color-burnt-orange)' }}
          />
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
