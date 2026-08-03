import { describe, expect, it } from 'vitest'
import { parseDeepLinkParams } from './deepLinks.js'
import { getMapTileLayer } from './mapTiles.js'

describe('parseDeepLinkParams', () => {
  it('reads ride and share query params', () => {
    expect(parseDeepLinkParams('https://example.com/?ride=abc&share=xyz')).toEqual({
      ride: 'abc',
      share: 'xyz',
    })
  })

  it('returns nulls for invalid urls', () => {
    expect(parseDeepLinkParams('not-a-url')).toEqual({ ride: null, share: null })
  })
})

describe('getMapTileLayer', () => {
  it('falls back to OSM when custom url is unset', () => {
    const layer = getMapTileLayer()
    expect(layer.url).toContain('tile.openstreetmap.org')
    expect(layer.provider).toBe('osm')
  })
})
