import { useCallback, useEffect, useState } from 'react'
import {
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceMobile,
  IconDots,
  IconLink,
  IconLinkOff,
  IconMap,
  IconPencil,
  IconPlayerPlayFilled,
  IconRefresh,
  IconRepeat,
  IconRoute,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconTag,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
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
const SELECT_FIELDS_LEGACY = 'id, name, mode, distance_km, duration_seconds, created_at, user_id'
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

// Route outline for the 64×64 list thumbnail (downsampled, kept to scale).
function routeThumbnail(feature) {
  const coords = feature?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const step = Math.max(1, Math.floor(coords.length / 60))
  const points = coords.filter((_, index) => index % step === 0 || index === coords.length - 1)
  const lngs = points.map((point) => point[0])
  const lats = points.map((point) => point[1])
  const minX = Math.min(...lngs)
  const maxX = Math.max(...lngs)
  const minY = Math.min(...lats)
  const maxY = Math.max(...lats)
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const pad = 10
  const size = 64 - pad * 2
  const offsetX = pad + (size - ((maxX - minX) / span) * size) / 2
  const offsetY = pad + (size - ((maxY - minY) / span) * size) / 2
  const project = ([lng, lat]) => [offsetX + ((lng - minX) / span) * size, offsetY + ((maxY - lat) / span) * size]
  const projected = points.map(project)
  return {
    d: projected.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    start: projected[0],
  }
}

function MenuButton({ icon: Icon, danger = false, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`press flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold disabled:opacity-50 ${
        danger ? 'text-[#9A2A12] hover:bg-[#FDE7DF]' : 'text-ink hover:bg-ink/5'
      }`}
    >
      <Icon size={16} stroke={2.2} />
      {children}
    </button>
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
      let query = supabase.from('saved_routes').select(selectFields, { count: 'exact' })

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
        query = query.order('is_favorite', { ascending: false }).order('created_at', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      // Unique tie-breaker: equal sort keys (same distance, same created_at)
      // must not make range pages overlap or skip rows.
      query = query.order('id', { ascending: true })

      return query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    },
    [user, detailMode, activeRouteId, searchTerm, filterMode, sortMode, page]
  )

  const fetchOwnRoutes = useCallback(async () => {
    const primary = await buildOwnRoutesQuery(detailMode ? DETAIL_FIELDS : SELECT_FIELDS)
    if (!primary.error) return primary

    // Read-only compatibility before the sharing migration; sharing stays disabled.
    if (isMissingColumnError(primary.error.message)) {
      return buildOwnRoutesQuery(detailMode ? DETAIL_FIELDS_LEGACY : SELECT_FIELDS_LEGACY, true)
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
  }, [isAuthenticated, user?.id, refreshKey, applyRoutes, fetchOwnRoutes, detailMode, page])

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
      setRoutes((current) => current.map((item) => (item.id === hydrated.id ? hydrated : item)))
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
            : deleteError.message
        )
      }

      if (!data?.length) {
        throw new Error('Nie usunięto trasy w bazie (brak uprawnień albo rekord już nie istnieje). Odśwież listę.')
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
        throw new Error('Nie zapisano nowej nazwy — sprawdź uprawnienia UPDATE w supabase/schema.sql.')
      }

      setRoutes((current) => current.map((route) => (route.id === routeId ? { ...route, name: nextName } : route)))
      setRenamingId(null)
      setRenameValue('')
    } catch (renameError) {
      setError(
        renameError.message.includes('policy')
          ? 'Brak uprawnień do edycji — uruchom zaktualizowany supabase/schema.sql (polityka UPDATE).'
          : renameError.message || 'Nie udało się zmienić nazwy.'
      )
    }
  }

  const handleTogglePublic = async (route) => {
    setShareInfo('')
    const nextPublic = !route.isPublic
    try {
      const { data: shareToken, error: updateError } = await supabase.rpc('set_route_sharing', {
        p_route_id: route.id,
        p_enabled: nextPublic,
      })

      if (updateError) throw new Error(updateError.message)
      if (nextPublic && !shareToken) {
        throw new Error('Nie otrzymano tokenu udostępniania. Spróbuj ponownie.')
      }

      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id ? { ...item, isPublic: nextPublic, shareToken: nextPublic ? shareToken : null } : item
        )
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
          : shareError.message || 'Nie udało się zmienić udostępniania.'
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
        current.map((item) => (item.id === route.id ? { ...item, isFavorite: nextFavorite } : item))
      )
    } catch (favoriteError) {
      setError(
        favoriteError.message.includes('is_favorite') || favoriteError.message.includes('column')
          ? 'Brak kolumny is_favorite — uruchom zaktualizowany supabase/schema.sql.'
          : favoriteError.message || 'Nie udało się zmienić ulubionej trasy.'
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

      setRoutes((current) => current.map((route) => (route.id === routeId ? { ...route, tags } : route)))
      setTagEditingId(null)
      setTagValue('')
    } catch (tagError) {
      setError(
        tagError.message.includes('tags') || tagError.message.includes('column')
          ? 'Brak kolumny tags — uruchom zaktualizowany supabase/schema.sql.'
          : tagError.message || 'Nie udało się zapisać tagów.'
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[22px] border border-[#EFE0BC] bg-white p-4 text-[15px] text-ink-muted">
        Zaloguj się, aby zapisywać i wczytywać swoje trasy.
      </div>
    )
  }

  const visibleRoutes = detailMode ? routes.filter((route) => route.id === activeRouteId) : routes
  const totalPages = Math.max(1, Math.ceil(totalRoutes / PAGE_SIZE))
  const filters = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'favorite', label: 'Ulubione' },
    { value: 'loop', label: 'Pętle' },
    { value: 'atob', label: 'A → B' },
    { value: 'public', label: 'Udostępnione' },
  ]

  return (
    <div className="space-y-3 text-ink">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B4E3D]">
          {detailMode ? 'Wczytana trasa' : totalRoutes > 0 ? `Zapisane · ${totalRoutes}` : 'Zapisane trasy'}
        </p>
        {detailMode && onBackToList ? (
          <button
            type="button"
            onClick={onBackToList}
            className="press flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink hover:bg-ink/5"
          >
            <IconArrowLeft size={16} stroke={2.2} /> Lista
          </button>
        ) : (
          <button
            type="button"
            onClick={loadRoutes}
            aria-label="Odśwież listę"
            className="press grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-ink/5"
          >
            <IconRefresh size={17} stroke={2.2} />
          </button>
        )}
      </div>

      {!detailMode && (routes.length > 0 || searchTerm || filterMode !== 'all') && (
        <div className="space-y-2.5">
          <label className="flex h-11 items-center gap-2.5 rounded-full border border-[#EFE0BC] bg-white px-4 focus-within:border-burnt-orange focus-within:shadow-[0_0_0_4px_rgba(252,108,38,0.15)]">
            <IconSearch size={17} stroke={2.2} className="shrink-0 text-ink" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(0)
              }}
              placeholder="Szukaj po nazwie"
              aria-label="Szukaj tras"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#A08A73]"
            />
          </label>
          <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={filterMode === filter.value}
                onClick={() => {
                  setFilterMode(filter.value)
                  setPage(0)
                }}
                className={`press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${
                  filterMode === filter.value ? 'bg-ink text-white' : 'border-[1.5px] border-sand text-ink'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value)
                setPage(0)
              }}
              aria-label="Sortowanie"
              className="ml-auto h-9 shrink-0 rounded-full border-[1.5px] border-sand bg-transparent pl-3 pr-2 text-[13px] font-semibold text-ink"
            >
              <option value="newest">Najnowsze</option>
              <option value="favorite">Ulubione najpierw</option>
              <option value="distance">Najdłuższe</option>
            </select>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="h-[104px] animate-pulse rounded-[22px] bg-vanilla-deep" />
          <div className="h-[104px] animate-pulse rounded-[22px] bg-vanilla-deep" />
        </div>
      )}
      {error && (
        <p className="rounded-2xl border border-[#E9A08A] bg-[#FDE7DF] px-4 py-3 text-sm font-medium text-[#6E1C12]">
          {error}
        </p>
      )}
      {shareInfo && (
        <p className="rounded-2xl border border-[#9CC9AE] bg-sage-soft px-4 py-3 text-sm font-medium text-[#1F4D3B]">
          {shareInfo}
        </p>
      )}

      {!isLoading && visibleRoutes.length === 0 && !error && (
        <p className="rounded-[22px] border border-dashed border-sand px-4 py-6 text-center text-sm text-ink-muted">
          {detailMode ? 'Nie znaleziono tej trasy.' : 'Brak zapisanych tras. Wyznacz trasę i zapisz ją.'}
        </p>
      )}

      <ul className="space-y-2.5">
        {visibleRoutes.map((route) => {
          const feature = route.geojson?.features?.[0]
          const needsNavRefresh = feature && !routeHasTurnByTurnInstructions(feature)
          const isActive = activeRouteId === route.id || detailMode
          const thumb = routeThumbnail(feature)
          const menuOpen = menuOpenId === route.id

          return (
            <li
              key={route.id}
              className={`rounded-[22px] border bg-white p-3 transition-[border-color,box-shadow] duration-200 ${
                isActive ? 'border-burnt-orange/60 shadow-[0_0_0_3px_rgba(252,108,38,0.12)]' : 'border-[#EFE0BC]'
              }`}
            >
              <div className="flex gap-3">
                {thumb ? (
                  <svg
                    role="img"
                    aria-label="Kształt trasy"
                    viewBox="0 0 64 64"
                    className="h-16 w-16 shrink-0 rounded-2xl bg-ink"
                  >
                    <path
                      d={thumb.d}
                      fill="none"
                      stroke="#FC6C26"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={thumb.start[0]} cy={thumb.start[1]} r="3.2" fill="#FFFFFF" />
                  </svg>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${
                      route.mode === 'Loop' ? 'bg-vanilla' : 'bg-sage-soft'
                    }`}
                  >
                    {route.mode === 'Loop' ? (
                      <IconRepeat size={26} stroke={2} className="text-burnt-orange-dark" />
                    ) : (
                      <IconRoute size={26} stroke={2} className="text-sage" />
                    )}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  {renamingId === route.id ? (
                    <div className="flex gap-1.5">
                      <input
                        value={renameValue}
                        maxLength={ROUTE_NAME_MAX}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-[#EFE0BC] bg-vanilla px-3 text-[16px] outline-none focus:border-burnt-orange"
                        aria-label="Nowa nazwa trasy"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameSave(route.id)}
                        className="press h-10 rounded-full bg-ink px-3 text-sm font-bold text-white"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(null)
                          setRenameValue('')
                        }}
                        aria-label="Anuluj zmianę nazwy"
                        className="press grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/5"
                      >
                        <IconX size={16} stroke={2.4} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-[16px] font-bold leading-snug">{route.name}</p>
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(route)}
                        aria-pressed={route.isFavorite}
                        aria-label={route.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                        className="press -mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      >
                        {route.isFavorite ? (
                          <IconStarFilled size={19} className="text-burnt-orange" />
                        ) : (
                          <IconStar size={19} stroke={2} className="text-[#C9B58C]" />
                        )}
                      </button>
                    </div>
                  )}
                  <p className="mt-0.5 text-[13px] text-[#6B4E3D]">
                    {route.mode === 'Loop' ? 'Pętla' : 'A → B'}
                    {route.distanceKm != null && ` · ${route.distanceKm.toFixed(1).replace('.', ',')} km`}
                    {route.createdAt && ` · ${formatDate(route.createdAt)}`}
                  </p>
                  {(route.isPublic || route.tags.length > 0) && tagEditingId !== route.id && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {route.isPublic && (
                        <span className="flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-bold text-[#1F5A43]">
                          <IconLink size={11} stroke={2.6} /> link aktywny
                        </span>
                      )}
                      {route.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-vanilla-deep px-2 py-0.5 text-[11px] font-bold text-ink-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {tagEditingId === route.id && (
                    <div className="mt-2 flex gap-1.5">
                      <input
                        value={tagValue}
                        maxLength={TAGS_MAX * (TAG_MAX + 2)}
                        onChange={(event) => setTagValue(event.target.value)}
                        placeholder="tagi po przecinku"
                        aria-label="Tagi trasy"
                        className="h-10 min-w-0 flex-1 rounded-xl border border-[#EFE0BC] bg-vanilla px-3 text-[16px] outline-none focus:border-burnt-orange"
                      />
                      <button
                        type="button"
                        onClick={() => handleTagsSave(route.id)}
                        className="press h-10 rounded-full bg-ink px-3 text-sm font-bold text-white"
                      >
                        OK
                      </button>
                    </div>
                  )}
                  {needsNavRefresh && (
                    <p className="mt-1.5 text-xs text-[#8A5A12]">Starsza trasa — przy starcie odświeżymy nawigację.</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {onRideRoute && (
                  <button
                    type="button"
                    onClick={() => handleRouteAction(route, onRideRoute)}
                    disabled={isPreparingRide || Boolean(routeActionId)}
                    className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-burnt-orange text-sm font-bold text-ink disabled:opacity-60"
                  >
                    <IconPlayerPlayFilled size={14} />
                    {isPreparingRide || routeActionId === route.id ? 'Przygotowanie…' : 'Jedź'}
                  </button>
                )}
                {!detailMode && (
                  <button
                    type="button"
                    onClick={() => handleRouteAction(route, onLoadRoute)}
                    disabled={Boolean(routeActionId)}
                    className={`press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold ${
                      activeRouteId === route.id
                        ? 'bg-sage-soft text-[#1F5A43]'
                        : 'border-[1.5px] border-ink/15 text-ink'
                    }`}
                  >
                    {activeRouteId === route.id ? (
                      <IconCheck size={16} stroke={2.6} />
                    ) : (
                      <IconMap size={16} stroke={2.2} />
                    )}
                    {activeRouteId === route.id ? 'Na mapie' : 'Pokaż'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMenuOpenId((current) => (current === route.id ? null : route.id))}
                  aria-expanded={menuOpen}
                  aria-label="Więcej opcji"
                  className={`press grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    menuOpen ? 'bg-ink text-white' : 'border-[1.5px] border-ink/15 text-ink'
                  }`}
                >
                  <IconDots size={18} stroke={2.4} />
                </button>
              </div>

              {menuOpen && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-[#F1E6CC] pt-2.5">
                  {onOpenOnPhone && (
                    <MenuButton
                      icon={IconDeviceMobile}
                      onClick={() => handleRouteAction(route, onOpenOnPhone)}
                      disabled={Boolean(routeActionId)}
                    >
                      Na telefonie
                    </MenuButton>
                  )}
                  <MenuButton
                    icon={IconPencil}
                    onClick={() => {
                      setRenamingId(route.id)
                      setRenameValue(route.name)
                    }}
                  >
                    Zmień nazwę
                  </MenuButton>
                  <MenuButton icon={route.isPublic ? IconLinkOff : IconLink} onClick={() => handleTogglePublic(route)}>
                    {route.isPublic ? 'Wyłącz link' : 'Udostępnij'}
                  </MenuButton>
                  <MenuButton
                    icon={IconTag}
                    onClick={() => {
                      setTagEditingId(route.id)
                      setTagValue(route.tags.join(', '))
                    }}
                  >
                    Tagi
                  </MenuButton>
                  <MenuButton icon={IconTrash} danger onClick={() => handleDelete(route.id)}>
                    Usuń
                  </MenuButton>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {!detailMode && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            aria-label="Poprzednia strona"
            className="press grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-ink/15 text-ink disabled:opacity-35"
          >
            <IconChevronLeft size={18} stroke={2.4} />
          </button>
          <span className="text-[13px] font-semibold text-ink-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages || isLoading}
            onClick={() => setPage((current) => current + 1)}
            aria-label="Następna strona"
            className="press grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-ink/15 text-ink disabled:opacity-35"
          >
            <IconChevronRight size={18} stroke={2.4} />
          </button>
        </div>
      )}
    </div>
  )
}

export default SavedRoutes
