import { describe, expect, it } from 'vitest'
import {
  buildCumulativeDistances,
  computeNavState,
  findNearestIndex,
  sampleWaypointsFromCoordinates,
} from './navigation'
import { buildRejoinWaypoints } from './offRouteRecalc'

describe('navigation waypoints', () => {
  it('samples evenly spaced waypoints along a line', () => {
    const coordinates = Array.from({ length: 100 }, (_, index) => [index * 0.01, 0])
    const waypoints = sampleWaypointsFromCoordinates(coordinates, { maxPoints: 5 })
    expect(waypoints).toHaveLength(5)
    expect(waypoints[0]).toEqual({ lng: 0, lat: 0 })
    expect(waypoints[waypoints.length - 1].lng).toBeCloseTo(0.99, 5)
  })

  it('builds rejoin waypoints from current user position', () => {
    const feature = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0.01, 0],
          [0.02, 0],
          [0.03, 0],
          [0.04, 0],
        ],
      },
    }

    const waypoints = buildRejoinWaypoints(feature, { lat: 0, lng: 0.015 }, 1)
    expect(waypoints.length).toBeGreaterThanOrEqual(2)
    expect(waypoints[0]).toEqual({ lat: 0, lng: 0.015 })
    expect(waypoints[waypoints.length - 1]).toEqual({ lat: 0, lng: 0.04 })
  })

  it('keeps nearest matching near the current route progress', () => {
    const coordinates = [
      [0, 0],
      [0.001, 0],
      [0.002, 0],
      [0.003, 0],
      [0.004, 0],
      [0.004, 0.001],
      [0.003, 0.001],
      [0.002, 0.001],
      [0.001, 0.001],
      [0, 0.001],
    ]

    const nearest = findNearestIndex(coordinates, { lat: 0.001, lng: 0.002 }, 7)

    expect(nearest.index).toBeGreaterThanOrEqual(5)
  })

  it('uses GPS accuracy when deciding off-route state', () => {
    const coordinates = [
      [0, 0],
      [0.001, 0],
      [0.002, 0],
    ]
    const cumulative = buildCumulativeDistances(coordinates)

    const state = computeNavState({
      coordinates,
      cumulative,
      maneuvers: [],
      user: { lat: 0.00045, lng: 0.001 },
      accuracyMeters: 40,
    })

    expect(state.isOffRoute).toBe(false)
    expect(state.offRouteThreshold).toBeGreaterThanOrEqual(70)
  })
})
