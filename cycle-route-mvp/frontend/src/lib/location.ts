import type { Position } from '@capacitor/geolocation'
import { isNativePlatform } from './platform'

export type GeoErrorLike = {
  code?: number
  message?: string
}

export type WatchPositionOptions = {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  background?: boolean
}

export type UnsubscribePosition = () => void | Promise<void>

/**
 * Unified geolocation watch with Capacitor plugin on native, web API otherwise.
 * Returns an unsubscribe function.
 */
export async function watchPosition(
  onUpdate?: (position: Position | GeolocationPosition) => void,
  onError?: (error: GeoErrorLike | GeolocationPositionError) => void,
  options: WatchPositionOptions = {},
): Promise<UnsubscribePosition> {
  const {
    enableHighAccuracy = true,
    maximumAge = 1000,
    timeout = 25000,
    background = false,
  } = options

  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const permission = await Geolocation.requestPermissions()
      const location = permission.location || permission.coarseLocation
      if (location === 'denied') {
        onError?.({ code: 1, message: 'Brak uprawnień do lokalizacji.' })
        return () => undefined
      }

      const id = await Geolocation.watchPosition(
        { enableHighAccuracy, maximumAge, timeout },
        (position, err) => {
          if (err) {
            onError?.(err)
            return
          }
          if (position) onUpdate?.(position)
        },
      )

      if (background) {
        console.info('[location] Background flag set — use keep-awake + foreground for v1')
      }

      return async () => {
        try {
          await Geolocation.clearWatch({ id })
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.warn('[location] Capacitor Geolocation unavailable, falling back to web', error)
    }
  }

  if (!('geolocation' in navigator)) {
    onError?.({ code: 2, message: 'Geolokalizacja niedostępna na tym urządzeniu.' })
    return () => undefined
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => onUpdate?.(position),
    (error) => onError?.(error),
    {
      enableHighAccuracy,
      maximumAge,
      timeout,
    },
  )

  return () => navigator.geolocation.clearWatch(watchId)
}

export async function getCurrentPosition(
  options: Pick<WatchPositionOptions, 'timeout' | 'maximumAge'> = {},
): Promise<Position | GeolocationPosition> {
  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      await Geolocation.requestPermissions()
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 10000,
      })
    } catch (error) {
      console.warn('[location] native getCurrentPosition failed', error)
    }
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolokalizacja niedostępna.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 10000,
    })
  })
}
