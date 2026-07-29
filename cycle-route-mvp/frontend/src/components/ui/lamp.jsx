import { cn } from '../../lib/utils'

export function LampContainer({ children, className }) {
  return (
    <div
      className={cn(
        'relative flex min-h-[min(92vh,760px)] w-full flex-col items-center justify-center overflow-hidden px-5 py-14 md:px-12 md:py-20',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_84%_66%_at_50%_28%,rgba(252,108,38,0.28),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-20 top-[38%] h-64 w-64 rounded-full bg-[#f5b56d]/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-[14%] h-72 w-72 rounded-full bg-burnt-orange/16 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#4a3226]/38 via-[#4a3226]/18 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-vanilla via-vanilla/80 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[16%] h-px w-[min(100%,44rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-burnt-orange/55 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-28 w-96 -translate-x-1/2 rounded-full bg-burnt-orange/20 blur-3xl" />

      <div className="pointer-events-none absolute left-[8%] top-[30%] hidden h-28 w-28 rounded-full border border-dashed border-burnt-orange/25 md:block" />
      <div className="pointer-events-none absolute left-[calc(8%+3.25rem)] top-[calc(30%+3.25rem)] hidden h-5 w-5 rounded-full border-4 border-vanilla bg-burnt-orange shadow-md md:block" />
      <div className="pointer-events-none absolute right-[9%] top-[55%] hidden h-40 w-40 rounded-full border border-burnt-orange/15 md:block" />
      <div className="pointer-events-none absolute right-[calc(9%+1rem)] top-[calc(55%+1rem)] hidden h-3 w-3 animate-pulse rounded-full bg-[#ff9a5c] md:block" />

      <div className="relative z-10 mt-4 flex w-full max-w-5xl flex-col items-center text-center md:mt-7">
        {children}
      </div>
    </div>
  )
}
