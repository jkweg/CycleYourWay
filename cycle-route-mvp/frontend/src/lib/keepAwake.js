import { isNativePlatform } from './platform'

/** Keep screen awake during navigation. */
export async function keepAwake() {
  if (isNativePlatform()) {
    try {
      const { KeepAwake } = await import('@capacitor-community/keep-awake')
      await KeepAwake.keepAwake()
      return async () => {
        try {
          await KeepAwake.allowSleep()
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.warn('[keepAwake] plugin missing, using Wake Lock', error)
    }
  }

  if (!navigator.wakeLock?.request) return () => undefined

  let wakeLock = null
  const request = async () => {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch {
      wakeLock = null
    }
  }
  await request()

  const onVisibility = () => {
    if (document.visibilityState === 'visible') request()
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    wakeLock?.release?.().catch(() => undefined)
  }
}

export async function lockPortrait() {
  if (!isNativePlatform()) {
    try {
      await screen.orientation?.lock?.('portrait')
    } catch {
      // browser may deny outside fullscreen/PWA
    }
    return
  }

  try {
    // Capacitor Android typically locks via AndroidManifest; best-effort here.
    await screen.orientation?.lock?.('portrait')
  } catch {
    // ignore
  }
}
