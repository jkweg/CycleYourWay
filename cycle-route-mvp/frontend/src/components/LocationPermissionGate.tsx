import { useState } from 'react'
import { getCurrentPosition } from '../lib/location'
import { isNativePlatform } from '../lib/platform'

type LocationPermissionGateProps = {
  open: boolean
  onReady?: () => void
  onCancel?: () => void
}

/**
 * One-shot permission primer before starting ride / locating.
 */
function LocationPermissionGate({ open, onReady, onCancel }: LocationPermissionGateProps) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [gateSession, setGateSession] = useState(0)

  if (!open) return null

  const request = async () => {
    setBusy(true)
    setError('')
    try {
      await getCurrentPosition({ timeout: 20000 })
      onReady?.()
      setGateSession((n) => n + 1)
      setBusy(false)
      setError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined
      setError(
        message ||
          'Nie udało się uzyskać lokalizacji. Włącz GPS i pozwól aplikacji na dostęp do lokalizacji.',
      )
      setBusy(false)
    }
  }

  const handleCancel = () => {
    setError('')
    setBusy(false)
    setGateSession((n) => n + 1)
    onCancel?.()
  }

  return (
    <div
      key={gateSession}
      className="fixed inset-0 z-[4000] flex items-end justify-center bg-stone-900/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#C4A574] bg-[#FFF4D6] p-5 shadow-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-burnt-orange">
          Lokalizacja
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-[#4a3226]">
          Potrzebujemy GPS do nawigacji
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Cycle Your Way używa lokalizacji, żeby pokazać Twoją pozycję na trasie,
          zapowiadać manewry i wracać na ścieżkę po zjechaniu. Dane nie są
          sprzedawane — służą wyłącznie do jazdy.
          {isNativePlatform()
            ? ' Na Androidzie lokalizacja działa najlepiej przy włączonym GPS.'
            : ''}
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-[#4a3226]/30 px-4 py-2.5 text-sm font-semibold text-[#4a3226]"
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void request()}
            className="soft-button flex-1 rounded-xl bg-burnt-orange px-4 py-2.5 text-sm font-semibold text-vanilla disabled:opacity-60"
          >
            {busy ? 'Sprawdzam…' : 'Zezwól na lokalizację'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPermissionGate
