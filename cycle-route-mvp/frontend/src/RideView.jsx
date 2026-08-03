import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconAlertTriangle,
  IconCurrentLocation,
  IconList,
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
  IconX,
} from '@tabler/icons-react'
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
import { keepAwake, lockPortrait } from './lib/keepAwake'
import { getMapTileLayer } from './lib/mapTiles'
import { speakText, cancelSpeech } from './lib/tts'
import { trackEvent } from './lib/monitoring'
import { startRideTracking } from './lib/backgroundLocation'
import { isNativePlatform } from './lib/platform'

const OFF_ROUTE_TRIGGER_MS = 15_000
const OFF_ROUTE_MIN_DISTANCE_M = 90
const RECALC_COOLDOWN_MS = 60_000
const MAX_ACCURACY_M = 45
const MIN_MOVE_M = 4

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
  if (error.code === 1) {
    return isNativePlatform()
      ? 'Brak zgody na lokalizację. Włącz GPS w ustawieniach aplikacji.'
      : 'Brak zgody na lokalizację. Włącz dostęp do GPS w przeglądarce.'
  }
  if (error.code === 2) return 'Sygnał GPS niedostępny. Wyjdź na otwartą przestrzeń.'
  if (error.code === 3) return 'Przekroczono czas oczekiwania na GPS. Sprawdź sygnał i spróbuj ponownie.'
  return error.message || 'Problem z lokalizacją.'
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
  speakText(text, { lang: 'pl-PL' })
}

