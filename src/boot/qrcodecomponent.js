import { boot } from 'quasar/wrappers'
import VueQRCodeComponent from 'vue-qrcode-component'

export default boot(({ app }) => {
    app.component('qr-code', VueQRCodeComponent)
})
