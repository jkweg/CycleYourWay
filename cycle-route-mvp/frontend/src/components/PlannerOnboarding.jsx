import { useState } from 'react'
import { markPlannerOnboardingDone } from '../lib/plannerOnboarding'

const STEPS = [
  {
    title: 'Ustaw start',
    body: 'Kliknij mapę, wpisz adres albo użyj swojej lokalizacji.',
  },
  {
    title: 'Wybierz tryb',
    body: 'Trasa A → B między dwoma punktami albo pętla treningowa o wybranym dystansie.',
  },
  {
    title: 'Zapisz i jedź',
    body: 'Porównaj warianty, zapisz trasę na koncie i otwórz nawigację na telefonie.',
  },
]

function PlannerOnboarding({ isOpen, onClose }) {
  const [step, setStep] = useState(0)

  if (!isOpen) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  const finish = () => {
    markPlannerOnboardingDone()
    setStep(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-stone-900/35 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a6248]">
          Szybki start · {step + 1}/{STEPS.length}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-semibold text-[#2e5f43]">
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{current.body}</p>

        <div className="mt-4 flex gap-1.5">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${
                index <= step ? 'bg-[#3f7b57]' : 'bg-[#e8dfcf]'
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={finish}
            className="rounded-xl px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            Pomiń
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) finish()
              else setStep((currentStep) => currentStep + 1)
            }}
            className="soft-button ml-auto rounded-xl bg-[#3f7b57] px-4 py-2 text-sm font-semibold text-white hover:bg-[#356b4b]"
          >
            {isLast ? 'Zaczynamy' : 'Dalej'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlannerOnboarding
