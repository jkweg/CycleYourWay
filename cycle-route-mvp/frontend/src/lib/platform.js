import { Capacitor } from '@capacitor/core'

export const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const getPlatform = () => {
  try {
    return Capacitor.getPlatform()
  } catch {
    return 'web'
  }
}
