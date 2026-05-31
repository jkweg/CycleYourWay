const MAX_GOOGLE_MAPS_STOPS = 10

const toLatLng = (coordinate) => {
  const lng = coordinate[0]
  const lat = coordinate[1]
  return `${lat},${lng}`
}

const sampleCoordinates = (coordinates, maxPoints) => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return []
  if (coordinates.length <= maxPoints) return coordinates

  const sampled = []
  const step = (coordinates.length - 1) / (maxPoints - 1)

  for (let index = 0; index < maxPoints; index += 1) {
    const coordinateIndex = Math.round(index * step)
    sampled.push(coordinates[coordinateIndex])
  }

  return sampled
}

/**
 * Buduje link do Google Maps z próbkowanymi punktami trasy.
 * Uwaga: Google ma limit punktów, więc to przybliżenie przebiegu, nie 1:1 GeoJSON.
 */
export const buildGoogleMapsDirectionsUrl = (coordinates) => {
  const sampled = sampleCoordinates(coordinates, MAX_GOOGLE_MAPS_STOPS)
  if (sampled.length < 2) return null

  const origin = toLatLng(sampled[0])
  const destination = toLatLng(sampled[sampled.length - 1])
  const intermediate = sampled.slice(1, -1).map(toLatLng)

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'bicycling',
  })

  if (intermediate.length > 0) {
    params.set('waypoints', intermediate.join('|'))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export const openRouteInGoogleMaps = (routeFeature) => {
  const coordinates = routeFeature?.geometry?.coordinates
  const url = buildGoogleMapsDirectionsUrl(coordinates)

  if (!url) {
    throw new Error('Nie udało się przygotować linku do Google Maps.')
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
