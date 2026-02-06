import { Capacitor } from '@capacitor/core'

/**
 * True only for the native iOS app (Capacitor).
 * IMPORTANT: This stays false for web builds, even on iPhone Safari.
 */
export function isNativeIOS () {
  try {
    return Boolean(Capacitor?.isNativePlatform?.()) && Capacitor?.getPlatform?.() === 'ios'
  } catch (_) {
    return false
  }
}

