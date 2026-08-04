import { Capacitor } from '@capacitor/core'
import { isNativePlatform } from './platform'

/**
 * Register App URL open handlers for ?ride= / ?share= deep links.
 */
export async function registerAppUrlListener(
  onOpenUrl: (url: string) => void,
): Promise<() => void> {
  if (!isNativePlatform()) return () => undefined

  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appUrlOpen', (event) => {
      if (event?.url) onOpenUrl(event.url)
    })

    const launch = await App.getLaunchUrl()
    if (launch?.url) onOpenUrl(launch.url)

    return () => {
      void handle.remove()
    }
  } catch (error) {
    console.warn('[deepLinks] App plugin unavailable', error)
    return () => undefined
  }
}

export type DeepLinkParams = {
  ride: string | null
  share: string | null
}

export function parseDeepLinkParams(urlString: string): DeepLinkParams {
  try {
    const url = new URL(urlString)
    return {
      ride: url.searchParams.get('ride'),
      share: url.searchParams.get('share'),
    }
  } catch {
    return { ride: null, share: null }
  }
}

export function isRunningInCapacitor(): boolean {
  return Capacitor.isNativePlatform?.() === true
}
