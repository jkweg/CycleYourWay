// Client-side limits for rows written to Supabase. The database enforces looser
// limits (supabase/migrations/20261007_r07_data_constraints.sql), so a payload that
// passes these checks never hits a check_violation.

export const ROUTE_NAME_MAX = 120 // DB: 200
export const TAGS_MAX = 8 // DB: 8
export const TAG_MAX = 40 // DB: 40
export const DISPLAY_NAME_MAX = 80 // DB: 100
export const HOME_AREA_MAX = 160 // DB: 200
// DB limit is 6 MiB measured on jsonb::text, which is wider than JSON.stringify.
export const GEOJSON_MAX_BYTES = 4 * 1024 * 1024

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

export function clampText(value, max) {
  return Array.from(String(value ?? '').replace(CONTROL_CHARS, ' ').trim())
    .slice(0, max)
    .join('')
    .trim()
}

export function normalizeTags(input) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(',')
  const tags = []
  for (const item of raw) {
    const tag = clampText(item, TAG_MAX)
    if (tag && !tags.includes(tag)) tags.push(tag)
    if (tags.length === TAGS_MAX) break
  }
  return tags
}

export function jsonByteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value ?? null)).length
}

// Keeps a recorded ride savable: halves the LineString resolution (first and last
// point always kept) until the track fits. Distance/duration are computed before
// this, so only the drawn track loses detail.
export function fitTrackGeoJson(track, maxBytes = GEOJSON_MAX_BYTES) {
  if (!track || jsonByteLength(track) <= maxBytes) return track
  let coordinates = track.geometry?.coordinates
  if (!Array.isArray(coordinates)) return null

  let fitted = track
  while (coordinates.length > 2 && jsonByteLength(fitted) > maxBytes) {
    const last = coordinates[coordinates.length - 1]
    coordinates = coordinates.filter((_, index) => index % 2 === 0)
    if (coordinates[coordinates.length - 1] !== last) coordinates.push(last)
    fitted = { ...track, geometry: { ...track.geometry, coordinates } }
  }
  return jsonByteLength(fitted) <= maxBytes ? fitted : null
}

// Saved route GeoJSON with the selected feature first. Alternatives are dropped
// when they would push the row over the limit; null means even one is too big.
export function buildSavedRouteGeoJson(selected, remaining = [], maxBytes = GEOJSON_MAX_BYTES) {
  for (const features of [[selected, ...remaining], [selected]]) {
    const geojson = { type: 'FeatureCollection', features }
    if (jsonByteLength(geojson) <= maxBytes) return geojson
  }
  return null
}

export function isCheckViolation(error) {
  return error?.code === '23514' || /violates check constraint/i.test(String(error?.message || ''))
}
