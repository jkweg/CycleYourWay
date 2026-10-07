import { useCallback, useEffect, useState } from 'react'
import { getAppOrigin } from './lib/appOrigin'
import { routeHasTurnByTurnInstructions } from './lib/navigation'
import { mapSavedRouteRow, supabase } from './supabaseClient'
import { useAuth } from './useAuth'
import { buildShareUrl } from './lib/shareLinks'
import { ROUTE_NAME_MAX, TAG_MAX, TAGS_MAX, clampText, normalizeTags } from './lib/dataLimits'

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
  'id, name, mode, distance_km, duration_seconds, share_enabled, share_token, is_favorite, tags, created_at, user_id'
const SELECT_FIELDS_LEGACY =
  'id, name, mode, distance_km, duration_seconds, created_at, user_id'
const DETAIL_FIELDS = `${SELECT_FIELDS}, geojson`
const DETAIL_FIELDS_LEGACY = `${SELECT_FIELDS_LEGACY}, geojson`
const PAGE_SIZE = 20

function isMissingColumnError(message) {
  const text = String(message || '').toLowerCase()
  return (
    text.includes('share_enabled') ||
    text.includes('share_token') ||
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
  const [page, setPage] = useState(0)
  const [totalRoutes, setTotalRoutes] = useState(0)
  const [routeActionId, setRouteActionId] = useState(null)

  const applyRoutes = useCallback((data, count) => {
    setRoutes((data ?? []).map(mapSavedRouteRow))
    setTotalRoutes(Number.isFinite(count) ? count : (data ?? []).length)
  }, [])

  const buildOwnRoutesQuery = useCallback(
    (selectFields = SELECT_FIELDS, legacy = false) => {
      let query = supabase
        .from('saved_routes')
        .select(selectFields, { count: 'exact' })

      // Defense in depth: own-route filter in addition to owner-only RLS.
      if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      if (detailMode && activeRouteId) {
        return query.eq('id', activeRouteId).limit(1)
      }

      const queryText = searchTerm.trim().slice(0, 80)
      if (queryText) query = query.ilike('name', `%${queryText}%`)
      if (!legacy) {
        if (filterMode === 'favorite') query = query.eq('is_favorite', true)
        if (filterMode === 'public') query = query.eq('share_enabled', true)
      }
      if (filterMode === 'loop') query = query.eq('mode', 'Loop')
      if (filterMode === 'atob') query = query.eq('mode', 'AtoB')

      if (sortMode === 'distance') {
        query = query.order('distance_km', { ascending: false, nullsFirst: false })
      } else if (sortMode === 'favorite' && !legacy) {
        query = query
          .order('is_favorite', { ascending: false })
          .order('created_at', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      // Unique tie-breaker: equal sort keys (same distance, same created_at)
      // must not make range pages overlap or skip rows.
      query = query.order('id', { ascending: true })

      return query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    },
    [user, detailMode, activeRouteId, searchTerm, filterMode, sortMode, page],
  )

  const fetchOwnRoutes = useCallback(async () => {
    const primary = await buildOwnRoutesQuery(detailMode ? DETAIL_FIELDS : SELECT_FIELDS)
    if (!primary.error) return primary

    // Read-only compatibility before the sharing migration; sharing stays disabled.
    if (isMissingColumnError(primary.error.message)) {
      return buildOwnRoutesQuery(
        detailMode ? DETAIL_FIELDS_LEGACY : SELECT_FIELDS_LEGACY,
        true,
      )
    }
    return primary
  }, [buildOwnRoutesQuery, detailMode])

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error: fetchError, count } = await fetchOwnRoutes()

      if (fetchError) throw new Error(fetchError.message)
      const lastPage = Math.max(0, Math.ceil((count || 0) / PAGE_SIZE) - 1)
      if (!detailMode && page > lastPage && !data?.length) {
        setPage(lastPage)
        return
      }
      applyRoutes(data, count)
    } catch (loadError) {
      setError(loadError.message || 'Nie udało się pobrać tras.')
      setRoutes([])
      setTotalRoutes(0)
    } finally {
      setIsLoading(false)
    }
  }, [applyRoutes, fetchOwnRoutes, detailMode, page])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined

    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError('')
      try {
        const { data, error: fetchError, count } = await fetchOwnRoutes()

        if (fetchError) throw new Error(fetchError.message)
        if (!cancelled) {
          const lastPage = Math.max(0, Math.ceil((count || 0) / PAGE_SIZE) - 1)
          if (!detailMode && page > lastPage && !data?.length) {
            setPage(lastPage)
          } else {
            applyRoutes(data, count)
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Nie udało się pobrać tras.')
          setRoutes([])
          setTotalRoutes(0)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    isAuthenticated,
    user?.id,
    refreshKey,
    applyRoutes,
    fetchOwnRoutes,
    detailMode,
    page,
  ])

  const loadRouteGeometry = async (route) => {
    if (route.geojson?.features?.length) return route

    setRouteActionId(route.id)
    setError('')
    try {
      let result = await supabase
        .from('saved_routes')
        .select(DETAIL_FIELDS)
        .eq('id', route.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (result.error && isMissingColumnError(result.error.message)) {
        result = await supabase
          .from('saved_routes')
          .select(DETAIL_FIELDS_LEGACY)
          .eq('id', route.id)
          .eq('user_id', user.id)
          .maybeSingle()
      }
      if (result.error) throw new Error(result.error.message)
      if (!result.data) throw new Error('Trasa nie istnieje lub nie masz do niej dostępu.')

      const hydrated = mapSavedRouteRow(result.data)
      setRoutes((current) =>
        current.map((item) => (item.id === hydrated.id ? hydrated : item)),
      )
      return hydrated
    } finally {
      setRouteActionId(null)
    }
  }

  const handleRouteAction = async (route, action) => {
    if (!action || routeActionId) return
    try {
      const hydrated = await loadRouteGeometry(route)
      await action(hydrated)
    } catch (actionError) {
      setError(actionError.message || 'Nie udało się wczytać geometrii trasy.')
    }
  }

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
      setTotalRoutes((current) => Math.max(0, current - 1))
      if (routes.length === 1 && page > 0) setPage((current) => current - 1)
      setMenuOpenId((current) => (current === routeId ? null : current))
      onRouteRemoved?.(routeId)
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć trasy.')
    }
  }

  const handleRenameSave = async (routeId) => {
    const nextName = clampText(renameValue, ROUTE_NAME_MAX)
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
      const { data: shareToken, error: updateError } = await supabase.rpc(
        'set_route_sharing',
        { p_route_id: route.id, p_enabled: nextPublic },
      )

      if (updateError) throw new Error(updateError.message)
      if (nextPublic && !shareToken) {
        throw new Error(
          'Nie otrzymano tokenu udostępniania. Spróbuj ponownie.',
        )
      }

      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id
            ? { ...item, isPublic: nextPublic, shareToken: nextPublic ? shareToken : null }
            : item,
        ),
      )

      if (nextPublic) {
        const shareUrl = buildShareUrl(getAppOrigin(), shareToken)
        try {
          await navigator.clipboard.writeText(shareUrl)
          setShareInfo('Link udostępniania skopiowany do schowka.')
        } catch {
          setShareInfo(`Udostępniono: ${shareUrl}`)
        }
      } else {
        setShareInfo('Udostępnianie wyłączone. Poprzedni link przestał działać.')
      }
    } catch (shareError) {
      setError(
        /set_route_sharing|share_enabled|share_token|schema cache|column/i.test(shareError.message)
          ? 'Brak migracji bezpiecznego udostępniania — uruchom 20261001_unlisted_route_sharing.sql.'
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
    const tags = normalizeTags(tagValue)

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
      <div className="rounded-2xl border border-[#C4A574]/50 bg-[#FFF8E8]/70 p-4 text-sm text-stone-700">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Zapisane trasy
        </p>
        <p className="mt-2 text-stone-700">Zaloguj się, aby zapisywać i wczytywać swoje trasy.</p>
      </div>
    )
  }

  const visibleRoutes = detailMode
    ? routes.filter((route) => route.id === activeRouteId)
    : routes
  const totalPages = Math.max(1, Math.ceil(totalRoutes / PAGE_SIZE))

  return (
    <div className="rounded-2xl border border-[#C4A574]/45 bg-[#FFF8E8]/55 p-3.5 text-sm text-stone-700">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          {detailMode ? 'Wczytana trasa' : 'Zapisane trasy'}
        </p>
        <div className="flex items-center gap-2">
          {detailMode && onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="text-xs font-medium text-stone-500 transition hover:text-stone-700"
            >
              ← Lista
            </button>
          )}
          {!detailMode && (
            <button
              type="button"
              onClick={loadRoutes}
              className="text-xs font-medium text-stone-500 transition hover:text-stone-700"
            >
              Odśwież
            </button>
          )}
        </div>
      </div>

      {!detailMode && (routes.length > 0 || searchTerm || filterMode !== 'all') && (
        <div className="mt-3 space-y-2 rounded-xl border border-[#C4A574]/35 bg-[#FFF4D6]/50 p-3">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setPage(0)
            }}
            placeholder="Szukaj po nazwie"
            className="w-full rounded-lg border border-[#C4A574]/45 bg-[#FFFBF1] px-3 py-2 text-sm text-stone-700 outline-none placeholder:text-stone-400 focus:border-[#E08A50] focus:ring-1 focus:ring-[#E08A50]/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterMode}
              onChange={(event) => {
                setFilterMode(event.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#C4A574]/45 bg-[#FFFBF1] px-2 py-2 text-xs font-medium text-stone-600"
            >
              <option value="all">Wszystkie</option>
              <option value="favorite">Ulubione</option>
              <option value="public">Udostępnione linkiem</option>
              <option value="loop">Pętle</option>
              <option value="atob">A → B</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#C4A574]/45 bg-[#FFFBF1] px-2 py-2 text-xs font-medium text-stone-600"
            >
              <option value="newest">Najnowsze</option>
              <option value="favorite">Ulubione najpierw</option>
              <option value="distance">Najdłuższe</option>
            </select>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-3 text-stone-500">Ładowanie...</p>}
      {error && <p className="mt-3 font-medium text-rose-700">{error}</p>}
      {shareInfo && <p className="mt-3 font-medium text-stone-600">{shareInfo}</p>}

      {!isLoading && visibleRoutes.length === 0 && !error && (
        <p className="mt-3 text-stone-500">
          {detailMode
            ? 'Nie znaleziono tej trasy.'
            : 'Brak zapisanych tras. Wyznacz trasę i kliknij „Zapisz trasę”.'}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {visibleRoutes.map((route) => {
          const feature = route.geojson?.features?.[0]
          const needsNavRefresh = feature && !routeHasTurnByTurnInstructions(feature)
          const isActive = activeRouteId === route.id || detailMode

          return (
            <li
              key={route.id}
              className={`rounded-2xl border p-3.5 ${
                isActive
                  ? 'border-[#E08A50]/40 bg-[#FFF4D6]/70'
                  : 'border-[#C4A574]/35 bg-[#FFFBF1]/80'
              }`}
            >
              {renamingId === route.id ? (
                <div className="flex gap-2">
                  <input
                    value={renameValue}
                    maxLength={ROUTE_NAME_MAX}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[#C4A574]/45 bg-[#FFFBF1] px-2 py-1.5 text-sm text-stone-700"
                    aria-label="Nowa nazwa trasy"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameSave(route.id)}
                    className="rounded-lg bg-[#E08A50] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(null)
                      setRenameValue('')
                    }}
                    className="rounded-lg border border-[#C4A574]/45 px-2.5 py-1 text-xs font-medium text-stone-600"
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold leading-snug text-stone-700">
                    {route.isFavorite ? '★ ' : ''}
                    {route.name}
                  </p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {route.isFavorite && (
                      <span className="rounded-md bg-[#E08A50]/15 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                        Ulubiona
                      </span>
                    )}
                    {route.isPublic && (
                      <span className="rounded-md bg-stone-200/60 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                        Link aktywny
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-1 text-xs text-stone-500">
                {route.mode === 'Loop' ? 'Pętla' : 'A → B'}
                {route.distanceKm != null && ` · ${route.distanceKm.toFixed(1)} km`}
                {route.createdAt && ` · ${formatDate(route.createdAt)}`}
              </p>
              {needsNavRefresh && (
                <p className="mt-2 text-[11px] leading-5 text-amber-800/80">
                  Stara trasa — przy starcie odświeżymy nawigację.
                </p>
              )}
              {tagEditingId === route.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={tagValue}
                    maxLength={TAGS_MAX * (TAG_MAX + 2)}
                    onChange={(event) => setTagValue(event.target.value)}
                    placeholder="tagi po przecinku"
                    className="min-w-0 flex-1 rounded-lg border border-[#C4A574]/45 bg-[#FFFBF1] px-2 py-1.5 text-xs text-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleTagsSave(route.id)}
                    className="rounded-lg bg-[#E08A50] px-2 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                </div>
              ) : route.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {route.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#C4A574]/25 px-2 py-0.5 text-[11px] font-medium text-stone-600"
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
                    onClick={() => handleRouteAction(route, onRideRoute)}
                    disabled={isPreparingRide || Boolean(routeActionId)}
                    className="flex-1 rounded-xl bg-[#F07A3A] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#E56A2C] disabled:opacity-60"
                  >
                    {isPreparingRide || routeActionId === route.id ? 'Przygotowanie…' : 'Jedź'}
                  </button>
                )}
                {!detailMode && (
                  <button
                    type="button"
                    onClick={() => handleRouteAction(route, onLoadRoute)}
                    disabled={Boolean(routeActionId)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      activeRouteId === route.id
                        ? 'border border-[#E08A50]/45 bg-[#FFF4D6] text-stone-700'
                        : 'border border-[#C4A574]/50 bg-[#FFFBF1] text-stone-600 hover:border-[#C4A574]'
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
                className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-stone-400 transition hover:text-stone-600"
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
                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-[#C4A574]/30 pt-2.5">
                  {onOpenOnPhone && (
                    <button
                      type="button"
                      onClick={() => handleRouteAction(route, onOpenOnPhone)}
                      disabled={Boolean(routeActionId)}
                      className="rounded-xl border border-[#C4A574]/40 bg-[#FFFBF1] px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-[#FFF4D6]"
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
                    className="rounded-xl border border-[#C4A574]/40 bg-[#FFFBF1] px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-[#FFF4D6]"
                  >
                    Zmień nazwę
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublic(route)}
                    className="rounded-xl border border-[#C4A574]/40 bg-[#FFFBF1] px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-[#FFF4D6]"
                  >
                    {route.isPublic ? 'Unieważnij link' : 'Udostępnij linkiem'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(route)}
                    className="rounded-xl border border-[#C4A574]/40 bg-[#FFFBF1] px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-[#FFF4D6]"
                  >
                    {route.isFavorite ? 'Odznacz ulubioną' : 'Ulubiona'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTagEditingId(route.id)
                      setTagValue(route.tags.join(', '))
                    }}
                    className="rounded-xl border border-[#C4A574]/40 bg-[#FFFBF1] px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-[#FFF4D6]"
                  >
                    Tagi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(route.id)}
                    className="rounded-xl border border-rose-200/80 bg-rose-50/50 px-2.5 py-2 text-xs font-medium text-rose-700/90 transition hover:bg-rose-50"
                  >
                    Usuń
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {!detailMode && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#C4A574]/30 pt-3">
          <button
            type="button"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="rounded-lg border border-[#C4A574]/45 px-3 py-1.5 text-xs font-medium text-stone-600 disabled:opacity-40"
          >
            ← Poprzednia
          </button>
          <span className="text-xs text-stone-500">
            Strona {page + 1} z {totalPages} · {totalRoutes} tras
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages || isLoading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-[#C4A574]/45 px-3 py-1.5 text-xs font-medium text-stone-600 disabled:opacity-40"
          >
            Następna →
          </button>
        </div>
      )}
    </div>
  )
}

export default SavedRoutes
