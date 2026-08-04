const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Fetch JSON from the ORS backend proxy.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  let response: Response
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

  const data = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(
      (data && typeof data === 'object' && 'error' in data && data.error) ||
        `Błąd serwera (${response.status}).`,
    )
  }

  return data
}

export { API_BASE }
