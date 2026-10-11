import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { BikeShapes } from '../brand/BikeGlyph'

const STEPS = [
  {
    n: '01',
    title: 'Zaplanuj',
    text: 'Wpisz start i cel albo wybierz długość pętli. Ustaw styl jazdy, nawierzchnię i to, czy omijać główne drogi.',
  },
  {
    n: '02',
    title: 'Jedź',
    text: 'Nawigacja głosowa prowadzi zakręt po zakręcie, a gdy zjedziesz z trasy — wyznacza drogę powrotu.',
  },
  {
    n: '03',
    title: 'Zapisz',
    text: 'Ślad, dystans i czas trafiają do historii jazd. Ulubione trasy udostępnisz jednym linkiem.',
  },
]

// Torn paper edge between the hero and the scene.
const TORN_EDGE =
  'M0 0 H1440 V34 L1404 46 L1370 30 L1322 52 L1281 36 L1236 58 L1190 40 L1150 56 L1101 34 L1062 50 L1010 38 L968 60 L921 42 L880 54 L834 32 L790 52 L741 40 L700 58 L652 36 L611 52 L560 34 L519 56 L470 40 L428 54 L380 32 L338 50 L290 38 L250 58 L202 40 L160 52 L112 34 L70 50 L30 38 L0 52 Z'

function Scene({ progress, still }) {
  const range = (amount) =>
    still ? ['translateX(0%)', 'translateX(0%)'] : ['translateX(0%)', `translateX(${amount}%)`]
  // Farther layers move less: that difference is the depth.
  const far = useTransform(progress, [0, 1], range(-6))
  const mid = useTransform(progress, [0, 1], range(-14))
  const near = useTransform(progress, [0, 1], range(-24))
  const sun = useTransform(
    progress,
    [0, 1],
    still ? ['translateY(0%)', 'translateY(0%)'] : ['translateY(-20%)', 'translateY(150%)']
  )
  const rider = useTransform(
    progress,
    [0, 1],
    still ? ['translateX(42vw)', 'translateX(42vw)'] : ['translateX(-14vw)', 'translateX(92vw)']
  )

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#FFE7C2] via-[#FFC58F] to-[#FC8A4A]"
    >
      <motion.div
        style={{ transform: sun }}
        className="absolute left-[58%] top-[18%] h-[22vmin] w-[22vmin] rounded-full bg-[#FFF4D6]"
      />
      <motion.svg
        style={{ transform: far }}
        className="absolute bottom-[30%] left-0 h-[40%] w-[130%]"
        viewBox="0 0 1870 400"
        preserveAspectRatio="none"
      >
        <path
          d="M0 400 V250 L170 120 L300 210 L460 70 L640 230 L790 110 L960 240 L1120 90 L1300 220 L1460 120 L1640 250 L1870 140 V400 Z"
          fill="#F2A36A"
          opacity="0.75"
        />
      </motion.svg>
      <motion.svg
        style={{ transform: mid }}
        className="absolute bottom-[18%] left-0 h-[36%] w-[140%]"
        viewBox="0 0 2016 360"
        preserveAspectRatio="none"
      >
        <path
          d="M0 360 V210 C 160 120 300 230 470 160 S 760 70 930 170 S 1240 250 1420 140 S 1760 110 2016 190 V360 Z"
          fill="#E05518"
        />
        <g fill="#C94A12" opacity="0.7">
          <path d="M240 190 l14 -46 l14 46 Z" />
          <path d="M262 196 l11 -36 l11 36 Z" />
          <path d="M1180 200 l14 -46 l14 46 Z" />
          <path d="M1204 206 l11 -34 l11 34 Z" />
          <path d="M1600 170 l14 -44 l14 44 Z" />
        </g>
      </motion.svg>
      <motion.svg
        style={{ transform: near }}
        className="absolute bottom-[12%] left-0 h-[26%] w-[150%]"
        viewBox="0 0 2160 260"
        preserveAspectRatio="none"
      >
        <path
          d="M0 260 V150 C 220 80 380 170 600 120 S 980 60 1200 130 S 1600 190 1840 110 S 2060 90 2160 120 V260 Z"
          fill="#B8410F"
        />
      </motion.svg>
      {/* Road band: the rider stays on it while the land scrolls by. */}
      <div className="absolute inset-x-0 bottom-0 h-[13%] bg-ink">
        <div className="absolute inset-x-0 top-[42%] border-t-[3px] border-dashed border-[#FFF4D6]/35" />
      </div>
      <motion.div
        style={{ transform: rider }}
        className="absolute bottom-[7.2%] left-0 h-[clamp(58px,9vmin,96px)] w-[clamp(92px,14vmin,152px)]"
      >
        <svg viewBox="0 0 120 76" className="h-full w-full">
          <BikeShapes tire="#FFF4D6" spoke="rgba(255,244,214,0.5)" frame="#FC6C26" hub="#2A1A12" spinning={!still} />
        </svg>
      </motion.div>
    </div>
  )
}

