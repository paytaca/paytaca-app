import { boot } from 'quasar/wrappers'
import VueQrcodeReader from 'vue-qrcode-reader'

export default boot(({ app }) => {
  app.use(VueQrcodeReader)
})
