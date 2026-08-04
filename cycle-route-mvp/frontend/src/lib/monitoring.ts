/**
 * Lightweight analytics + Sentry wiring.
 * Sentry only initializes when VITE_SENTRY_DSN is set.
 */

let sentryReady = false

export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    if (import.meta.env.PROD) {
      console.warn('[monitoring] VITE_SENTRY_DSN not set — Sentry skipped.')
    }
    return
  }
  if (sentryReady) return

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || 'cycleyourway@1.0.0',
      tracesSampleRate: 0.15,
      sendDefaultPii: false,
    })
    sentryReady = true
  } catch (error) {
    console.warn('[monitoring] Sentry init failed', error)
  }
}

export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  try {
    if (import.meta.env.DEV) {
      console.info('[analytics]', name, props)
    }
    window.dispatchEvent(
      new CustomEvent('cyw:analytics', { detail: { name, props, at: Date.now() } }),
    )
    if (window.gtag) {
      window.gtag('event', name, props)
    }
  } catch {
    // ignore
  }
}

export function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error(error)
  import('@sentry/react')
    .then((Sentry) => {
      if (!sentryReady) return
      Sentry.captureException(error, { extra: context })
    })
    .catch(() => undefined)
}
