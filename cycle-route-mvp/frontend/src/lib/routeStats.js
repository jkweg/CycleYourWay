/** Shared route summary helpers (also used by comparison UI). */

export const SURFACE_LABELS = {
  0: 'Brak danych w mapie',
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
  'bg-orange-500',
  'bg-lime-500',
  'bg-amber-600',
  'bg-stone-500',
  'bg-orange-700',
  'bg-yellow-700',
]

/** ORS steepness codes → Polish labels (inclines only for “stromizny”). */
export const STEEPNESS_LABELS = {
  1: 'Lekki podjazd (1–3%)',
  2: 'Podjazd (4–6%)',
  3: 'Stromy podjazd (7–9%)',
  4: 'Bardzo stromy (10–15%)',
  5: 'Ekstremalny podjazd (>16%)',
  [-1]: 'Lekki zjazd (1–3%)',
  [-2]: 'Zjazd (4–6%)',
  [-3]: 'Stromy zjazd (7–9%)',
  [-4]: 'Bardzo stromy zjazd (10–15%)',
  [-5]: 'Ekstremalny zjazd (>16%)',
  0: 'Płasko',
}

const UNKNOWN_SURFACE_CODE = 0

const MAIN_ROAD_WAYTYPES = new Set([1, 2])

const EARTH_RADIUS_METERS = 6371000

const toRadians = (degrees) => (degrees * Math.PI) / 180

function distanceBetweenPointsMeters(pointA, pointB) {
  const [lonA, latA] = pointA
  const [lonB, latB] = pointB
  const dLat = toRadians(latB - latA)
  const dLon = toRadians(lonB - lonA)
  const latARad = toRadians(latA)
  const latBRad = toRadians(latB)

  const haversineValue =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latARad) *
      Math.cos(latBRad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const arc = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  return EARTH_RADIUS_METERS * arc
}

/**
 * ORS elevation can contain single-vertex outliers (0 or sudden drops).
 * Detect spikes, interpolate gaps, then lightly smooth for the chart.
 */
export function buildElevationProfile(coordinates, options = {}) {
  const { forDisplay = true, maxPoints = 360 } = options
  if (!Array.isArray(coordinates) || coordinates.length < 2) return []

  let cumulativeDistanceMeters = 0
  const raw = []

  for (let index = 0; index < coordinates.length; index += 1) {
    const point = coordinates[index]
    if (!Array.isArray(point) || point.length < 2) continue

    if (index > 0 && Array.isArray(coordinates[index - 1])) {
      cumulativeDistanceMeters += distanceBetweenPointsMeters(
        coordinates[index - 1],
        point,
      )
    }

    const elevRaw = point.length >= 3 ? Number(point[2]) : NaN
    raw.push({
      distanceKm: cumulativeDistanceMeters / 1000,
      distanceMeters: cumulativeDistanceMeters,
      elevation: Number.isFinite(elevRaw) ? elevRaw : null,
    })
  }

  if (raw.length === 0) return []

  const marked = raw.map((item) => ({ ...item }))
  for (let i = 0; i < marked.length; i += 1) {
    const curr = marked[i].elevation
    if (curr == null || !Number.isFinite(curr)) {
      marked[i].elevation = null
      continue
    }

    const prev = findNeighborElevation(marked, i, -1)
    const next = findNeighborElevation(marked, i, 1)

    if (curr <= 1 && ((prev != null && prev > 25) || (next != null && next > 25))) {
      marked[i].elevation = null
      continue
    }

    if (prev != null && next != null) {
      const dropPrev = prev - curr
      const dropNext = next - curr
      const neighborGap = Math.abs(prev - next)
      if (dropPrev > 35 && dropNext > 35 && neighborGap < 100) {
        marked[i].elevation = null
        continue
      }
    }

    if (i > 0 && marked[i - 1].elevation != null) {
      const distDelta =
        marked[i].distanceMeters - marked[i - 1].distanceMeters
      const elevDelta = Math.abs(curr - marked[i - 1].elevation)
      if (distDelta > 0 && distDelta < 80 && elevDelta > 70) {
        marked[i].elevation = null
      }
    }
  }

  // Iterative median filter: multi-point valleys contaminate a single pass.
  const window = 10
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false
    for (let i = 0; i < marked.length; i += 1) {
      if (marked[i].elevation == null) continue
      const sample = []
      for (
        let j = Math.max(0, i - window);
        j <= Math.min(marked.length - 1, i + window);
        j += 1
      ) {
        if (j === i) continue
        if (marked[j].elevation != null) sample.push(marked[j].elevation)
      }
      if (sample.length < 4) continue
      sample.sort((a, b) => a - b)
      const median = sample[Math.floor(sample.length / 2)]
      if (median - marked[i].elevation > 40) {
        marked[i].elevation = null
        changed = true
      }
    }
    if (!changed) break
  }

  // Bridge short valleys using farther good neighbors (not adjacent bad points).
  for (let i = 0; i < marked.length; i += 1) {
    if (marked[i].elevation == null) continue
    const prev = findNeighborElevation(marked, i, -1)
    const next = findNeighborElevation(marked, i, 1)
    if (prev == null || next == null) continue
    const expected = (prev + next) / 2
    const neighborGap = Math.abs(prev - next)
    if (
      expected - marked[i].elevation > 40 &&
      neighborGap < 120 &&
      marked[i].elevation < Math.min(prev, next) - 35
    ) {
      marked[i].elevation = null
    }
  }

  interpolateElevationGaps(marked)

  const firstValid = marked.find((item) => item.elevation != null)
  const lastValid = [...marked].reverse().find((item) => item.elevation != null)
  if (!firstValid || !lastValid) return []

  for (let i = 0; i < marked.length; i += 1) {
    if (marked[i].elevation == null) {
      marked[i].elevation =
        marked[i].distanceKm <= firstValid.distanceKm
          ? firstValid.elevation
          : lastValid.elevation
    }
  }

  let series = marked.map((item) => ({
    distanceKm: item.distanceKm,
    elevation: item.elevation,
  }))

  if (forDisplay && series.length >= 3) {
    series = series.map((item, index) => {
      if (index === 0 || index === series.length - 1) return item
      const prev = series[index - 1].elevation
      const curr = item.elevation
      const next = series[index + 1].elevation
      return {
        distanceKm: item.distanceKm,
        elevation: prev * 0.25 + curr * 0.5 + next * 0.25,
      }
    })
  }

  return downsampleElevationProfile(series, maxPoints).map((item) => ({
    distance: Number(item.distanceKm.toFixed(2)),
    elevation: Number(item.elevation.toFixed(1)),
  }))
}

