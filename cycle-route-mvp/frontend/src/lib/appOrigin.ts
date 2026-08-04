/**
 * Canonical public origin for share links, OAuth, and password reset.
 * On Capacitor, window.location.origin is often https://localhost — prefer VITE_APP_ORIGIN.
 */
export function getAppOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_APP_ORIGIN || '').trim()
  const raw = fromEnv || (typeof window !== 'undefined' ? window.location.origin : '')
  return raw.replace(/\/+$/, '')
}

export function appUrl(path = '/'): string {
  const origin = getAppOrigin()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}
