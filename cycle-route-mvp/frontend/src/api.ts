import { supabase } from './supabaseClient'
import { NETWORK_ERROR_MESSAGE } from './lib/userMessages'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * fetch() to the backend proxy, with the Supabase session token when signed in.
 * The backend uses it only to pick the per-account provider quota (guests are
 * limited per IP); requests still work without it.
 */
export async function fetchApi(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!headers.has('Authorization')) {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (token) headers.set('Authorization', `Bearer ${token}`)
    } catch {
      // No session available: the request goes out as a guest.
    }
  }
  return fetch(url, { ...init, headers })
}

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
    response = await fetchApi(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
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
