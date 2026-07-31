import { useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react'
import PhoneShowcase from './PhoneShowcase'

const RAIL_PATH =
  'M 50 0 C 12 70 88 125 48 195 C 12 260 90 320 52 390 C 18 452 84 510 48 575 C 22 622 66 662 50 700'

const STEPS = [
  {
    n: '01',
    eyebrow: 'Zacznij od pomysłu',
    title: 'Wybierz, dokąd jedziesz.',
    text: 'Trasa A → B albo pętla o konkretnym dystansie. Wpisz adresy, kliknij mapę i dopasuj styl jazdy.',
    detail: 'Planer prowadzi od wyboru trybu do gotowego zapytania bez zbędnych ekranów.',
  },
  {
    n: '02',
    eyebrow: 'Zobacz możliwości',
    title: 'Porównaj realne warianty.',
    text: 'Rowerowy routing wyznacza trasę, a Ty od razu widzisz dystans, czas i przebieg na mapie.',
    detail: 'Punkty pośrednie i preferencje pozwalają dopracować przejazd przed wyjazdem.',
  },
  {
    n: '03',
    eyebrow: 'Poznaj trasę',
    title: 'Sprawdź, co czeka po drodze.',
    text: 'Profil wysokości, przewyższenia, stromizny i nawierzchnia pokazują charakter przejazdu.',
    detail: 'Podejmujesz świadomą decyzję, zanim pierwszy raz zakręcisz korbą.',
  },
  {
    n: '04',
    eyebrow: 'Jedź po swojemu',
    title: 'Zabierz trasę w teren.',
    text: 'Uruchom nawigację na telefonie, słuchaj wskazówek i wróć na trasę po przypadkowym zjechaniu.',
    detail: 'Po jeździe trasa i historia przejazdu zostają zapisane na Twoim koncie.',
  },
]

const BREAKPOINTS = [0, 0.25, 0.5, 0.75]

function StepCard({ step, active, onStartPlanning, compact = false }) {
  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={active}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.34, ease: 'easeOut' }}
        className="max-w-xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4a3226] text-sm font-bold text-vanilla">
            {step.n}
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-burnt-orange">
            {step.eyebrow}
          </p>
        </div>
        <h3
          className={`font-serif font-semibold leading-[1.05] tracking-tight text-[#4a3226] ${
            compact ? 'mt-3 text-2xl' : 'mt-6 text-4xl md:text-6xl'
          }`}
        >
          {step.title}
        </h3>
        <p
          className={`text-[#4a3226]/85 ${
            compact ? 'mt-3 text-xs leading-5' : 'mt-6 text-base leading-8 md:text-lg'
          }`}
        >
          {step.text}
        </p>
        {!compact && (
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-ink-muted">
            {step.detail}
          </p>
        )}
        {active === STEPS.length - 1 && (
          <button
            type="button"
            onClick={onStartPlanning}
            className={`soft-button rounded-full bg-burnt-orange font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark ${
              compact ? 'mt-3 px-4 py-2 text-[10px]' : 'mt-7 px-7 py-3 text-sm'
            }`}
          >
            Rozpocznij planowanie
          </button>
        )}
      </motion.article>
    </AnimatePresence>
  )
}

function ProgressRail({ progress, active, compact = false }) {
  return (
    <div
      className={
        compact
          ? 'relative h-[70vh] w-10 shrink-0'
          : 'relative mx-auto h-[78vh] w-24'
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 700" className="h-full w-full overflow-visible">
        <path
          d={RAIL_PATH}
          fill="none"
          stroke="#4a3226"
          strokeWidth="3"
          strokeDasharray="4 11"
          opacity="0.18"
          strokeLinecap="round"
        />
        <motion.path
          d={RAIL_PATH}
          fill="none"
          stroke="#FC6C26"
          strokeWidth="5"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />
        {BREAKPOINTS.map((point, index) => (
          <motion.circle
            key={point}
            initial={false}
            animate={{
              r: index === active ? 11 : 7,
              fill: index <= active ? '#FC6C26' : '#fff4d6',
            }}
            stroke="#4a3226"
            strokeWidth={index === active ? 4 : 3}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              offsetPath: `path('${RAIL_PATH}')`,
              offsetDistance: `${point * 100}%`,
              offsetRotate: '0deg',
            }}
          />
        ))}
      </svg>
      <motion.p
        style={{ opacity: useTransform(progress, [0, 0.12, 0.86, 1], [1, 0.45, 0.45, 0]) }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 rotate-90 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.24em] text-[#4a3226]/45"
      >
        Scroll down
      </motion.p>
    </div>
  )
}

function ScrollJourney({ onStartPlanning }) {
  const sectionRef = useRef(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.min(STEPS.length - 1, Math.floor(value * STEPS.length))
    setActive((current) => (current === next ? current : next))
  })

  const step = STEPS[active]
  const copyOnLeft = active % 2 === 0

  return (
    <section
      id="journey"
      ref={sectionRef}
      className="relative h-[500vh] scroll-mt-20 bg-vanilla"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden border-y border-[#4a3226]/18">
        <div className="mx-auto w-full max-w-7xl px-5 md:px-10">
          <div className="mb-5 text-center lg:mb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-burnt-orange">
              Od pomysłu do przejazdu
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#4a3226] md:text-4xl">
              Jak to działa
            </h2>
          </div>

          <div className="hidden min-h-[78vh] grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center gap-5 lg:grid">
            <motion.div
              layout
              style={{ gridColumn: copyOnLeft ? '1' : '3', gridRow: '1' }}
              transition={{ layout: { type: 'spring', stiffness: 115, damping: 24, mass: 0.9 } }}
              className={copyOnLeft ? 'flex justify-end' : 'flex justify-start'}
            >
              <StepCard step={step} active={active} onStartPlanning={onStartPlanning} />
            </motion.div>
            <div style={{ gridColumn: '2', gridRow: '1' }}>
              <ProgressRail progress={scrollYProgress} active={active} />
            </div>
            <motion.div
              layout
              style={{ gridColumn: copyOnLeft ? '3' : '1', gridRow: '1' }}
              transition={{ layout: { type: 'spring', stiffness: 105, damping: 25, mass: 1 } }}
              className={copyOnLeft ? 'flex justify-start' : 'flex justify-end'}
            >
              <PhoneShowcase activeStep={active} />
            </motion.div>
          </div>

          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 lg:hidden">
            <ProgressRail
              progress={scrollYProgress}
              active={active}
              compact
            />
            <div className="py-1">
              <StepCard
                step={step}
                active={active}
                onStartPlanning={onStartPlanning}
                compact
              />
              <div className="mt-3">
                <PhoneShowcase activeStep={active} compact />
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2">
            {STEPS.map((item, index) => (
              <span
                key={item.n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === active ? 'w-8 bg-burnt-orange' : 'w-1.5 bg-[#4a3226]/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrollJourney
