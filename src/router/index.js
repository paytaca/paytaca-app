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
    if (to.path === '/') {
      try {
        console.log('[Router] ===== ROUTER GUARD: Checking wallet access =====')
        
        // Ensure current wallet index is valid (points to undeleted wallet)
        // This will switch to the first valid wallet if current is null/deleted
        await store.dispatch('global/ensureValidWalletIndex')
        
        // Get the current wallet index (may have changed after ensureValidWalletIndex)
        const currentWalletIndex = store.getters['global/getWalletIndex']
        const vault = store.getters['global/getVault']
        console.log('[Router] Vault length:', vault?.length || 0)
        console.log('[Router] Vault contents:', vault?.map((w, i) => ({
          index: i,
          deleted: w?.deleted,
          hasWallet: !!w?.wallet,
          hasName: !!w?.name,
          walletHash: w?.wallet?.bch?.walletHash || w?.wallet?.BCH?.walletHash || w?.BCH?.walletHash || w?.bch?.walletHash || w?.walletHash || 'none'
        })))
        
        const currentWallet = vault[currentWalletIndex]
        console.log('[Router] Current wallet at index:', currentWalletIndex, currentWallet ? 'exists' : 'MISSING')
        
        if (currentWallet) {
          console.log('[Router] Current wallet details:', {
            deleted: currentWallet.deleted,
            hasWallet: !!currentWallet.wallet,
            hasChipnet: !!currentWallet.chipnet,
            name: currentWallet.name,
            walletHash: currentWallet.wallet?.bch?.walletHash || currentWallet.wallet?.BCH?.walletHash || currentWallet.BCH?.walletHash || currentWallet.bch?.walletHash || currentWallet.walletHash || 'none'
          })
        }
        
        // Check if we have a valid wallet structure
        // Use helper function to check all possible wallet hash locations
        const hasValidWallet = currentWallet && 
          currentWallet.deleted !== true && 
          (currentWallet.wallet?.bch?.walletHash ||
           currentWallet.wallet?.BCH?.walletHash ||
           currentWallet.BCH?.walletHash ||
           currentWallet.bch?.walletHash ||
           currentWallet.walletHash)
        
        console.log('[Router] Has valid wallet structure:', hasValidWallet)
        
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
        
        console.log('[Router] Wallet hash for mnemonic lookup:', walletHash || 'none')
        
        // Check if mnemonic exists for this wallet
        // Prefer wallet hash if available (post-migration pattern)
        let mnemonic = null
        if (walletHash) {
          console.log('[Router] Attempting to get mnemonic using wallet hash:', walletHash)
          mnemonic = await getMnemonic(walletHash).catch((err) => {
            console.warn('[Router] Error getting mnemonic with wallet hash:', err)
            return null
          })
          console.log('[Router] Mnemonic retrieved with wallet hash:', mnemonic ? 'found' : 'not found')
        }
        
        // Fallback to index-based lookup if wallet hash not available or mnemonic not found
        if (!mnemonic) {
          console.log('[Router] Attempting to get mnemonic using index:', currentWalletIndex)
          mnemonic = await getMnemonic(currentWalletIndex).catch((err) => {
            console.warn('[Router] Error getting mnemonic with index:', err)
            return null
          })
          console.log('[Router] Mnemonic retrieved with index:', mnemonic ? 'found' : 'not found')
        }

        // if mnemonic does not exist but not first wallet,
        // check for other wallets with mnemonic
        let _mnemonic = mnemonic
        let walletIndex = currentWalletIndex

        if (!_mnemonic) {
          console.log('[Router] No mnemonic found for current wallet, checking other wallets...')
          while (!_mnemonic && walletIndex > 0) {
            walletIndex--;
            const otherWallet = vault[walletIndex]
            console.log('[Router] Checking wallet at index:', walletIndex, otherWallet ? 'exists' : 'missing')
            if (otherWallet && otherWallet.deleted !== true) {
              const otherWalletHash = otherWallet.wallet?.bch?.walletHash ||
                                     otherWallet.wallet?.BCH?.walletHash ||
                                     otherWallet.BCH?.walletHash ||
                                     otherWallet.bch?.walletHash ||
                                     otherWallet.walletHash
              if (otherWalletHash) {
                console.log('[Router] Trying wallet hash for index', walletIndex, ':', otherWalletHash)
                _mnemonic = await getMnemonic(otherWalletHash).catch(() => null)
              }
              if (!_mnemonic) {
                console.log('[Router] Trying index for wallet at', walletIndex)
                _mnemonic = await getMnemonic(walletIndex).catch(() => null)
              }
              if (_mnemonic) {
                console.log('[Router] Found mnemonic for wallet at index:', walletIndex)
              }
            }
          }
        }

        if (_mnemonic && walletIndex !== currentWalletIndex) {
          console.log('[Router] Switching to wallet at index:', walletIndex, 'which has mnemonic')
          await store.dispatch(`global/switchWallet`, walletIndex).catch(console.error)
          location.reload()
          return
        }

        if (mnemonic) {
          console.log('[Router] Mnemonic found, allowing access to home page')
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
