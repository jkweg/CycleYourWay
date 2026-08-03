/**
 * Background geolocation (v2 start).
 *
 * v1 relies on foreground watch + keep-awake.
 * When `@capacitor-community/background-geolocation` is installed and
 * `VITE_ENABLE_BG_GPS=true`, uses the plugin; otherwise foreground watch.
 */
import { isNativePlatform } from './platform'
import { watchPosition } from './location'
import { trackEvent } from './monitoring'

/**
 * Start location tracking suitable for rides.
 * @param {(pos: GeolocationPosition) => void} onUpdate
 * @param {(err: unknown) => void} onError
 * @param {{ preferBackground?: boolean }} [options]
 * @returns {Promise<() => void | Promise<void>>}
 */
export async function startRideTracking(onUpdate, onError, options = {}) {
  const preferBackground = options.preferBackground !== false
  const bgEnabled = import.meta.env.VITE_ENABLE_BG_GPS === 'true'

  if (preferBackground && bgEnabled && isNativePlatform()) {
    try {
      // Dynamic name so Vite does not fail the build when the optional plugin is absent.
      const pluginId = '@capacitor-community/' + 'background-geolocation'
      const mod = await import(/* @vite-ignore */ pluginId)
      const BackgroundGeolocation = mod.BackgroundGeolocation || mod.default
      if (BackgroundGeolocation?.addWatcher) {
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Cycle Your Way śledzi Twoją jazdę.',
            backgroundTitle: 'Nawigacja rowerowa',
            requestPermissions: true,
            stale: false,
            distanceFilter: 8,
          },
          (location, error) => {
            if (error) {
              onError?.(error)
              return
            }
            onUpdate?.({
              coords: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                speed: location.speed,
                heading: location.bearing,
              },
              timestamp: location.time || Date.now(),
            })
          },
        )
        trackEvent('bg_gps_active', { plugin: 'community' })
        return async () => {
          try {
            await BackgroundGeolocation.removeWatcher({ id })
          } catch {
            // ignore
          }
        }
      }
    } catch {
      trackEvent('bg_gps_fallback', { reason: 'plugin_missing' })
    }
  }

  trackEvent('fg_gps_active', { native: isNativePlatform() })
  return watchPosition(onUpdate, onError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 25000,
    background: preferBackground,
  })
}
