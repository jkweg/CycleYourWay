/**
 * Lightweight analytics + Sentry wiring.
 * Sentry only initializes when VITE_SENTRY_DSN is set.
 */

let sentryReady = false

export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || sentryReady) return

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.15,
      integrations: [],
    })
    sentryReady = true
  } catch (error) {
    console.warn('[monitoring] Sentry init failed', error)
  }
}

export function trackEvent(name, props = {}) {
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

export function captureException(error, context = {}) {
  console.error(error)
  import('@sentry/react')
    .then((Sentry) => {
      if (!sentryReady) return
      Sentry.captureException(error, { extra: context })
    })
    .catch(() => undefined)
}
