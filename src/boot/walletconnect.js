import { boot } from 'quasar/wrappers'
import { WalletConnectManager } from '../wallet/walletconnect'

export default boot((obj) => {
  const { app, store } = obj
  app.config.globalProperties.$walletConnect = new WalletConnectManager(store)
  app.provide('$walletConnect', app.config.globalProperties.$walletConnect)
})
