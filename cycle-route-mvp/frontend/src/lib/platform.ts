import { Capacitor } from '@capacitor/core'

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const getPlatform = (): string => {
  try {
    return Capacitor.getPlatform()
  } catch {
    return 'web'
  }
}
