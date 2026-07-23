import { describe, expect, it } from 'vitest'
import {
  buildRouteAlternatives,
  formatDurationShort,
  getElevationGainMeters,
  getMainRoadSharePercent,
  getRouteSummary,
} from './routeStats'

describe('routeStats', () => {
  it('formats short durations', () => {
    expect(formatDurationShort(90)).toBe('2 min')
    expect(formatDurationShort(3700)).toBe('1 h 2 min')
  })

  it('reads summary from feature properties', () => {
    const feature = {
      properties: { summary: { distance: 12500, duration: 2400 } },
    }
    expect(getRouteSummary(feature)).toEqual({
      distanceMeters: 12500,
      durationSeconds: 2400,
    })
  })

  it('computes main-road share from waytype extras', () => {
    const feature = {
      properties: {
        extras: {
          waytype: {
            summary: [
              { value: 1, amount: 20 },
              { value: 2, amount: 10 },
              { value: 3, amount: 70 },
            ],
          },
        },
      },
    }
    expect(getMainRoadSharePercent(feature)).toBe(30)
  })

  it('computes elevation gain from 3D coordinates', () => {
    const feature = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0, 10],
          [0, 0, 15],
          [0, 0, 12],
          [0, 0, 20],
        ],
      },
    }
    expect(getElevationGainMeters(feature)).toBe(13)
  })

  it('builds alternatives list', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            summary: { distance: 10000, duration: 1800 },
            extras: { waytype: { summary: [{ value: 1, amount: 40 }] } },
          },
          geometry: { type: 'LineString', coordinates: [[0, 0, 0], [1, 1, 5]] },
        },
        {
          type: 'Feature',
          properties: {
            summary: { distance: 12000, duration: 2000 },
          },
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        },
      ],
    }

    const alternatives = buildRouteAlternatives(geojson)
    expect(alternatives).toHaveLength(2)
    expect(alternatives[0].distanceKm).toBe(10)
    expect(alternatives[0].mainRoadShare).toBe(40)
  })
})
