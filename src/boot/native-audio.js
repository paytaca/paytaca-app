import { boot } from 'quasar/wrappers'
import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'

export default boot(async () => {
  // Only attempt to configure if running on a native device and NativeAudio is available
  if (
    Capacitor.isNativePlatform &&
    typeof NativeAudio?.configure === 'function'
  ) {
    try {
      await NativeAudio.configure({ focus: false, fade: false })
    } catch (e) {
      // If configure fails, log error—don't break the app
      console.warn('NativeAudio configure error:', e)
    }
  } else {
    // Optionally, log that we skipped config (useful for debugging)
    // console.info('NativeAudio configure skipped: not native platform or plugin missing')
  }
})
