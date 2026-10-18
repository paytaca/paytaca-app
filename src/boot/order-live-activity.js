import { boot } from 'quasar/wrappers'
import { App } from '@capacitor/app'
import { Platform } from 'quasar'
import { Store } from 'src/store'
import { orderLiveActivityManager } from 'src/services/order-live-activity'

/**
 * Boots the cross-platform order live activity controller (iOS Live Activities,
 * Android ongoing notifications) and keeps it in sync with the app lifecycle.
 *
 * Navigation from a live activity tap is handled by `src/boot/deep-link.js`
 * through the `paytaca://live-activity` URL.
 */
export default boot(() => {
  if (!Platform.is.mobile) return

  const manager = orderLiveActivityManager
  manager.init().catch(error => {
    console.warn('Order live activity init failed:', error)
  })

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) manager.refreshAll().catch(() => {})
  })

  // Wallet switch / logout: drop every activity, then rebuild for the new wallet.
  try {
    Store.watch(
      () => Store.getters['global/getWallet']?.('bch')?.walletHash,
      (newHash, oldHash) => {
        if (newHash === oldHash) return
        if (!newHash) {
          manager.stopAll().catch(() => {})
          return
        }
        manager.refreshAll({ force: true }).catch(() => {})
      }
    )
  } catch (error) {
    console.warn('Failed to watch wallet changes for order live activities:', error)
  }

  // Track any orders that are already active for the current wallet.
  if (manager.getWalletHash()) {
    manager.refreshAll({ force: true }).catch(() => {})
  }
})
