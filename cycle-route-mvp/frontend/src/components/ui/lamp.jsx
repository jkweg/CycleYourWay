import { cn } from '../../lib/utils'

export function LampContainer({ children, className }) {
  return (
    <div
      className={cn(
        'relative flex min-h-[min(88vh,640px)] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 md:px-12 md:py-20',
        className,
      )}
    >
      {/* Full-bleed atmospheric glow — brand orange, not inset card */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,rgba(252,108,38,0.28),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-vanilla via-vanilla/80 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-px w-[min(100%,36rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-burnt-orange/60 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[20%] h-28 w-72 -translate-x-1/2 rounded-full bg-burnt-orange/25 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}
