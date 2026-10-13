import { useCallback, useEffect, useMemo, useState } from 'react'
import { mapSavedRouteRow, supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'
import { fetchAllPages } from '../lib/paginatedExport'
import { DISPLAY_NAME_MAX, HOME_AREA_MAX, clampText } from '../lib/dataLimits'
import { IconActivity, IconDownload, IconLogout, IconRepeat, IconRoute, IconStarFilled } from '@tabler/icons-react'
import LocalRideDrafts from './LocalRideDrafts'
import Sheet from './ui/Sheet'
import { Button, Card, Field, Notice, SectionTitle, Segmented, Spinner } from './ui/controls'
import {
  CLIMB_PREFERENCES,
  DEFAULT_CLIMB_PREFERENCE,
  DEFAULT_FITNESS_LEVEL,
  DEFAULT_RIDE_STYLE,
  DEFAULT_SURFACE_PREFERENCE,
  FITNESS_LEVELS,
  RIDE_STYLES,
  SURFACE_PREFERENCES,
} from '../lib/routePreferences'

const ROUTE_SELECT =
  'id, name, mode, distance_km, duration_seconds, share_enabled, share_token, is_favorite, tags, created_at'
const ROUTE_SELECT_LEGACY = 'id, name, mode, distance_km, duration_seconds, is_public, created_at'

const PROFILE_SELECT = [
  'display_name',
  'prefer_avoid_main_roads',
  'default_loop_distance_km',
  'ride_style',
  'fitness_level',
  'preferred_distance_km',
  'max_distance_km',
  'preferred_duration_min',
  'surface_preference',
  'climb_preference',
  'prefer_asphalt',
  'avoid_unpaved',
  'avoid_dark_routes',
  'home_area',
].join(', ')

function isMissingSchemaError(message) {
  const text = String(message || '').toLowerCase()
  return text.includes('schema cache') || text.includes('column') || text.includes('relation')
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest} min` : `${minutes} min`
}

function defaultProfile(user) {
  return {
    display_name: user?.email?.split('@')[0] || '',
    prefer_avoid_main_roads: false,
    default_loop_distance_km: 30,
    ride_style: DEFAULT_RIDE_STYLE,
    fitness_level: DEFAULT_FITNESS_LEVEL,
    preferred_distance_km: 30,
    max_distance_km: 80,
    preferred_duration_min: 120,
    surface_preference: DEFAULT_SURFACE_PREFERENCE,
    climb_preference: DEFAULT_CLIMB_PREFERENCE,
    prefer_asphalt: false,
    avoid_unpaved: false,
    avoid_dark_routes: false,
    home_area: '',
  }
}

function BigStat({ label, value, hint, small = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-vanilla-deep">{label}</dt>
      <dd className={small ? 'text-xl font-bold' : 'font-serif text-[28px] font-semibold leading-none'}>{value}</dd>
      {hint && <dd className="text-xs text-vanilla-deep">{hint}</dd>}
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <p className="rounded-[22px] border border-dashed border-sand px-4 py-5 text-center text-sm text-ink-muted">
      {children}
    </p>
  )
}

function ListRow({ icon, title, meta, tags = [], favorite = false, tone = 'vanilla' }) {
  return (
    <li className="flex items-center gap-3 rounded-[20px] border border-[#EFE0BC] bg-white p-3">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${
          tone === 'sage' ? 'bg-sage-soft' : 'bg-vanilla'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <strong className="truncate text-[15px] text-ink">{title}</strong>
          {favorite && <IconStarFilled size={14} className="shrink-0 text-burnt-orange" aria-label="Ulubiona" />}
        </span>
        <span className="block truncate text-[13px] text-[#6B4E3D]">{meta.filter(Boolean).join(' · ')}</span>
        {tags.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-bold text-[#1F5A43]">
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    </li>
  )
}

function ChoiceGroup({ label, items, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-bold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={`press h-10 rounded-full px-4 text-sm font-semibold ${
              value === item.id ? 'bg-ink text-white' : 'border-[1.5px] border-sand bg-transparent text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 text-[15px] text-ink">
      <span>{label}</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-sand transition-colors duration-200 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 after:ease-[var(--ease-out)] peer-checked:bg-sage peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-burnt-orange/30"
      />
    </label>
  )
}

function findLabel(items, id, fallback) {
  return items.find((item) => item.id === id)?.label || fallback
}

