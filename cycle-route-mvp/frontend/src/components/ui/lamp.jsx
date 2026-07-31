import { cn } from '../../lib/utils'

export function LampContainer({ children, className }) {
  return (
    <div
      className={cn(
        'relative flex min-h-[min(92vh,760px)] w-full flex-col items-center justify-center overflow-hidden bg-vanilla px-5 py-14 md:px-12 md:py-20',
        className,
      )}
    >
      <div className="relative z-10 mt-4 flex w-full max-w-5xl flex-col items-center text-center md:mt-7">
        {children}
      </div>
    </div>
  )
}