function RideView({
  feature,
  routeName,
  mode,
  avoidMainRoads = false,
  preferAsphalt = false,
  rideStyle = 'gravel',
  climbPreference = 'normal',
  onExit,
  onRideComplete,
}) {
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
  const [showManeuverList, setShowManeuverList] = useState(false)

  const hintRef = useRef(0)
  const spokenRef = useRef(null)
  const offRouteSinceRef = useRef(null)
  const lastRecalcAtRef = useRef(0)
  const recalcInFlightRef = useRef(false)
  const offRouteEventsRef = useRef(0)
  const recalculationsRef = useRef(0)
  const maxSpeedMpsRef = useRef(0)
  // Kotwica do liczenia kierunku z przesunięcia (nie z klatki na klatkę,
  // bo to daje znikome, jitterujące delty i strzałka stoi w miejscu).
  const headingAnchorRef = useRef(null)
  const originalFeatureRef = useRef(feature)
  const trackRef = useRef([])
  const startedAtRef = useRef(0)
  const pausedAtRef = useRef(null)
  const pausedMsRef = useRef(0)
  const isPausedRef = useRef(false)

  useEffect(() => {
    startedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    originalFeatureRef.current = feature
  }, [feature])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const handleRecalculateRoute = useCallback(async ({ silent = false } = {}) => {
    if (!userPos || recalcInFlightRef.current) return

    const sourceFeature = originalFeatureRef.current || routeFeature
    const waypoints = buildRejoinWaypoints(sourceFeature, userPos, hintRef.current)
    const routeDestination = getRouteDestination(sourceFeature)
    if (!waypoints && !routeDestination) {
      setRecalcError('Nie udało się ustalić celu trasy do przeliczenia.')
      return
    }

    recalcInFlightRef.current = true
    recalculationsRef.current += 1
    setIsRecalculating(true)
    setRecalcError('')

    if (voiceOn && !silent) {
      speak('Zjechałeś z trasy. Przeliczam nową drogę.')
    }

    try {
      const refreshed = await rerouteFromPosition({
        user: userPos,
        destination: routeDestination,
        waypoints,
        avoidMainRoads,
        preferAsphalt,
        rideStyle,
        climbPreference,
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
  }, [userPos, routeFeature, voiceOn, avoidMainRoads, preferAsphalt, rideStyle, climbPreference])

  useEffect(() => {
    if (!navState?.isOffRoute || !userPos || isRecalculating || isPaused) {
      if (!navState?.isOffRoute) {
        offRouteSinceRef.current = null
      }
      return
    }

    const triggerDistance = Math.max(OFF_ROUTE_MIN_DISTANCE_M, navState.offRouteThreshold || 0)
    if (navState.offRouteDistance < triggerDistance) {
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
      offRouteEventsRef.current += 1
      handleRecalculateRoute({ silent: false })
    }
  }, [navState, userPos, isRecalculating, isPaused, handleRecalculateRoute])

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => undefined
    let lastAccepted = null

    startRideTracking(
      (position) => {
        if (cancelled) return
        const { latitude, longitude, speed, accuracy: acc, heading: gpsHeading } =
          position.coords
        const point = { lat: latitude, lng: longitude }

        // Drop very inaccurate fixes (common indoors / cold start).
        if (Number.isFinite(acc) && acc > MAX_ACCURACY_M) {
          setAccuracy(acc)
          return
        }

        // Ignore tiny jitter when nearly stationary.
        if (
          lastAccepted &&
          haversineMeters(lastAccepted, point) < MIN_MOVE_M &&
          !(Number.isFinite(speed) && speed > 1.2)
        ) {
          setAccuracy(Number.isFinite(acc) ? acc : null)
          return
        }
        lastAccepted = point

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

        if (Number.isFinite(speed) && speed > maxSpeedMpsRef.current) {
          maxSpeedMpsRef.current = speed
        }

        if (!isPausedRef.current) {
          const track = trackRef.current
          const last = track[track.length - 1]
          if (!last || haversineMeters(last, point) >= 8) {
            track.push({ ...point, t: Date.now() })
          }
        }
      },
      (error) => {
        if (!cancelled) setGeoError(geoErrorMessage(error))
      },
      { preferBackground: true },
    ).then((stop) => {
      unsubscribe = typeof stop === 'function' ? stop : () => undefined
    })

    return () => {
      cancelled = true
      Promise.resolve(unsubscribe()).catch(() => undefined)
    }
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
      accuracyMeters: accuracy,
    })
    if (state) {
      hintRef.current = state.nearestIndex
      setNavState(state)
    }
  }, [userPos, gpsSpeed, accuracy, coordinates, cumulative, maneuvers, isPaused])

  useEffect(() => {
    let release = () => undefined
    keepAwake().then((fn) => {
      release = fn || (() => undefined)
    })
    lockPortrait()
    trackEvent('ride_start', { mode: mode || 'unknown' })
    return () => {
      Promise.resolve(release()).catch(() => undefined)
      cancelSpeech()
    }
  }, [mode])
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
      cancelSpeech()
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
    const maxSpeedKmh = maxSpeedMpsRef.current > 0 ? maxSpeedMpsRef.current * 3.6 : 0

    const trackCoordinates = points.map((point) => [point.lng, point.lat])
    const trackGeoJson =
      trackCoordinates.length >= 2
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: trackCoordinates },
          }
        : null

    return {
      distanceMeters,
      durationSeconds,
      avgSpeedKmh,
      maxSpeedKmh,
      elevationGainM: null,
      offRouteEvents: offRouteEventsRef.current,
      recalculations: recalculationsRef.current,
      startedAt: new Date(startedAtRef.current).toISOString(),
      trackGeoJson,
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

  const handleCloseSummary = () => {
    onRideComplete?.(rideSummary)
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

  const lineColor = mode === 'Loop' ? '#7a6248' : '#FC6C26'

  if (rideSummary) {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#2c1e16]/80 p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#3d2a20] p-6 text-orange-50 shadow-2xl ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-white">Podsumowanie jazdy</h2>
          <p className="mt-1 text-sm text-orange-100/70">{routeName || 'Trasa'}</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-orange-100/60">Dystans</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {formatDistance(rideSummary.distanceMeters)}
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-orange-100/60">Czas</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {formatDuration(rideSummary.durationSeconds)}
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-orange-100/60">Średnia</dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {rideSummary.avgSpeedKmh > 0
                  ? `${rideSummary.avgSpeedKmh.toFixed(1)} km/h`
                  : '—'}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleCloseSummary}
            className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-[#10231a] transition hover:bg-orange-400"
          >
            Zamknij
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#2c1e16] text-white">
      <div className="absolute inset-0">
        <MapContainer
          center={[52.0, 19.2]}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution={getMapTileLayer().attribution}
            url={getMapTileLayer().url}
            maxZoom={getMapTileLayer().maxZoom}
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3000] h-52 bg-gradient-to-b from-[#2c1e16]/55 via-[#2c1e16]/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3000] h-48 bg-gradient-to-t from-[#2c1e16]/45 to-transparent" />
      {isPaused && (
        <div className="pointer-events-none absolute inset-0 z-[3000] bg-[#2c1e16]/25 backdrop-saturate-50" />
      )}

      <div
        className="pointer-events-none relative z-[3001] flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="pointer-events-auto m-3 rounded-[1.35rem] bg-[#3d2a20]/94 p-3.5 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.12] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExitRequest}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60"
              aria-label="Zakończ nawigację"
              title="Zakończ nawigację"
            >
              <IconX className="h-5 w-5" stroke={2} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-orange-50">
                {routeName || 'Trasa'}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-orange-100/55">
                {isPaused ? 'Nawigacja wstrzymana' : mode === 'Loop' ? 'Pętla' : 'Trasa A → B'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowManeuverList((value) => !value)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 ${
                  showManeuverList
                    ? 'bg-orange-500 text-[#2c1e16]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-pressed={showManeuverList}
                aria-label="Lista manewrów"
                title="Lista manewrów"
              >
                <IconList className="h-5 w-5" stroke={2} />
              </button>
              <button
                type="button"
                onClick={togglePause}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 ${
                  isPaused
                    ? 'bg-amber-400 text-[#2a1f05]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-pressed={isPaused}
                aria-label={isPaused ? 'Wznów jazdę' : 'Wstrzymaj jazdę'}
                title={isPaused ? 'Wznów jazdę' : 'Wstrzymaj jazdę'}
              >
                {isPaused ? (
                  <IconPlayerPlay className="h-5 w-5" fill="currentColor" stroke={1.8} />
                ) : (
                  <IconPlayerPause className="h-5 w-5" fill="currentColor" stroke={1.8} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setVoiceOn((value) => !value)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 ${
                  voiceOn
                    ? 'bg-orange-500 text-[#2c1e16]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-pressed={voiceOn}
                aria-label={voiceOn ? 'Wyłącz komunikaty głosowe' : 'Włącz komunikaty głosowe'}
                title={voiceOn ? 'Wyłącz komunikaty głosowe' : 'Włącz komunikaty głosowe'}
              >
                {voiceOn ? (
                  <IconVolume className="h-5 w-5" stroke={2} />
                ) : (
                  <IconVolumeOff className="h-5 w-5" stroke={2} />
                )}
              </button>
            </div>
          </div>

          {showManeuverList && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-black/25 p-2">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-orange-100/70">
                Manewry ({maneuvers.length})
              </p>
              {maneuvers.length === 0 ? (
                <p className="px-1 text-sm text-orange-100/70">Brak instrukcji dla tej trasy.</p>
              ) : (
                <ol className="space-y-1">
                  {maneuvers.map((maneuver, index) => {
                    const visual = getManeuverVisual(maneuver.type)
                    const isCurrent =
                      navState?.nextManeuver?.coordIndex === maneuver.coordIndex
                    return (
                      <li
                        key={`${maneuver.coordIndex}-${index}`}
                        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          isCurrent ? 'bg-orange-500/25 text-white' : 'text-orange-50/90'
                        }`}
                      >
                        <span className="w-6 shrink-0 text-center text-base">{visual.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            {maneuver.instruction || visual.label}
                          </span>
                          <span className="text-[11px] text-orange-100/55">
                            {formatDistance(maneuver.distance)}
                            {maneuver.name ? ` · ${maneuver.name}` : ''}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          )}

          {isPaused ? (
            <p className="mt-3 rounded-lg bg-amber-400/20 px-3 py-2 text-sm text-amber-100">
              Jazda wstrzymana — nawigacja i zapis śladu są zapauzowane.
            </p>
          ) : geoError ? (
            <p className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {geoError}
            </p>
          ) : !userPos ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-100/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300" />
              Ustalanie pozycji GPS…
            </div>
          ) : navState?.isOffRoute ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-400/10 px-3 py-2.5">
                {isRecalculating ? (
                  <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-amber-200/35 border-t-amber-300" />
                ) : (
                  <IconAlertTriangle className="h-7 w-7 shrink-0 text-amber-300" stroke={1.8} />
                )}
                <div>
                  <p className="text-base font-semibold text-amber-200">
                    {isRecalculating ? 'Przeliczanie trasy…' : 'Poza trasą'}
                  </p>
                  <p className="text-sm text-orange-100/80">
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
              <p className="text-lg font-semibold text-orange-100">Dojeżdżasz do celu</p>
            </div>
          ) : nextManeuver ? (
            <div className="mt-3 flex items-center gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/[0.18] text-4xl leading-none text-orange-300 ring-1 ring-orange-300/10">
                {maneuverVisual?.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <p className="text-3xl font-bold leading-none tabular-nums text-white">
                  {formatDistance(navState.distanceToManeuver)}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-orange-100/65">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    GPS{accuracy ? ` ±${Math.round(accuracy)} m` : ''}
                  </span>
                </div>
                <p className="truncate text-sm text-orange-100/90">
                  {nextManeuver.instruction || maneuverVisual?.label}
                </p>
                {followingManeuver && (
                  <p className="mt-1 inline-flex max-w-full items-center rounded-full bg-white/[0.08] px-2 py-0.5 text-xs text-orange-100/65">
                    <span className="truncate">
                    potem {getManeuverVisual(followingManeuver.type).icon}{' '}
                    {followingManeuver.instruction}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-orange-100/80">
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
            className="pointer-events-auto flex items-center gap-2 self-end rounded-full bg-[#FFF8E8] px-4 py-2 text-sm font-semibold text-[#2c1e16] shadow-lg ring-2 ring-white/35 transition hover:bg-white"
          >
            <IconCurrentLocation className="h-4 w-4 text-[#E05518]" stroke={2} />
            Wyśrodkuj
          </button>
        )}

        <div className="pointer-events-auto rounded-[1.35rem] bg-[#3d2a20]/94 px-4 py-3 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.12] backdrop-blur-xl">
          <div className="mb-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.12]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FC6C26] via-orange-400 to-[#ffc08b] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round((navState?.progress || 0) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <p className="text-xl font-bold tabular-nums text-white">
                {formatDistance(navState ? navState.remainingDistance : totalDistance)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-orange-100/60">Pozostało</p>
            </div>
            <div className="flex-1 border-x border-white/10">
              <p className="text-lg font-bold tabular-nums text-white">
                {navState ? formatDuration(navState.remainingSeconds) : '—'}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-orange-100/60">Czas (szac.)</p>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold tabular-nums text-white">
                {gpsSpeed != null ? `${Math.round(gpsSpeed * 3.6)}` : '—'}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-orange-100/60">km/h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RideView
