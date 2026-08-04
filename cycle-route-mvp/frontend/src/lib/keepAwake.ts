import { isNativePlatform } from './platform'

export type ReleaseAwake = () => void | Promise<void>

/** Keep screen awake during navigation. */
export async function keepAwake(): Promise<ReleaseAwake> {
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

  let wakeLock: WakeLockSentinel | null = null
  const request = async () => {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
    } catch {
      wakeLock = null
    }
  }
  await request()

  const onVisibility = () => {
    if (document.visibilityState === 'visible') void request()
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    void wakeLock?.release?.().catch(() => undefined)
  }
}

export async function lockPortrait(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>
    }
    await orientation.lock?.('portrait')
  } catch {
    // browser may deny outside fullscreen/PWA; Capacitor often locks via manifest
  }
}
