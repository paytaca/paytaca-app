import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { getMnemonic } from '../wallet'
import routes from './routes'
import useStore from '../store'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
*/
const createHistory = process.env.SERVER
  ? createMemoryHistory
  : process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory
export const Router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,

  // Leave this as is and make changes in quasar.config.js instead!
  // quasar.config.js -> build -> vueRouterMode
  // quasar.config.js -> build -> publicPath
  history: createHistory(process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE)
})

export default function () {
  const store = useStore()

  window.popStateDetected = false
  window.addEventListener('popstate', () => {
    window.popStateDetected = true
  })

  Router.beforeEach(async (to, from, next) => {
    // Check if app is locked and user is trying to access a protected route
    // Access state directly from store to ensure we get the latest value
    // Use multiple access methods to ensure we get the correct state
    const lockAppEnabled = store.getters['global/lockApp']
    
    // Try multiple ways to get the unlock state to ensure we have the latest value
    let isUnlocked = Boolean(store.getters['global/isUnlocked'])
    
    // Also check state directly as a fallback (for debugging and reliability)
    const stateUnlocked = store.state?.global?.isUnlocked
    if (typeof stateUnlocked === 'boolean') {
      isUnlocked = Boolean(stateUnlocked)
    }
    
    const isLockScreen = to.path === '/lock'
    const isAccountsRoute = to.path.startsWith('/accounts')

    // Debug logging (only log when lock is enabled to reduce noise)
    if (lockAppEnabled) {
      console.log('[Router] Lock check - lockAppEnabled:', lockAppEnabled, 'isUnlocked:', isUnlocked, 
                 'stateDirect:', stateUnlocked, 'to:', to.path, 'from:', from.path)
    }

    // IMPORTANT: If app is already unlocked, skip ALL lock checks and allow navigation
    // The lock screen should only show on initial app load or when coming from background
    // Once unlocked, the app should remain unlocked for the entire session until it goes to background
    // This check must happen FIRST before any other lock-related logic
    // Use strict equality to ensure we're checking for true, not just truthy
    if (isUnlocked === true) {
      // If user tries to go to lock screen while unlocked, redirect away
      if (isLockScreen) {
        console.log('[Router] App is already unlocked, redirecting from lock screen')
        const redirectPath = to.query.redirect || '/'
        next(redirectPath)
        return
      }
      // App is unlocked - skip ALL lock checks and proceed directly to route handling
      // Do NOT check lock state again - the app is unlocked for this session
      // Continue to normal route handling below - DO NOT return here
    } else if (lockAppEnabled) {
      // App is locked - only redirect if not already on lock screen or accounts
      if (!isLockScreen && !isAccountsRoute) {
        console.log('[Router] App is locked, redirecting to lock screen')
        next({
          path: '/lock',
          query: { redirect: to.fullPath }
        })
        return
      }
      // If already on lock screen or accounts route, allow navigation to proceed
    }

    if (to.path === '/') {
      try {
        // Ensure current wallet index is valid (points to undeleted wallet)
        // This will switch to the first valid wallet if current is null/deleted
        await store.dispatch('global/ensureValidWalletIndex')

        // Get the current wallet index (may have changed after ensureValidWalletIndex)
        const currentWalletIndex = store.getters['global/getWalletIndex']
        const vault = store.getters['global/getVault']

        const currentWallet = vault[currentWalletIndex]

        // Check if we have a valid wallet structure
        // Use helper function to check all possible wallet hash locations
        const hasValidWallet = currentWallet &&
          currentWallet.deleted !== true &&
          (currentWallet.wallet?.bch?.walletHash ||
           currentWallet.wallet?.BCH?.walletHash ||
           currentWallet.BCH?.walletHash ||
           currentWallet.bch?.walletHash ||
           currentWallet.walletHash)
        
        if (!hasValidWallet) {
          // No valid wallets - go to account creation
          console.warn('[Router] No valid wallet found, redirecting to accounts')
          console.warn('[Router] Reason: currentWallet =', currentWallet ? 'exists' : 'null/undefined', 
                       ', deleted =', currentWallet?.deleted, 
                       ', hasWalletHash =', !!(currentWallet?.wallet?.bch?.walletHash || currentWallet?.wallet?.BCH?.walletHash || currentWallet?.BCH?.walletHash || currentWallet?.bch?.walletHash || currentWallet?.walletHash))
          next('/accounts')
          return
        }
        
        // Get wallet hash to use for mnemonic retrieval (more reliable than index)
        const walletHash = currentWallet.wallet?.bch?.walletHash ||
                          currentWallet.wallet?.BCH?.walletHash ||
                          currentWallet.BCH?.walletHash ||
                          currentWallet.bch?.walletHash ||
                          currentWallet.walletHash
        
        // Check if mnemonic exists for this wallet
        // Prefer wallet hash if available (post-migration pattern)
        let mnemonic = null
        if (walletHash) {
          mnemonic = await getMnemonic(walletHash).catch((err) => {
            console.warn('[Router] Error getting mnemonic with wallet hash:', err)
            return null
          })
        }
        
        // Fallback to index-based lookup if wallet hash not available or mnemonic not found
        if (!mnemonic) {
          mnemonic = await getMnemonic(currentWalletIndex).catch((err) => {
            console.warn('[Router] Error getting mnemonic with index:', err)
            return null
          })
        }

        // if mnemonic does not exist but not first wallet,
        // check for other wallets with mnemonic
        let _mnemonic = mnemonic
        let walletIndex = currentWalletIndex

        if (!_mnemonic) {
          while (!_mnemonic && walletIndex > 0) {
            walletIndex--;
            const otherWallet = vault[walletIndex]
            if (otherWallet && otherWallet.deleted !== true) {
              const otherWalletHash = otherWallet.wallet?.bch?.walletHash ||
                                     otherWallet.wallet?.BCH?.walletHash ||
                                     otherWallet.BCH?.walletHash ||
                                     otherWallet.bch?.walletHash ||
                                     otherWallet.walletHash
              if (otherWalletHash) {
                _mnemonic = await getMnemonic(otherWalletHash).catch(() => null)
              }
              if (!_mnemonic) {
                _mnemonic = await getMnemonic(walletIndex).catch(() => null)
              }
            }
          }
        }

        if (_mnemonic && walletIndex !== currentWalletIndex) {
          await store.dispatch(`global/switchWallet`, walletIndex).catch(console.error)
          location.reload()
          return
        }

        if (mnemonic) {
          next()
        } else {
          console.warn('[Router] No mnemonic found for any wallet, redirecting to accounts')
          console.warn('[Router] Checked wallet index:', currentWalletIndex)
          console.warn('[Router] Checked wallet hash:', walletHash || 'none')
          console.warn('[Router] Vault state:', vault?.map((w, i) => ({
            index: i,
            deleted: w?.deleted,
            hasWalletHash: !!(w?.wallet?.bch?.walletHash || w?.wallet?.BCH?.walletHash || w?.BCH?.walletHash || w?.bch?.walletHash || w?.walletHash)
          })))
          next('/accounts')
        }
      } catch (err) {
        console.error('[Router] Router error:', err)
        console.error('[Router] Error stack:', err.stack)
        next('/accounts')
      }
    } else {
      next()
    }
  })

  return Router
}
