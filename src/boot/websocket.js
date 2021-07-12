import Vue from 'vue'
import VueNativeSock from 'vue-native-websocket'

Vue.use(VueNativeSock, 'wss://watchtower.cash', {
  connectManually: true
})
