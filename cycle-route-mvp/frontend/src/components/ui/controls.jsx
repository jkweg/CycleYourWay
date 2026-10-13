// Shared form pieces in the app's style (vanilla surfaces, ink and orange actions).

const BUTTON_TONES = {
  ink: 'bg-ink text-white hover:bg-ink-muted disabled:bg-sand disabled:text-white',
  orange: 'bg-burnt-orange text-ink hover:bg-burnt-orange-dark disabled:opacity-60',
  outline: 'border-[1.5px] border-ink/20 bg-transparent text-ink hover:border-ink/50 disabled:opacity-50',
  white: 'bg-white text-ink shadow-[0_4px_14px_rgba(42,26,18,0.08)] hover:bg-cream disabled:opacity-50',
  danger: 'bg-[#B4231A] text-white hover:bg-[#931B13] disabled:opacity-60',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 disabled:opacity-50',
}

export function Button({ tone = 'ink', size = 'md', className = '', children, ...props }) {
  const height = size === 'sm' ? 'h-10 px-4 text-sm' : 'h-12 px-5 text-[15px]'
  return (
    <button
      type="button"
      {...props}
      className={`press inline-flex items-center justify-center gap-2 rounded-full font-bold disabled:cursor-not-allowed ${height} ${BUTTON_TONES[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 [animation-duration:0.65s] ${className}`}
    />
  )
}

export function Field({ id, label, hint, error, className = '', ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        className="h-12 w-full rounded-2xl border border-[#EFE0BC] bg-white px-4 text-[16px] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A08A73] focus:border-burnt-orange focus:shadow-[0_0_0_4px_rgba(252,108,38,0.18)]"
      />
      {hint && !error && <p className="mt-1.5 text-xs text-[#6B4E3D]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-semibold text-[#9A2A12]">{error}</p>}
    </div>
  )
}

export function Notice({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'border-[#EFE0BC] bg-white text-ink',
    success: 'border-[#9CC9AE] bg-sage-soft text-[#1F4D3B]',
    error: 'border-[#E9A08A] bg-[#FDE7DF] text-[#6E1C12]',
    warning: 'border-[#F2C38A] bg-[#FFF0D9] text-[#6B3A0E]',
  }
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-relaxed ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  )
}

/** Segmented control: two or three mutually exclusive options. */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-full bg-vanilla-deep p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`press h-10 rounded-full text-sm font-semibold transition-colors duration-200 ${
            value === option.value ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B4E3D]">{children}</h3>
      {action}
    </div>
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-[22px] border border-[#EFE0BC] bg-white p-4 ${className}`}>{children}</div>
}
