const DB_NAME = 'cycle-your-way'
// Unsent rides stay on the device at most this long after their last change.
export const RIDE_DRAFT_RETENTION_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const DB_VERSION = 1
const STORE = 'ride-drafts'

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'))
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'sessionId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open ride storage'))
  })
}

async function transact(mode, operation) {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = operation(transaction.objectStore(STORE))
      let result
      request.onsuccess = () => {
        result = request.result
      }
      request.onerror = () => reject(request.error || new Error('Ride storage operation failed'))
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error || new Error('Ride storage transaction aborted'))
    })
  } finally {
    db.close()
  }
}

export function createRideSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function saveRideDraft(draft) {
  if (!draft?.sessionId) throw new Error('Ride draft requires a sessionId')
  const record = { ...draft, version: 1, updatedAt: new Date().toISOString() }
  await transact('readwrite', store => store.put(record))
  return record
}

export async function deleteRideDraft(sessionId) {
  if (!sessionId) return
  await transact('readwrite', store => store.delete(sessionId))
}

export async function markRideDraftSynced(sessionId) {
  if (!sessionId) return
  const existing = await transact('readonly', store => store.get(sessionId))
  if (!existing) return
  await saveRideDraft({ ...existing, status: 'synced' })
}

export async function listRideDrafts() {
  const records = await transact('readonly', store => store.getAll())
  return (records || []).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export function rideDraftExpiresAt(draft) {
  const updatedAt = Date.parse(draft?.updatedAt)
  return Number.isFinite(updatedAt) ? updatedAt + RIDE_DRAFT_RETENTION_DAYS * DAY_MS : null
}

// Synced leftovers and drafts without a readable timestamp are expired as well.
export function isRideDraftExpired(draft, now = Date.now()) {
  if (draft?.status === 'synced') return true
  const expiresAt = rideDraftExpiresAt(draft)
  return expiresAt == null || now > expiresAt
}

export async function purgeExpiredRideDrafts(now = Date.now()) {
  const expired = (await listRideDrafts()).filter(draft => isRideDraftExpired(draft, now))
  for (const draft of expired) {
    await deleteRideDraft(draft.sessionId)
  }
  return expired.length
}

export function canRestoreRideDraft(draft, userId) {
  if (!draft?.sessionId || !draft?.route?.feature) return false
  if (!['active', 'completed'].includes(draft.status)) return false
  return !draft.ownerId || draft.ownerId === userId
}
