type ChunkFallbackProps = {
  label?: string
  className?: string
}

function ChunkFallback({ label = 'Ładowanie...', className = '' }: ChunkFallbackProps) {
  return (
    <div
      className={`flex items-center justify-center text-sm font-medium text-stone-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  )
}

export default ChunkFallback
