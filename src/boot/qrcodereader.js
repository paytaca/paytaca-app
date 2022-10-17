import { boot } from 'quasar/wrappers'
import VueQrcodeReader from 'vue3-qrcode-reader'

export default boot(({ app }) => {
  app.use(VueQrcodeReader)
})
