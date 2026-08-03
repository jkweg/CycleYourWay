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
  'id, name, mode, geojson, distance_km, duration_seconds, is_public, is_favorite, tags, created_at, user_id'
const SELECT_FIELDS_LEGACY =
  'id, name, mode, geojson, distance_km, duration_seconds, created_at, user_id'

function isMissingColumnError(message) {
  const text = String(message || '').toLowerCase()
  return (
    text.includes('is_public') ||
    text.includes('column') ||
    text.includes('schema cache')
  )
}

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
  const [tagEditingId, setTagEditingId] = useState(null)
  const [tagValue, setTagValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [sortMode, setSortMode] = useState('newest')
  const [shareInfo, setShareInfo] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)

  const applyRoutes = useCallback((data) => {
    setRoutes((data ?? []).map(mapSavedRouteRow))
  }, [])

  const buildOwnRoutesQuery = useCallback(
    (selectFields = SELECT_FIELDS) => {
      let query = supabase
        .from('saved_routes')
        .select(selectFields)
        .order('created_at', { ascending: false })

      // Tylko własne trasy — polityka SELECT obejmuje też cudze publiczne.
      if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      if (detailMode && activeRouteId) {
        query = query.eq('id', activeRouteId)
      }

      return query
    },
    [user, detailMode, activeRouteId],
  )

  const fetchOwnRoutes = useCallback(async () => {
    const primary = await buildOwnRoutesQuery(SELECT_FIELDS)
    if (!primary.error) return primary

    // Starsze projekty bez kolumny is_public.
    if (isMissingColumnError(primary.error.message)) {
      return buildOwnRoutesQuery(SELECT_FIELDS_LEGACY)
    }
    return primary
  }, [buildOwnRoutesQuery])

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await fetchOwnRoutes()

      if (fetchError) throw new Error(fetchError.message)
      applyRoutes(data)
    } catch (loadError) {
      setError(loadError.message || 'Nie udało się pobrać tras.')
      setRoutes([])
    } finally {
      setIsLoading(false)
    }
  }, [applyRoutes, fetchOwnRoutes])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined

    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await fetchOwnRoutes()

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

    run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, refreshKey, applyRoutes, fetchOwnRoutes])

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
      setMenuOpenId((current) => (current === routeId ? null : current))
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

  const handleToggleFavorite = async (route) => {
    const nextFavorite = !route.isFavorite
    try {
      const { data, error: updateError } = await supabase
        .from('saved_routes')
        .update({ is_favorite: nextFavorite })
        .eq('id', route.id)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) throw new Error(updateError.message)
      if (!data?.length) throw new Error('Nie zmieniono ulubionej trasy.')

      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id ? { ...item, isFavorite: nextFavorite } : item,
        ),
      )
    } catch (favoriteError) {
      setError(
        favoriteError.message.includes('is_favorite') || favoriteError.message.includes('column')
          ? 'Brak kolumny is_favorite — uruchom zaktualizowany supabase/schema.sql.'
          : favoriteError.message || 'Nie udało się zmienić ulubionej trasy.',
      )
    }
  }

  const handleTagsSave = async (routeId) => {
    const tags = tagValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)

    try {
      const { data, error: updateError } = await supabase
        .from('saved_routes')
        .update({ tags })
        .eq('id', routeId)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) throw new Error(updateError.message)
      if (!data?.length) throw new Error('Nie zapisano tagów trasy.')

      setRoutes((current) =>
        current.map((route) => (route.id === routeId ? { ...route, tags } : route)),
      )
      setTagEditingId(null)
      setTagValue('')
    } catch (tagError) {
      setError(
        tagError.message.includes('tags') || tagError.message.includes('column')
          ? 'Brak kolumny tags — uruchom zaktualizowany supabase/schema.sql.'
          : tagError.message || 'Nie udało się zapisać tagów.',
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-[#4a3226]/15 bg-white p-4 text-sm text-stone-700">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4a3226]/55">
          Zapisane trasy
        </p>
        <p className="mt-2 text-[#4a3226]">Zaloguj się, aby zapisywać i wczytywać swoje trasy.</p>
      </div>
    )
  }

  const visibleRoutes = (detailMode
    ? routes.filter((route) => route.id === activeRouteId)
    : routes
  )
    .filter((route) => {
      if (filterMode === 'favorite' && !route.isFavorite) return false
      if (filterMode === 'public' && !route.isPublic) return false
      if (filterMode === 'loop' && route.mode !== 'Loop') return false
      if (filterMode === 'atob' && route.mode !== 'AtoB') return false
      const query = searchTerm.trim().toLowerCase()
      if (!query) return true
      return (
        route.name.toLowerCase().includes(query) ||
        route.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => {
      if (sortMode === 'distance') return (b.distanceKm || 0) - (a.distanceKm || 0)
      if (sortMode === 'favorite') return Number(b.isFavorite) - Number(a.isFavorite)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })

  return (
    <div className="rounded-2xl border border-[#4a3226]/12 bg-white p-3.5 text-sm text-[#4a3226] shadow-[0_10px_28px_-24px_rgba(74,50,38,0.35)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4a3226]/55">
          {detailMode ? 'Wczytana trasa' : 'Zapisane trasy'}
        </p>
        <div className="flex items-center gap-2">
          {detailMode && onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="text-xs font-semibold text-[#4a3226]/70 transition hover:text-[#FC6C26]"
            >
              ← Lista
            </button>
          )}
          {!detailMode && (
            <button
              type="button"
              onClick={loadRoutes}
              className="text-xs font-semibold text-[#4a3226]/70 transition hover:text-[#FC6C26]"
            >
              Odśwież
            </button>
          )}
        </div>
      </div>

      {!detailMode && routes.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-[#4a3226]/10 bg-[#FFF8E8]/80 p-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Szukaj po nazwie lub tagu"
            className="w-full rounded-lg border border-[#4a3226]/15 bg-white px-3 py-2 text-sm text-[#4a3226] outline-none focus:border-[#FC6C26] focus:ring-2 focus:ring-[#FC6C26]/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value)}
              className="rounded-lg border border-[#4a3226]/15 bg-white px-2 py-2 text-xs font-semibold text-[#4a3226]"
            >
              <option value="all">Wszystkie</option>
              <option value="favorite">Ulubione</option>
              <option value="public">Publiczne</option>
              <option value="loop">Pętle</option>
              <option value="atob">A → B</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="rounded-lg border border-[#4a3226]/15 bg-white px-2 py-2 text-xs font-semibold text-[#4a3226]"
            >
              <option value="newest">Najnowsze</option>
              <option value="favorite">Ulubione najpierw</option>
              <option value="distance">Najdłuższe</option>
            </select>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-3 text-stone-600">Ładowanie...</p>}
      {error && <p className="mt-3 font-medium text-rose-800">{error}</p>}
      {shareInfo && <p className="mt-3 font-medium text-[#4a3226]">{shareInfo}</p>}

      {!isLoading && visibleRoutes.length === 0 && !error && (
        <p className="mt-3 text-stone-600">
          {detailMode
            ? 'Nie znaleziono tej trasy.'
            : 'Brak zapisanych tras. Wyznacz trasę i kliknij „Zapisz trasę”.'}
        </p>
      )}

      <ul className="mt-3 space-y-2.5">
        {visibleRoutes.map((route) => {
          const feature = route.geojson?.features?.[0]
          const needsNavRefresh = feature && !routeHasTurnByTurnInstructions(feature)
          const isActive = activeRouteId === route.id || detailMode

          return (
            <li
              key={route.id}
              className={`rounded-2xl border p-3.5 ${
                isActive
                  ? 'border-[#FC6C26]/35 bg-[#FFF8E8] shadow-[inset_3px_0_0_#FC6C26]'
                  : 'border-[#4a3226]/12 bg-[#FFFCFA]'
              }`}
            >
              {renamingId === route.id ? (
                <div className="flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[#4a3226]/15 bg-white px-2 py-1.5 text-sm text-[#4a3226]"
                    aria-label="Nowa nazwa trasy"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameSave(route.id)}
                    className="rounded-lg bg-[#FC6C26] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(null)
                      setRenameValue('')
                    }}
                    className="rounded-lg border border-[#4a3226]/15 px-2.5 py-1 text-xs font-semibold text-[#4a3226]"
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-lg font-semibold leading-snug text-[#4a3226]">
                    {route.isFavorite ? '★ ' : ''}
                    {route.name}
                  </p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {route.isFavorite && (
                      <span className="rounded-md bg-[#4a3226]/08 px-1.5 py-0.5 text-[10px] font-semibold text-[#4a3226]">
                        Ulubiona
                      </span>
                    )}
                    {route.isPublic && (
                      <span className="rounded-md bg-[#4a3226]/08 px-1.5 py-0.5 text-[10px] font-semibold text-[#4a3226]/80">
                        Publiczna
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-1 text-xs font-medium text-stone-500">
                {route.mode === 'Loop' ? 'Pętla' : 'A → B'}
                {route.distanceKm != null && ` · ${route.distanceKm.toFixed(1)} km`}
                {route.createdAt && ` · ${formatDate(route.createdAt)}`}
              </p>
              {needsNavRefresh && (
                <p className="mt-2 text-[11px] leading-5 text-amber-800/90">
                  Stara trasa — przy starcie odświeżymy nawigację.
                </p>
              )}
              {tagEditingId === route.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={tagValue}
                    onChange={(event) => setTagValue(event.target.value)}
                    placeholder="tagi po przecinku"
                    className="min-w-0 flex-1 rounded-lg border border-[#4a3226]/15 bg-white px-2 py-1.5 text-xs text-[#4a3226]"
                  />
                  <button
                    type="button"
                    onClick={() => handleTagsSave(route.id)}
                    className="rounded-lg bg-[#FC6C26] px-2 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                </div>
              ) : route.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {route.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#4a3226]/08 px-2 py-0.5 text-[11px] font-medium text-[#4a3226]/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                {onRideRoute && (
                  <button
                    type="button"
                    onClick={() => onRideRoute(route)}
                    disabled={isPreparingRide}
                    className="soft-button flex-1 rounded-2xl bg-[#FC6C26] px-3 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-12px_rgba(252,108,38,0.9)] transition hover:bg-[#E05518] disabled:opacity-60"
                  >
                    {isPreparingRide ? 'Przygotowanie…' : 'Jedź'}
                  </button>
                )}
                {!detailMode && (
                  <button
                    type="button"
                    onClick={() => onLoadRoute(route)}
                    className={`soft-button flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                      activeRouteId === route.id
                        ? 'border border-[#FC6C26]/40 bg-[#FFF4D6] text-[#4a3226]'
                        : 'border border-[#4a3226]/15 bg-white text-[#4a3226] hover:border-[#4a3226]/30'
                    }`}
                  >
                    {activeRouteId === route.id ? 'Wczytana ✓' : 'Wczytaj'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuOpenId((current) => (current === route.id ? null : route.id))
                }
                aria-expanded={menuOpenId === route.id}
                className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-stone-500 transition hover:text-[#4a3226]"
              >
                <span
                  className={`inline-block text-[10px] transition-transform ${
                    menuOpenId === route.id ? 'rotate-90' : ''
                  }`}
                  aria-hidden
                >
                  ▸
                </span>
                {menuOpenId === route.id ? 'Schowaj opcje' : 'Edytuj'}
              </button>

              {menuOpenId === route.id && (
                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-[#4a3226]/10 pt-2.5">
                  {onOpenOnPhone && (
                    <button
                      type="button"
                      onClick={() => onOpenOnPhone(route)}
                      className="rounded-xl border border-[#4a3226]/12 bg-white px-2.5 py-2 text-xs font-semibold text-[#4a3226] transition hover:bg-[#FFF8E8]"
                    >
                      Na telefonie
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(route.id)
                      setRenameValue(route.name)
                    }}
                    className="rounded-xl border border-[#4a3226]/12 bg-white px-2.5 py-2 text-xs font-semibold text-[#4a3226] transition hover:bg-[#FFF8E8]"
                  >
                    Zmień nazwę
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(route)}
                    className="rounded-xl border border-[#4a3226]/12 bg-white px-2.5 py-2 text-xs font-semibold text-[#4a3226] transition hover:bg-[#FFF8E8]"
                  >
                    {route.isPublic ? 'Ustaw prywatną' : 'Udostępnij'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(route)}
                    className="rounded-xl border border-[#4a3226]/12 bg-white px-2.5 py-2 text-xs font-semibold text-[#4a3226] transition hover:bg-[#FFF8E8]"
                  >
                    {route.isFavorite ? 'Odznacz ulubioną' : 'Ulubiona'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTagEditingId(route.id)
                      setTagValue(route.tags.join(', '))
                    }}
                    className="rounded-xl border border-[#4a3226]/12 bg-white px-2.5 py-2 text-xs font-semibold text-[#4a3226] transition hover:bg-[#FFF8E8]"
                  >
                    Tagi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(route.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-50"
                  >
                    Usuń
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SavedRoutes
