import { Plugins } from '@capacitor/core'
import Vue from 'vue'
import VueRouter from 'vue-router'
import { getMnemonic } from '../wallet'
import routes from './routes'

import { parseWalletConnectUri } from '../wallet/walletconnect'

Vue.use(VueRouter)

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default function ({ store }) {
  const Router = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),
    routes,

    // Leave these as they are and change in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
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
  console.log(process.env)
  console.log(Plugins)

  Plugins.App.addListener('appUrlOpen', function (event) {
    const url = new URL(event.url)
    console.log(url)
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
