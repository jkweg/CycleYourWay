const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Fetch JSON from the ORS backend proxy.
 * @param {string} path
 * @param {RequestInit} [options]
 */
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(
      'Brak połączenia z serwerem. Uruchom backend: npm run dev (folder backend).',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Błąd serwera (${response.status}).`)
  }

  return data
}

export { API_BASE }
