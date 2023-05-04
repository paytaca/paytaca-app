<template>
    <router-view />
</template>

<script>
import { getMnemonic, Wallet, loadWallet } from './wallet'

export default {
  name: 'App',
  data () {
    return {
      subscribedPushNotifications: false,
      assetPricesUpdateIntervalId: null
    }
  },
  methods: {
    async subscribePushNotifications() {
      if (this.subscribedPushNotifications) return
      const wallet = await loadWallet()
      const walletHashes = [
        wallet.BCH.getWalletHash(),
        wallet.SLP.getWalletHash(),
        wallet.sBCH.getWalletHash(),
      ]
      await this.$pushNotifications.subscribe(walletHashes)
      this.subscribedPushNotifications = true
    },
    async resubscribeBCHAddresses(mnemonic) {
      const wallet = new Wallet(mnemonic, 'BCH')
      let resubscriptionInfo = { completed: false, lastIndex: -1 }
      try {
        const _raw = localStorage.getItem('bchResubscribe')
        if (_raw) resubscriptionInfo = JSON.parse(_raw)
      } catch(error) {}

      // abort resubscription if completed
      if (resubscriptionInfo.completed) return

      let lastBCHIndex = 0
      try {
        lastBCHIndex = await wallet.BCH.getLastAddressIndex({ exclude_pos: true, with_tx: true })
        if (!Number.isInteger(lastBCHIndex)) throw new TypeError('Invalid index')
      } catch(error) {
        lastBCHIndex = this.$store.getters['global/getWallet']('bch')?.lastAddressIndex
      }

      try {
        // added iterator 'ctr' to cap index to 50
        for (var i = resubscriptionInfo.lastIndex+1, ctr = 0; i <= lastBCHIndex && ctr < 50; i++, ctr++) {
          await wallet.BCH.getNewAddressSet(i)
          resubscriptionInfo.lastIndex = i
        }
        resubscriptionInfo.completed = true
      } finally {
        localStorage.setItem('bchResubscribe', JSON.stringify(resubscriptionInfo))
      }
    },
    async resubscribeSLPAddresses(mnemonic) {
      const wallet = new Wallet(mnemonic, 'BCH')
      let resubscriptionInfo = { completed: false, lastIndex: -1 }
      try {
        const _raw = localStorage.getItem('slpResubscribe')
        if (_raw) resubscriptionInfo = JSON.parse(_raw)
      } catch(error) {}

      // abort resubscription if completed
      if (resubscriptionInfo.completed) return

      let lastSLPIndex = 0
      try {
        lastSLPIndex = await wallet.SLP.getLastAddressIndex({ exclude_pos: true, with_tx: true })
        if (!Number.isInteger(lastSLPIndex)) throw new TypeError('Invalid index')
      } catch(error) {
        lastSLPIndex = this.$store.getters['global/getWallet']('slp')?.lastAddressIndex
      }

      try {
        // added iterator 'ctr' to cap index to 50
        for (var i = resubscriptionInfo.lastIndex+1, ctr = 0; i <= lastSLPIndex && ctr < 50; i++, ctr++) {
          await wallet.SLP.getNewAddressSet(i)
          resubscriptionInfo.lastIndex = i
        }
        resubscriptionInfo.completed = true
      } finally {
        localStorage.setItem('slpResubscribe', JSON.stringify(resubscriptionInfo))
      }
    },
    async resubscribeAddresses() {
      const mnemonic = await getMnemonic()
      if (mnemonic) {
        this.resubscribeBCHAddresses(mnemonic)
        this.resubscribeSLPAddresses(mnemonic)
      }
    }
  },
  mounted () {
    console.log('testing')

    // saving unsaved active wallet to vault
    this.$store.dispatch('global/saveExistingWallet')
    // console.log(this.$store.getters['global/getAllWalletTypes'])
    // console.log(this.$store.getters['global/getVault'])

    this.$pushNotifications.events.addEventListener('pushNotificationReceived', notification => {
      console.log('Notification:', notification)
      if (notification?.title || notification?.body) {
        this.$q.notify({
          color: 'brandblue',
          message: notification?.title,
          caption: notification?.body,
          attrs: {
            style: 'word-break:break-all;',
          },
          actions: [
            { icon: 'close', 'aria-label': 'Dismiss', color: 'white' }
          ]
        })
      }
    })

    this.subscribePushNotifications()
    this.resubscribeAddresses()
    const vm = this
    if (vm.$q.platform.is.bex) {
      if (vm.$refs?.container?.style?.display) vm.$refs.container.style.display = 'none'
      document.body.style.width = '375px'
      document.body.style.minHeight = '650px'
      document.body.style.margin = '0 auto'

      vm.$q.bex.on('bex.paytaca.send', event => {
        vm.$router.push({
          name: 'transaction-send',
          query: {
            assetId: event.data.assetId,
            amount: event.data.amount,
            recipient: event.data.recipient
          }
        })
      })

      vm.$q.bex.on('bex.paytaca.connecta', event => {
        const query = {}
        if (event.data.paymentRequestData) query.paymentRequestData = event.data.paymentRequestData
        else if (event.data.orderId) query.orderId = event.data.orderId
        vm.$router.push({
          name: 'connecta',
          query: query
        })
      })
    }
  },
  unmounted () {
    if (this.assetPricesUpdateIntervalId) clearInterval(this.assetPricesUpdateIntervalId)
  },
  created () {
    const vm = this
    setTimeout(function () {
      if (vm.$refs?.container?.style?.display) vm.$refs.container.style.display = 'block'

      vm.$store.dispatch('market/updateCoinsList', { force: false })
        .finally(() => {
          vm.assetPricesUpdateIntervalId = setInterval(() => {
            vm.$store.dispatch('market/updateAssetPrices', {})
          }, 60 * 1000)
        })
    }, 500)
  }
}
</script>

<style>
#q-app {
  overflow: auto;
}
</style>
