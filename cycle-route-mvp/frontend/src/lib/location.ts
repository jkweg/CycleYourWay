import type { Position } from '@capacitor/geolocation'
import { isNativePlatform } from './platform'

export type GeoErrorLike = {
  code?: number
  message?: string
  /** Location services are switched off on the device. */
  disabled?: boolean
}

export type WatchPositionOptions = {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  /** Android: desired ms between fixes while watching. */
  interval?: number
  background?: boolean
}

export type UnsubscribePosition = () => void | Promise<void>

const WATCH_RETRY_MS = 2000

// Android plugin error codes (@capacitor/geolocation GeolocationErrors.kt),
// mapped onto the web GeolocationPositionError codes the UI understands.
const NATIVE_DENIED = new Set(['OS-PLUG-GLOC-0003', 'OS-PLUG-GLOC-0009'])
const NATIVE_DISABLED = new Set(['OS-PLUG-GLOC-0007', 'OS-PLUG-GLOC-0017'])
const NATIVE_TIMEOUT = 'OS-PLUG-GLOC-0010'

function normalizeNativeError(error: unknown): GeoErrorLike {
  const code = String((error as { code?: unknown })?.code ?? '')
  if (NATIVE_DENIED.has(code)) return { code: 1, message: 'Brak zgody na lokalizację.' }
  if (NATIVE_DISABLED.has(code)) return { code: 2, message: 'Lokalizacja w telefonie jest wyłączona.', disabled: true }
  if (code === NATIVE_TIMEOUT) return { code: 3, message: 'Szukam sygnału GPS…' }
  return { code: 2, message: 'Sygnał GPS niedostępny.' }
}

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
    interval = 1000,
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

      let stopped = false
      let watchId: string | null = null
      let retryTimer: ReturnType<typeof setTimeout> | undefined
      const watchOptions = {
        enableHighAccuracy,
        maximumAge,
        timeout,
        // Without these the plugin polls at `timeout` (one fix per 25 s).
        interval,
        minimumUpdateInterval: interval,
      }

      // On Android the plugin ends a watch after any error (e.g. no fix within
      // `timeout` indoors or on a cold GPS), so keep a fresh one running.
      const restart = () => {
        if (stopped || retryTimer) return
        const previous = watchId
        watchId = null
        if (previous) Geolocation.clearWatch({ id: previous }).catch(() => undefined)
        retryTimer = setTimeout(() => {
          retryTimer = undefined
          void start()
        }, WATCH_RETRY_MS)
      }

      const start = async () => {
        if (stopped) return
        try {
          const id = await Geolocation.watchPosition(watchOptions, (position, err) => {
            if (stopped) return
            if (err) {
              const error = normalizeNativeError(err)
              onError?.(error)
              if (error.code !== 1) restart()
              return
            }
            if (position) onUpdate?.(position)
          })
          if (stopped) {
            Geolocation.clearWatch({ id }).catch(() => undefined)
            return
          }
          watchId = id
        } catch (error) {
          const normalized = normalizeNativeError(error)
          onError?.(normalized)
          if (normalized.code !== 1) restart()
        }
      }

      await start()

      // Show the last known fix straight away while GPS warms up.
      Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 })
        .then((position) => {
          if (!stopped && position) onUpdate?.(position)
        })
        .catch(() => undefined)

      if (background) {
        console.info('[location] Background flag set — use keep-awake + foreground for v1')
      }

      return async () => {
        stopped = true
        if (retryTimer) clearTimeout(retryTimer)
        if (watchId) {
          try {
            await Geolocation.clearWatch({ id: watchId })
          } catch {
            // ignore
          }
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

/** True when location access is already granted, so the permission primer can be skipped. */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    if (isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation')
      const status = await Geolocation.checkPermissions()
      return status.location === 'granted' || status.coarseLocation === 'granted'
    }
    const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    return status?.state === 'granted'
  } catch {
    return false
  }
}
