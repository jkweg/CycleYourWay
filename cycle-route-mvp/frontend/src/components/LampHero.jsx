import { motion } from 'motion/react'
import { LampContainer } from './ui/lamp'

function LampHero({ onStartPlanning }) {
  return (
    <section className="relative w-full">
      <LampContainer>
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.7, ease: 'easeOut' }}
          className="font-serif text-5xl font-semibold tracking-tight text-burnt-orange md:text-7xl lg:text-8xl"
        >
          Cycle Your Way
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.28, duration: 0.65 }}
          className="mt-6 max-w-2xl text-lg font-medium leading-8 text-ink md:text-xl"
        >
          Planuj trasy, które prowadzą dalej.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-4 max-w-xl text-sm leading-7 text-ink-muted md:text-base"
        >
          Mapa, routing rowerowy, elewacja i zapis tras — w jednym planerze stworzonym
          dla codziennych przejażdżek i długich wyjazdów.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55, duration: 0.55 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 pb-2"
        >
          <button
            type="button"
            onClick={onStartPlanning}
            className="soft-button rounded-full bg-burnt-orange px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-vanilla transition hover:bg-burnt-orange-dark"
          >
            Rozpocznij planowanie
          </button>
          <a
            href="#how-it-works"
            className="soft-button rounded-full border-2 border-burnt-orange px-8 py-3.5 text-sm font-semibold text-burnt-orange transition hover:bg-burnt-orange/10"
          >
            Dowiedz się więcej
          </a>
        </motion.div>
      </LampContainer>
    </section>
  )
}

export default LampHero
