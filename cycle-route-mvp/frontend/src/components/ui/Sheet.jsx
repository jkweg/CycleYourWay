import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { IconX } from '@tabler/icons-react'

const PHONE_QUERY = '(max-width: 639px)'
const DRAWER_EASE = [0.32, 0.72, 0, 1]
const OUT_EASE = [0.23, 1, 0.32, 1]
// A quick flick closes the sheet even if it moved only a little.
const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 500

// Open sheets, oldest first: Escape belongs to the last one (a document over the profile).
const openStack = []

const WIDTHS = {
  sm: 'sm:max-w-[420px]',
  md: 'sm:max-w-[480px]',
  lg: 'sm:max-w-[640px]',
}

function usePhoneLayout() {
  const [phone, setPhone] = useState(() => window.matchMedia?.(PHONE_QUERY).matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.(PHONE_QUERY)
    if (!query) return undefined
    const sync = () => setPhone(query.matches)
    query.addEventListener?.('change', sync)
    return () => query.removeEventListener?.('change', sync)
  }, [])
  return phone
}

/**
 * Dialog in the app's style: a bottom sheet on phones (drag the handle down to
 * close), a centred card from `sm` up. Escape closes it, focus moves in and
 * back out, and the page behind does not scroll.
 */
function Sheet({ open, onClose, eyebrow, title, description, children, footer, size = 'md', tone = 'vanilla' }) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef(null)
  const dragControls = useDragControls()
  const phone = usePhoneLayout()
  const reduceMotion = useReducedMotion()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const token = {}
    openStack.push(token)
    const previousFocus = document.activeElement
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus], input, select, textarea, button:not([data-sheet-close])')
      ;(target || panelRef.current)?.focus?.({ preventScroll: true })
    }, 60)
    const onKey = (event) => {
      if (event.key === 'Escape' && openStack[openStack.length - 1] === token) onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusTimer)
      openStack.splice(openStack.indexOf(token), 1)
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = previousOverflow
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [open])

  const hidden = reduceMotion
    ? { opacity: 0 }
    : phone
      ? { transform: 'translateY(100%)' }
      : { opacity: 0, transform: 'translateY(8px) scale(0.97)' }
  const shown = reduceMotion ? { opacity: 1 } : phone ? { transform: 'translateY(0%)' } : { opacity: 1, transform: 'translateY(0px) scale(1)' }

  const surface = tone === 'ink' ? 'bg-ink text-vanilla' : 'bg-vanilla text-ink'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2500] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={hidden}
            animate={shown}
            exit={{ ...hidden, transition: { duration: 0.2, ease: OUT_EASE } }}
            transition={{ duration: phone ? 0.42 : 0.24, ease: phone ? DRAWER_EASE : OUT_EASE }}
            drag={phone && !reduceMotion ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) onClose?.()
            }}
            className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] shadow-[0_-16px_50px_rgba(42,26,18,0.25)] outline-none sm:max-h-[88vh] sm:rounded-[28px] sm:shadow-[0_30px_80px_rgba(42,26,18,0.35)] ${surface} ${WIDTHS[size] || WIDTHS.md}`}
          >
            <div
              className="flex shrink-0 touch-none justify-center pt-2.5 sm:hidden"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <span className={`h-1 w-10 rounded-full ${tone === 'ink' ? 'bg-white/25' : 'bg-sand'}`} />
            </div>
            <div className="flex shrink-0 items-start gap-4 px-5 pb-3 pt-3 sm:px-7 sm:pt-6">
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${tone === 'ink' ? 'text-burnt-orange' : 'text-rust'}`}>
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <h2 id={titleId} className="mt-1 font-serif text-[26px] font-medium leading-tight sm:text-[30px]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className={`mt-1.5 text-[15px] leading-relaxed ${tone === 'ink' ? 'text-vanilla-deep' : 'text-ink-muted'}`}>
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                data-sheet-close
                onClick={onClose}
                aria-label="Zamknij"
                className={`press grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  tone === 'ink' ? 'bg-white/10 text-white' : 'bg-white text-ink shadow-[0_4px_14px_rgba(42,26,18,0.08)]'
                }`}
              >
                <IconX size={18} stroke={2.4} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7 sm:pb-7">{children}</div>
            {footer && (
              <div
                className="shrink-0 border-t border-ink/10 px-5 pt-3 sm:px-7"
                style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom)) + 16px)' }}
              >
                {footer}
              </div>
            )}
            {!footer && <div className="shrink-0 sm:hidden" style={{ height: 'var(--safe-area-inset-bottom,env(safe-area-inset-bottom))' }} />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default Sheet
