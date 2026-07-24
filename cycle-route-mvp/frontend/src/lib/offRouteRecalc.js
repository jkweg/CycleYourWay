import { API_BASE } from '../api'
import {
  findNearestIndex,
  getFeatureCoordinates,
  getRouteEndpointsFromFeature,
  sampleWaypointsFromCoordinates,
  toLatLng,
} from './navigation'
import { buildRoutePreferencePayload } from './routePreferences'

export async function rerouteFromPosition({
  user,
  destination,
  waypoints,
  ...preferences
}) {
  if (!user) {
    throw new Error('Brak pozycji do przeliczenia trasy.')
  }

  const hasWaypoints = Array.isArray(waypoints) && waypoints.length >= 2
  if (!hasWaypoints && !destination) {
    throw new Error('Brak pozycji do przeliczenia trasy.')
  }

  const payload = {
    ...buildRoutePreferencePayload(preferences),
  }

  if (hasWaypoints) {
    payload.waypoints = waypoints
  } else {
    payload.start = user
    payload.end = destination
  }

  const response = await fetch(`${API_BASE}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || 'Nie udało się przeliczyć trasy.')
  }

  const refreshed = data?.features?.[0]
  if (!refreshed) {
    throw new Error('Serwer nie zwrócił nowej trasy.')
  }

  return refreshed
}

export function getRouteDestination(feature) {
  return getRouteEndpointsFromFeature(feature)?.end ?? null
}

/**
 * Build waypoints from current GPS → remaining saved path (to finish / rejoin).
 * For loops, the path end is typically back at the start.
 */
export function buildRejoinWaypoints(feature, user, hintIndex = 0) {
  if (!user || !feature) return null

  const coordinates = getFeatureCoordinates(feature)
  if (coordinates.length < 2) return null

  const { index } = findNearestIndex(coordinates, user, hintIndex)
  const remaining = coordinates.slice(Math.max(0, index))
  if (remaining.length < 2) {
    const end = toLatLng(coordinates[coordinates.length - 1])
    if (!end) return null
    return [user, end]
  }

  const alongRoute = sampleWaypointsFromCoordinates(remaining, { maxPoints: 20 })
  if (alongRoute.length === 0) return null

  // Drop first on-route sample if it is essentially the snap point — user is start.
  const rest = alongRoute.slice(1)
  const waypoints = [user, ...(rest.length ? rest : [alongRoute[alongRoute.length - 1]])]

  // Ensure destination is present
  const end = toLatLng(coordinates[coordinates.length - 1])
  if (end) {
    const last = waypoints[waypoints.length - 1]
    if (!last || last.lat !== end.lat || last.lng !== end.lng) {
      waypoints.push(end)
    }
  }

  return waypoints.length >= 2 ? waypoints : null
}
