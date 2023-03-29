import { boot } from 'quasar/wrappers'
import VueQrReader from 'vue3-qr-reader'

export default boot(({ app }) => {
  app.use(VueQrReader)
})
