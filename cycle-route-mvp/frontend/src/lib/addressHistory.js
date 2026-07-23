const STORAGE_KEY = 'cyw-address-history-v1'
const MAX_ITEMS = 8

export function readAddressHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.name === 'string' &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lon),
      )
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function pushAddressHistory(entry) {
  if (!entry?.name || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) {
    return readAddressHistory()
  }

  const nextItem = {
    name: String(entry.name).trim(),
    lat: entry.lat,
    lon: entry.lon,
  }
  if (!nextItem.name) return readAddressHistory()

  const current = readAddressHistory().filter(
    (item) =>
      item.name.toLowerCase() !== nextItem.name.toLowerCase() &&
      !(
        Math.abs(item.lat - nextItem.lat) < 0.00015 &&
        Math.abs(item.lon - nextItem.lon) < 0.00015
      ),
  )

  const next = [nextItem, ...current].slice(0, MAX_ITEMS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota
  }
  return next
}
