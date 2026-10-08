const CHUNK_RELOAD_KEY = 'cyw:chunk-reload-at'

// After a deploy, an open tab may request JS chunks that no longer exist.
export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as Error)?.message || error || '')
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(
    message,
  )
}

// Reload at most once per minute so a genuinely broken deploy cannot loop.
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
