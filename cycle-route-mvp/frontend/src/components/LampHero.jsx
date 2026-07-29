import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { LampContainer } from './ui/lamp'

const HERO_POINTS = [
  { label: 'Zaplanuj', value: 'Trasę dopasowaną do Ciebie' },
  { label: 'Sprawdź', value: 'Nawierzchnię i przewyższenia' },
  { label: 'Jedź', value: 'Z nawigacją w telefonie' },
]

function LampHero({ onStartPlanning }) {
  const [lineReady, setLineReady] = useState(false)

  useEffect(() => {
    let frameId = 0
    const revealLine = () => {
      frameId = window.requestAnimationFrame(() => setLineReady(true))
    }

    if (!document.querySelector('.loading-screen')) {
      revealLine()
      return () => window.cancelAnimationFrame(frameId)
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector('.loading-screen')) return
      observer.disconnect()
      revealLine()
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <section className="relative w-full" aria-labelledby="landing-hero-title">
      <LampContainer className="min-h-[min(92vh,760px)]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.65 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-burnt-orange/25 bg-vanilla/65 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-burnt-orange shadow-sm backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-burnt-orange opacity-35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-burnt-orange" />
          </span>
          Twój kierunek. Twoje tempo.
        </motion.div>

        <h1
          id="landing-hero-title"
          className="relative font-serif text-[clamp(3.8rem,10vw,8.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]"
        >
          <span className="block pb-[0.22em]">
            <motion.span
              initial={{ y: 34, rotate: 2, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              className="block text-[#4a2b20]"
            >
              Cycle
            </motion.span>
          </span>
          <span className="-mt-[0.18em] block pb-[0.34em]">
            <motion.span
              initial={{ y: 38, rotate: -2, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.24, duration: 0.95, ease: [0.2, 0.8, 0.2, 1] }}
              className="block bg-gradient-to-r from-[#c94612] via-[#f06424] to-[#d84b13] bg-clip-text pb-[0.18em] leading-[1.08] text-transparent"
            >
              Your Way
            </motion.span>
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: lineReady ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="relative -mt-1 h-12 w-[min(78vw,34rem)]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 560 48" className="h-full w-full overflow-visible">
            <path
              d="M 8 31 C 88 31 96 10 162 18 C 234 28 275 42 345 25 C 418 7 452 16 552 8"
              fill="none"
              stroke="#e9c99e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 10"
            />
            <motion.path
              d="M 8 31 C 88 31 96 10 162 18 C 234 28 275 42 345 25 C 418 7 452 16 552 8"
              fill="none"
              stroke="#FC6C26"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: lineReady ? 1 : 0 }}
              transition={{ delay: 0.2, duration: 2, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.circle
              r="6"
              fill="#FC6C26"
              stroke="#FFF4D6"
              strokeWidth="3"
              initial={false}
              animate={{
                offsetDistance: lineReady ? '100%' : '0%',
                opacity: lineReady ? 1 : 0,
              }}
              transition={{ delay: 0.2, duration: 2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                offsetPath:
                  "path('M 8 31 C 88 31 96 10 162 18 C 234 28 275 42 345 25 C 418 7 452 16 552 8')",
              }}
            />
          </svg>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.65 }}
          className="mt-4 max-w-2xl text-lg font-medium leading-8 text-ink md:text-xl"
        >
          Nie wybieraj po prostu drogi. Wybierz przejazd, który pasuje do Ciebie.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-4 max-w-xl text-sm leading-7 text-ink-muted md:text-base"
        >
          Od spokojnej pętli po ambitny wyjazd — planowanie, analiza i nawigacja
          spotykają się w jednym eleganckim narzędziu.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.92, duration: 0.55 }}
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
            className="soft-button rounded-full border border-burnt-orange/40 bg-vanilla/45 px-8 py-3.5 text-sm font-semibold text-burnt-orange backdrop-blur transition hover:bg-burnt-orange/10"
          >
            Zobacz, jak to działa
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.65 }}
          className="mt-9 grid w-full max-w-4xl gap-2 pb-2 sm:grid-cols-3"
        >
          {HERO_POINTS.map((point, index) => (
            <motion.div
              key={point.label}
              animate={{ y: [0, index % 2 === 0 ? -3 : 3, 0] }}
              transition={{
                duration: 5 + index,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.4,
              }}
              className="rounded-2xl border border-burnt-orange/15 bg-vanilla/55 px-4 py-3 text-left shadow-[0_14px_40px_-26px_rgba(94,54,31,0.55)] backdrop-blur-md"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-burnt-orange">
                0{index + 1} · {point.label}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-muted md:text-sm">
                {point.value}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </LampContainer>
    </section>
  )
}

export default LampHero
