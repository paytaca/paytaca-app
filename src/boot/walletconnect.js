import { boot } from 'quasar/wrappers'
import { initWeb3Wallet, isWalletConnectInitialized } from '../wallet/walletconnect2'
import { Store } from 'src/store'

export default boot(async (obj) => {
  const { app } = obj
  const store = Store

  // Initialize WalletConnect v2 at app startup. The relay connection is
  // intentionally global so the socket stays warm, but the `session_request`
  // handler that refreshes the Pending section is scoped to the home page
  // and the WalletConnect page (not every page). See:
  //   - src/pages/transaction/index.vue (home page listener)
  //   - src/components/walletconnect/WalletConnectV2.vue (WC page listener)
  try {
    if (!isWalletConnectInitialized()) {
      await initWeb3Wallet()
      console.log('WalletConnect v2 initialized successfully at app startup')
    }
  } catch (error) {
    console.error('Failed to initialize WalletConnect v2 at startup:', error)
    // Don't throw - app should still work without WalletConnect
  }

  // Note: WizardConnect is now lazily initialized when the user opens the
  // WizardConnect feature (apps hub tile / wizard-connect page) or when the
  // home page mounts (for the Pending section). See:
  //   - src/pages/apps/wizard-connect.vue
  //   - src/pages/apps/index.vue
  //   - src/pages/transaction/index.vue (home page)
})
