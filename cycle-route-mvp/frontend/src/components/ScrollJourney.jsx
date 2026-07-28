import { useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'

const ROUTE_D =
  'M 60 384 C 132 384 150 300 220 288 C 292 276 300 196 362 198 C 424 200 430 126 500 72'

const STEPS = [
  {
    n: '01',
    title: 'Wybierz tryb jazdy',
    text: 'Trasa A → B prosto do celu albo pętla treningowa o zadanym dystansie — wszystko z bocznego panelu.',
    at: 0,
    point: { x: 60, y: 384 },
  },
  {
    n: '02',
    title: 'Wyznacz trasę na mapie',
    text: 'Kliknij punkty albo wpisz adresy z podpowiedziami. Liczymy rowerowy routing i pokazujemy warianty.',
    at: 0.36,
    point: { x: 220, y: 288 },
  },
  {
    n: '03',
    title: 'Sprawdź szczegóły',
    text: 'Profil wysokości, dystans, szacowany czas i nawierzchnia — zanim wyjedziesz z domu.',
    at: 0.66,
    point: { x: 362, y: 198 },
  },
  {
    n: '04',
    title: 'Zabierz w teren',
    text: 'Zapisz trasę na koncie, pobierz GPX albo odpal nawigację głosową na telefonie.',
    at: 1,
    point: { x: 500, y: 72 },
  },
]

const STEP_BREAKPOINTS = [0, 0.22, 0.47, 0.72, 1]

function StepDot({ point, at, progress }) {
  const scale = useTransform(progress, [at - 0.16, at], [0.55, 1])
  const fill = useTransform(progress, [at - 0.06, at], ['#f5e6c0', '#FC6C26'])
  const pulse = useTransform(progress, [at - 0.14, at - 0.02, at + 0.22], [0, 0.55, 0])
  const labelOpacity = useTransform(
    progress,
    [at - 0.1, at, Math.min(1, at + 0.28), Math.min(1, at + 0.42)],
    [0, 1, 1, 0.35],
  )

  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <motion.circle r="22" fill="#FC6C26" style={{ opacity: pulse }} />
      <motion.circle
        r="10"
        stroke="#ffffff"
        strokeWidth="3"
        style={{ scale, fill }}
      />
      <motion.text
        x="0"
        y="-26"
        textAnchor="middle"
        className="fill-burnt-orange text-[15px] font-bold"
        style={{ opacity: labelOpacity }}
      >
        {STEPS.find((s) => s.point === point)?.n}
      </motion.text>
    </g>
  )
}

function MapStage({ progress, offsetDistance }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-burnt-orange/25 bg-gradient-to-br from-vanilla via-[#fff8e8] to-vanilla-deep p-4 shadow-[0_30px_70px_-30px_rgba(252,108,38,0.4)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.45] [background-image:linear-gradient(rgba(252,108,38,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(252,108,38,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />

      <svg
        viewBox="0 0 560 440"
        className="relative h-auto w-full"
        role="img"
        aria-label="Animowana mapa z trasą rowerową"
      >
        <path
          d="M 40 60 Q 110 30 180 70 Q 200 130 130 150 Q 60 140 40 90 Z"
          fill="#FC6C26"
          opacity="0.12"
        />
        <ellipse cx="450" cy="330" rx="95" ry="60" fill="#FC6C26" opacity="0.1" />
        <path
          d="M -10 250 C 120 230 160 320 300 300 C 420 284 470 360 580 330"
          fill="none"
          stroke="#e8c9a0"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.7"
        />

        <path
          d={ROUTE_D}
          fill="none"
          stroke="#f0d9b0"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 12"
        />
        <motion.path
          d={ROUTE_D}
          fill="none"
          stroke="#FC6C26"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />

        {STEPS.map((step) => (
          <StepDot key={step.n} point={step.point} at={step.at} progress={progress} />
        ))}

        <g transform="translate(500 72)">
          <circle r="13" fill="#ffffff" stroke="#FC6C26" strokeWidth="3" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="14">
            🏁
          </text>
        </g>

        <motion.g
          style={{
            offsetPath: `path('${ROUTE_D}')`,
            offsetDistance,
            offsetRotate: '0deg',
          }}
        >
          <circle r="20" fill="#FC6C26" opacity="0.18" />
          <circle r="15" fill="#FC6C26" stroke="#ffffff" strokeWidth="3" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="16">
            🚴
          </text>
        </motion.g>
      </svg>

      <div className="pointer-events-none absolute bottom-5 left-5 rounded-full bg-vanilla/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-burnt-orange shadow-sm backdrop-blur">
        Cycle Your Way · podgląd trasy
      </div>
    </div>
  )
}

function ScrollJourney({ onStartPlanning }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  })
  const offsetDistance = useTransform(progress, [0, 1], ['0%', '100%'])
  const mapScale = useTransform(progress, [0, 0.5, 1], [0.97, 1, 0.98])
  const mapY = useTransform(progress, [0, 0.5, 1], [10, 0, -8])

  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)
  useMotionValueEvent(progress, 'change', (value) => {
    const index = STEP_BREAKPOINTS.findIndex((point, idx) => {
      const next = STEP_BREAKPOINTS[idx + 1]
      if (next == null) return false
      return value >= point && value < next
    })

    const normalized = index === -1 ? STEPS.length - 1 : index
    setActive((current) => {
      if (current === normalized) return current
      setDirection(normalized > current ? 1 : -1)
      return normalized
    })
  })

  const step = STEPS[active]
  const isLast = active === STEPS.length - 1

  return (
    <section
      ref={ref}
      className="relative h-[240vh] bg-[linear-gradient(180deg,rgba(255,244,214,0.72)_0%,rgba(255,244,214,0.56)_18%,rgba(255,244,214,0.56)_82%,rgba(255,244,214,0.72)_100%)] md:h-[250vh]"
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(255,244,214,0.18)_100%)]" />
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1">
              <motion.div
                style={{ scale: mapScale, y: mapY }}
                className="mx-auto w-full max-w-[22rem] sm:max-w-md lg:max-w-xl"
              >
                <MapStage progress={progress} offsetDistance={offsetDistance} />
              </motion.div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-burnt-orange">
                Od pomysłu do trasy
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-4xl">
                Jak to działa.
              </h2>

              <div className="relative mt-6 min-h-[220px] md:min-h-[240px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: direction > 0 ? 30 : -30, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: direction > 0 ? -22 : 22, scale: 0.99 }}
                    transition={{ duration: 0.36, ease: 'easeOut' }}
                    className="rounded-3xl border border-burnt-orange/25 bg-vanilla/95 p-7 shadow-[0_24px_60px_-32px_rgba(252,108,38,0.45)] backdrop-blur md:p-9"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-burnt-orange text-lg font-bold text-vanilla">
                        {step.n}
                      </span>
                      <h3 className="text-xl font-semibold text-ink md:text-2xl">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-base leading-8 text-ink-muted">{step.text}</p>

                    {isLast && (
                      <button
                        type="button"
                        onClick={onStartPlanning}
                        className="soft-button mt-6 rounded-full bg-burnt-orange px-7 py-3 text-sm font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
                      >
                        Rozpocznij planowanie
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-7 flex items-center gap-2">
                {STEPS.map((s, index) => (
                  <button
                    key={s.n}
                    type="button"
                    aria-label={`Krok ${s.n}`}
                    className="group flex-1"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-500 ${
                        index <= active ? 'bg-burnt-orange' : 'bg-burnt-orange/20'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-muted/70">
                Przewiń, aby przejść dalej · {step.n} / 04
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrollJourney
