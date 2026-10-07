import { describe, expect, it } from 'vitest'
import {
  RIDE_DRAFT_RETENTION_DAYS,
  canRestoreRideDraft,
  createRideSessionId,
  isRideDraftExpired,
  rideDraftExpiresAt,
} from './rideDraftStore'

describe('ride draft identity boundaries', () => {
  it('creates distinct identifiers suitable for idempotent writes', () => {
    const first = createRideSessionId()
    const second = createRideSessionId()
    expect(first).toBeTruthy()
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(second).not.toBe(first)
  })

  it('restores guest drafts for the current device and owned drafts only for their owner', () => {
    const base = { sessionId: 'one', status: 'active', route: { feature: { type: 'Feature' } } }
    expect(canRestoreRideDraft(base, null)).toBe(true)
    expect(canRestoreRideDraft({ ...base, ownerId: 'user-a' }, 'user-a')).toBe(true)
    expect(canRestoreRideDraft({ ...base, ownerId: 'user-a' }, 'user-b')).toBe(false)
    expect(canRestoreRideDraft({ sessionId: 'broken' }, 'user-a')).toBe(false)
    expect(canRestoreRideDraft({ ...base, status: 'synced' }, 'user-a')).toBe(false)
  })
})

describe('ride draft retention', () => {
  const day = 24 * 60 * 60 * 1000
  const now = Date.parse('2026-10-07T12:00:00Z')
  const draft = (ageDays, status = 'completed') => ({
    sessionId: 'x',
    status,
    updatedAt: new Date(now - ageDays * day).toISOString(),
  })

  it('keeps unsent rides for the retention period after their last change', () => {
    expect(RIDE_DRAFT_RETENTION_DAYS).toBe(30)
    expect(isRideDraftExpired(draft(29), now)).toBe(false)
    expect(isRideDraftExpired(draft(30), now)).toBe(false)
    expect(isRideDraftExpired(draft(30.01), now)).toBe(true)
    expect(isRideDraftExpired(draft(1, 'active'), now)).toBe(false)
    expect(rideDraftExpiresAt(draft(0))).toBe(now + 30 * day)
  })

  it('expires synced leftovers and unreadable records immediately', () => {
    expect(isRideDraftExpired(draft(0, 'synced'), now)).toBe(true)
    expect(isRideDraftExpired({ sessionId: 'x', status: 'active' }, now)).toBe(true)
    expect(isRideDraftExpired({ ...draft(0), updatedAt: 'garbage' }, now)).toBe(true)
  })
})
