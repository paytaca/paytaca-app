import { boot } from 'quasar/wrappers'
import VueNativeSock from 'vue-native-websocket-vue3'

export default boot(({ app }) => {
  app.use(VueNativeSock, 'wss://watchtower.cash', {
    connectManually: true
  })
})
