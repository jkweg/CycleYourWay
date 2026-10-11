import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { isNativePlatform } from './platform'

/**
 * Android status/navigation bar icons: 'dark' = light icons for dark screens (intro,
 * ride view), 'light' = dark icons for the vanilla app. The default follows the phone's
 * dark mode, which would hide the icons on our light background.
 */
export function setSystemBarsTone(tone: 'dark' | 'light'): void {
  if (!isNativePlatform()) return
  SystemBars.setStyle({ style: tone === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(
    () => undefined,
  )
}
