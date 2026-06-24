import { useCallback, useEffect, useState } from 'react'
import { mapSavedRouteRow, supabase } from './supabaseClient'
import { useAuth } from './useAuth'

const formatDate = (value) => {
  if (!value) return ''
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SavedRoutes({ onLoadRoute, refreshKey = 0, activeRouteId = null }) {
  const { isAuthenticated } = useAuth()
  const [routes, setRoutes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('saved_routes')
        .select('id, name, mode, geojson, distance_km, duration_seconds, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw new Error(fetchError.message)
      setRoutes((data ?? []).map(mapSavedRouteRow))
    } catch (loadError) {
      setError(loadError.message || 'Nie udało się pobrać tras.')
      setRoutes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let cancelled = false

    const fetchRoutes = async () => {
      setIsLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('saved_routes')
          .select('id, name, mode, geojson, distance_km, duration_seconds, created_at')
          .order('created_at', { ascending: false })

        if (fetchError) throw new Error(fetchError.message)
        if (!cancelled) {
          setRoutes((data ?? []).map(mapSavedRouteRow))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nie udało się pobrać tras.')
          setRoutes([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchRoutes()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, refreshKey])

  const handleDelete = async (routeId) => {
    if (!window.confirm('Usunąć zapisaną trasę?')) return

    try {
      const { error: deleteError } = await supabase
        .from('saved_routes')
        .delete()
        .eq('id', routeId)

      if (deleteError) throw new Error(deleteError.message)
      setRoutes((current) => current.filter((route) => route.id !== routeId))
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć trasy.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="soft-panel rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4 text-sm text-stone-600">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Zapisane trasy
        </p>
        <p className="mt-2">Zaloguj się, aby zapisywać i wczytywać swoje trasy.</p>
      </div>
    )
  }

  return (
    <div className="soft-panel rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Zapisane trasy
        </p>
        <button
          type="button"
          onClick={loadRoutes}
          className="text-xs font-medium text-[#3f7b57] hover:underline"
        >
          Odśwież
        </button>
      </div>

      {isLoading && <p className="mt-3 text-stone-600">Ładowanie...</p>}
      {error && <p className="mt-3 font-medium text-rose-700">{error}</p>}

      {!isLoading && routes.length === 0 && !error && (
        <p className="mt-3 text-stone-600">
          Brak zapisanych tras. Wyznacz trasę i kliknij „Zapisz trasę”.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {routes.map((route) => (
          <li
            key={route.id}
            className={`rounded-lg border p-3 text-stone-800 ${
              activeRouteId === route.id
                ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                : 'border-emerald-100 bg-white'
            }`}
          >
            <p className="font-semibold text-[#2e5f43]">{route.name}</p>
            <p className="mt-1 text-xs text-stone-500">
              {route.mode === 'Loop' ? 'Pętla' : 'A → B'}
              {route.distanceKm != null && ` · ${route.distanceKm.toFixed(1)} km`}
              {route.createdAt && ` · ${formatDate(route.createdAt)}`}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onLoadRoute(route)}
                className={`soft-button flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  activeRouteId === route.id
                    ? 'bg-[#2e5f43] text-white hover:bg-[#264f38]'
                    : 'bg-[#3f7b57] text-white hover:bg-[#356b4b]'
                }`}
              >
                {activeRouteId === route.id ? 'Wczytana' : 'Wczytaj'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(route.id)}
                className="soft-button rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Usuń
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SavedRoutes
