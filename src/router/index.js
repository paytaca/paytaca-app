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
        // Check if first mnemonic exists
        const currentWalletIndex = store.getters['global/getWalletIndex']        
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
        }

        if (mnemonic) {
          next()
        } else {
          next('/accounts')
        }
      } catch (err) {
        next('/accounts')
      }
    } else {
      next()
    }
  })

  return Router
}
