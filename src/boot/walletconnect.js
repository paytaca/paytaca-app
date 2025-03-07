import { boot } from 'quasar/wrappers'
import { WalletConnectManager } from '../wallet/walletconnect'
import { Store } from 'src/store'

export default boot((obj) => {
  const { app } = obj
  const store = Store
  app.config.globalProperties.$walletConnect = new WalletConnectManager(store)
  app.provide('$walletConnect', app.config.globalProperties.$walletConnect)
})
