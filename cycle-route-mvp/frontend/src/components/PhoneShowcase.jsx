import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

function PhoneScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#2c1e16]">
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px]" />
      <svg viewBox="0 0 220 460" className="absolute inset-0 h-full w-full">
        <path
          d="M 40 430 C 120 400 60 320 120 280 C 180 240 110 170 150 120 C 180 80 150 50 120 20"
          fill="none"
          stroke="#FC6C26"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M 40 430 C 120 400 60 320 120 280 C 180 240 110 170 150 120 C 180 80 150 50 120 20"
          fill="none"
          stroke="#ff9a5c"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <g transform="translate(120 280)">
          <circle r="18" fill="#2563eb" opacity="0.2" />
          <circle r="13" fill="#2563eb" stroke="#fff" strokeWidth="3" />
          <path d="M0 -7 L5 7 L0 4 L-5 7 Z" fill="#ffffff" />
        </g>
      </svg>

      <div className="absolute inset-x-3 top-3 rounded-2xl bg-[#3d2a20]/95 p-3 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none text-orange-300">↱</span>
          <div>
            <p className="text-lg font-bold tabular-nums">200 m</p>
            <p className="text-[11px] text-orange-100/80">w prawo w ul. Leśną</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#3d2a20]/95 px-3 py-2 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <p className="text-sm font-bold tabular-nums">12,4 km</p>
            <p className="text-[9px] uppercase tracking-wide text-orange-100/60">Pozostało</p>
          </div>
          <div className="flex-1 border-x border-white/10">
            <p className="text-sm font-bold tabular-nums">38 min</p>
            <p className="text-[9px] uppercase tracking-wide text-orange-100/60">Czas</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold tabular-nums">21</p>
            <p className="text-[9px] uppercase tracking-wide text-orange-100/60">km/h</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneShowcase({ onStartPlanning }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const progress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 26,
    mass: 0.5,
  })

  const rotateY = useTransform(progress, [0, 0.5, 1], [38, 0, -38])
  const rotateZ = useTransform(progress, [0, 0.5, 1], [-6, 0, 6])
  const y = useTransform(progress, [0, 1], [60, -60])
  const glow = useTransform(progress, [0, 0.5, 1], [0.15, 0.5, 0.15])

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-y border-burnt-orange/20 bg-[#3d2a20] py-24 text-vanilla"
    >
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(252,108,38,0.45),transparent_65%)]"
        style={{ opacity: glow }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:px-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-burnt-orange">
            Nawigacja w terenie
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-vanilla md:text-5xl">
            Twoja trasa rusza
            <br />
            razem z Tobą.
          </h2>
          <p className="mt-5 max-w-md text-base leading-8 text-vanilla/75">
            Po zaplanowaniu trasy otwórz ją na telefonie i jedź z nawigacją głosową,
            strzałką kierunku i podpowiedziami zakrętów — bez przełączania aplikacji.
          </p>

          <ul className="mt-7 space-y-3 text-sm text-vanilla/85">
            {[
              'Głosowe zapowiedzi: za 300 m, za 100 m, teraz',
              'Strzałka kierunku i podążająca kamera',
              'Ekran nie gaśnie — Wake Lock w tle',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-burnt-orange/25 text-burnt-orange">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onStartPlanning}
            className="soft-button mt-8 rounded-full bg-burnt-orange px-7 py-3 text-sm font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
          >
            Zaplanuj i jedź
          </button>
        </div>

        <div className="flex justify-center [perspective:1400px]">
          <motion.div
            style={{ rotateY, rotateZ, y, transformStyle: 'preserve-3d' }}
            className="relative h-[560px] w-[280px] rounded-[2.6rem] border border-white/15 bg-[#2c1e16] p-2.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute left-1/2 top-2.5 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#2c1e16]" />
            <div className="h-full w-full overflow-hidden rounded-[2.1rem]">
              <PhoneScreen />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default PhoneShowcase
