import { useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'

// Trasa w układzie viewBox 0 0 560 440 (od dołu-lewej do góry-prawej).
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
  const fill = useTransform(progress, [at - 0.06, at], ['#cdddd0', '#2e5f43'])
  const pulse = useTransform(progress, [at - 0.14, at - 0.02, at + 0.22], [0, 0.55, 0])
  const labelOpacity = useTransform(
    progress,
    [at - 0.1, at, Math.min(1, at + 0.28), Math.min(1, at + 0.42)],
    [0, 1, 1, 0.35],
  )

  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <motion.circle r="22" fill="#2e5f43" style={{ opacity: pulse }} />
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
        className="fill-[#2e5f43] text-[15px] font-bold"
        style={{ opacity: labelOpacity }}
      >
        {STEPS.find((s) => s.point === point)?.n}
      </motion.text>
    </g>
  )
}

function MapStage({ progress, offsetDistance }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-[#e2dac9] bg-gradient-to-br from-[#f3f7f1] via-[#eef4ec] to-[#f6f0e6] p-4 shadow-[0_30px_70px_-30px_rgba(46,95,67,0.45)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(#dfe7da_1px,transparent_1px),linear-gradient(90deg,#dfe7da_1px,transparent_1px)] [background-size:34px_34px]" />

      <svg
        viewBox="0 0 560 440"
        className="relative h-auto w-full"
        role="img"
        aria-label="Animowana mapa z trasą rowerową"
      >
        {/* dekoracje: tereny zielone i woda */}
        <path
          d="M 40 60 Q 110 30 180 70 Q 200 130 130 150 Q 60 140 40 90 Z"
          fill="#dcebd9"
          opacity="0.45"
        />
        <ellipse cx="450" cy="330" rx="95" ry="60" fill="#cfe3d4" opacity="0.55" />
        <path
          d="M -10 250 C 120 230 160 320 300 300 C 420 284 470 360 580 330"
          fill="none"
          stroke="#bcd6e8"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* trasa: ślad bazowy + rysowana linia */}
        <path
          d={ROUTE_D}
          fill="none"
          stroke="#cdd9ce"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 12"
        />
        <motion.path
          d={ROUTE_D}
          fill="none"
          stroke="#2e5f43"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />

        {/* znaczniki kroków */}
        {STEPS.map((step) => (
          <StepDot key={step.n} point={step.point} at={step.at} progress={progress} />
        ))}

        {/* meta (flaga) */}
        <g transform="translate(500 72)">
          <circle r="13" fill="#ffffff" stroke="#7a6248" strokeWidth="3" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="14">
            🏁
          </text>
        </g>

        {/* rowerzysta jadący po trasie */}
        <motion.g
          style={{
            offsetPath: `path('${ROUTE_D}')`,
            offsetDistance,
            offsetRotate: '0deg',
          }}
        >
          <circle r="20" fill="#2e5f43" opacity="0.18" />
          <circle r="15" fill="#2e5f43" stroke="#ffffff" strokeWidth="3" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="16">
            🚴
          </text>
        </motion.g>
      </svg>

      <div className="pointer-events-none absolute bottom-5 left-5 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#2e5f43] shadow-sm backdrop-blur">
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
    // wysokość sekcji = długość scrolla; wnętrze jest przypięte (pinned).
    <section ref={ref} className="relative h-[240vh] md:h-[250vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* scena z mapą */}
            <div className="order-2 lg:order-1">
              <motion.div
                style={{ scale: mapScale, y: mapY }}
                className="mx-auto w-full max-w-[22rem] sm:max-w-md lg:max-w-xl"
              >
                <MapStage progress={progress} offsetDistance={offsetDistance} />
              </motion.div>
            </div>

            {/* panel kroków — jedna karta zmieniająca treść */}
            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a6248]">
                Od pomysłu do trasy
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#2e5f43] md:text-4xl">
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
                    className="rounded-3xl border border-[#bcd6c3] bg-white/90 p-7 shadow-[0_24px_60px_-32px_rgba(46,95,67,0.5)] backdrop-blur md:p-9"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2e5f43] text-lg font-bold text-white">
                        {step.n}
                      </span>
                      <h3 className="text-xl font-semibold text-[#2e5f43] md:text-2xl">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-base leading-8 text-stone-700">{step.text}</p>

                    {isLast && (
                      <button
                        type="button"
                        onClick={onStartPlanning}
                        className="soft-button mt-6 rounded-full bg-[#2e5f43] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#356b4b]"
                      >
                        Rozpocznij planowanie
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* pasek postępu kroków */}
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
                        index <= active ? 'bg-[#2e5f43]' : 'bg-[#d7e2d8]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-stone-400">
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
