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
        // Ensure current wallet index is valid (points to undeleted wallet)
        // This will switch to the first valid wallet if current is null/deleted
        await store.dispatch('global/ensureValidWalletIndex')
        
        // Get the current wallet index (may have changed after ensureValidWalletIndex)
        const currentWalletIndex = store.getters['global/getWalletIndex']
        const vault = store.getters['global/getVault']
        const currentWallet = vault[currentWalletIndex]
        
        // Check if we have a valid wallet structure
        const hasValidWallet = currentWallet && 
          currentWallet.deleted !== true && 
          currentWallet.wallet?.bch?.walletHash
        
        if (!hasValidWallet) {
          // No valid wallets - go to account creation
          next('/accounts')
          return
        }
        
        // Check if mnemonic exists for this wallet index
        const mnemonic = await getMnemonic(currentWalletIndex)

        // if mnemonic does not exist but not first wallet,
        // check for other wallets with mnemonic
        let _mnemonic = mnemonic
        let walletIndex = currentWalletIndex

        while (!_mnemonic && walletIndex > 0) {
          walletIndex--;
          _mnemonic = await getMnemonic(walletIndex)
        }

        if (_mnemonic && walletIndex !== currentWalletIndex) {
          await store.dispatch(`global/switchWallet`, walletIndex).catch(console.error)
          location.reload()
          return
        }

        if (mnemonic) {
          next()
        } else {
          next('/accounts')
        }
      } catch (err) {
        console.error('Router error:', err)
        next('/accounts')
      }
    } else {
      next()
    }
  })

  return Router
}
