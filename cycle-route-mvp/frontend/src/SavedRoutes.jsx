import { useCallback, useEffect, useState } from 'react'
import { routeHasTurnByTurnInstructions } from './lib/navigation'
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

function SavedRoutes({
  onLoadRoute,
  onRideRoute,
  onOpenOnPhone,
  refreshKey = 0,
  activeRouteId = null,
  isPreparingRide = false,
}) {
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
        {routes.map((route) => {
          const feature = route.geojson?.features?.[0]
          const needsNavRefresh = feature && !routeHasTurnByTurnInstructions(feature)

          return (
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
            {needsNavRefresh && (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-5 text-amber-800">
                Stara trasa — przy „Jedź” odświeżymy instrukcje nawigacji automatycznie.
              </p>
            )}
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                {onRideRoute && (
                  <button
                    type="button"
                    onClick={() => onRideRoute(route)}
                    disabled={isPreparingRide}
                    className="soft-button flex-1 rounded-lg bg-[#2e5f43] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#264f38] disabled:opacity-60"
                  >
                    {isPreparingRide ? 'Przygotowanie…' : 'Jedź'}
                  </button>
                )}
                {onOpenOnPhone && (
                  <button
                    type="button"
                    onClick={() => onOpenOnPhone(route)}
                    className="soft-button flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#2e5f43] hover:bg-emerald-50"
                  >
                    Na telefonie
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onLoadRoute(route)}
                  className={`soft-button flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    activeRouteId === route.id
                      ? 'bg-emerald-100 text-[#2e5f43] ring-1 ring-emerald-300'
                      : 'border border-[#dfd4c2] bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {activeRouteId === route.id ? 'Wczytana ✓' : 'Wczytaj na mapę'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(route.id)}
                  className="soft-button rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Usuń
                </button>
              </div>
            </div>
          </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SavedRoutes
