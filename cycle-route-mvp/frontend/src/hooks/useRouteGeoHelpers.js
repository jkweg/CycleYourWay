import { useCallback } from 'react'
import {
  buildRouteAlternatives,
  getLineCoordinates,
  getRouteSummary,
  pointFromCoordinate,
} from '../lib/routeStats'

/**
 * Pure helpers extracted from App for planner deep-links / loaders.
 * Keeps App thinner without a full rewrite.
 */
export function useRouteGeoHelpers() {
  const summarizeSelected = useCallback((feature) => getRouteSummary(feature), [])

  const alternativesFromGeoJson = useCallback(
    (routeGeoJson) => buildRouteAlternatives(routeGeoJson),
    [],
  )

  const endpointsFromFeature = useCallback((feature) => {
    const coordinates = getLineCoordinates(feature)
    return {
      start: pointFromCoordinate(coordinates[0]),
      end: pointFromCoordinate(coordinates[coordinates.length - 1]),
    }
  }, [])

  return { summarizeSelected, alternativesFromGeoJson, endpointsFromFeature }
}

export function parsePlannerQuery(search = window.location.search) {
  const params = new URLSearchParams(search)
  return {
    rideId: params.get('ride'),
    shareId: params.get('share'),
  }
}
