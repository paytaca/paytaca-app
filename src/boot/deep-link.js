import { boot } from 'quasar/wrappers'
import { App } from '@capacitor/app'

import { parseWalletConnectUri } from '../wallet/walletconnect'
import { parsePaymentUri } from 'src/wallet/payment-uri'
import { extractWifFromUrl } from 'src/wallet/sweep'

export default boot(({ router, /* store */ }) => {

  App.addListener('appUrlOpen', event => {
    const url = new URL(event.url);
    console.log('App URL open', { url });

    if (/\/payment-request\/?$/.test(url.pathname) || /\/apps\/connecta\/?$/.test(url.pathname)) {
      const query = {}
      if (url.searchParams.has('d')) query.paymentRequestData = url.searchParams.get('d')
      else if (url.searchParams.has('orderId')) query.orderId = url.searchParams.get('orderId')

      router.push({ name: 'connecta', query: query })
    } else if (parseWalletConnectUri(url)) {
      router.push({
        name: 'app-wallet-connect',
        query: {
          uri: String(url),
          openCallRequest: true
        }
      })
    } else if(extractWifFromUrl(String(url))) {
      router.push({
        name: 'app-sweep',
        query: { w: extractWifFromUrl(String(url)) }
      })
    } else if (url.protocol === 'bitcoincash:') {
      // will need to refactor to have similar behavior as in qr scanner page
      router.push({
        name: 'qr-reader',
        query: { decode: url.toString() },
      })
    } else if (['ethereum:', 'paytaca:'].indexOf(url.protocol) >= 0) {
      const query = { assetId: 'bch', paymentUrl: String(url) }
      try {
        const parsedPaymentUri = parsePaymentUri(
          String(url),
          { chain: url.protocol === 'ethereum:' ? 'smart' : 'main' },
        )
        query.network = parsedPaymentUri.asset.chain === 'smart' ? 'sBCH' : 'BCH'
      } catch(error) { console.error(error) }
      router.push({ name: 'transaction-send', query: query })
    } else if (url.host === 'explorer.paytaca.com') {
      // Paytaca Explorer transaction URL
      // Example: https://explorer.paytaca.com/tx/<txid>
      const match = url.pathname.match(/^\/tx\/([0-9a-fA-F]{64})\/?$/)
      if (match) {
        const txid = match[1]
        router.push({ name: 'transaction-list', query: { txid } })
      }
    } else if (url.host === 'gifts.paytaca.com' && url.pathname.match('/claim/?')) {
      router.push({ name: 'claim-gift', query: { claimShare: url.searchParams.get('code') } })
    } else if (url.host === 'p2p.paytaca.com' && url.pathname.match('/ad/share/?')) {
      router.push({ name: 'exchange', query: { ad_id: url.searchParams.get('id') } })
    }
  })

})
