import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { Plugins } from '@capacitor/core'
import { getMnemonic } from '../wallet'
import routes from './routes'

import { parseWalletConnectUri } from '../wallet/walletconnect'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.config.js instead!
    // quasar.config.js -> build -> vueRouterMode
    // quasar.config.js -> build -> publicPath
    history: createHistory(process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE)
  })

  Router.beforeEach(async (to, from, next) => {
    if (to.path === '/') {
      try {
        const mnemonic = await getMnemonic()
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

  Plugins.App.addListener('appUrlOpen', function (event) {
    const url = new URL(event.url)
    if (/\/payment-request\/?$/.test(url.pathname) || /\/apps\/connecta\/?$/.test(url.pathname)) {
      const query = {}
      if (url.searchParams.has('d')) query.paymentRequestData = url.searchParams.get('d')
      else if (url.searchParams.has('orderId')) query.orderId = url.searchParams.get('orderId')

      Router.push({ name: 'connecta', query: query })
    } else if (parseWalletConnectUri(url)) {
      Router.push({
        name: 'app-wallet-connect',
        query: {
          uri: String(url),
          openCallRequest: true
        }
      })
    }
  })

  return Router
}
