/** Shared geo / route domain types used across planner + ride. */

export type LatLng = {
  lat: number
  lng: number
}

/** GeoJSON [lng, lat] pair (and optional elevation). */
export type LngLatTuple = [number, number] | [number, number, number]

export type ManeuverVisual = {
  icon: string
  label: string
}

export type Maneuver = {
  coordIndex: number
  endIndex: number
  location: LatLng
  instruction: string
  name: string
  distance: number
  duration: number
  type: number
}

export type RouteFeatureProperties = {
  summary?: {
    distance?: number
    duration?: number
  }
  segments?: Array<{
    steps?: Array<{
      instruction?: string
      name?: string
      distance?: number
      duration?: number
      type?: number
      way_points?: number[]
    }>
  }>
  extras?: {
    surface?: { summary?: Array<{ value?: number; amount?: number }> }
    steepness?: { summary?: Array<{ value?: number; amount?: number }> }
    waytypes?: { summary?: Array<{ value?: number; amount?: number }> }
  }
  /** Full-resolution coordinates kept after display simplify. */
  cyw_full_coordinates?: LngLatTuple[]
  [key: string]: unknown
}

export type RouteFeature = {
  type?: string
  geometry?: {
    type?: string
    coordinates?: LngLatTuple[] | LngLatTuple[][]
  }
  properties?: RouteFeatureProperties
}

export type NavState = {
  nearestIndex: number
  offRouteDistance: number
  offRouteThreshold: number
  isOffRoute: boolean
  remainingDistance: number
  remainingSeconds: number
  progress: number
  nextManeuver: Maneuver | null
  followingManeuver: Maneuver | null
  distanceToManeuver: number | null
  isArriving: boolean
}

export type SavedRoute = {
  id: string
  name: string
  mode: string | null
  geojson: unknown
  distanceKm: number | null
  durationSeconds: number | null
  isPublic: boolean
  isFavorite: boolean
  tags: string[]
  createdAt: string | null
}

export type AuthUser = {
  id: string
  email: string
}
