import { AnimatePresence, motion } from 'motion/react'

const SCREEN_META = [
  { label: 'Planer', number: '01' },
  { label: 'Trasa', number: '02' },
  { label: 'Analiza', number: '03' },
  { label: 'Nawigacja', number: '04' },
]

function PlannerScreen() {
  return (
    <div className="h-full bg-vanilla p-4 text-[#4a3226]">
      <div className="mt-8 flex rounded-xl border border-[#4a3226]/15 bg-white/45 p-1 text-[10px] font-bold uppercase tracking-wide">
        <span className="flex-1 rounded-lg bg-[#4a3226] px-2 py-2 text-center text-vanilla">
          A → B
        </span>
        <span className="flex-1 px-2 py-2 text-center text-[#4a3226]/55">Pętla</span>
      </div>
      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-[#4a3226]/15 bg-white/55 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-burnt-orange">
            Początek
          </p>
          <p className="mt-1 text-xs font-semibold">Kraków, Rynek Główny</p>
        </div>
        <div className="ml-4 h-5 border-l border-dashed border-burnt-orange/45" />
        <div className="rounded-xl border border-[#4a3226]/15 bg-white/55 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-burnt-orange">
            Cel
          </p>
          <p className="mt-1 text-xs font-semibold">Las Wolski</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {['Gravel', 'Spokojnie'].map((item) => (
          <div
            key={item}
            className="rounded-lg border border-[#4a3226]/12 px-2 py-2 text-center text-[10px] font-semibold"
          >
            {item}
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-burnt-orange py-3 text-center text-[10px] font-bold uppercase tracking-wide text-vanilla">
        Wyznacz trasę
      </div>
    </div>
  )
}

function RouteScreen() {
  return (
    <div className="relative h-full overflow-hidden bg-[#efe3c5]">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(74,50,38,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(74,50,38,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <svg viewBox="0 0 220 460" className="absolute inset-0 h-full w-full">
        <path
          d="M 34 418 C 78 378 52 328 112 292 C 174 254 118 190 164 142 C 192 110 166 64 124 28"
          fill="none"
          stroke="#4a3226"
          strokeWidth="13"
          strokeLinecap="round"
          opacity="0.12"
        />
        <motion.path
          d="M 34 418 C 78 378 52 328 112 292 C 174 254 118 190 164 142 C 192 110 166 64 124 28"
          fill="none"
          stroke="#FC6C26"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />
        <circle cx="34" cy="418" r="8" fill="#4a3226" stroke="#fff4d6" strokeWidth="3" />
        <circle cx="124" cy="28" r="8" fill="#FC6C26" stroke="#fff4d6" strokeWidth="3" />
      </svg>
      <div className="absolute inset-x-3 top-9 rounded-2xl border border-[#4a3226]/10 bg-vanilla/95 p-3 text-[#4a3226]">
        <div className="flex justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-burnt-orange">
              Wybrana trasa
            </p>
            <p className="mt-1 text-lg font-bold">24,8 km</p>
          </div>
          <p className="text-right text-xs font-semibold">1 h 42 min</p>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-4 rounded-xl bg-[#4a3226] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-vanilla">
        3 warianty do porównania
      </div>
    </div>
  )
}

function AnalysisScreen() {
  return (
    <div className="h-full bg-vanilla p-4 text-[#4a3226]">
      <div className="mt-9">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-burnt-orange">
          Profil trasy
        </p>
        <p className="mt-1 font-serif text-2xl font-semibold">Wiesz, co Cię czeka.</p>
      </div>
      <div className="mt-5 rounded-2xl border border-[#4a3226]/15 bg-white/45 p-3">
        <svg viewBox="0 0 220 100" className="w-full">
          <path
            d="M0 88 C28 82 38 52 64 58 C90 65 98 22 126 34 C154 48 168 16 220 26 L220 100 L0 100 Z"
            fill="#FC6C26"
            opacity="0.16"
          />
          <motion.path
            d="M0 88 C28 82 38 52 64 58 C90 65 98 22 126 34 C154 48 168 16 220 26"
            fill="none"
            stroke="#4a3226"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
        </svg>
        <div className="mt-2 flex justify-between text-[9px] font-semibold text-[#4a3226]/60">
          <span>0 km</span>
          <span>24,8 km</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ['Przewyższenie', '420 m'],
          ['Asfalt', '68%'],
          ['Szuter', '24%'],
          ['Strome odcinki', '3'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#4a3226]/12 bg-white/40 p-3">
            <p className="text-lg font-bold">{value}</p>
            <p className="mt-1 text-[9px] text-[#4a3226]/60">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NavigationScreen() {
  return (
    <div className="relative h-full overflow-hidden bg-[#4a3226] text-vanilla">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,244,214,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,244,214,0.12)_1px,transparent_1px)] [background-size:26px_26px]" />
      <svg viewBox="0 0 220 460" className="absolute inset-0 h-full w-full">
        <path
          d="M 38 430 C 112 402 58 320 118 282 C 178 244 112 168 152 116 C 180 78 154 48 122 20"
          fill="none"
          stroke="#FC6C26"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Marker sits on path endpoint (118, 282) so it stays on the line */}
        <motion.circle
          cx="118"
          cy="282"
          fill="#FC6C26"
          stroke="#fff4d6"
          strokeWidth="3.5"
          animate={{ r: [9, 11, 9] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </svg>
      <div className="absolute inset-x-3 top-10 rounded-2xl bg-[#342218]/95 p-3 ring-1 ring-vanilla/15">
        <div className="flex items-center gap-3">
          <span className="text-3xl text-burnt-orange">↱</span>
          <div>
            <p className="text-lg font-bold">200 m</p>
            <p className="text-[11px] text-vanilla/65">w prawo w ul. Leśną</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#342218]/95 px-3 py-3 ring-1 ring-vanilla/15">
        <div className="flex justify-between text-center">
          <div><p className="text-sm font-bold">12,4 km</p><p className="text-[8px] text-vanilla/50">Pozostało</p></div>
          <div><p className="text-sm font-bold">38 min</p><p className="text-[8px] text-vanilla/50">Czas</p></div>
          <div><p className="text-sm font-bold">21 km/h</p><p className="text-[8px] text-vanilla/50">Tempo</p></div>
        </div>
      </div>
    </div>
  )
}

const SCREENS = [PlannerScreen, RouteScreen, AnalysisScreen, NavigationScreen]

function PhoneShowcase({ activeStep = 0, compact = false }) {
  const Screen = SCREENS[activeStep] || PlannerScreen
  const meta = SCREEN_META[activeStep] || SCREEN_META[0]

  return (
    <div className={`relative mx-auto w-full ${compact ? 'max-w-[12.5rem]' : 'max-w-[18rem]'}`}>
      <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a3226]/55">
        <span>{meta.number}</span>
        <span>{meta.label}</span>
      </div>
      <div
        className={`relative border-2 border-[#4a3226] bg-[#2b1b14] p-2.5 ${
          compact ? 'h-[380px] rounded-[2.2rem]' : 'h-[560px] rounded-[2.8rem]'
        }`}
      >
        <div className="absolute left-1/2 top-2.5 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#2b1b14]" />
        <div className="relative h-full overflow-hidden rounded-[2.15rem]">
          <AnimatePresence initial={false}>
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 22, scale: 0.985, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, scale: 0.99, filter: 'blur(2px)' }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Screen />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default PhoneShowcase
