import { boot } from 'quasar/wrappers'
import { Keyboard } from '@capacitor/keyboard'
import { Platform } from 'quasar'

export default boot(() => {
  if (Platform.is.ios) {
    Keyboard.setResizeMode({ mode: 'native' })
      .then(() => {
        Keyboard.getResizeMode()
          .then(resizeMode => {
            console.log('Keyboard resize mode', resizeMode)
          })
      })
  }
})
