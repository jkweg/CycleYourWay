import { describe, expect, it } from 'vitest'
import {
  TAG_MAX,
  TAGS_MAX,
  clampText,
  fitTrackGeoJson,
  buildSavedRouteGeoJson,
  isCheckViolation,
  jsonByteLength,
  normalizeTags,
} from './dataLimits'

describe('data limits (R07)', () => {
  it('clamps text by characters, not UTF-16 units, and strips control characters', () => {
    expect(clampText('  Żółć\nłódź  ', 20)).toBe('Żółć łódź')
    expect(clampText('🚴'.repeat(5), 3)).toBe('🚴🚴🚴')
    expect(clampText(null, 10)).toBe('')
  })

  it('normalizes tags to the database rules', () => {
    const tags = normalizeTags(`a, ,b,a,${'x'.repeat(60)},c,d,e,f,g,h,i`)
    expect(tags).toHaveLength(TAGS_MAX)
    expect(tags.slice(0, 3)).toEqual(['a', 'b', 'x'.repeat(TAG_MAX)])
    expect(tags.every((tag) => tag.length > 0 && tag.length <= TAG_MAX)).toBe(true)
    expect(normalizeTags(['  gravel ', 'gravel', ''])).toEqual(['gravel'])
  })

  it('thins an oversized ride track but keeps both ends', () => {
    const coordinates = Array.from({ length: 5000 }, (_, i) => [19 + i / 1e4, 50 + i / 1e4])
    const track = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
    const limit = Math.floor(jsonByteLength(track) / 3)

    const fitted = fitTrackGeoJson(track, limit)
    expect(jsonByteLength(fitted)).toBeLessThanOrEqual(limit)
    expect(fitted.geometry.coordinates[0]).toEqual(coordinates[0])
    expect(fitted.geometry.coordinates.at(-1)).toEqual(coordinates.at(-1))
    expect(fitTrackGeoJson(track)).toBe(track)
    expect(fitTrackGeoJson(null)).toBe(null)
  })

  it('drops route alternatives before refusing an oversized route', () => {
    const feature = (n) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array(n).fill([19.5, 50.1]) } })
    const selected = feature(100)
    const alt = feature(1000)
    expect(buildSavedRouteGeoJson(selected, [alt]).features).toEqual([selected, alt])
    const limit = jsonByteLength({ type: 'FeatureCollection', features: [selected] }) + 10
    expect(buildSavedRouteGeoJson(selected, [alt], limit).features).toEqual([selected])
    expect(buildSavedRouteGeoJson(alt, [], limit)).toBe(null)
  })

  it('recognizes PostgREST check violations', () => {
    expect(isCheckViolation({ code: '23514' })).toBe(true)
    expect(isCheckViolation({ message: 'new row violates check constraint "x"' })).toBe(true)
    expect(isCheckViolation({ code: '42501' })).toBe(false)
  })
})
