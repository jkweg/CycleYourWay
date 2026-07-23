import { describe, expect, it } from 'vitest'
import {
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
})
