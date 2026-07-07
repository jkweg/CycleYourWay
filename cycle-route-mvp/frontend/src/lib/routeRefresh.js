import { API_BASE } from '../api'
import {
  getFeatureCoordinates,
  getFeatureDistanceKm,
  getRouteEndpointsFromFeature,
  routeHasTurnByTurnInstructions,
  toLatLng,
} from './navigation'

export async function refreshRouteForNavigation({
  feature,
  mode,
  distanceKm,
  avoidMainRoads = false,
}) {
  if (!feature) {
    throw new Error('Brak danych trasy.')
  }

  if (mode === 'Loop') {
    const coordinates = getFeatureCoordinates(feature)
    const start = toLatLng(coordinates[0])
    if (!start) {
      throw new Error('Nie można odczytać punktu startowego trasy.')
    }

    const km = distanceKm ?? getFeatureDistanceKm(feature)
    if (!km) {
      throw new Error('Nie można ustalić dystansu pętli.')
    }

    const response = await fetch(`${API_BASE}/api/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start,
        distance: km,
        avoidMainRoads,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Nie udało się odświeżyć pętli.')
    }

    const refreshed = data?.features?.[0]
    if (!refreshed) {
      throw new Error('Serwer nie zwrócił trasy z nawigacją.')
    }
    return refreshed
  }

  const endpoints = getRouteEndpointsFromFeature(feature)
  if (!endpoints) {
    throw new Error('Nie można odczytać punktów trasy A → B.')
  }

  const response = await fetch(`${API_BASE}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start: endpoints.start,
      end: endpoints.end,
      profile: 'cycling-mountain',
      avoidMainRoads,
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

export async function ensureNavigableFeature({
  feature,
  mode,
  distanceKm,
  avoidMainRoads = false,
}) {
  if (routeHasTurnByTurnInstructions(feature)) {
    return { feature, refreshed: false }
  }

  const refreshedFeature = await refreshRouteForNavigation({
    feature,
    mode,
    distanceKm,
    avoidMainRoads,
  })

  if (!routeHasTurnByTurnInstructions(refreshedFeature)) {
    throw new Error('Nie udało się przygotować instrukcji nawigacji dla tej trasy.')
  }

  return { feature: refreshedFeature, refreshed: true }
}
