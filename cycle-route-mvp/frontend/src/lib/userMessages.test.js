import { describe, expect, it } from 'vitest'
import { BAD_RESPONSE_MESSAGE, NETWORK_ERROR_MESSAGE, toUserMessage } from './userMessages'

describe('user-facing error messages (R28)', () => {
  it('translates browser network failures (Chrome, Firefox, Safari)', () => {
    expect(toUserMessage(new TypeError('Failed to fetch'), 'x')).toBe(NETWORK_ERROR_MESSAGE)
    expect(toUserMessage(new TypeError('NetworkError when attempting to fetch resource.'), 'x')).toBe(NETWORK_ERROR_MESSAGE)
    expect(toUserMessage(new TypeError('Load failed'), 'x')).toBe(NETWORK_ERROR_MESSAGE)
  })

  it('hides HTML error pages parsed as JSON', () => {
    expect(toUserMessage(new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"), 'x'))
      .toBe(BAD_RESPONSE_MESSAGE)
  })

  it('keeps server/app messages and falls back when empty', () => {
    expect(toUserMessage(new Error('Trasa jest zbyt długa dla tego trybu.'), 'x')).toBe('Trasa jest zbyt długa dla tego trybu.')
    expect(toUserMessage(new Error(''), 'Nie udało się.')).toBe('Nie udało się.')
    expect(toUserMessage(null, 'Nie udało się.')).toBe('Nie udało się.')
  })
})
