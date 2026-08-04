/**
 * Warn once in production when critical launch env vars are missing.
 * Secrets are never logged — only presence.
 */
export function warnMissingProdEnv(): void {
  if (!import.meta.env.PROD) return

  const missing: string[] = []
  if (!import.meta.env.VITE_API_URL) missing.push('VITE_API_URL')
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL')
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!import.meta.env.VITE_APP_ORIGIN) missing.push('VITE_APP_ORIGIN')
  if (!import.meta.env.VITE_MAP_TILES_URL) {
    console.warn(
      '[env] VITE_MAP_TILES_URL unset — production uses public OSM tiles (not allowed for commercial traffic). Set MapTiler/Stadia.',
    )
  }
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('[env] VITE_SENTRY_DSN unset — crash reporting disabled.')
  }
  if (missing.length) {
    console.warn(
      `[env] Missing production env: ${missing.join(', ')}. Set them in Vercel / Capacitor build and redeploy.`,
    )
  }
}
