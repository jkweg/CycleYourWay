import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowBearLeft,
  IconArrowBearRight,
  IconArrowRoundaboutRight,
  IconArrowSharpTurnLeft,
  IconArrowSharpTurnRight,
  IconArrowUp,
  IconCircleDot,
  IconCornerUpLeft,
  IconCornerUpRight,
  IconCurrentLocation,
  IconFlag,
  IconList,
  IconMapPinOff,
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
import { deleteRideDraft, saveRideDraft } from './lib/rideDraftStore'

const OFF_ROUTE_TRIGGER_MS = 15_000
const OFF_ROUTE_MIN_DISTANCE_M = 90
const RECALC_COOLDOWN_MS = 60_000
const MAX_ACCURACY_M = 45
// Before the first good fix, still show a rough position (indoors, cold GPS).
const MAX_FIRST_FIX_ACCURACY_M = 150
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
  if (error.disabled) return 'Lokalizacja w telefonie jest wyłączona. Włącz ją w szybkich ustawieniach.'
  if (error.code === 3) return ''
  return 'Sygnał GPS niedostępny. Wyjdź na otwartą przestrzeń.'
}

// ORS maneuver types (lib/navigation.ts) drawn with the app's icon set.
const MANEUVER_ICONS = {
  0: IconCornerUpLeft,
  1: IconCornerUpRight,
  2: IconArrowSharpTurnLeft,
  3: IconArrowSharpTurnRight,
  4: IconArrowBearLeft,
  5: IconArrowBearRight,
  6: IconArrowUp,
  7: IconArrowRoundaboutRight,
  8: IconArrowRoundaboutRight,
  9: IconArrowBackUp,
  10: IconFlag,
  11: IconCircleDot,
  12: IconArrowBearLeft,
  13: IconArrowBearRight,
}

function ManeuverIcon({ type, size = 24, className }) {
  const Icon = MANEUVER_ICONS[type] || IconArrowUp
  return <Icon size={size} stroke={2.4} className={className} aria-hidden="true" />
}

const CARD_TONES = {
  orange: 'bg-burnt-orange text-ink',
  sand: 'bg-vanilla text-ink',
  alert: 'bg-[#FDE7DF] text-[#6E1C12]',
}

