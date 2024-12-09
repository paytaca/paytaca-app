import { boot } from 'quasar/wrappers'
import QrCodeComponent from 'src/components/QrCodeComponent.vue'

export default boot(({ app }) => {
  app.component('qr-code', QrCodeComponent)
})