function ProfileModal({ isOpen, onClose, onApplied, onOpenPrivacy, onOpenTerms, onOpenRideDraft }) {
  const { user, isAuthenticated, logout } = useAuth()
  const [profile, setProfile] = useState(() => defaultProfile(user))
  const [routes, setRoutes] = useState([])
  const [rides, setRides] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [accountStats, setAccountStats] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadAccount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    setIsLoading(true)
    setError('')
    setInfo('')
    setConfirmDelete(false)

    try {
      const [profileResult, routeResult, ridesResult, statsResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_SELECT).eq('id', user.id).maybeSingle(),
        supabase
          .from('saved_routes')
          .select(ROUTE_SELECT)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('rides')
          .select('id, route_name, mode, distance_meters, duration_seconds, avg_speed_kmh, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(8),
        supabase.rpc('get_own_account_stats'),
      ])

      if (profileResult.error) {
        throw new Error(profileResult.error.message)
      }

      if (profileResult.data) {
        setProfile({ ...defaultProfile(user), ...profileResult.data })
      } else {
        setProfile(defaultProfile(user))
      }

      if (routeResult.error) {
        if (isMissingSchemaError(routeResult.error.message)) {
          const legacyRoutes = await supabase
            .from('saved_routes')
            .select(ROUTE_SELECT_LEGACY)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8)
          if (legacyRoutes.error) throw new Error(legacyRoutes.error.message)
          setRoutes((legacyRoutes.data || []).map(mapSavedRouteRow))
        } else {
          throw new Error(routeResult.error.message)
        }
      } else {
        setRoutes((routeResult.data || []).map(mapSavedRouteRow))
      }

      if (ridesResult.error) {
        setRides([])
      } else {
        setRides(ridesResult.data || [])
      }
      setAccountStats(statsResult.error ? null : statsResult.data)
    } catch (loadError) {
      setError(
        isMissingSchemaError(loadError.message)
          ? 'Schemat profilu jest nieaktualny — uruchom ponownie supabase/schema.sql.'
          : loadError.message || 'Nie udało się wczytać danych konta.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isOpen) return
    Promise.resolve().then(() => {
      void loadAccount()
    })
  }, [isOpen, loadAccount])

  const stats = useMemo(() => {
    const rideDistance = rides.reduce((sum, ride) => sum + (Number(ride.distance_meters) || 0), 0)
    const rideSeconds = rides.reduce((sum, ride) => sum + (Number(ride.duration_seconds) || 0), 0)
    const favoriteRoutes = routes.filter((route) => route.isFavorite).length
    return accountStats
      ? {
          routes: Number(accountStats.routes || 0),
          favoriteRoutes: Number(accountStats.favoriteRoutes || 0),
          rides: Number(accountStats.rides || 0),
          rideDistance: `${(Number(accountStats.rideDistanceMeters || 0) / 1000).toFixed(1)} km`,
          rideTime: formatDuration(Number(accountStats.rideDurationSeconds || 0)),
        }
      : {
          routes: `${routes.length}${routes.length === 8 ? '+' : ''}`,
          favoriteRoutes: `${favoriteRoutes}${routes.length === 8 ? '+' : ''}`,
          rides: `${rides.length}${rides.length === 8 ? '+' : ''}`,
          rideDistance: `${(rideDistance / 1000).toFixed(1)} km${rides.length === 8 ? '+' : ''}`,
          rideTime: `${formatDuration(rideSeconds)}${rides.length === 8 ? '+' : ''}`,
        }
  }, [accountStats, rides, routes])

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!user?.id) return

    setIsSaving(true)
    setError('')
    setInfo('')

    const payload = {
      id: user.id,
      display_name: clampText(profile.display_name, DISPLAY_NAME_MAX) || null,
      prefer_avoid_main_roads: Boolean(profile.prefer_avoid_main_roads),
      default_loop_distance_km: clampNumber(profile.default_loop_distance_km, 5, 200, 30),
      ride_style: profile.ride_style || DEFAULT_RIDE_STYLE,
      fitness_level: profile.fitness_level || DEFAULT_FITNESS_LEVEL,
      preferred_distance_km: clampNumber(profile.preferred_distance_km, 5, 250, 30),
      max_distance_km: clampNumber(profile.max_distance_km, 5, 300, 80),
      preferred_duration_min: clampNumber(profile.preferred_duration_min, 15, 1440, 120),
      surface_preference: profile.surface_preference || DEFAULT_SURFACE_PREFERENCE,
      climb_preference: profile.climb_preference || DEFAULT_CLIMB_PREFERENCE,
      prefer_asphalt: Boolean(profile.prefer_asphalt),
      avoid_unpaved: Boolean(profile.avoid_unpaved),
      avoid_dark_routes: Boolean(profile.avoid_dark_routes),
      home_area: clampText(profile.home_area, HOME_AREA_MAX) || null,
    }

    try {
      const { error: upsertError } = await supabase.from('profiles').upsert(payload)
      if (upsertError) throw new Error(upsertError.message)

      setProfile({ ...defaultProfile(user), ...payload })
      setInfo('Zapisano profil i preferencje planowania.')
      onApplied?.(payload)
    } catch (saveError) {
      setError(
        isMissingSchemaError(saveError.message)
          ? 'Schemat profilu jest nieaktualny — uruchom ponownie supabase/schema.sql.'
          : saveError.message || 'Nie udało się zapisać profilu.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user?.id || isExporting) return
    setIsExporting(true)
    setError('')
    setInfo('Przygotowujemy kompletny eksport danych…')
    try {
      const fetchResource = (table, orderColumn) =>
        fetchAllPages(async (from, to) => {
          const { data, error: fetchError } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id)
            .order(orderColumn, { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)
          if (fetchError) throw new Error(fetchError.message)
          return data || []
        })
      const [profileResult, allRoutes, allRides] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        fetchResource('saved_routes', 'created_at'),
        fetchResource('rides', 'created_at'),
      ])
      if (profileResult.error) throw new Error(profileResult.error.message)

      const payload = {
        format: 'cycle-your-way-account-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at || null,
          lastSignInAt: user.last_sign_in_at || null,
        },
        profile: profileResult.data,
        routes: allRoutes,
        rides: allRides,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cycle-your-way-data-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setInfo(`Wyeksportowano ${allRoutes.length} tras i ${allRides.length} jazd.`)
    } catch (exportError) {
      setInfo('')
      setError(exportError.message || 'Nie udało się wyeksportować danych konta.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    onClose()
  }

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setInfo('')
      setError('Potwierdź usunięcie konta — usuniemy profil, trasy i historię jazd.')
      return
    }

    setIsDeleting(true)
    setError('')
    setInfo('')

    try {
      const { error: rpcError } = await supabase.rpc('delete_own_account')
      if (rpcError) {
        throw new Error(
          rpcError.message.includes('function') || rpcError.message.includes('schema cache')
            ? 'Brak funkcji delete_own_account — uruchom zaktualizowany supabase/schema.sql.'
            : rpcError.message
        )
      }
      await logout()
      onClose()
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć konta.')
    } finally {
      setIsDeleting(false)
    }
  }

  const tabs = [
    { value: 'dashboard', label: 'Przegląd' },
    { value: 'profile', label: 'Profil' },
    { value: 'privacy', label: 'Prywatność' },
  ]
  const displayName = profile.display_name || user?.email?.split('@')[0] || 'Rowerzysta'
  const initials = displayName.slice(0, 2).toUpperCase()

  const footer =
    activeTab === 'profile' ? (
      <Button type="submit" form="profile-form" className="w-full" disabled={isSaving || isDeleting || isLoading}>
        {isSaving && <Spinner />}
        {isSaving ? 'Zapisywanie…' : 'Zapisz profil'}
      </Button>
    ) : null

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      eyebrow="Moje konto"
      title={displayName}
      description={user?.email}
      size="lg"
      footer={footer}
    >
      <div className="space-y-5">
        <Segmented label="Sekcje konta" value={activeTab} onChange={setActiveTab} options={tabs} />

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}

        {isLoading ? (
          <div className="space-y-3" aria-label="Ładowanie danych konta">
            <div className="h-40 animate-pulse rounded-[24px] bg-vanilla-deep" />
            <div className="h-24 animate-pulse rounded-[22px] bg-vanilla-deep" />
            <div className="h-16 animate-pulse rounded-[22px] bg-vanilla-deep" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                <section
                  aria-label="Twoje statystyki"
                  className="relative overflow-hidden rounded-[24px] bg-ink p-5 text-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-burnt-orange font-bold text-ink">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-xl font-medium">{displayName}</p>
                      <p className="text-sm text-vanilla-deep">
                        {findLabel(RIDE_STYLES, profile.ride_style, 'Gravel')}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                    <BigStat label="Przejechane" value={stats.rideDistance} />
                    <BigStat label="W siodle" value={stats.rideTime} />
                    <BigStat label="Jazdy" value={stats.rides} small />
                    <BigStat
                      label="Zapisane trasy"
                      value={stats.routes}
                      small
                      hint={`${stats.favoriteRoutes} ulubionych`}
                    />
                  </dl>
                </section>

                <section>
                  <SectionTitle
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="text-sm font-semibold text-rust hover:underline"
                      >
                        Edytuj
                      </button>
                    }
                  >
                    Twoje preferencje
                  </SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {[
                      findLabel(RIDE_STYLES, profile.ride_style, 'Gravel'),
                      findLabel(SURFACE_PREFERENCES, profile.surface_preference, 'Mieszana'),
                      `Podjazdy: ${findLabel(CLIMB_PREFERENCES, profile.climb_preference, 'Normalne').toLowerCase()}`,
                      `Pętla ${profile.default_loop_distance_km} km`,
                      `Zwykle ${profile.preferred_distance_km} km`,
                      `${profile.preferred_duration_min} min jazdy`,
                    ].map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[#EFE0BC] bg-white px-3 py-1.5 text-sm font-semibold text-ink"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <SectionTitle>Ostatnie jazdy</SectionTitle>
                  {rides.length === 0 ? (
                    <EmptyState>Po zakończeniu nawigacji jazdy pojawią się tutaj.</EmptyState>
                  ) : (
                    <ul className="space-y-2">
                      {rides.map((ride) => (
                        <ListRow
                          key={ride.id}
                          icon={<IconActivity size={20} stroke={2} className="text-burnt-orange-dark" />}
                          title={ride.route_name || 'Jazda'}
                          meta={[
                            formatDate(ride.completed_at),
                            `${(Number(ride.distance_meters || 0) / 1000).toFixed(1).replace('.', ',')} km`,
                            formatDuration(Number(ride.duration_seconds || 0)),
                            Number.isFinite(Number(ride.avg_speed_kmh)) && Number(ride.avg_speed_kmh) > 0
                              ? `${Number(ride.avg_speed_kmh).toFixed(1).replace('.', ',')} km/h`
                              : null,
                          ]}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionTitle>Ostatnie trasy</SectionTitle>
                  {routes.length === 0 ? (
                    <EmptyState>Zapisane trasy pojawią się tutaj.</EmptyState>
                  ) : (
                    <ul className="space-y-2">
                      {routes.slice(0, 6).map((route) => (
                        <ListRow
                          key={route.id}
                          tone={route.mode === 'Loop' ? 'vanilla' : 'sage'}
                          icon={
                            route.mode === 'Loop' ? (
                              <IconRepeat size={20} stroke={2} className="text-burnt-orange-dark" />
                            ) : (
                              <IconRoute size={20} stroke={2} className="text-sage" />
                            )
                          }
                          title={route.name}
                          meta={[
                            route.mode === 'Loop' ? 'Pętla' : 'A → B',
                            route.distanceKm != null ? `${route.distanceKm.toFixed(1).replace('.', ',')} km` : null,
                          ]}
                          tags={route.tags}
                          favorite={route.isFavorite}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                <Button tone="outline" className="w-full" onClick={handleLogout}>
                  <IconLogout size={18} stroke={2.2} />
                  Wyloguj się
                </Button>
              </div>
            )}

            {activeTab === 'profile' && (
              <form id="profile-form" className="space-y-6" onSubmit={handleSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="profile-name"
                    label="Wyświetlana nazwa"
                    value={profile.display_name || ''}
                    maxLength={DISPLAY_NAME_MAX}
                    onChange={(event) => updateProfile('display_name', event.target.value)}
                  />
                  <Field
                    id="profile-area"
                    label="Okolica startowa"
                    value={profile.home_area || ''}
                    maxLength={HOME_AREA_MAX}
                    onChange={(event) => updateProfile('home_area', event.target.value)}
                    placeholder="np. Kraków, Grzegórzki"
                  />
                </div>

                <ChoiceGroup
                  label="Styl jazdy"
                  items={RIDE_STYLES}
                  value={profile.ride_style || DEFAULT_RIDE_STYLE}
                  onChange={(value) => updateProfile('ride_style', value)}
                />
                <ChoiceGroup
                  label="Kondycja"
                  items={FITNESS_LEVELS}
                  value={profile.fitness_level || DEFAULT_FITNESS_LEVEL}
                  onChange={(value) => updateProfile('fitness_level', value)}
                />
                <ChoiceGroup
                  label="Nawierzchnia"
                  items={SURFACE_PREFERENCES}
                  value={profile.surface_preference || DEFAULT_SURFACE_PREFERENCE}
                  onChange={(value) => updateProfile('surface_preference', value)}
                />
                <ChoiceGroup
                  label="Podjazdy"
                  items={CLIMB_PREFERENCES}
                  value={profile.climb_preference || DEFAULT_CLIMB_PREFERENCE}
                  onChange={(value) => updateProfile('climb_preference', value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    id="profile-loop"
                    label="Domyślna pętla (km)"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={200}
                    value={profile.default_loop_distance_km}
                    onChange={(event) => updateProfile('default_loop_distance_km', event.target.value)}
                  />
                  <Field
                    id="profile-typical"
                    label="Typowy dystans (km)"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={250}
                    value={profile.preferred_distance_km}
                    onChange={(event) => updateProfile('preferred_distance_km', event.target.value)}
                  />
                  <Field
                    id="profile-max"
                    label="Maks. dystans (km)"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={300}
                    value={profile.max_distance_km}
                    onChange={(event) => updateProfile('max_distance_km', event.target.value)}
                  />
                  <Field
                    id="profile-duration"
                    label="Czas jazdy (min)"
                    type="number"
                    inputMode="numeric"
                    min={15}
                    max={1440}
                    value={profile.preferred_duration_min}
                    onChange={(event) => updateProfile('preferred_duration_min', event.target.value)}
                  />
                </div>

                <div>
                  <SectionTitle>Przy planowaniu</SectionTitle>
                  <div className="divide-y divide-[#F1E6CC] overflow-hidden rounded-[22px] border border-[#EFE0BC] bg-white">
                    {[
                      ['prefer_avoid_main_roads', 'Unikaj dróg głównych'],
                      ['prefer_asphalt', 'Preferuj asfalt i drogi utwardzone'],
                      ['avoid_unpaved', 'Unikaj nieutwardzonych odcinków'],
                      ['avoid_dark_routes', 'Unikaj słabo oświetlonych tras'],
                    ].map(([key, label]) => (
                      <Toggle
                        key={key}
                        label={label}
                        checked={Boolean(profile[key])}
                        onChange={(checked) => updateProfile(key, checked)}
                      />
                    ))}
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <Card>
                  <h3 className="font-semibold text-ink">Dokumenty</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Polityka prywatności i regulamin — też pod stałymi adresami na cycleyourway.pl.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button tone="outline" size="sm" onClick={() => onOpenPrivacy?.()}>
                      Polityka prywatności
                    </Button>
                    <Button tone="outline" size="sm" onClick={() => onOpenTerms?.()}>
                      Regulamin
                    </Button>
                  </div>
                </Card>

                <LocalRideDrafts userId={user?.id || null} onOpenDraft={onOpenRideDraft} />

                <Card>
                  <h3 className="font-semibold text-ink">Eksport danych</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Pobierz plik JSON z profilem, trasami i historią jazd.
                  </p>
                  <Button tone="outline" size="sm" className="mt-3" disabled={isExporting} onClick={handleExportData}>
                    {isExporting ? <Spinner /> : <IconDownload size={16} stroke={2.2} />}
                    {isExporting ? 'Przygotowywanie…' : 'Eksportuj dane'}
                  </Button>
                </Card>

                <div className="rounded-[22px] border border-[#E9A08A] bg-[#FDE7DF] p-4">
                  <h3 className="font-semibold text-[#6E1C12]">Usunięcie konta</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#6E1C12]/85">
                    Usuwa profil, zapisane trasy i historię jazd. Tej operacji nie da się cofnąć.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button tone="danger" size="sm" disabled={isDeleting || isSaving} onClick={handleDeleteAccount}>
                      {isDeleting && <Spinner />}
                      {isDeleting ? 'Usuwanie…' : confirmDelete ? 'Tak, usuń konto na zawsze' : 'Usuń konto'}
                    </Button>
                    {confirmDelete && !isDeleting && (
                      <Button
                        tone="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmDelete(false)
                          setError('')
                        }}
                      >
                        Anuluj
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

export default ProfileModal
