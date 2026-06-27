import { boot } from 'quasar/wrappers'
import { initWeb3Wallet, isWalletConnectInitialized, getWeb3Wallet } from '../wallet/walletconnect2'
import { Store } from 'src/store'

export default boot(async (obj) => {
  const { app } = obj
  const store = Store

  // Initialize WalletConnect v2 at app startup with proper error handling.
  // The relay connection is intentionally global so dApp requests can be
  // received on any page.
  try {
    if (!isWalletConnectInitialized()) {
      await initWeb3Wallet()
      console.log('WalletConnect v2 initialized successfully at app startup')
    }

    // Register a global `session_request` handler so inbound dApp requests
    // refresh the store (and the home page Pending section) even when the
    // WalletConnect page is not mounted. The WC2 page keeps its own richer
    // handler for the dialog UI; this one only refreshes pending state.
    const web3Wallet = getWeb3Wallet()
    if (web3Wallet) {
      const refreshPending = () => {
        store.dispatch('walletconnect/loadSessionRequests').catch((err) => {
          console.error('Global session_request refresh failed:', err)
        })
      }
      web3Wallet.on('session_request', refreshPending)
      web3Wallet.on('session_request_expire', refreshPending)
    }
  } catch (error) {
    console.error('Failed to initialize WalletConnect v2 at startup:', error)
    // Don't throw - app should still work without WalletConnect
  }

  // Note: WizardConnect is now lazily initialized when the user opens the
  // WizardConnect feature (apps hub tile / wizard-connect page) instead of
  // at app boot. See src/pages/apps/wizard-connect.vue and
  // src/pages/apps/index.vue. This avoids HD key derivation, dynamic chunk
  // loading, relay reconnections and a 30s interval running on every page
  // for users who don't use WizardConnect.
})
