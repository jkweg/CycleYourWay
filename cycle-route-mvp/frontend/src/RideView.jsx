import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
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

// Marker pozycji użytkownika: strzałka kierunku (gdy znamy heading) lub kropka.
const buildUserIcon = (heading) => {
  const hasHeading = heading != null && Number.isFinite(heading)
  const html = hasHeading
    ? `<div style="width:32px;height:32px;transform:rotate(${heading}deg);transition:transform 0.3s ease-out;">
         <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
           <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
           <path d="M16 6 L22 22 L16 18 L10 22 Z" fill="#ffffff"/>
         </svg>
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
        duration: 0.9,
        easeLinearity: 0.25,
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

function RideView({ feature, routeName, mode, onExit }) {
  const coordinates = useMemo(() => getFeatureCoordinates(feature), [feature])
  const cumulative = useMemo(() => buildCumulativeDistances(coordinates), [coordinates])
  const maneuvers = useMemo(() => extractManeuvers(feature), [feature])

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

  const hintRef = useRef(0)
  const spokenRef = useRef(null)
  const prevPosRef = useRef(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy: acc, heading: gpsHeading } =
          position.coords
        const point = { lat: latitude, lng: longitude }

        // Kierunek: najpierw z GPS (gdy jedziemy), w innym wypadku liczymy
        // azymut z przesunięcia względem poprzedniej pozycji.
        let nextHeading = null
        if (Number.isFinite(gpsHeading) && (!Number.isFinite(speed) || speed > 0.5)) {
          nextHeading = gpsHeading
        } else if (prevPosRef.current) {
          const moved = haversineMeters(prevPosRef.current, point)
          if (moved > 4) nextHeading = bearingDegrees(prevPosRef.current, point)
        }
        if (nextHeading != null) setHeading(nextHeading)
        prevPosRef.current = point

        setUserPos(point)
        setGpsSpeed(Number.isFinite(speed) ? speed : null)
        setAccuracy(Number.isFinite(acc) ? acc : null)
        setGeoError('')
      },
      (error) => setGeoError(geoErrorMessage(error)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 25000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    if (!userPos || coordinates.length === 0) return
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
  }, [userPos, gpsSpeed, coordinates, cumulative, maneuvers])

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
    if (!voiceOn || !navState?.nextManeuver) return
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
  }, [navState, voiceOn])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const routeLine = useMemo(() => {
    if (!feature) return null
    return { type: 'FeatureCollection', features: [feature] }
  }, [feature])

  const userIcon = useMemo(() => buildUserIcon(heading), [heading])

  const nextManeuver = navState?.nextManeuver || null
  const followingManeuver = navState?.followingManeuver || null
  const maneuverVisual = nextManeuver ? getManeuverVisual(nextManeuver.type) : null

  const lineColor = mode === 'Loop' ? '#7a6248' : '#2e5f43'

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
              onClick={onExit}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              ← Zakończ
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-emerald-100">
              {routeName || 'Trasa'}
            </p>
            <button
              type="button"
              onClick={() => setVoiceOn((value) => !value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                voiceOn ? 'bg-emerald-500 text-[#10231a]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-pressed={voiceOn}
            >
              {voiceOn ? '🔊 Głos' : '🔈 Głos'}
            </button>
          </div>

          {geoError ? (
            <p className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {geoError}
            </p>
          ) : !userPos ? (
            <p className="mt-3 text-sm text-emerald-100/80">Ustalanie pozycji GPS…</p>
          ) : navState?.isOffRoute ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="text-base font-semibold text-amber-200">Poza trasą</p>
                <p className="text-sm text-emerald-100/80">
                  Wróć na wyznaczoną drogę ({formatDistance(navState.offRouteDistance)} od trasy).
                </p>
              </div>
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
