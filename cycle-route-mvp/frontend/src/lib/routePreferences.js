export const RIDE_STYLES = [
  {
    id: 'road',
    label: 'Szosa',
    hint: 'Preferuje utwardzone drogi (profil road).',
  },
  {
    id: 'gravel',
    label: 'Gravel',
    hint: 'Mieszanka asfaltu i lekkiego terenu.',
  },
  {
    id: 'mtb',
    label: 'MTB',
    hint: 'Większa tolerancja na ścieżki i teren.',
  },
]

export const CLIMB_PREFERENCES = [
  {
    id: 'easy',
    label: 'Łagodne',
    hint: 'Unika stromych podjazdów, gdy to możliwe.',
  },
  {
    id: 'normal',
    label: 'Normalne',
    hint: 'Zbalansowane podjazdy.',
  },
  {
    id: 'hard',
    label: 'Strome',
    hint: 'Akceptuje bardziej wymagające przewyższenia.',
  },
]

export const DEFAULT_RIDE_STYLE = 'gravel'
export const DEFAULT_CLIMB_PREFERENCE = 'normal'

/** Surface codes treated as asphalt-like for “prefer asphalt”. */
export const ASPHALT_SURFACE_CODES = new Set([1, 3])

export function getAsphaltSharePercent(feature) {
  const summary = feature?.properties?.extras?.surface?.summary
  if (!Array.isArray(summary) || summary.length === 0) return null

  let asphaltShare = 0
  for (const item of summary) {
    if (ASPHALT_SURFACE_CODES.has(item?.value) && typeof item.amount === 'number') {
      asphaltShare += item.amount
    }
  }
  return Number(asphaltShare.toFixed(1))
}

export function buildRoutePreferencePayload({
  rideStyle = DEFAULT_RIDE_STYLE,
  climbPreference = DEFAULT_CLIMB_PREFERENCE,
  preferAsphalt = false,
  avoidMainRoads = false,
} = {}) {
  return {
    rideStyle,
    climbPreference,
    preferAsphalt: Boolean(preferAsphalt),
    avoidMainRoads: Boolean(avoidMainRoads),
  }
}
