import { isNativePlatform } from './platform'

/**
 * Android hardware/gesture back. The app has no router, so "back" closes the topmost
 * overlay or panel; `handleBack()` returns true when it did. Otherwise the app is sent
 * to the background instead of being closed (a ride keeps recording).
 * Registering a listener replaces Capacitor's default (WebView history / exit).
 */
export async function registerBackButton(handleBack) {
  if (!isNativePlatform()) return () => undefined
  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('backButton', () => {
      if (!handleBack()) void App.minimizeApp()
    })
    return () => {
      void handle.remove()
    }
  } catch (error) {
    console.warn('[backButton] App plugin unavailable', error)
    return () => undefined
  }
}
