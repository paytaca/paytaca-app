import { boot } from 'quasar/wrappers'
import { WalletConnectManager } from '../wallet/walletconnect'
import { initWeb3Wallet, isWalletConnectInitialized } from '../wallet/walletconnect2'
import { Store } from 'src/store'

export default boot(async (obj) => {
  const { app } = obj
  const store = Store

  // Initialize legacy WalletConnect v1 manager
  app.config.globalProperties.$walletConnect = new WalletConnectManager(store)
  app.provide('$walletConnect', app.config.globalProperties.$walletConnect)

  // Initialize WalletConnect v2 at app startup with proper error handling
  try {
    if (!isWalletConnectInitialized()) {
      await initWeb3Wallet()
      console.log('WalletConnect v2 initialized successfully at app startup')
    }
  } catch (error) {
    console.error('Failed to initialize WalletConnect v2 at startup:', error)
    // Don't throw - app should still work without WalletConnect
  }
})
