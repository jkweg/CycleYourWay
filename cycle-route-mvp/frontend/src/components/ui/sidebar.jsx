import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { SidebarContext } from './sidebarContext'
import { useSidebar } from './useSidebar'

const COLLAPSED_WIDTH = '4.5rem'
const EXPANDED_WIDTH = '16rem'
const CLOSE_DELAY_MS = 180

function SidebarProvider({ children, open: openProp, setOpen: setOpenProp }) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = setOpenProp ?? setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>
  )
}

export function Sidebar({ children, open, setOpen, animate = true, className }) {
  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpen(true)
  }

  const handleLeave = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, CLOSE_DELAY_MS)
  }

  return (
    <SidebarProvider open={open} setOpen={setOpen}>
      {/* Spacer keeps flex layout stable — expanding panel overlays instead of resizing the map */}
      <div className="relative hidden h-full w-[4.5rem] shrink-0 md:block">
        <motion.aside
          className={cn(
            'absolute inset-y-0 left-0 z-30 flex h-full flex-col overflow-hidden border-r border-[#f0d4b8] bg-[#F5E6C0] px-3 py-4 shadow-[4px_0_24px_-12px_rgba(42,26,18,0.35)]',
            className,
          )}
          initial={false}
          animate={{
            width: animate ? (open ? EXPANDED_WIDTH : COLLAPSED_WIDTH) : EXPANDED_WIDTH,
          }}
          transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {children}
        </motion.aside>
      </div>
    </SidebarProvider>
  )
}

export function SidebarBody({ className, ...props }) {
  return (
    <div className={cn('flex h-full flex-col justify-between gap-6', className)} {...props} />
  )
}

export function SidebarLink({ link, className, ...props }) {
  const { open, setOpen } = useSidebar()
  const isButton = typeof link.onClick === 'function'

  const content = (
    <>
      {link.icon}
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap text-sm text-stone-700 transition-[opacity,max-width,margin] duration-150 group-hover/sidebar:translate-x-0.5',
          open ? 'ml-0 max-w-[12rem] opacity-100' : 'ml-0 max-w-0 opacity-0',
        )}
      >
        {link.label}
      </span>
    </>
  )

  const sharedClassName = cn(
    'group/sidebar flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#FFE8D6]',
    link.active && 'bg-[#FFE8D6] ring-1 ring-[#FC6C26]/35',
    className,
  )

  if (isButton) {
    return (
      <button
        type="button"
        onClick={() => {
          link.onClick()
          setOpen(false)
        }}
        className={sharedClassName}
        {...props}
      >
        {content}
      </button>
    )
  }

  return (
    <a href={link.href || '#'} className={sharedClassName} {...props}>
      {content}
    </a>
  )
}
