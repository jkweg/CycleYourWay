import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from './chunkReload'

describe('stale chunk reload', () => {
  it('recognizes stale-deploy chunk failures across browsers', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/RideView-abc.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true)
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'lat')"))).toBe(false)
  })
})
