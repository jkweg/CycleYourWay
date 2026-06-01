import { motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { SidebarContext } from './sidebarContext'
import { useSidebar } from './useSidebar'

function SidebarProvider({ children, open: openProp, setOpen: setOpenProp }) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = setOpenProp ?? setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>
  )
}

export function Sidebar({ children, open, setOpen, animate = true, className }) {
  return (
    <SidebarProvider open={open} setOpen={setOpen}>
      <motion.aside
        className={cn(
          'hidden h-full shrink-0 flex-col border-r border-[#e9e1d2] bg-[#fcfaf5] px-3 py-4 md:flex',
          className,
        )}
        animate={{
          width: animate ? (open ? '16rem' : '4.5rem') : '16rem',
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </motion.aside>
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
      <motion.span
        animate={{
          display: open ? 'inline-block' : 'none',
          opacity: open ? 1 : 0,
        }}
        className="whitespace-pre text-sm text-stone-700 transition duration-150 group-hover/sidebar:translate-x-1"
      >
        {link.label}
      </motion.span>
    </>
  )

  const sharedClassName = cn(
    'group/sidebar flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#eef7f0]',
    link.active && 'bg-[#eef7f0] ring-1 ring-[#cfe7d2]',
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