function interpolateElevationGaps(points) {
  let lastValidIndex = -1
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].elevation == null) continue

    if (lastValidIndex >= 0 && i - lastValidIndex > 1) {
      const startElev = points[lastValidIndex].elevation
      const endElev = points[i].elevation
      const startDist = points[lastValidIndex].distanceKm
      const endDist = points[i].distanceKm
      const span = endDist - startDist || 1

      for (let j = lastValidIndex + 1; j < i; j += 1) {
        const t = (points[j].distanceKm - startDist) / span
        points[j].elevation = startElev + (endElev - startElev) * t
      }
    }

    lastValidIndex = i
  }
}

function downsampleElevationProfile(points, maxPoints) {
  if (points.length <= maxPoints) return points
  const result = []
  const step = (points.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step)
    result.push(points[index])
  }
  return result
}

function findNeighborElevation(points, index, direction) {
  for (
    let i = index + direction;
    i >= 0 && i < points.length;
    i += direction
  ) {
    const value = points[i].elevation
    if (value != null && Number.isFinite(value) && value > 0.5) return value
  }
  return null
}

export function summarizeRouteSurfaces(feature) {
  const summary = feature?.properties?.extras?.surface?.summary
  if (!Array.isArray(summary) || summary.length === 0) {
    return { known: [], unknownPercent: null }
  }

  const rows = summary
    .map((item) => {
      const code = item?.value
      const amount = typeof item?.amount === 'number' ? item.amount : null
      const distanceMeters = typeof item?.distance === 'number' ? item.distance : null
      if (amount === null || distanceMeters === null) return null
      return {
        code,
        label: SURFACE_LABELS[code] || `Typ ${code}`,
        percentage: Number(amount.toFixed(1)),
        distanceKm: Number((distanceMeters / 1000).toFixed(2)),
        isUnknown: code === UNKNOWN_SURFACE_CODE,
      }
    })
    .filter(Boolean)

  const unknown = rows.find((row) => row.isUnknown) || null
  const known = rows
    .filter((row) => !row.isUnknown)
    .sort((a, b) => b.percentage - a.percentage)
    .map((row, index) => ({
      ...row,
      colorClass: SURFACE_COLORS[index % SURFACE_COLORS.length],
    }))

  return {
    known,
    unknownPercent: unknown ? unknown.percentage : null,
    unknownDistanceKm: unknown ? unknown.distanceKm : null,
  }
}

export function summarizeRouteSteepness(feature) {
  const summary = feature?.properties?.extras?.steepness?.summary
  if (!Array.isArray(summary) || summary.length === 0) {
    return { climbs: [], totalClimbPercent: null }
  }

  const rows = summary
    .map((item) => {
      const code = item?.value
      const amount = typeof item?.amount === 'number' ? item.amount : null
      const distanceMeters = typeof item?.distance === 'number' ? item.distance : null
      if (amount === null || distanceMeters === null) return null
      if (typeof code !== 'number' || code <= 0) return null
      return {
        code,
        label: STEEPNESS_LABELS[code] || `Podjazd (${code})`,
        percentage: Number(amount.toFixed(1)),
        distanceKm: Number((distanceMeters / 1000).toFixed(2)),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.code - a.code || b.percentage - a.percentage)

  const totalClimbPercent = rows.reduce((sum, row) => sum + row.percentage, 0)

  return {
    climbs: rows,
    totalClimbPercent: rows.length
      ? Number(Math.min(100, totalClimbPercent).toFixed(1))
      : null,
  }
}

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

  const coords = getLineCoordinates(feature)
  const profile = buildElevationProfile(coords, { forDisplay: false })
  if (profile.length < 2) return null

  let gain = 0
  for (let i = 1; i < profile.length; i += 1) {
    const delta = profile[i].elevation - profile[i - 1].elevation
    if (delta > 0) gain += delta
  }
  return gain > 0 ? Math.round(gain) : null
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
