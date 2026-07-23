import { describe, expect, it } from 'vitest'
import {
  buildElevationProfile,
  buildRouteAlternatives,
  formatDurationShort,
  getElevationGainMeters,
  getMainRoadSharePercent,
  getRouteSummary,
  summarizeRouteSurfaces,
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

  it('removes zero elevation spikes by interpolation', () => {
    const profile = buildElevationProfile(
      [
        [0, 0, 100],
        [0.01, 0, 0],
        [0.02, 0, 120],
      ],
      { forDisplay: false },
    )
    expect(profile).toHaveLength(3)
    expect(profile[0].elevation).toBe(100)
    expect(profile[2].elevation).toBe(120)
    expect(profile[1].elevation).toBeGreaterThan(90)
    expect(profile[1].elevation).toBeLessThan(130)
  })

  it('removes deep V-spikes that are not exactly zero', () => {
    const profile = buildElevationProfile([
      [0, 0, 300],
      [0.001, 0, 310],
      [0.002, 0, 140],
      [0.003, 0, 305],
      [0.004, 0, 320],
    ])
    const elevations = profile.map((point) => point.elevation)
    expect(Math.min(...elevations)).toBeGreaterThan(250)
  })

  it('removes multi-point elevation valleys', () => {
    const profile = buildElevationProfile([
      [0, 0, 300],
      [0.001, 0, 305],
      [0.002, 0, 310],
      [0.003, 0, 120],
      [0.004, 0, 125],
      [0.005, 0, 118],
      [0.006, 0, 308],
      [0.007, 0, 315],
      [0.008, 0, 320],
    ])
    const elevations = profile.map((point) => point.elevation)
    expect(Math.min(...elevations)).toBeGreaterThan(280)
  })

  it('summarizes surfaces with unknown as footnote data', () => {
    const feature = {
      properties: {
        extras: {
          surface: {
            summary: [
              { value: 3, amount: 60, distance: 6000 },
              { value: 0, amount: 30, distance: 3000 },
              { value: 12, amount: 10, distance: 1000 },
            ],
          },
        },
      },
    }
    const result = summarizeRouteSurfaces(feature)
    expect(result.known).toHaveLength(2)
    expect(result.known[0].label).toBe('Asfalt')
    expect(result.unknownPercent).toBe(30)
    expect(result.known.every((row) => !row.isUnknown)).toBe(true)
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
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0, 10],
              [1, 1, 15],
            ],
          },
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