function StepText({ step }) {
  return (
    <motion.div
      key={step.n}
      initial={{ opacity: 0, filter: 'blur(8px)', transform: 'translateY(16px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }}
      exit={{ opacity: 0, filter: 'blur(8px)', transform: 'translateY(-12px)' }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0"
    >
      <p className="font-display text-[clamp(5rem,12vw,10rem)] leading-[0.8] text-ink/90">{step.n}</p>
      <h3 className="mt-3 font-serif text-[clamp(2.4rem,5vw,4rem)] font-medium leading-none text-ink">{step.title}</h3>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-muted md:text-xl">{step.text}</p>
    </motion.div>
  )
}

/**
 * "Jak to działa" told by scrolling: a layered sunset landscape slides by at
 * different speeds while a cyclist rides across, and the three steps change.
 */
function RideStory() {
  const sectionRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = value < 0.34 ? 0 : value < 0.68 ? 1 : 2
    setActive((current) => (current === next ? current : next))
  })

  const jumpTo = (index) => {
    const section = sectionRef.current
    if (!section) return
    const top = section.offsetTop + (section.offsetHeight - window.innerHeight) * (index / 3 + 0.17)
    window.scrollTo({ top, behavior: 'smooth' })
  }

  if (reduceMotion) {
    return (
      <section id="journey" aria-labelledby="journey-title" className="relative scroll-mt-20">
        <h2 id="journey-title" className="sr-only">
          Jak to działa
        </h2>
        <div className="relative h-[60svh] min-h-[360px]">
          <Scene progress={scrollYProgress} still />
        </div>
        <ol className="mx-auto grid max-w-7xl gap-8 bg-vanilla px-5 py-16 md:grid-cols-3 md:px-10">
          {STEPS.map((step) => (
            <li key={step.n}>
              <p className="font-display text-6xl text-burnt-orange">{step.n}</p>
              <h3 className="mt-2 font-serif text-4xl font-medium text-ink">{step.title}</h3>
              <p className="mt-3 text-lg leading-relaxed text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section id="journey" ref={sectionRef} aria-labelledby="journey-title" className="relative h-[320svh] scroll-mt-0">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Scene progress={scrollYProgress} />
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-[2] h-[60px] w-full"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
        >
          <path d={TORN_EDGE} fill="#FFF4D6" />
        </svg>

        <div className="relative z-[3] mx-auto flex h-full max-w-7xl flex-col px-5 pt-[14svh] md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rust">Jak to działa</p>
          <h2 id="journey-title" className="sr-only">
            Jak to działa
          </h2>
          <div className="relative mt-4 h-[46svh] max-w-xl" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <StepText step={STEPS[active]} />
            </AnimatePresence>
          </div>
        </div>

        <nav
          aria-label="Kroki"
          className="absolute right-5 top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-3 md:right-10"
        >
          {STEPS.map((step, index) => (
            <button
              key={step.n}
              type="button"
              onClick={() => jumpTo(index)}
              aria-current={active === index ? 'step' : undefined}
              className="press group flex items-center justify-end gap-3 text-right"
            >
              <span
                className={`hidden text-sm font-semibold transition-opacity duration-200 md:inline ${
                  active === index ? 'text-ink opacity-100' : 'text-ink/60 opacity-0 group-hover:opacity-100'
                }`}
              >
                {step.title}
              </span>
              <span
                className={`block h-3 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out)] ${
                  active === index ? 'w-8 bg-ink' : 'w-3 bg-ink/30'
                }`}
              />
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}

export default RideStory
