/** Shared route summary helpers (also used by comparison UI). */

export const SURFACE_LABELS = {
  0: 'Nieznana',
  1: 'Asfalt / utwardzona',
  2: 'Nieutwardzona',
  3: 'Asfalt',
  4: 'Beton',
  5: 'Kostka brukowa',
  6: 'Metal',
  7: 'Drewno',
  8: 'Ubity szuter',
  9: 'Drobny szuter',
  10: 'Szuter',
  11: 'Ziemia',
  12: 'Grunt',
  13: 'Lód',
  14: 'Kostka / płyty',
  15: 'Piasek',
  16: 'Wióry drzewne',
  17: 'Trawa',
  18: 'Płyty trawnikowe',
}

export const SURFACE_COLORS = [
  'bg-emerald-500',
  'bg-lime-500',
  'bg-amber-600',
  'bg-stone-500',
  'bg-green-700',
  'bg-yellow-700',
]

const MAIN_ROAD_WAYTYPES = new Set([1, 2])

export function getRouteSummary(feature) {
  const summary = feature?.properties?.summary
  const distanceMeters =
    typeof summary?.distance === 'number'
      ? summary.distance
      : typeof feature?.properties?.distance === 'number'
        ? feature.properties.distance
        : null
  const durationSeconds =
    typeof summary?.duration === 'number'
      ? summary.duration
      : typeof feature?.properties?.duration === 'number'
        ? feature.properties.duration
        : null

  if (distanceMeters === null || durationSeconds === null) return null

  return { distanceMeters, durationSeconds }
}

export function formatDurationShort(durationSeconds) {
  const totalMinutes = Math.round(durationSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}

export function getMainRoadSharePercent(feature) {
  const summary = feature?.properties?.extras?.waytype?.summary
  if (!Array.isArray(summary) || summary.length === 0) return null

  let mainRoadShare = 0
  for (const item of summary) {
    if (MAIN_ROAD_WAYTYPES.has(item?.value) && typeof item.amount === 'number') {
      mainRoadShare += item.amount
    }
  }
  return mainRoadShare
}

export function getElevationGainMeters(feature) {
  const ascent = feature?.properties?.ascent
  if (typeof ascent === 'number') return ascent

  const coords = feature?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null

  let gain = 0
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1]?.[2]
    const curr = coords[i]?.[2]
    if (typeof prev === 'number' && typeof curr === 'number' && curr > prev) {
      gain += curr - prev
    }
  }
  return gain > 0 ? gain : null
}

export function buildRouteAlternatives(routeGeoJson) {
  const features = Array.isArray(routeGeoJson?.features) ? routeGeoJson.features : []
  return features
    .map((feature, index) => {
      const summary = getRouteSummary(feature)
      if (!summary) return null
      const mainRoadShare = getMainRoadSharePercent(feature)
      const elevationGain = getElevationGainMeters(feature)
      return {
        index,
        feature,
        distanceKm: Number((summary.distanceMeters / 1000).toFixed(1)),
        durationLabel: formatDurationShort(summary.durationSeconds),
        durationSeconds: summary.durationSeconds,
        mainRoadShare:
          mainRoadShare == null ? null : Number(mainRoadShare.toFixed(1)),
        elevationGain:
          elevationGain == null ? null : Math.round(elevationGain),
      }
    })
    .filter(Boolean)
}

export function getLineCoordinates(feature) {
  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'LineString') return geometry.coordinates
  if (geometry.type === 'MultiLineString') return geometry.coordinates.flat()
  return []
}

export function pointFromCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null
  return { lat: coordinate[1], lng: coordinate[0] }
}
