import { WalletConnectManager } from '../wallet/walletconnect'

export default ({ Vue, app }) => {
  Vue.prototype.$walletConnect = new WalletConnectManager(app)
}
