import { boot } from 'quasar/wrappers'
import { WalletConnectManager } from '../wallet/walletconnect'

export default boot(({ app }) => {
  app.config.globalProperties.$walletConnect = new WalletConnectManager(app)
})
