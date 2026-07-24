import { API_BASE } from '../api'
import {
  getFeatureDistanceKm,
  routeHasTurnByTurnInstructions,
  sampleWaypointsAlongFeature,
  sampleWaypointsFromCoordinates,
} from './navigation'
import { buildRoutePreferencePayload } from './routePreferences'

async function fetchRouteThroughWaypoints({ waypoints, ...preferences }) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('Za mało punktów do odświeżenia trasy.')
  }

  const response = await fetch(`${API_BASE}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      waypoints,
      ...buildRoutePreferencePayload(preferences),
    }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || 'Nie udało się odświeżyć trasy.')
  }

  const refreshed = data?.features?.[0]
  if (!refreshed) {
    throw new Error('Serwer nie zwrócił trasy z nawigacją.')
  }
  return refreshed
}

/**
 * Re-request turn-by-turn instructions while following the saved geometry
 * (via sampled waypoints). Avoids regenerating a random ORS loop seed.
 */
export async function refreshRouteForNavigation({
  feature,
  ...preferences
}) {
  if (!feature) {
    throw new Error('Brak danych trasy.')
  }

  const waypoints = sampleWaypointsAlongFeature(feature, { maxPoints: 24 })
  if (waypoints.length < 2) {
    throw new Error('Nie można odczytać geometrii zapisanej trasy.')
  }

  return fetchRouteThroughWaypoints({ waypoints, ...preferences })
}

export async function ensureNavigableFeature({
  feature,
  mode,
  distanceKm,
  ...preferences
}) {
  if (routeHasTurnByTurnInstructions(feature)) {
    return { feature, refreshed: false }
  }

  // distanceKm / mode kept for callers; refresh follows saved geometry.
  void mode
  void distanceKm

  const refreshedFeature = await refreshRouteForNavigation({
    feature,
    ...preferences,
  })

  if (!routeHasTurnByTurnInstructions(refreshedFeature)) {
    throw new Error('Nie udało się przygotować instrukcji nawigacji dla tej trasy.')
  }

  return { feature: refreshedFeature, refreshed: true }
}

export { sampleWaypointsFromCoordinates, getFeatureDistanceKm }
