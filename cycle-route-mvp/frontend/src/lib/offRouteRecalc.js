import { API_BASE } from '../api'
import { getRouteEndpointsFromFeature } from './navigation'

export async function rerouteFromPosition({ user, destination, avoidMainRoads = false }) {
  if (!user || !destination) {
    throw new Error('Brak pozycji do przeliczenia trasy.')
  }

  const response = await fetch(`${API_BASE}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start: user,
      end: destination,
      profile: 'cycling-mountain',
      avoidMainRoads,
    }),
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
