<template>
    <router-view />
</template>

<script>
import { getMnemonic, Wallet, loadWallet } from './wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'

// Handle JSON serialization of BigInt
// Source: https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006086291
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

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
      const wallet = await loadWallet('BCH', this.$store.getters['global/getWalletIndex'])
      const walletHashes = [
        getWalletByNetwork(wallet, 'bch').getWalletHash(),
        getWalletByNetwork(wallet, 'slp').getWalletHash(),
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
        lastBCHIndex = await getWalletByNetwork(wallet, 'bch').getLastAddressIndex({
          exclude_pos: true,
          with_tx: true
        })
        if (!Number.isInteger(lastBCHIndex)) throw new TypeError('Invalid index')
      } catch(error) {
        lastBCHIndex = this.$store.getters['global/getWallet']('bch')?.lastAddressIndex
      }

      try {
        // added iterator 'ctr' to cap index to 50
        for (var i = resubscriptionInfo.lastIndex+1, ctr = 0; i <= lastBCHIndex && ctr < 50; i++, ctr++) {
          await getWalletByNetwork(wallet, 'bch').getNewAddressSet(i)
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
    async resubscribeAddresses(mnemonic) {
      this.resubscribeBCHAddresses(mnemonic)
      this.resubscribeSLPAddresses(mnemonic)
    },
    // Generate chipnet for existing wallet
    async savingInitialChipnet (mnemonic) {
      const vm = this

      const chipnetHash = vm.$store.getters['global/getAllChipnetTypes'].bch.walletHash

      if (chipnetHash.length === 0) {
        const wallet = new Wallet(mnemonic, 'BCH')

        const bchChipWallet = wallet.BCH_CHIP
        const slpChipWallet = wallet.SLP_TEST

        const isChipnet = true

        // save BCH_CHIP
        await bchChipWallet.getNewAddressSet(0).then(function ({ addresses, pgpIdentity }) {
          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'bch',
            walletHash: bchChipWallet.walletHash,
            derivationPath: bchChipWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
          })
          vm.$store.dispatch('chat/addIdentity', pgpIdentity)
          try {
            vm.$store.dispatch('global/refetchWalletPreferences')
          } catch(error) { console.error(error) }
        })

        bchChipWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'bch',
            xPubKey: xpub
          })
        })

        // save SLP_CHIP
        slpChipWallet.getNewAddressSet(0).then(function (addresses) {
          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'slp',
            walletHash: slpChipWallet.walletHash,
            derivationPath: slpChipWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
          })
        })

        slpChipWallet.getXPubKey().then(function (xpub) {
          vm.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'slp',
            xPubKey: xpub
          })
        })
      }
    }
  },
  async mounted () {
    const vm = this
    const index = vm.$store.getters['global/getWalletIndex']
    const mnemonic = await getMnemonic(index)
    if (mnemonic) {
      console.log(vm.$store.getters['global/language'])
      vm.$i18n.locale =  vm.$store.getters['global/language'].value
      await vm.savingInitialChipnet(mnemonic)
      // first check if vaults are empty
      this.$store.dispatch('global/saveExistingWallet')
      this.$store.dispatch('assets/saveExistingAsset', { index: this.$store.getters['global/getWalletIndex'], walletHash: this.$store.getters['global/getWallet']('bch')?.walletHash })

      if (this.$q.platform.is.mobile) {
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
      }
      this.resubscribeAddresses(mnemonic)
    }

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

      vm.$q.bex.on('bex.paytaca.connect', async (event) => {
        vm.$router.push({
          name: 'connect',
          query: {
            origin: event.data.origin,
            eventResponseKey: event.data.eventResponseKey,
          },
        })
      })

      vm.$q.bex.on('bex.paytaca.signMessage', async (event) => {
        vm.$router.push({
          name: 'sign-message',
          query: {
            origin: event.data.origin,
            assetId: event.data.assetId,
            message: event.data.message,
            userPrompt: event.data.userPrompt,
            eventResponseKey: event.data.eventResponseKey,
          },
        })
      })

      vm.$q.bex.on('bex.paytaca.signTransaction', async (event) => {
        vm.$router.push({
          name: 'sign-transaction',
          query: {
            origin: event.data.origin,
            assetId: event.data.assetId,
            transaction: event.data.transaction,
            sourceOutputs: event.data.sourceOutputs,
            broadcast: event.data.broadcast,
            userPrompt: event.data.userPrompt,
            eventResponseKey: event.data.eventResponseKey,
          },
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

<style lang="scss">
#q-app {
  overflow: auto;
}

#app-container {
  position: relative !important;
  background-color: #ECF3F3;
  min-height: 100vh;
  flex-direction: column;
  display: flex;
}

body {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}

body::-webkit-scrollbar { 
  display: none;  /* Safari and Chrome */
}
</style>
