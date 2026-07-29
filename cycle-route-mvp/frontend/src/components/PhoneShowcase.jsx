import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

function PhoneScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(155deg,#2c1e16_0%,#432c20_48%,#251912_100%)]">
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute -right-16 top-24 h-44 w-44 rounded-full bg-burnt-orange/20 blur-3xl" />
      <div className="absolute -left-12 bottom-24 h-36 w-36 rounded-full bg-[#f5b56d]/15 blur-3xl" />
      <svg viewBox="0 0 220 460" className="absolute inset-0 h-full w-full">
        <path
          d="M 40 430 C 120 400 60 320 120 280 C 180 240 110 170 150 120 C 180 80 150 50 120 20"
          fill="none"
          stroke="#FC6C26"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.35"
        />
        <motion.path
          d="M 40 430 C 120 400 60 320 120 280 C 180 240 110 170 150 120 C 180 80 150 50 120 20"
          fill="none"
          stroke="url(#phoneRouteGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 2.2, ease: 'easeInOut' }}
        />
        <defs>
          <linearGradient id="phoneRouteGradient" x1="40" y1="430" x2="120" y2="20">
            <stop offset="0%" stopColor="#FC6C26" />
            <stop offset="55%" stopColor="#ff9a5c" />
            <stop offset="100%" stopColor="#ffd09f" />
          </linearGradient>
        </defs>
        <motion.g
          transform="translate(120 280)"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.circle
            r="22"
            fill="#4a9cff"
            animate={{ opacity: [0.08, 0.26, 0.08], scale: [0.85, 1.2, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle r="13" fill="#2563eb" stroke="#fff" strokeWidth="3" />
          <path d="M0 -7 L5 7 L0 4 L-5 7 Z" fill="#ffffff" />
        </motion.g>
      </svg>

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#2c1e16]/78 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-orange-100/80 ring-1 ring-white/10 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        GPS aktywny
      </div>

      <div className="absolute inset-x-3 top-12 rounded-2xl bg-[#3d2a20]/88 p-3 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-burnt-orange/20 text-3xl leading-none text-orange-300">
            ↱
          </span>
          <div>
            <p className="text-lg font-bold tabular-nums">200 m</p>
            <p className="text-[11px] text-orange-100/80">w prawo w ul. Leśną</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#3d2a20]/90 px-3 py-2.5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-xl">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-burnt-orange to-[#ffc08b]"
            initial={{ width: '18%' }}
            animate={{ width: '62%' }}
            transition={{ delay: 0.7, duration: 2, ease: 'easeOut' }}
          />
        </div>
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

  const rotateY = useTransform(progress, [0, 0.5, 1], [18, 0, -14])
  const rotateZ = useTransform(progress, [0, 0.5, 1], [-3, 0, 3])
  const y = useTransform(progress, [0, 1], [46, -42])
  const glow = useTransform(progress, [0, 0.5, 1], [0.22, 0.68, 0.22])
  const orbitRotate = useTransform(progress, [0, 1], [-12, 22])

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[linear-gradient(135deg,#302018_0%,#4a3022_48%,#2a1b15_100%)] py-24 text-vanilla md:py-32"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-gradient-to-b from-vanilla/16 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-t from-vanilla/14 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,244,214,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,244,214,0.16)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-burnt-orange/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#f5b56d]/12 blur-3xl" />

      <motion.div
        className="pointer-events-none absolute left-[70%] top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(252,108,38,0.5),transparent_66%)]"
        style={{ opacity: glow }}
      />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-6 md:px-10 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
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

          <ul className="mt-7 grid gap-3 text-sm text-vanilla/85 sm:grid-cols-2 lg:grid-cols-1">
            {[
              'Głosowe zapowiedzi: za 300 m, za 100 m, teraz',
              'Strzałka kierunku i podążająca kamera',
              'Ekran nie gaśnie — Wake Lock w tle',
              'Automatyczne przeliczenie po zjechaniu z trasy',
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burnt-orange/25 text-burnt-orange">
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
        </motion.div>

        <div className="relative flex min-h-[620px] items-center justify-center [perspective:1400px]">
          <motion.div
            style={{ rotate: orbitRotate }}
            className="pointer-events-none absolute h-[480px] w-[480px] rounded-full border border-dashed border-burnt-orange/25"
          />
          <motion.div
            style={{ rotate: orbitRotate }}
            className="pointer-events-none absolute h-[380px] w-[380px] rounded-full border border-white/10"
          />

          <motion.div
            animate={{ y: [0, -10, 0], rotate: [-2, 1, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[2%] top-[24%] z-20 hidden rounded-2xl border border-white/10 bg-[#fff4d6]/95 px-4 py-3 text-[#3d2a20] shadow-2xl backdrop-blur sm:block"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-burnt-orange">
              Trasa
            </p>
            <p className="mt-1 text-lg font-bold">24,8 km</p>
            <p className="text-[11px] text-[#6a4b3a]">spokojna pętla</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0], rotate: [2, -1, 2] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="absolute bottom-[20%] right-[1%] z-20 hidden rounded-2xl border border-burnt-orange/20 bg-[#3d2a20]/94 px-4 py-3 text-vanilla shadow-2xl backdrop-blur sm:block"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">
              Następny zakręt
            </p>
            <p className="mt-1 text-lg font-bold">za 200 m ↱</p>
            <p className="text-[11px] text-orange-100/60">ul. Leśna</p>
          </motion.div>

          <motion.div
            style={{ rotateY, rotateZ, y, transformStyle: 'preserve-3d' }}
            className="relative z-10 h-[560px] w-[280px] rounded-[2.8rem] border border-white/20 bg-[#20150f] p-2.5 shadow-[0_50px_110px_-28px_rgba(0,0,0,0.9)] ring-1 ring-burnt-orange/20"
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
