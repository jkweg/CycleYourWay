import { Capacitor } from '@capacitor/core'
import { isNativePlatform } from './platform'

/**
 * Register App URL open handlers for ?ride= / ?share= deep links.
 * @param {(url: string) => void} onOpenUrl
 */
export async function registerAppUrlListener(onOpenUrl) {
  if (!isNativePlatform()) return () => undefined

  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appUrlOpen', (event) => {
      if (event?.url) onOpenUrl(event.url)
    })

    // Cold start URL
    const launch = await App.getLaunchUrl()
    if (launch?.url) onOpenUrl(launch.url)

    return () => {
      handle.remove()
    }
  } catch (error) {
    console.warn('[deepLinks] App plugin unavailable', error)
    return () => undefined
  }
}

export function parseDeepLinkParams(urlString) {
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

export function isRunningInCapacitor() {
  return Capacitor.isNativePlatform?.() === true
}
