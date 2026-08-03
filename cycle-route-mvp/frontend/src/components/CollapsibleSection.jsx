import { useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'

/**
 * Lightweight disclose/collapse for secondary planner options.
 */
function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  open: openControlled,
  onOpenChange,
  children,
  className = '',
}) {
  const isControlled = openControlled !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isControlled ? openControlled : internalOpen

  const toggle = () => {
    const next = !open
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className={`rounded-xl border border-[#C4A574]/55 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-[#FFF8E8]/70"
      >
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-[#E05518] transition-transform duration-200 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
          stroke={2.25}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#4a3226]">{title}</span>
          {!open && summary ? (
            <span className="mt-0.5 block truncate text-xs text-stone-500">{summary}</span>
          ) : null}
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-[#C4A574]/40 px-3 py-3">{children}</div> : null}
    </div>
  )
}

export default CollapsibleSection
