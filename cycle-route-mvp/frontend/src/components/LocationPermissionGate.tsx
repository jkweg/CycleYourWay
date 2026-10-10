import { useEffect, useRef, useState } from 'react'
import { getCurrentPosition, hasLocationPermission } from '../lib/location'
import { isNativePlatform } from '../lib/platform'

type LocationPermissionGateProps = {
  open: boolean
  onReady?: () => void
  onCancel?: () => void
}

/**
 * Permission primer before starting a ride / locating. Shown only while access
 * is not granted yet; with access granted it hands straight over to `onReady`.
 */
function LocationPermissionGate({ open, onReady, onCancel }: LocationPermissionGateProps) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [gateSession, setGateSession] = useState(0)
  const [needsAsk, setNeedsAsk] = useState(false)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    hasLocationPermission().then((granted) => {
      if (cancelled) return
      if (granted) onReadyRef.current?.()
      else setNeedsAsk(true)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open && needsAsk) setNeedsAsk(false)
  if (!open || !needsAsk) return null

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
      className="fixed inset-0 z-[4000] flex items-end justify-center bg-ink/50 p-3 sm:items-center"
    >
      <div className="w-full max-w-md rounded-[28px] bg-vanilla p-5 shadow-[0_24px_60px_rgba(42,26,18,0.35)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rust">
          Lokalizacja
        </p>
        <h2 className="mt-1 font-serif text-[26px] font-medium leading-tight text-ink">
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
            className="h-12 flex-1 rounded-full border-[1.5px] border-ink px-4 text-sm font-bold text-ink"
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void request()}
            className="h-12 flex-1 rounded-full bg-burnt-orange px-4 text-sm font-bold text-ink disabled:opacity-60"
          >
            {busy ? 'Sprawdzam…' : 'Zezwól na lokalizację'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPermissionGate
