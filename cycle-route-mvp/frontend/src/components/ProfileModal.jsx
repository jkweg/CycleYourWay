import { useCallback, useEffect, useMemo, useState } from 'react'
import { mapSavedRouteRow, supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'
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
  'id, name, mode, distance_km, duration_seconds, is_public, is_favorite, tags, created_at'
const ROUTE_SELECT_LEGACY =
  'id, name, mode, distance_km, duration_seconds, is_public, created_at'

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

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#f0d4b8] bg-[#FFF8E8] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#FC6C26]">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}

function ProfileModal({ isOpen, onClose, onApplied }) {
  const { user, isAuthenticated, logout } = useAuth()
  const [profile, setProfile] = useState(() => defaultProfile(user))
  const [routes, setRoutes] = useState([])
  const [rides, setRides] = useState([])
  const [activeTab, setActiveTab] = useState('profile')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadAccount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    setIsLoading(true)
    setError('')
    setInfo('')
    setConfirmDelete(false)

    try {
      const [profileResult, routeResult, ridesResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_SELECT).eq('id', user.id).maybeSingle(),
        supabase
          .from('saved_routes')
          .select(ROUTE_SELECT)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('rides')
          .select(
            'id, route_name, mode, distance_meters, duration_seconds, avg_speed_kmh, completed_at',
          )
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(8),
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
    } catch (loadError) {
      setError(
        isMissingSchemaError(loadError.message)
          ? 'Schemat profilu jest nieaktualny — uruchom ponownie supabase/schema.sql.'
          : loadError.message || 'Nie udało się wczytać danych konta.',
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
    const rideDistance = rides.reduce(
      (sum, ride) => sum + (Number(ride.distance_meters) || 0),
      0,
    )
    const rideSeconds = rides.reduce(
      (sum, ride) => sum + (Number(ride.duration_seconds) || 0),
      0,
    )
    const favoriteRoutes = routes.filter((route) => route.isFavorite).length
    return {
      routes: routes.length,
      favoriteRoutes,
      rides: rides.length,
      rideDistanceKm: rideDistance / 1000,
      rideTime: formatDuration(rideSeconds),
    }
  }, [rides, routes])

  if (!isOpen) return null

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
      display_name: profile.display_name?.trim() || null,
      prefer_avoid_main_roads: Boolean(profile.prefer_avoid_main_roads),
      default_loop_distance_km: clampNumber(profile.default_loop_distance_km, 5, 100, 30),
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
      home_area: profile.home_area?.trim() || null,
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
          : saveError.message || 'Nie udało się zapisać profilu.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: { id: user?.id, email: user?.email },
      profile,
      routes,
      rides,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cycle-your-way-data-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
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
            : rpcError.message,
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
    { id: 'profile', label: 'Profil' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'privacy', label: 'Prywatność' },
  ]

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#f0d4b8] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#f0d4b8] p-5">
          <div>
            <h2 id="profile-modal-title" className="text-2xl font-semibold text-[#FC6C26]">
              Moje konto
            </h2>
            <p className="mt-1 text-sm text-stone-600">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
            aria-label="Zamknij"
          >
            x
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#f0d4b8] bg-[#FFF8E8] px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-[#FC6C26] text-white'
                  : 'bg-white text-stone-700 hover:bg-[#FFF4D6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-stone-600">Ładowanie danych konta...</p>
          ) : (
            <>
              {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
              {info && <p className="mb-4 rounded-xl bg-orange-50 p-3 text-sm font-medium text-orange-800">{info}</p>}

              {activeTab === 'profile' && (
                <form className="space-y-5" onSubmit={handleSave}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-stone-700">
                      Wyświetlana nazwa
                      <input
                        value={profile.display_name || ''}
                        onChange={(event) => updateProfile('display_name', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm outline-none ring-orange-500/30 focus:ring-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Okolica startowa
                      <input
                        value={profile.home_area || ''}
                        onChange={(event) => updateProfile('home_area', event.target.value)}
                        placeholder="np. Krosno, okolice rynku"
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm outline-none ring-orange-500/30 focus:ring-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Typ jazdy
                      <select
                        value={profile.ride_style || DEFAULT_RIDE_STYLE}
                        onChange={(event) => updateProfile('ride_style', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      >
                        {RIDE_STYLES.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Poziom kondycji
                      <select
                        value={profile.fitness_level || DEFAULT_FITNESS_LEVEL}
                        onChange={(event) => updateProfile('fitness_level', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      >
                        {FITNESS_LEVELS.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Preferowana nawierzchnia
                      <select
                        value={profile.surface_preference || DEFAULT_SURFACE_PREFERENCE}
                        onChange={(event) => updateProfile('surface_preference', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      >
                        {SURFACE_PREFERENCES.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Podjazdy
                      <select
                        value={profile.climb_preference || DEFAULT_CLIMB_PREFERENCE}
                        onChange={(event) => updateProfile('climb_preference', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      >
                        {CLIMB_PREFERENCES.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Domyślny dystans pętli
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={profile.default_loop_distance_km}
                        onChange={(event) => updateProfile('default_loop_distance_km', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Typowy dystans
                      <input
                        type="number"
                        min={5}
                        max={250}
                        value={profile.preferred_distance_km}
                        onChange={(event) => updateProfile('preferred_distance_km', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Maksymalny dystans
                      <input
                        type="number"
                        min={5}
                        max={300}
                        value={profile.max_distance_km}
                        onChange={(event) => updateProfile('max_distance_km', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Preferowany czas jazdy (min)
                      <input
                        type="number"
                        min={15}
                        max={1440}
                        value={profile.preferred_duration_min}
                        onChange={(event) => updateProfile('preferred_duration_min', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#e8c9a8] px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ['prefer_avoid_main_roads', 'Domyślnie unikaj dróg głównych'],
                      ['prefer_asphalt', 'Preferuj asfalt / utwardzone drogi'],
                      ['avoid_unpaved', 'Unikaj nieutwardzonych odcinków'],
                      ['avoid_dark_routes', 'Unikaj słabo oświetlonych tras'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-start gap-3 rounded-xl border border-[#f0d4b8] bg-[#FFF4D6] p-3 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={Boolean(profile[key])}
                          onChange={(event) => updateProfile(key, event.target.checked)}
                          className="mt-0.5"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || isDeleting}
                    className="soft-button w-full rounded-xl bg-[#FC6C26] px-4 py-3 text-sm font-semibold text-white hover:bg-[#E05518] disabled:opacity-60"
                  >
                    {isSaving ? 'Zapisywanie...' : 'Zapisz profil'}
                  </button>
                </form>
              )}

              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-5">
                    <StatCard label="Trasy" value={stats.routes} />
                    <StatCard label="Ulubione" value={stats.favoriteRoutes} />
                    <StatCard label="Jazdy" value={stats.rides} />
                    <StatCard label="Dystans" value={`${stats.rideDistanceKm.toFixed(1)} km`} />
                    <StatCard label="Czas" value={stats.rideTime} />
                  </div>

                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#FC6C26]">Ostatnie jazdy</h3>
                    {rides.length === 0 ? (
                      <p className="mt-2 rounded-xl bg-[#FFF8E8] p-3 text-sm text-stone-600">Brak zapisanych jazd. Po zakończeniu nawigacji pojawią się tutaj aktywności.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {rides.map((ride) => (
                          <li key={ride.id} className="rounded-xl border border-[#f0d4b8] bg-[#FFF8E8] p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-stone-800">{ride.route_name || 'Jazda'}</p>
                              <span className="text-xs text-stone-500">{formatDate(ride.completed_at)}</span>
                            </div>
                            <p className="mt-1 text-xs text-stone-600">
                              {(Number(ride.distance_meters || 0) / 1000).toFixed(1)} km · {formatDuration(Number(ride.duration_seconds || 0))}
                              {Number.isFinite(Number(ride.avg_speed_kmh)) ? ` · ${Number(ride.avg_speed_kmh).toFixed(1)} km/h` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#FC6C26]">Ostatnie trasy</h3>
                    {routes.length === 0 ? (
                      <p className="mt-2 rounded-xl bg-[#FFF8E8] p-3 text-sm text-stone-600">Brak zapisanych tras.</p>
                    ) : (
                      <ul className="mt-2 grid gap-2 md:grid-cols-2">
                        {routes.slice(0, 6).map((route) => (
                          <li key={route.id} className="rounded-xl border border-[#f0d4b8] bg-[#FFF8E8] p-3 text-sm">
                            <p className="font-semibold text-stone-800">{route.isFavorite ? '* ' : ''}{route.name}</p>
                            <p className="mt-1 text-xs text-stone-600">
                              {route.mode === 'Loop' ? 'Pętla' : 'A-B'}
                              {route.distanceKm != null ? ` · ${route.distanceKm.toFixed(1)} km` : ''}
                            </p>
                            {route.tags.length > 0 && (
                              <p className="mt-2 flex flex-wrap gap-1">
                                {route.tags.map((tag) => (
                                  <span key={tag} className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-900">{tag}</span>
                                ))}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#f0d4b8] bg-[#FFF8E8] p-4">
                    <h3 className="font-semibold text-[#FC6C26]">Eksport danych</h3>
                    <p className="mt-1 text-sm text-stone-600">Pobierz lokalny plik JSON z profilem, trasami i historią jazd widocznymi dla konta.</p>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="soft-button mt-3 rounded-xl border border-[#E08A50] bg-white px-4 py-2 text-sm font-semibold text-[#E05518]"
                    >
                      Eksportuj dane
                    </button>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h3 className="font-semibold text-rose-800">Usunięcie konta</h3>
                    <p className="mt-1 text-sm text-rose-700">Usunięcie konta usuwa profil, zapisane trasy i historię jazd. Tej operacji nie da się cofnąć.</p>
                    <button
                      type="button"
                      disabled={isDeleting || isSaving}
                      onClick={handleDeleteAccount}
                      className="soft-button mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-60"
                    >
                      {isDeleting ? 'Usuwanie...' : confirmDelete ? 'Potwierdź usunięcie konta' : 'Usuń konto'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
