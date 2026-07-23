import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import {
  bearingDegrees,
  buildCumulativeDistances,
  computeNavState,
  extractManeuvers,
  formatDistance,
  formatDuration,
  getFeatureCoordinates,
  getManeuverVisual,
  haversineMeters,
  toLatLng,
} from './lib/navigation'
import { getRouteDestination, buildRejoinWaypoints, rerouteFromPosition } from './lib/offRouteRecalc'

const OFF_ROUTE_TRIGGER_MS = 10_000
const OFF_ROUTE_MIN_DISTANCE_M = 50
const RECALC_COOLDOWN_MS = 45_000

// Marker pozycji użytkownika. Ikonę tworzymy RAZ (zależnie tylko od tego,
// czy znamy kierunek). Obrót strzałki ustawiamy potem bezpośrednio na
// wewnętrznym elemencie (.cyw-arrow-inner), żeby nie odtwarzać DOM-u i mieć
// płynną animację CSS.
const buildUserIcon = (hasHeading) => {
  const html = hasHeading
    ? `<div style="width:32px;height:32px;">
         <div class="cyw-arrow-inner" style="width:32px;height:32px;transition:transform 0.25s linear;will-change:transform;">
           <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
             <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
             <path d="M16 6 L22 22 L16 18 L10 22 Z" fill="#ffffff"/>
           </svg>
         </div>
       </div>`
    : `<div style="width:32px;height:32px;">
         <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
           <circle cx="16" cy="16" r="9" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
         </svg>
       </div>`
  return L.divIcon({
    className: 'cyw-user-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const geoErrorMessage = (error) => {
  if (!error) return 'Nie udało się ustalić lokalizacji.'
  if (error.code === 1) return 'Brak zgody na lokalizację. Włącz dostęp do GPS w przeglądarce.'
  if (error.code === 2) return 'Sygnał GPS niedostępny. Wyjdź na otwartą przestrzeń.'
  if (error.code === 3) return 'Przekroczono czas oczekiwania na GPS.'
  return 'Problem z lokalizacją.'
}

function InitialFit({ coordinates }) {
  const map = useMap()
  useEffect(() => {
    if (!coordinates.length) return
    const latLngs = coordinates
      .map(toLatLng)
      .filter(Boolean)
      .map((point) => [point.lat, point.lng])
    if (latLngs.length > 1) {
      map.fitBounds(latLngs, { padding: [40, 40] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function FollowController({ center, follow, onUserDrag }) {
  const map = useMap()

  useEffect(() => {
    if (follow && center) {
      map.panTo([center.lat, center.lng], {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.5,
      })
    }
  }, [center, follow, map])

  useMapEvents({
    dragstart: () => onUserDrag(),
  })

  return null
}

function speak(text) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pl-PL'
    utterance.rate = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  } catch {
    // ignore
  }
}

function RideView({ feature, routeName, mode, avoidMainRoads = false, onExit }) {
  const [routeFeature, setRouteFeature] = useState(feature)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [recalcError, setRecalcError] = useState('')

  const coordinates = useMemo(() => getFeatureCoordinates(routeFeature), [routeFeature])
  const cumulative = useMemo(() => buildCumulativeDistances(coordinates), [coordinates])
  const maneuvers = useMemo(() => extractManeuvers(routeFeature), [routeFeature])

  const totalDistance = cumulative[cumulative.length - 1] || 0
  const destination = coordinates.length ? toLatLng(coordinates[coordinates.length - 1]) : null

  const [userPos, setUserPos] = useState(null)
  const [heading, setHeading] = useState(null)
  const [gpsSpeed, setGpsSpeed] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [geoError, setGeoError] = useState(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator
      ? ''
      : 'Ta przeglądarka nie udostępnia lokalizacji.',
  )
  const [navState, setNavState] = useState(null)
  const [follow, setFollow] = useState(true)
  const [voiceOn, setVoiceOn] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rideSummary, setRideSummary] = useState(null)

  const hintRef = useRef(0)
  const spokenRef = useRef(null)
  const offRouteSinceRef = useRef(null)
  const lastRecalcAtRef = useRef(0)
  const recalcInFlightRef = useRef(false)
  // Kotwica do liczenia kierunku z przesunięcia (nie z klatki na klatkę,
  // bo to daje znikome, jitterujące delty i strzałka stoi w miejscu).
  const headingAnchorRef = useRef(null)
  const originalFeatureRef = useRef(feature)
  const trackRef = useRef([])
  const startedAtRef = useRef(Date.now())
  const pausedAtRef = useRef(null)
  const pausedMsRef = useRef(0)
  const isPausedRef = useRef(false)

  useEffect(() => {
    hintRef.current = 0
    spokenRef.current = null
    offRouteSinceRef.current = null
    originalFeatureRef.current = feature
    trackRef.current = []
    startedAtRef.current = Date.now()
    pausedAtRef.current = null
    pausedMsRef.current = 0
    setIsPaused(false)
    setRideSummary(null)
  }, [feature])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const handleRecalculateRoute = useCallback(async () => {
    if (!userPos || recalcInFlightRef.current) return

    const sourceFeature = originalFeatureRef.current || routeFeature
    const waypoints = buildRejoinWaypoints(sourceFeature, userPos, hintRef.current)
    const routeDestination = getRouteDestination(sourceFeature)
    if (!waypoints && !routeDestination) {
      setRecalcError('Nie udało się ustalić celu trasy do przeliczenia.')
      return
    }

    recalcInFlightRef.current = true
    setIsRecalculating(true)
    setRecalcError('')

    try {
      const refreshed = await rerouteFromPosition({
        user: userPos,
        destination: routeDestination,
        waypoints,
        avoidMainRoads,
      })

      setRouteFeature(refreshed)
      hintRef.current = 0
      spokenRef.current = null
      offRouteSinceRef.current = null
      lastRecalcAtRef.current = Date.now()

      if (voiceOn) {
        speak('Trasa została przeliczona. Jedź dalej.')
      }
    } catch (recalcErr) {
      setRecalcError(recalcErr.message || 'Nie udało się przeliczyć trasy.')
    } finally {
      recalcInFlightRef.current = false
      setIsRecalculating(false)
    }
  }, [userPos, routeFeature, voiceOn, avoidMainRoads])

  useEffect(() => {
    if (!navState?.isOffRoute || !userPos || isRecalculating || isPaused) {
      if (!navState?.isOffRoute) {
        offRouteSinceRef.current = null
      }
      return
    }

    if (navState.offRouteDistance < OFF_ROUTE_MIN_DISTANCE_M) {
      offRouteSinceRef.current = null
      return
    }

    const now = Date.now()
    if (!offRouteSinceRef.current) {
      offRouteSinceRef.current = now
      return
    }

    const offRouteDuration = now - offRouteSinceRef.current
    const sinceLastRecalc = now - lastRecalcAtRef.current

    if (offRouteDuration >= OFF_ROUTE_TRIGGER_MS && sinceLastRecalc >= RECALC_COOLDOWN_MS) {
      handleRecalculateRoute()
    }
  }, [navState, userPos, isRecalculating, isPaused, handleRecalculateRoute])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy: acc, heading: gpsHeading } =
          position.coords
        const point = { lat: latitude, lng: longitude }

        // Kierunek: jeśli GPS podaje wiarygodny heading w ruchu, używamy go.
        // W przeciwnym razie liczymy azymut względem kotwicy oddalonej o >=6 m.
        let nextHeading = null
        if (Number.isFinite(gpsHeading) && Number.isFinite(speed) && speed > 1) {
          nextHeading = gpsHeading
          headingAnchorRef.current = point
        } else {
          const anchor = headingAnchorRef.current
          if (!anchor) {
            headingAnchorRef.current = point
          } else if (haversineMeters(anchor, point) > 6) {
            nextHeading = bearingDegrees(anchor, point)
            headingAnchorRef.current = point
          }
        }
        if (nextHeading != null) setHeading(nextHeading)

        setUserPos(point)
        setGpsSpeed(Number.isFinite(speed) ? speed : null)
        setAccuracy(Number.isFinite(acc) ? acc : null)
        setGeoError('')

        if (!isPausedRef.current) {
          const track = trackRef.current
          const last = track[track.length - 1]
          if (!last || haversineMeters(last, point) >= 8) {
            track.push({ ...point, t: Date.now() })
          }
        }
      },
      (error) => setGeoError(geoErrorMessage(error)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 25000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    if (!userPos || coordinates.length === 0 || isPaused) return
    const speed = gpsSpeed && gpsSpeed > 0.8 ? gpsSpeed : 4.5
    const state = computeNavState({
      coordinates,
      cumulative,
      maneuvers,
      user: userPos,
      hintIndex: hintRef.current,
      averageSpeedMps: speed,
    })
    if (state) {
      hintRef.current = state.nearestIndex
      setNavState(state)
    }
  }, [userPos, gpsSpeed, coordinates, cumulative, maneuvers, isPaused])

  useEffect(() => {
    let wakeLock = null
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen')
      } catch {
        // ignore
      }
    }
    requestWakeLock()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLock?.release?.().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!voiceOn || isPaused || !navState?.nextManeuver) return
    const { nextManeuver, distanceToManeuver } = navState
    if (distanceToManeuver == null) return

    const instruction = nextManeuver.instruction || getManeuverVisual(nextManeuver.type).label

    // Reset progów dla nowego manewru.
    if (!spokenRef.current || spokenRef.current.key !== nextManeuver.coordIndex) {
      spokenRef.current = { key: nextManeuver.coordIndex, tiers: new Set() }
    }
    const spoken = spokenRef.current.tiers

    const tier =
      distanceToManeuver <= 50
        ? { id: 'now', phrase: instruction }
        : distanceToManeuver <= 170
          ? { id: 'near', phrase: `Za 100 metrów ${instruction}` }
          : distanceToManeuver <= 350
            ? { id: 'far', phrase: `Za 300 metrów ${instruction}` }
            : null

    if (tier && !spoken.has(tier.id)) {
      // Pomiń wcześniejsze progi, jeśli wjechaliśmy od razu w bliższy
      // (np. przy dużej prędkości), aby nie zapowiadać ich z opóźnieniem.
      if (tier.id === 'now') {
        spoken.add('far').add('near').add('now')
      } else if (tier.id === 'near') {
        spoken.add('far').add('near')
      } else {
        spoken.add('far')
      }
      speak(tier.phrase)
    }
  }, [navState, voiceOn, isPaused])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const buildRideSummary = () => {
    const points = trackRef.current
    let distanceMeters = 0
    for (let i = 1; i < points.length; i += 1) {
      distanceMeters += haversineMeters(points[i - 1], points[i])
    }

    let pausedMs = pausedMsRef.current
    if (pausedAtRef.current) {
      pausedMs += Date.now() - pausedAtRef.current
    }
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - startedAtRef.current - pausedMs) / 1000),
    )
    const avgSpeedKmh =
      durationSeconds > 0 ? (distanceMeters / durationSeconds) * 3.6 : 0

    return {
      distanceMeters,
      durationSeconds,
      avgSpeedKmh,
      pointCount: points.length,
    }
  }

  const togglePause = () => {
    setIsPaused((current) => {
      if (current) {
        if (pausedAtRef.current) {
          pausedMsRef.current += Date.now() - pausedAtRef.current
          pausedAtRef.current = null
        }
        return false
      }
      pausedAtRef.current = Date.now()
      return true
    })
  }

  const handleExitRequest = () => {
    const summary = buildRideSummary()
    if (summary.distanceMeters >= 40 || summary.durationSeconds >= 45) {
      setRideSummary(summary)
      return
    }
    onExit()
  }

  const routeLine = useMemo(() => {
    if (!routeFeature) return null
    return { type: 'FeatureCollection', features: [routeFeature] }
  }, [routeFeature])

  const hasHeading = heading != null
  const userIcon = useMemo(() => buildUserIcon(hasHeading), [hasHeading])
  const markerRef = useRef(null)
  const rotationRef = useRef(0)

  // Obracamy istniejący element strzałki (bez odtwarzania ikony), wybierając
  // najkrótszą drogę kątową, aby uniknąć obrotu o 350° przy przejściu 359→1.
  useEffect(() => {
    if (heading == null) return
    const el = markerRef.current?.getElement?.()
    const inner = el?.querySelector?.('.cyw-arrow-inner')
    if (!inner) return
    const current = rotationRef.current
    const delta = (((heading - (current % 360)) % 360) + 540) % 360 - 180
    const next = current + delta
    rotationRef.current = next
    inner.style.transform = `rotate(${next}deg)`
  }, [heading, hasHeading])

  const nextManeuver = navState?.nextManeuver || null
  const followingManeuver = navState?.followingManeuver || null
  const maneuverVisual = nextManeuver ? getManeuverVisual(nextManeuver.type) : null

  const lineColor = mode === 'Loop' ? '#7a6248' : '#2e5f43'

  if (rideSummary) {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#0f1a14]/80 p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#15241b] p-6 text-emerald-50 shadow-2xl ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-white">Podsumowanie jazdy</h2>
          <p className="mt-1 text-sm text-emerald-100/70">{routeName || 'Trasa'}</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-emerald-100/60">Dystans</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {formatDistance(rideSummary.distanceMeters)}
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-emerald-100/60">Czas</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {formatDuration(rideSummary.durationSeconds)}
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-emerald-100/60">Średnia</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {rideSummary.avgSpeedKmh > 0
                  ? `${rideSummary.avgSpeedKmh.toFixed(1)} km/h`
                  : '—'}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onExit}
            className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#10231a] transition hover:bg-emerald-400"
          >
            Zamknij
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#0f1a14] text-white">
      <div className="absolute inset-0">
        <MapContainer
          center={[52.0, 19.2]}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeLine && (
            <GeoJSON
              data={routeLine}
              style={{ color: lineColor, weight: 7, opacity: 0.9 }}
            />
          )}
          {destination && (
            <CircleMarker
              center={[destination.lat, destination.lng]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#b91c1c', fillOpacity: 1 }}
            />
          )}
          {userPos && (
            <>
              {accuracy && accuracy < 200 && (
                <CircleMarker
                  center={[userPos.lat, userPos.lng]}
                  radius={Math.min(40, Math.max(8, accuracy / 3))}
                  pathOptions={{
                    color: '#2563eb',
                    weight: 1,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                  }}
                />
              )}
              <Marker
                ref={markerRef}
                position={[userPos.lat, userPos.lng]}
                icon={userIcon}
                zIndexOffset={1000}
                keyboard={false}
              />
            </>
          )}
          <InitialFit coordinates={coordinates} />
          <FollowController
            center={userPos}
            follow={follow}
            onUserDrag={() => setFollow(false)}
          />
        </MapContainer>
      </div>

      <div
        className="pointer-events-none relative z-[3001] flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="pointer-events-auto m-3 rounded-2xl bg-[#15241b]/95 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExitRequest}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              ← Zakończ
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-emerald-100">
              {routeName || 'Trasa'}
              {isPaused ? ' · Pauza' : ''}
            </p>
            <button
              type="button"
              onClick={togglePause}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isPaused
                  ? 'bg-amber-400 text-[#2a1f05]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-pressed={isPaused}
            >
              {isPaused ? '▶ Wznów' : '⏸ Pauza'}
            </button>
            <button
              type="button"
              onClick={() => setVoiceOn((value) => !value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                voiceOn ? 'bg-emerald-500 text-[#10231a]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-pressed={voiceOn}
            >
              {voiceOn ? '🔊' : '🔈'}
            </button>
          </div>

          {isPaused ? (
            <p className="mt-3 rounded-lg bg-amber-400/20 px-3 py-2 text-sm text-amber-100">
              Jazda wstrzymana — nawigacja i zapis śladu są zapauzowane.
            </p>
          ) : geoError ? (
            <p className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {geoError}
            </p>
          ) : !userPos ? (
            <p className="mt-3 text-sm text-emerald-100/80">Ustalanie pozycji GPS…</p>
          ) : navState?.isOffRoute ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="text-base font-semibold text-amber-200">
                    {isRecalculating ? 'Przeliczanie trasy…' : 'Poza trasą'}
                  </p>
                  <p className="text-sm text-emerald-100/80">
                    {isRecalculating
                      ? 'Szukamy nowej drogi do celu z Twojej pozycji.'
                      : `Jesteś ${formatDistance(navState.offRouteDistance)} od trasy. Możesz wrócić lub przeliczyć trasę.`}
                  </p>
                </div>
              </div>
              {!isRecalculating && (
                <button
                  type="button"
                  onClick={handleRecalculateRoute}
                  className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-[#2a1f05] transition hover:bg-amber-300"
                >
                  Przelicz trasę do celu
                </button>
              )}
              {recalcError && (
                <p className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
                  {recalcError}
                </p>
              )}
            </div>
          ) : navState?.isArriving ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl">🏁</span>
              <p className="text-lg font-semibold text-emerald-100">Dojeżdżasz do celu</p>
            </div>
          ) : nextManeuver ? (
            <div className="mt-3 flex items-center gap-4">
              <span className="text-4xl leading-none text-emerald-300">
                {maneuverVisual?.icon}
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums text-white">
                  {formatDistance(navState.distanceToManeuver)}
                </p>
                <p className="truncate text-sm text-emerald-100/90">
                  {nextManeuver.instruction || maneuverVisual?.label}
                </p>
                {followingManeuver && (
                  <p className="mt-0.5 truncate text-xs text-emerald-100/60">
                    potem {getManeuverVisual(followingManeuver.type).icon}{' '}
                    {followingManeuver.instruction}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-100/80">
              Jedź wzdłuż wyznaczonej trasy.
            </p>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div
        className="relative z-[3001] flex flex-col gap-3 px-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {!follow && userPos && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="pointer-events-auto self-end rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#15241b] shadow-lg"
          >
            ◎ Wyśrodkuj
          </button>
        )}

        <div className="pointer-events-auto rounded-2xl bg-[#15241b]/95 px-4 py-3 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${Math.round((navState?.progress || 0) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <p className="text-lg font-bold tabular-nums text-white">
                {formatDistance(navState ? navState.remainingDistance : totalDistance)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/60">Pozostało</p>
            </div>
            <div className="flex-1 border-x border-white/10">
              <p className="text-lg font-bold tabular-nums text-white">
                {navState ? formatDuration(navState.remainingSeconds) : '—'}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/60">Czas (szac.)</p>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold tabular-nums text-white">
                {gpsSpeed != null ? `${Math.round(gpsSpeed * 3.6)}` : '—'}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/60">km/h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RideView
