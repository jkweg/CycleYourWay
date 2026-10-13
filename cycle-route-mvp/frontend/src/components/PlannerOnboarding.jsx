import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconBookmark, IconMapPin, IconRepeat } from '@tabler/icons-react'
import { markPlannerOnboardingDone } from '../lib/plannerOnboarding'
import Sheet from './ui/Sheet'
import { Button } from './ui/controls'

const STEPS = [
  {
    icon: IconMapPin,
    title: 'Ustaw start',
    body: 'Dotknij mapy, wpisz adres albo użyj swojej lokalizacji.',
  },
  {
    icon: IconRepeat,
    title: 'Wybierz trasę',
    body: 'Z punktu A do B albo pętla o wybranym dystansie — pod Twój styl jazdy.',
  },
  {
    icon: IconBookmark,
    title: 'Zapisz i jedź',
    body: 'Porównaj warianty, zapisz trasę na koncie i ruszaj z nawigacją głosową.',
  },
]

function PlannerOnboarding({ isOpen, onClose }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  const finish = () => {
    markPlannerOnboardingDone()
    setStep(0)
    onClose()
  }

  return (
    <Sheet
      open={isOpen}
      onClose={finish}
      eyebrow={`Szybki start · ${step + 1}/${STEPS.length}`}
      size="sm"
      footer={
        <div className="flex items-center gap-2">
          <Button tone="ghost" onClick={finish}>
            Pomiń
          </Button>
          <Button className="ml-auto min-w-[9rem]" onClick={() => (isLast ? finish() : setStep((value) => value + 1))}>
            {isLast ? 'Zaczynamy' : 'Dalej'}
          </Button>
        </div>
      }
    >
      <div className="relative h-[168px] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, filter: 'blur(6px)', transform: 'translateX(24px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' }}
            exit={{ opacity: 0, filter: 'blur(6px)', transform: 'translateX(-24px)' }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-burnt-orange text-ink">
              <Icon size={28} stroke={2.2} />
            </span>
            <h2 className="mt-4 font-serif text-[28px] font-medium leading-tight text-ink">{current.title}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{current.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {STEPS.map((item, index) => (
          <span
            key={item.title}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${index <= step ? 'bg-burnt-orange' : 'bg-vanilla-deep'}`}
          />
        ))}
      </div>
    </Sheet>
  )
}

export default PlannerOnboarding
