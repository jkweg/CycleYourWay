import { cn } from '../../lib/utils'

export function LampContainer({ children, className }) {
  return (
    <div
      className={cn(
        'relative flex min-h-[460px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#d8cbb7] bg-gradient-to-b from-[#2a4034] via-[#1e3228] to-[#172820] px-6 py-14 md:min-h-[500px] md:px-12 md:py-16',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(111,160,124,0.55),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-8 h-px w-[min(100%,28rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#8bc49a]/70 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-24 w-64 -translate-x-1/2 rounded-full bg-[#6fa07c]/20 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}
