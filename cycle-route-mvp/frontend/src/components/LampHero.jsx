import { motion } from 'motion/react'
import { LampContainer } from './ui/lamp'

function LampHero({ onStartPlanning }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-12 pt-8 md:px-10 md:pt-12">
      <LampContainer>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a8d4b8]"
        >
          Cycle Your Way
        </motion.p>
        <motion.h1
          initial={{ opacity: 0.5, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="mt-5 bg-gradient-to-br from-[#f0faf3] via-[#cfe7d2] to-[#c4a882] bg-clip-text text-4xl font-semibold leading-[1.15] tracking-tight text-transparent md:text-5xl lg:text-6xl"
        >
          Planuj trasy,
          <br />
          które prowadzą dalej.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="mt-6 max-w-2xl text-center text-sm leading-7 text-[#c8ddd0] md:text-base"
        >
          Mapa, routing rowerowy, elewacja i zapis tras — w jednym planerze stworzonym
          dla codziennych przejażdżek i długich wyjazdów.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.65, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-2"
        >
          <button
            type="button"
            onClick={onStartPlanning}
            className="soft-button rounded-full bg-[#6fa07c] px-8 py-3 text-sm font-semibold uppercase tracking-wide text-[#142318] transition hover:bg-[#8bc49a]"
          >
            Rozpocznij planowanie
          </button>
          <a
            href="#how-it-works"
            className="soft-button rounded-full border border-[#8bc49a]/35 bg-white/5 px-8 py-3 text-sm font-semibold text-[#e2f2e8] transition hover:bg-white/10"
          >
            Dowiedz się więcej
          </a>
        </motion.div>
      </LampContainer>
    </section>
  )
}

export default LampHero
