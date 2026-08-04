import type {
  LatLng,
  LngLatTuple,
  Maneuver,
  ManeuverVisual,
  NavState,
  RouteFeature,
} from '../types/geo'

const EARTH_RADIUS_M = 6371000

const toRad = (value: number) => (value * Math.PI) / 180

export const haversineMeters = (a: LatLng | null | undefined, b: LatLng | null | undefined): number => {
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

const toDeg = (value: number) => (value * 180) / Math.PI

export const bearingDegrees = (
  a: LatLng | null | undefined,
  b: LatLng | null | undefined,
): number | null => {
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

const MANEUVER_TYPES: Record<number, ManeuverVisual> = {
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

export const getManeuverVisual = (type: number | undefined): ManeuverVisual =>
  (type != null && MANEUVER_TYPES[type]) || { icon: '↑', label: 'Jedź dalej' }

export const toLatLng = (coordinate: LngLatTuple | number[] | null | undefined): LatLng | null => {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null
  return { lng: coordinate[0], lat: coordinate[1] }
}

export const getFeatureCoordinates = (feature: RouteFeature | null | undefined): LngLatTuple[] => {
  const full = feature?.properties?.cyw_full_coordinates
  if (Array.isArray(full) && full.length >= 2) return full

  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates as LngLatTuple[]
  }
  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as LngLatTuple[][]).flat()
  }
  return []
}

export const buildCumulativeDistances = (coordinates: LngLatTuple[]): number[] => {
  const cumulative = new Array<number>(coordinates.length).fill(0)
  for (let i = 1; i < coordinates.length; i += 1) {
    const prev = toLatLng(coordinates[i - 1])
    const curr = toLatLng(coordinates[i])
    cumulative[i] = cumulative[i - 1] + haversineMeters(prev, curr)
  }
  return cumulative
}

export const extractManeuvers = (feature: RouteFeature | null | undefined): Maneuver[] => {
  const coordinates = getFeatureCoordinates(feature)
  const segments = feature?.properties?.segments
  if (!Array.isArray(segments) || coordinates.length === 0) return []

  const maneuvers: Maneuver[] = []
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
        endIndex: Number.isInteger(wayPoints[1]) ? wayPoints[1]! : coordIndex,
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

export const routeHasTurnByTurnInstructions = (
  feature: RouteFeature | null | undefined,
): boolean => {
  const segments = feature?.properties?.segments
  if (!Array.isArray(segments) || segments.length === 0) return false

  return segments.some(
    (segment) =>
      Array.isArray(segment?.steps) &&
      segment.steps.some(
        (step) => typeof step?.instruction === 'string' && step.instruction.trim().length > 0,
      ),
  )
}

export const getRouteEndpointsFromFeature = (
  feature: RouteFeature | null | undefined,
): { start: LatLng; end: LatLng } | null => {
  const coordinates = getFeatureCoordinates(feature)
  if (coordinates.length < 2) return null

  const start = toLatLng(coordinates[0])
  const end = toLatLng(coordinates[coordinates.length - 1])
  if (!start || !end) return null

  return { start, end }
}

export const sampleWaypointsFromCoordinates = (
  coordinates: LngLatTuple[] | null | undefined,
  { maxPoints = 24 }: { maxPoints?: number } = {},
): LatLng[] => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return []

  const limit = Math.max(2, Math.min(maxPoints, 50))
  if (coordinates.length <= limit) {
    return coordinates.map(toLatLng).filter((point): point is LatLng => Boolean(point))
  }

  const waypoints: LatLng[] = []
  const step = (coordinates.length - 1) / (limit - 1)
  for (let i = 0; i < limit; i += 1) {
    const index = Math.round(i * step)
    const point = toLatLng(coordinates[index])
    if (!point) continue
    const prev = waypoints[waypoints.length - 1]
    if (prev && prev.lat === point.lat && prev.lng === point.lng) continue
    waypoints.push(point)
  }

  if (waypoints.length < 2) return []
  return waypoints
}

export const sampleWaypointsAlongFeature = (
  feature: RouteFeature | null | undefined,
  options?: { maxPoints?: number },
): LatLng[] => sampleWaypointsFromCoordinates(getFeatureCoordinates(feature), options)

export const getFeatureDistanceKm = (feature: RouteFeature | null | undefined): number | null => {
  const summaryDistance = feature?.properties?.summary?.distance
  if (typeof summaryDistance === 'number') {
    return Math.max(1, Math.round(summaryDistance / 100) / 10)
  }

  const coordinates = getFeatureCoordinates(feature)
  if (coordinates.length < 2) return null

  const cumulative = buildCumulativeDistances(coordinates)
  const meters = cumulative[cumulative.length - 1] || 0
  return Math.max(1, Math.round(meters / 100) / 10)
}

export const findNearestIndex = (
  coordinates: LngLatTuple[],
  user: LatLng,
  hintIndex = 0,
): { index: number; distance: number } => {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  const windowRadius = 500
  const backtrackWindow = 8
  const start = Math.max(0, hintIndex - backtrackWindow)
  const end = Math.min(coordinates.length, hintIndex + windowRadius)

  const scan = (from: number, to: number) => {
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

  if (bestDistance > 220) {
    bestDistance = Number.POSITIVE_INFINITY
    bestIndex = start
    scan(start, coordinates.length)
  }

  return { index: bestIndex, distance: bestDistance }
}

export const formatDistance = (meters: number): string => {
  if (!Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

export type ComputeNavStateArgs = {
  coordinates: LngLatTuple[]
  cumulative: number[]
  maneuvers: Maneuver[]
  user: LatLng
  hintIndex?: number
  averageSpeedMps?: number
  accuracyMeters?: number | null
}

export const computeNavState = ({
  coordinates,
  cumulative,
  maneuvers,
  user,
  hintIndex = 0,
  averageSpeedMps = 4.5,
  accuracyMeters = null,
}: ComputeNavStateArgs): NavState | null => {
  if (!coordinates.length) return null

  const nearest = findNearestIndex(coordinates, user, hintIndex)
  const totalDistance = cumulative[cumulative.length - 1] || 0
  const traveled = cumulative[nearest.index] || 0
  const remainingDistance = Math.max(0, totalDistance - traveled)

  const nextManeuver =
    maneuvers.find((maneuver) => maneuver.coordIndex > nearest.index) ||
    maneuvers[maneuvers.length - 1] ||
    null

  let distanceToManeuver: number | null = null
  if (nextManeuver) {
    const maneuverDistanceAlong = cumulative[nextManeuver.coordIndex] || totalDistance
    distanceToManeuver = Math.max(0, maneuverDistanceAlong - traveled)
  }

  const followingManeuver = nextManeuver
    ? maneuvers.find((maneuver) => maneuver.coordIndex > nextManeuver.coordIndex) || null
    : null

  const offRouteThreshold = Math.max(
    70,
    Number.isFinite(accuracyMeters) && accuracyMeters != null ? accuracyMeters * 1.8 : 0,
  )
  const hasUsableAccuracy = !Number.isFinite(accuracyMeters) || (accuracyMeters ?? 0) <= 85
  const isOffRoute = hasUsableAccuracy && nearest.distance > offRouteThreshold
  const remainingSeconds = remainingDistance / averageSpeedMps

  return {
    nearestIndex: nearest.index,
    offRouteDistance: nearest.distance,
    offRouteThreshold,
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
