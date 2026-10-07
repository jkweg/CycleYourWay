import { describe, expect, it } from 'vitest'
import { buildShareUrl, isUuid } from './shareLinks'

describe('unlisted route links', () => {
  const token = '6f9619ff-8b86-4e2b-a6c7-3f3f86f7c918'

  it('accepts UUID tokens and rejects identifiers that cannot reach the RPC', () => {
    expect(isUuid(token)).toBe(true)
    expect(isUuid('route-1')).toBe(false)
    expect(isUuid(`${token}?x=1`)).toBe(false)
  })

  it('builds a link without retaining unrelated query data or fragments', () => {
    expect(buildShareUrl('https://cycleyourway.pl/old?x=1#map', token))
      .toBe(`https://cycleyourway.pl/?share=${token}`)
  })
})
