import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { Plugins } from '@capacitor/core'
import { getMnemonic } from '../wallet'
import routes from './routes'
import useStore from '../store'

import { parseWalletConnectUri } from '../wallet/walletconnect'
import { parsePaymentUri } from 'src/wallet/payment-uri'
import { isValidWif, extractWifFromUrl } from 'src/wallet/sweep'

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
        console.log({ currentWalletIndex })
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

  Plugins.App.addListener('appUrlOpen', function (event) {
    const url = new URL(event.url)
    console.log('App URL open', { url })

    let baseURL = store.getters['global/isChipnet'] ? process.env.CHIPNET_WATCHTOWER_BASE_URL : process.env.MAINNET_WATCHTOWER_BASE_URL || ''
    baseURL = baseURL.replace('https://', '').replace('http://', '').replace('/api', '')

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
    } else if(extractWifFromUrl(String(url))) {
      Router.push({
        name: 'app-sweep',
        query: { w: extractWifFromUrl(String(url)) }
      })
    } else if (['ethereum:', 'bitcoincash:', 'paytaca:'].indexOf(url.protocol) >= 0) {
      const query = { assetId: 'bch', paymentUrl: String(url) }
      try {
        const parsedPaymentUri = parsePaymentUri(
          String(url),
          { chain: url.protocol === 'ethereum:' ? 'smart' : 'main' },
        )
        query.network = parsedPaymentUri.asset.chain === 'smart' ? 'sBCH' : 'BCH'
      } catch(error) { console.error(error) }
      Router.push({ name: 'transaction-send', query: query })
    } else if (url.host === 'gifts.paytaca.com' && url.pathname.match('/claim/?')) {
      Router.push({ name: 'claim-gift', query: { claimShare: url.searchParams.get('code') } })
    } else if (url.host === 'p2p.paytaca.com' && url.pathname.match('/ad/share/?')) {
      Router.push({ name: 'exchange', query: { ad_id: url.searchParams.get('id') } })
    }
  })

  return Router
}
