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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_72%_at_50%_26%,rgba(252,108,38,0.26),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#4a3226]/38 via-[#4a3226]/18 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-vanilla via-vanilla/80 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[22%] h-px w-[min(100%,38rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-burnt-orange/60 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[24%] h-28 w-80 -translate-x-1/2 rounded-full bg-burnt-orange/24 blur-3xl" />

      <div className="relative z-10 mt-6 flex w-full max-w-5xl flex-col items-center text-center md:mt-8">
        {children}
      </div>
    </div>
  )
}
