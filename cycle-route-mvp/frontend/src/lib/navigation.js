const EARTH_RADIUS_M = 6371000

const toRad = (value) => (value * Math.PI) / 180

export const haversineMeters = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

const toDeg = (value) => (value * 180) / Math.PI

// Azymut (0-360°, 0 = północ, rośnie zgodnie z ruchem wskazówek zegara)
// z punktu a do punktu b.
export const bearingDegrees = (a, b) => {
  if (!a || !b) return null
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}

// ORS step.type -> ikona + krótki opis kierunku
const MANEUVER_TYPES = {
  0: { icon: '↰', label: 'W lewo' },
  1: { icon: '↱', label: 'W prawo' },
  2: { icon: '⮰', label: 'Ostro w lewo' },
  3: { icon: '⮱', label: 'Ostro w prawo' },
  4: { icon: '↖', label: 'Lekko w lewo' },
  5: { icon: '↗', label: 'Lekko w prawo' },
  6: { icon: '↑', label: 'Prosto' },
  7: { icon: '↻', label: 'Wjazd na rondo' },
  8: { icon: '↻', label: 'Zjazd z ronda' },
  9: { icon: '⤺', label: 'Zawróć' },
  10: { icon: '⚑', label: 'Cel' },
  11: { icon: '●', label: 'Start' },
  12: { icon: '↖', label: 'Trzymaj się lewej' },
  13: { icon: '↗', label: 'Trzymaj się prawej' },
}

export const getManeuverVisual = (type) =>
  MANEUVER_TYPES[type] || { icon: '↑', label: 'Jedź dalej' }

export const toLatLng = (coordinate) => {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null
  return { lng: coordinate[0], lat: coordinate[1] }
}

export const getFeatureCoordinates = (feature) => {
  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'LineString') return geometry.coordinates
  if (geometry.type === 'MultiLineString') return geometry.coordinates.flat()
  return []
}

// Łączna odległość (m) wzdłuż trasy do każdego z punktów geometrii.
export const buildCumulativeDistances = (coordinates) => {
  const cumulative = new Array(coordinates.length).fill(0)
  for (let i = 1; i < coordinates.length; i += 1) {
    const prev = toLatLng(coordinates[i - 1])
    const curr = toLatLng(coordinates[i])
    cumulative[i] = cumulative[i - 1] + haversineMeters(prev, curr)
  }
  return cumulative
}

// Spłaszcza segmenty ORS w jedną listę manewrów z lokalizacją na trasie.
export const extractManeuvers = (feature) => {
  const coordinates = getFeatureCoordinates(feature)
  const segments = feature?.properties?.segments
  if (!Array.isArray(segments) || coordinates.length === 0) return []

  const maneuvers = []
  for (const segment of segments) {
    const steps = Array.isArray(segment?.steps) ? segment.steps : []
    for (const step of steps) {
      const wayPoints = Array.isArray(step?.way_points) ? step.way_points : []
      const coordIndex = Number.isInteger(wayPoints[0]) ? wayPoints[0] : null
      if (coordIndex === null) continue
      const location = toLatLng(coordinates[coordIndex])
      if (!location) continue

      maneuvers.push({
        coordIndex,
        endIndex: Number.isInteger(wayPoints[1]) ? wayPoints[1] : coordIndex,
        location,
        instruction: step.instruction || '',
        name: step.name && step.name !== '-' ? step.name : '',
        distance: typeof step.distance === 'number' ? step.distance : 0,
        duration: typeof step.duration === 'number' ? step.duration : 0,
        type: typeof step.type === 'number' ? step.type : 6,
      })
    }
  }
  return maneuvers
}

// Najbliższy punkt geometrii względem pozycji użytkownika.
export const findNearestIndex = (coordinates, user, hintIndex = 0) => {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  // Szukamy w oknie wokół ostatniej pozycji, aby uniknąć "przeskoków"
  // na trasach, które zbliżają się do siebie (pętle).
  const windowRadius = 400
  const start = Math.max(0, hintIndex - 40)
  const end = Math.min(coordinates.length, hintIndex + windowRadius)

  const scan = (from, to) => {
    for (let i = from; i < to; i += 1) {
      const point = toLatLng(coordinates[i])
      const distance = haversineMeters(user, point)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
  }

  scan(start, end)

  // Jeśli wynik w oknie jest podejrzanie daleki, przeszukaj całość.
  if (bestDistance > 120) {
    bestDistance = Number.POSITIVE_INFINITY
    bestIndex = 0
    scan(0, coordinates.length)
  }

  return { index: bestIndex, distance: bestDistance }
}

export const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

// Stan nawigacji na podstawie pozycji użytkownika i danych trasy.
export const computeNavState = ({
  coordinates,
  cumulative,
  maneuvers,
  user,
  hintIndex = 0,
  averageSpeedMps = 4.5,
}) => {
  if (!coordinates.length) return null

  const nearest = findNearestIndex(coordinates, user, hintIndex)
  const totalDistance = cumulative[cumulative.length - 1] || 0
  const traveled = cumulative[nearest.index] || 0
  const remainingDistance = Math.max(0, totalDistance - traveled)

  const nextManeuver =
    maneuvers.find((maneuver) => maneuver.coordIndex > nearest.index) ||
    maneuvers[maneuvers.length - 1] ||
    null

  let distanceToManeuver = null
  if (nextManeuver) {
    const maneuverDistanceAlong = cumulative[nextManeuver.coordIndex] || totalDistance
    distanceToManeuver = Math.max(0, maneuverDistanceAlong - traveled)
  }

  const followingManeuver = nextManeuver
    ? maneuvers.find((maneuver) => maneuver.coordIndex > nextManeuver.coordIndex) || null
    : null

  const isOffRoute = nearest.distance > 45
  const remainingSeconds = remainingDistance / averageSpeedMps

  return {
    nearestIndex: nearest.index,
    offRouteDistance: nearest.distance,
    isOffRoute,
    remainingDistance,
    remainingSeconds,
    progress: totalDistance > 0 ? Math.min(1, traveled / totalDistance) : 0,
    nextManeuver,
    followingManeuver,
    distanceToManeuver,
    isArriving: remainingDistance < 30,
  }
}
