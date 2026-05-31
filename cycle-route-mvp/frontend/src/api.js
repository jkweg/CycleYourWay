const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function apiFetch(path, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
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
    if (response.status === 404 && path.startsWith('/api/auth')) {
      throw new Error(
        'Endpoint logowania niedostępny. Zrestartuj backend po ostatniej aktualizacji.',
      )
    }
    throw new Error(data.error || `Błąd serwera (${response.status}).`)
  }

  return data
}

export { API_BASE }
