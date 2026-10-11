import { useId } from 'react'
import { IconArrowRight } from '@tabler/icons-react'

/** Circular call to action: the text ring turns slowly around an arrow. */
function SpinBadge({ onClick, className = '' }) {
  // Two badges can share a page: each needs its own path id.
  const ringId = `cyw-ring-${useId().replace(/[^\w-]/g, '')}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Zaplanuj trasę"
      className={`press group relative grid h-32 w-32 place-items-center rounded-full bg-ink text-vanilla shadow-[0_20px_40px_rgba(42,26,18,0.28)] ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 120 120" className="cyw-badge absolute inset-0 h-full w-full">
        <defs>
          <path id={ringId} d="M 60 60 m -44 0 a 44 44 0 1 1 88 0 a 44 44 0 1 1 -88 0" />
        </defs>
        <text fill="currentColor" fontSize="11" fontWeight="700">
          <textPath href={`#${ringId}`} textLength="272" lengthAdjust="spacing">PLANUJ • JEDŹ • ZAPISZ • PLANUJ • JEDŹ • ZAPISZ •</textPath>
        </text>
      </svg>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-burnt-orange text-ink transition-transform duration-300 ease-[var(--ease-out)] group-hover:rotate-[-45deg]">
        <IconArrowRight size={26} stroke={2.4} aria-hidden="true" />
      </span>
    </button>
  )
}

export default SpinBadge