function CardRow({ icon, tone, title, children }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-[18px] ${CARD_TONES[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[22px] font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-sm text-vanilla-deep">{children}</p>
      </div>
    </div>
  )
}

function RideButton({ label, onClick, pressed, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-[0_8px_22px_rgba(42,26,18,0.16)] transition active:scale-95 ${
        pressed ? 'bg-ink text-burnt-orange' : 'bg-white text-ink'
      }`}
    >
      {children}
    </button>
  )
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

// Street-level zoom for riding; the route overview is only shown until the first fix.
const FOLLOW_ZOOM = 16

function FollowController({ center, follow, onUserDrag }) {
  const map = useMap()
  // Zoom in on the first fix and on "Wyśrodkuj"; otherwise keep the rider's own zoom.
  const needsZoomRef = useRef(true)

  useEffect(() => {
    if (!follow) needsZoomRef.current = true
  }, [follow])

  useEffect(() => {
    if (!follow || !center) return
    if (needsZoomRef.current) {
      needsZoomRef.current = false
      map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), FOLLOW_ZOOM), { animate: true, duration: 0.8 })
      return
    }
    map.panTo([center.lat, center.lng], {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.5,
    })
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
  routeId = null,
  avoidMainRoads = false,
  preferAsphalt = false,
  rideStyle = 'gravel',
  climbPreference = 'normal',
  sessionId,
  ownerId,
  resumeDraft,
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
  const [isPaused, setIsPaused] = useState(() => Boolean(resumeDraft))
  const [rideSummary, setRideSummary] = useState(() =>
    resumeDraft?.status === 'completed' ? resumeDraft.summary : null,
  )
  const [isSavingRide, setIsSavingRide] = useState(false)
  const [saveRideError, setSaveRideError] = useState('')
  const [draftStorageError, setDraftStorageError] = useState('')
  const [showManeuverList, setShowManeuverList] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  // No fix arrived within the plugin timeout: keep searching, but say so.
  const [gpsSearching, setGpsSearching] = useState(false)

  const hintRef = useRef(0)
  const spokenRef = useRef(null)
  const offRouteSinceRef = useRef(null)
  const lastRecalcAtRef = useRef(0)
  const recalcInFlightRef = useRef(false)
  const offRouteEventsRef = useRef(resumeDraft?.runtime?.offRouteEvents || 0)
  const recalculationsRef = useRef(resumeDraft?.runtime?.recalculations || 0)
  const maxSpeedMpsRef = useRef(resumeDraft?.runtime?.maxSpeedMps || 0)
  // Kotwica do liczenia kierunku z przesunięcia (nie z klatki na klatkę,
  // bo to daje znikome, jitterujące delty i strzałka stoi w miejscu).
  const headingAnchorRef = useRef(null)
  const originalFeatureRef = useRef(feature)
  const trackRef = useRef(resumeDraft?.runtime?.track || [])
  const startedAtRef = useRef(resumeDraft?.runtime?.startedAt || 0)
  const pausedAtRef = useRef(null)
  const pausedMsRef = useRef(resumeDraft?.runtime?.pausedMs || 0)
  const isPausedRef = useRef(false)
  const rideFinishedRef = useRef(resumeDraft?.status === 'completed')
  const draftWriteRef = useRef(Promise.resolve())

  useEffect(() => {
    if (!startedAtRef.current) startedAtRef.current = Date.now()
    if (resumeDraft && !pausedAtRef.current) pausedAtRef.current = Date.now()
  }, [resumeDraft])

  const routeDraft = useMemo(() => ({
    feature,
    name: routeName,
    mode,
    routeId: resumeDraft?.route?.routeId || routeId,
    avoidMainRoads,
    preferAsphalt,
    rideStyle,
    climbPreference,
  }), [feature, routeName, mode, routeId, resumeDraft, avoidMainRoads, preferAsphalt, rideStyle, climbPreference])

  const queueDraftSave = useCallback((record) => {
    draftWriteRef.current = draftWriteRef.current
      .catch(() => undefined)
      .then(() => saveRideDraft(record))
    return draftWriteRef.current
  }, [])

  const activeDraftSnapshot = useCallback(() => ({
    sessionId,
    ownerId: resumeDraft?.ownerId || ownerId || null,
    status: 'active',
    route: routeDraft,
    runtime: {
      track: [...trackRef.current],
      startedAt: startedAtRef.current,
      pausedMs: pausedMsRef.current + (pausedAtRef.current ? Date.now() - pausedAtRef.current : 0),
      offRouteEvents: offRouteEventsRef.current,
      recalculations: recalculationsRef.current,
      maxSpeedMps: maxSpeedMpsRef.current,
    },
  }), [sessionId, ownerId, resumeDraft, routeDraft])

  useEffect(() => {
    if (!sessionId || rideSummary || rideFinishedRef.current) return undefined
    void queueDraftSave(activeDraftSnapshot())
      .then(() => setDraftStorageError(''))
      .catch(() => setDraftStorageError('Nie można utworzyć lokalnej kopii jazdy. Sprawdź wolne miejsce urządzenia.'))
    const checkpoint = window.setInterval(() => {
      if (rideFinishedRef.current) return
      void queueDraftSave(activeDraftSnapshot())
        .then(() => setDraftStorageError(''))
        .catch(() => setDraftStorageError('Nie można aktualizować lokalnej kopii jazdy. Sprawdź wolne miejsce urządzenia.'))
    }, 10_000)
    return () => window.clearInterval(checkpoint)
  }, [sessionId, rideSummary, queueDraftSave, activeDraftSnapshot])

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
    if (rideSummary) return undefined
    let cancelled = false
    let unsubscribe = () => undefined
    let lastAccepted = null

    startRideTracking(
      (position) => {
        if (cancelled) return
        const { latitude, longitude, speed, accuracy: acc, heading: gpsHeading } =
          position.coords
        const point = { lat: latitude, lng: longitude }

        setGpsSearching(false)
        // Drop very inaccurate fixes (common indoors / cold start); until a good
        // one arrives, a rough fix still puts the rider on the map.
        if (Number.isFinite(acc) && acc > MAX_ACCURACY_M) {
          setAccuracy(acc)
          if (!lastAccepted && acc <= MAX_FIRST_FIX_ACCURACY_M) {
            setUserPos(point)
            setGeoError('')
          }
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
        if (cancelled) return
        if (error?.code === 3) setGpsSearching(true)
        setGeoError(geoErrorMessage(error))
      },
      { preferBackground: true },
    ).then((stop) => {
      unsubscribe = typeof stop === 'function' ? stop : () => undefined
    })

    return () => {
      cancelled = true
      Promise.resolve(unsubscribe()).catch(() => undefined)
    }
  }, [rideSummary])

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
    let cancelled = false
    let release = () => undefined
    keepAwake().then((fn) => {
      if (cancelled) {
        Promise.resolve(fn?.()).catch(() => undefined)
        return
      }
      release = fn || (() => undefined)
    })
    lockPortrait()
    trackEvent('ride_start', { mode: mode || 'unknown' })
    return () => {
      cancelled = true
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
      clientRequestId: sessionId,
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

  const handleExitRequest = async () => {
    const summary = buildRideSummary()
    if (summary.distanceMeters >= 40 || summary.durationSeconds >= 45) {
      rideFinishedRef.current = true
      setRideSummary(summary)
      try {
        await queueDraftSave({
          ...activeDraftSnapshot(),
          status: 'completed',
          summary,
        })
      } catch {
        setSaveRideError('Nie udało się zachować jazdy na tym urządzeniu. Zwolnij miejsce i spróbuj ponownie.')
      }
      return
    }
    rideFinishedRef.current = true
    void draftWriteRef.current
      .catch(() => undefined)
      .then(() => deleteRideDraft(sessionId))
      .catch(() => undefined)
      .finally(() => onExit())
  }

  const handleCloseSummary = async () => {
    if (!rideSummary || isSavingRide) return
    setIsSavingRide(true)
    setSaveRideError('')
    try {
      const result = await onRideComplete?.(rideSummary)
      onExit(result?.saved === false ? sessionId : undefined)
    } catch (error) {
      setSaveRideError(error.message || 'Nie udało się zapisać jazdy. Spróbuj ponownie.')
    } finally {
      setIsSavingRide(false)
    }
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
  // react-leaflet's GeoJSON ignores new data; a new key redraws a recalculated route.
  const routeLineKey = `${coordinates.length}:${coordinates[0]}:${coordinates[coordinates.length - 1]}`

  if (rideSummary) {
    return (
      <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-ink/60 p-3 sm:items-center">
        <div
          className="w-full max-w-md rounded-[28px] bg-vanilla p-5 text-ink shadow-[0_24px_60px_rgba(42,26,18,0.35)]"
          style={{ marginBottom: 'var(--safe-area-inset-bottom,env(safe-area-inset-bottom))' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B4E3D]">Koniec jazdy</p>
          <h2 className="mt-1 font-serif text-[28px] font-medium leading-tight">{routeName || 'Trasa'}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['Dystans', formatDistance(rideSummary.distanceMeters)],
              ['Czas', formatDuration(rideSummary.durationSeconds)],
              ['Średnia', rideSummary.avgSpeedKmh > 0 ? `${rideSummary.avgSpeedKmh.toFixed(1)} km/h` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-3">
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B4E3D]">{label}</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {resumeDraft?.status === 'completed' && !saveRideError && (
            <p className="mt-3 rounded-2xl bg-sage-soft px-3.5 py-2.5 text-sm text-[#1F4D3B]">
              Odzyskano niezapisaną jazdę z tego urządzenia.
            </p>
          )}
          {saveRideError && (
            <p role="alert" className="mt-3 rounded-2xl border border-[#E9A08A] bg-[#FDE7DF] px-3.5 py-2.5 text-sm text-[#6E1C12]">
              {saveRideError}
            </p>
          )}
          <button
            type="button"
            onClick={handleCloseSummary}
            disabled={isSavingRide}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-burnt-orange text-base font-bold text-ink disabled:opacity-60"
          >
            {isSavingRide ? 'Zapisywanie…' : saveRideError ? 'Spróbuj zapisać ponownie' : 'Zapisz i zamknij'}
          </button>
          {saveRideError && (
            <button
              type="button"
              onClick={() => onExit(sessionId)}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-ink text-sm font-bold"
            >
              Wróć do planera — zachowaj lokalnie
            </button>
          )}
        </div>
      </div>
    )
  }

  const remaining = formatDistance(navState ? navState.remainingDistance : totalDistance)
  const progress = Math.round((navState?.progress || 0) * 100)

  // Top card: what to do next, or why we can't tell yet.
  let status
  if (isPaused) {
    status = (
      <CardRow icon={<IconPlayerPause size={26} />} tone="sand" title="Jazda wstrzymana">
        Nawigacja i zapis śladu czekają. Wznów, gdy ruszasz.
      </CardRow>
    )
  } else if (geoError) {
    status = (
      <CardRow icon={<IconMapPinOff size={26} />} tone="alert" title="Brak lokalizacji">
        {geoError}
      </CardRow>
    )
  } else if (!userPos) {
    status = (
      <CardRow icon={<span className="h-3 w-3 animate-ping rounded-full bg-ink" />} tone="orange" title="Szukam sygnału GPS…">
        {gpsSearching
          ? 'To trwa dłużej niż zwykle. W budynku GPS często nie działa — wyjdź na zewnątrz.'
          : 'Za chwilę pokażemy Twoją pozycję na trasie.'}
      </CardRow>
    )
  } else if (navState?.isOffRoute) {
    status = (
      <div className="space-y-2.5">
        <CardRow
          icon={isRecalculating ? <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-ink/25 border-t-ink" /> : <IconAlertTriangle size={26} />}
          tone="sand"
          title={isRecalculating ? 'Przeliczam trasę…' : 'Poza trasą'}
        >
          {isRecalculating
            ? 'Szukam nowej drogi z Twojej pozycji.'
            : `Jesteś ${formatDistance(navState.offRouteDistance)} od trasy.`}
        </CardRow>
        {!isRecalculating && (
          <button
            type="button"
            onClick={handleRecalculateRoute}
            className="flex h-11 w-full items-center justify-center rounded-full bg-burnt-orange text-[15px] font-bold text-ink"
          >
            Przelicz trasę do celu
          </button>
        )}
        {recalcError && <p className="rounded-2xl bg-[#FDE7DF] px-3.5 py-2 text-sm text-[#6E1C12]">{recalcError}</p>}
      </div>
    )
  } else if (navState?.isArriving) {
    status = (
      <CardRow icon={<IconFlag size={26} />} tone="orange" title="Dojeżdżasz do celu">
        Jeszcze {remaining}.
      </CardRow>
    )
  } else if (nextManeuver) {
    status = (
      <div className="flex items-center gap-3.5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-burnt-orange text-ink">
          <ManeuverIcon type={nextManeuver.type} size={38} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[34px] font-semibold leading-none tabular-nums">
            {formatDistance(navState.distanceToManeuver)}
          </p>
          <p className="mt-1 truncate text-[15px] text-vanilla-deep">
            {nextManeuver.instruction || getManeuverVisual(nextManeuver.type).label}
          </p>
        </div>
      </div>
    )
  } else {
    status = (
      <CardRow icon={<IconArrowUp size={26} />} tone="orange" title="Jedź wzdłuż trasy">
        Podpowiemy przed kolejnym skrętem.
      </CardRow>
    )
  }

  return (
    <div className="fixed inset-0 z-[3000] overflow-hidden bg-[#EFE3C4] font-sans text-ink">
      <div className={`absolute inset-0 transition ${isPaused ? 'saturate-50' : ''}`}>
        <MapContainer
          center={[52.0, 19.2]}
          zoom={15}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution={getMapTileLayer().attribution}
            url={getMapTileLayer().url}
            maxZoom={getMapTileLayer().maxZoom}
          />
          {routeLine && (
            <>
              <GeoJSON key={`casing-${routeLineKey}`} data={routeLine} style={{ color: '#FFFFFF', weight: 11, opacity: 0.9 }} />
              <GeoJSON key={`line-${routeLineKey}`} data={routeLine} style={{ color: '#FC6C26', weight: 6, opacity: 1 }} />
            </>
          )}
          {destination && (
            <CircleMarker
              center={[destination.lat, destination.lng]}
              radius={9}
              pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2A1A12', fillOpacity: 1 }}
            />
          )}
          {userPos && (
            <>
              {accuracy && accuracy < 200 && (
                <CircleMarker
                  center={[userPos.lat, userPos.lng]}
                  radius={Math.min(40, Math.max(8, accuracy / 3))}
                  pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.15 }}
                />
              )}
              <Marker ref={markerRef} position={[userPos.lat, userPos.lng]} icon={userIcon} zIndexOffset={1000} keyboard={false} />
            </>
          )}
          <InitialFit coordinates={coordinates} />
          <FollowController center={userPos} follow={follow} onUserDrag={() => setFollow(false)} />
        </MapContainer>
      </div>

      <div
        className="pointer-events-none absolute inset-x-3 top-0 z-[3001] space-y-2"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top,env(safe-area-inset-top)) + 10px)' }}
      >
        <section aria-label="Następny manewr" aria-live="polite" className="pointer-events-auto rounded-[26px] bg-ink p-4 text-white shadow-[0_18px_40px_rgba(42,26,18,0.35)]">
          {status}
          {!isPaused && userPos && nextManeuver && followingManeuver && !navState?.isOffRoute && (
            <p className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5 text-[13px] text-vanilla-deep">
              <span className="font-semibold text-white">Potem</span>
              <ManeuverIcon type={followingManeuver.type} size={16} className="shrink-0 text-burnt-orange" />
              <span className="truncate">{followingManeuver.instruction || getManeuverVisual(followingManeuver.type).label}</span>
            </p>
          )}
          {draftStorageError && (
            <p role="alert" className="mt-3 rounded-2xl bg-[#FDE7DF] px-3.5 py-2 text-sm text-[#6E1C12]">
              {draftStorageError}
            </p>
          )}
        </section>

        <div className="pointer-events-auto flex items-center gap-2">
          <RideButton label="Zakończ nawigację" onClick={handleExitRequest}>
            <IconX size={20} stroke={2.2} />
          </RideButton>
          <span className="flex-1" />
          {userPos && !isPaused && (
            <span className="flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-ink shadow-[0_6px_16px_rgba(42,26,18,0.14)]">
              <span className={`h-2 w-2 rounded-full ${gpsSearching ? 'bg-burnt-orange' : 'bg-sage'}`} />
              {gpsSearching ? 'Słaby GPS' : `GPS${accuracy ? ` ±${Math.round(accuracy)} m` : ''}`}
            </span>
          )}
          <RideButton
            label={voiceOn ? 'Wyłącz komunikaty głosowe' : 'Włącz komunikaty głosowe'}
            pressed={voiceOn}
            onClick={() => setVoiceOn((value) => !value)}
          >
            {voiceOn ? <IconVolume size={20} stroke={2.2} /> : <IconVolumeOff size={20} stroke={2.2} />}
          </RideButton>
          <RideButton label="Lista manewrów" pressed={showManeuverList} onClick={() => setShowManeuverList((value) => !value)}>
            <IconList size={20} stroke={2.2} />
          </RideButton>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3001] flex flex-col gap-2.5"
      >
        {!follow && userPos && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="pointer-events-auto mr-3 flex h-11 items-center gap-2 self-end rounded-full bg-ink px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(42,26,18,0.25)]"
          >
            <IconCurrentLocation size={18} stroke={2.2} className="text-burnt-orange" />
            Wyśrodkuj
          </button>
        )}

        <section
          aria-label="Postęp jazdy"
          className="pointer-events-auto rounded-t-[24px] bg-vanilla px-4 pt-3 shadow-[0_-10px_30px_rgba(42,26,18,0.16)]"
          style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom)) + 14px)' }}
        >
          {showManeuverList && (
            <div className="mb-3 max-h-[40dvh] overflow-y-auto rounded-[20px] bg-white p-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B4E3D]">
                Manewry ({maneuvers.length})
              </p>
              {maneuvers.length === 0 ? (
                <p className="px-2 pb-2 text-sm text-ink-muted">Brak instrukcji dla tej trasy.</p>
              ) : (
                <ol>
                  {maneuvers.map((maneuver, index) => {
                    const isCurrent = navState?.nextManeuver?.coordIndex === maneuver.coordIndex
                    return (
                      <li
                        key={`${maneuver.coordIndex}-${index}`}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`flex items-center gap-3 rounded-2xl px-2 py-2 text-sm ${isCurrent ? 'bg-vanilla' : ''}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isCurrent ? 'bg-burnt-orange text-ink' : 'bg-vanilla text-burnt-orange-dark'}`}>
                          <ManeuverIcon type={maneuver.type} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {maneuver.instruction || getManeuverVisual(maneuver.type).label}
                          </span>
                          <span className="text-xs text-[#6B4E3D]">
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

          <div
            role="progressbar"
            aria-label="Przejechana część trasy"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-1.5 w-full overflow-hidden rounded-full bg-vanilla-deep"
          >
            <div className="h-full rounded-full bg-burnt-orange transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-end gap-3">
            <p className="whitespace-nowrap font-serif text-[32px] font-semibold leading-none tabular-nums">
              {remaining}
              <span className="ml-1 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B4E3D]">do celu</span>
            </p>
            <span className="flex-1" />
            <p className="whitespace-nowrap text-right">
              <strong className="block text-[15px] leading-tight tabular-nums">
                {navState ? formatDuration(navState.remainingSeconds) : '—'}
              </strong>
              <span className="text-[11px] text-[#6B4E3D]">czas</span>
            </p>
            <p className="whitespace-nowrap text-right">
              <strong className="block text-[15px] leading-tight tabular-nums">
                {gpsSpeed != null ? Math.round(gpsSpeed * 3.6) : '—'}
              </strong>
              <span className="text-[11px] text-[#6B4E3D]">km/h</span>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePause}
              aria-pressed={isPaused}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-base font-bold ${
                isPaused ? 'bg-burnt-orange text-ink shadow-[0_10px_22px_rgba(224,85,24,0.26)]' : 'bg-ink text-white'
              }`}
            >
              {isPaused ? <IconPlayerPlay size={18} fill="currentColor" /> : <IconPlayerPause size={18} fill="currentColor" />}
              {isPaused ? 'Wznów jazdę' : 'Wstrzymaj'}
            </button>
            <button
              type="button"
              aria-label={showCredits ? 'Ukryj źródła mapy' : 'Źródła mapy i tras'}
              aria-expanded={showCredits}
              onClick={() => setShowCredits((value) => !value)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white font-serif text-base font-semibold italic text-ink-muted"
            >
              i
            </button>
          </div>
          {showCredits && (
            <p
              className="mt-2 text-[11px] leading-snug text-[#6B4E3D] [&_a]:underline"
              // Our own constant credits string (mapTiles.ts), not user content.
              dangerouslySetInnerHTML={{ __html: getMapTileLayer().attribution }}
            />
          )}
        </section>
      </div>
    </div>
  )
}

export default RideView
