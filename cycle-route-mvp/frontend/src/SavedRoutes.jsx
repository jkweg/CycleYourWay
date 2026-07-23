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

const SELECT_FIELDS =
  'id, name, mode, geojson, distance_km, duration_seconds, is_public, created_at'

function SavedRoutes({
  onLoadRoute,
  onRideRoute,
  onOpenOnPhone,
  refreshKey = 0,
  activeRouteId = null,
  isPreparingRide = false,
  detailMode = false,
  onBackToList,
  onRouteRemoved,
}) {
  const { isAuthenticated, user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareInfo, setShareInfo] = useState('')

  const applyRoutes = useCallback((data) => {
    setRoutes((data ?? []).map(mapSavedRouteRow))
  }, [])

  const buildOwnRoutesQuery = useCallback(() => {
    let query = supabase
      .from('saved_routes')
      .select(SELECT_FIELDS)
      .order('created_at', { ascending: false })

    // Tylko własne trasy — polityka SELECT obejmuje też cudze publiczne.
    if (user?.id) {
      query = query.eq('user_id', user.id)
    }

    if (detailMode && activeRouteId) {
      query = query.eq('id', activeRouteId)
    }

    return query
  }, [user, detailMode, activeRouteId])

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await buildOwnRoutesQuery()

      if (fetchError) throw new Error(fetchError.message)
      applyRoutes(data)
    } catch (loadError) {
      setError(loadError.message || 'Nie udało się pobrać tras.')
      setRoutes([])
    } finally {
      setIsLoading(false)
    }
  }, [applyRoutes, buildOwnRoutesQuery])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined

    let cancelled = false

    const fetchRoutes = async () => {
      setIsLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await buildOwnRoutesQuery()

        if (fetchError) throw new Error(fetchError.message)
        if (!cancelled) applyRoutes(data)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nie udało się pobrać tras.')
          setRoutes([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchRoutes()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, refreshKey, applyRoutes, buildOwnRoutesQuery])

  const handleDelete = async (routeId) => {
    if (!window.confirm('Usunąć zapisaną trasę?')) return

    try {
      // .select() wymusza zwrot usuniętych wierszy — bez tego RLS może
      // „udawać” sukces przy 0 usuniętych rekordach.
      const { data, error: deleteError } = await supabase
        .from('saved_routes')
        .delete()
        .eq('id', routeId)
        .eq('user_id', user.id)
        .select('id')

      if (deleteError) {
        throw new Error(
          deleteError.message.includes('policy')
            ? 'Brak uprawnień do usuwania — uruchom zaktualizowany supabase/schema.sql (polityka DELETE).'
            : deleteError.message,
        )
      }

      if (!data?.length) {
        throw new Error(
          'Nie usunięto trasy w bazie (brak uprawnień albo rekord już nie istnieje). Odśwież listę.',
        )
      }

      setRoutes((current) => current.filter((route) => route.id !== routeId))
      onRouteRemoved?.(routeId)
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć trasy.')
    }
  }

  const handleRenameSave = async (routeId) => {
    const nextName = renameValue.trim()
    if (!nextName) {
      setError('Nazwa nie może być pusta.')
      return
    }

    try {
      const { data, error: updateError } = await supabase
        .from('saved_routes')
        .update({ name: nextName })
        .eq('id', routeId)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) throw new Error(updateError.message)
      if (!data?.length) {
        throw new Error(
          'Nie zapisano nowej nazwy — sprawdź uprawnienia UPDATE w supabase/schema.sql.',
        )
      }

      setRoutes((current) =>
        current.map((route) =>
          route.id === routeId ? { ...route, name: nextName } : route,
        ),
      )
      setRenamingId(null)
      setRenameValue('')
    } catch (renameError) {
      setError(
        renameError.message.includes('policy')
          ? 'Brak uprawnień do edycji — uruchom zaktualizowany supabase/schema.sql (polityka UPDATE).'
          : renameError.message || 'Nie udało się zmienić nazwy.',
      )
    }
  }

  const handleTogglePublic = async (route) => {
    setShareInfo('')
    const nextPublic = !route.isPublic
    try {
      const { data, error: updateError } = await supabase
        .from('saved_routes')
        .update({ is_public: nextPublic })
        .eq('id', route.id)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) throw new Error(updateError.message)
      if (!data?.length) {
        throw new Error(
          'Nie zmieniono udostępniania — sprawdź uprawnienia UPDATE w supabase/schema.sql.',
        )
      }

      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id ? { ...item, isPublic: nextPublic } : item,
        ),
      )

      if (nextPublic) {
        const shareUrl = `${window.location.origin}/?share=${route.id}`
        try {
          await navigator.clipboard.writeText(shareUrl)
          setShareInfo('Link udostępniania skopiowany do schowka.')
        } catch {
          setShareInfo(`Udostępniono: ${shareUrl}`)
        }
      } else {
        setShareInfo('Trasa jest znowu prywatna.')
      }
    } catch (shareError) {
      setError(
        shareError.message.includes('is_public') || shareError.message.includes('column')
          ? 'Brak kolumny is_public — uruchom zaktualizowany supabase/schema.sql w SQL Editor.'
          : shareError.message || 'Nie udało się zmienić udostępniania.',
      )
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

  const visibleRoutes = detailMode
    ? routes.filter((route) => route.id === activeRouteId)
    : routes

  return (
    <div className="soft-panel rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {detailMode ? 'Wczytana trasa' : 'Zapisane trasy'}
        </p>
        <div className="flex items-center gap-2">
          {detailMode && onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="text-xs font-medium text-[#3f7b57] hover:underline"
            >
              ← Lista
            </button>
          )}
          {!detailMode && (
            <button
              type="button"
              onClick={loadRoutes}
              className="text-xs font-medium text-[#3f7b57] hover:underline"
            >
              Odśwież
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="mt-3 text-stone-600">Ładowanie...</p>}
      {error && <p className="mt-3 font-medium text-rose-700">{error}</p>}
      {shareInfo && <p className="mt-3 font-medium text-emerald-700">{shareInfo}</p>}

      {!isLoading && visibleRoutes.length === 0 && !error && (
        <p className="mt-3 text-stone-600">
          {detailMode
            ? 'Nie znaleziono tej trasy.'
            : 'Brak zapisanych tras. Wyznacz trasę i kliknij „Zapisz trasę”.'}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {visibleRoutes.map((route) => {
          const feature = route.geojson?.features?.[0]
          const needsNavRefresh = feature && !routeHasTurnByTurnInstructions(feature)

          return (
            <li
              key={route.id}
              className={`rounded-lg border p-3 text-stone-800 ${
                activeRouteId === route.id || detailMode
                  ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                  : 'border-emerald-100 bg-white'
              }`}
            >
              {renamingId === route.id ? (
                <div className="flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[#dfd4c2] px-2 py-1.5 text-sm"
                    aria-label="Nowa nazwa trasy"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameSave(route.id)}
                    className="rounded-lg bg-[#3f7b57] px-2 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(null)
                      setRenameValue('')
                    }}
                    className="rounded-lg border border-[#dfd4c2] px-2 py-1 text-xs"
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#2e5f43]">{route.name}</p>
                  {route.isPublic && (
                    <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                      Publiczna
                    </span>
                  )}
                </div>
              )}

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
                <div className="flex flex-wrap gap-2">
                  {!detailMode && (
                    <button
                      type="button"
                      onClick={() => onLoadRoute(route)}
                      className={`soft-button flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        activeRouteId === route.id
                          ? 'bg-emerald-100 text-[#2e5f43] ring-1 ring-emerald-300'
                          : 'border border-[#dfd4c2] bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {activeRouteId === route.id ? 'Wczytana ✓' : 'Wczytaj'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(route.id)
                      setRenameValue(route.name)
                    }}
                    className="soft-button rounded-lg border border-[#dfd4c2] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Zmień nazwę
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(route)}
                    className="soft-button rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                  >
                    {route.isPublic ? 'Prywatna' : 'Udostępnij'}
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
