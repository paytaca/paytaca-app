<template>
    <div>
      <router-view />
      <v-offline @detected-condition="onConnectivityChange" />
    </div>
</template>

<script>
import { getMnemonic, Wallet, loadWallet } from './wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { useStore } from "vuex"
import { useQuasar } from 'quasar'
import { computed, watchEffect } from "@vue/runtime-core"
import Watchtower from 'watchtower-cash-js'
import { VOffline } from 'v-offline'

// Handle JSON serialization of BigInt
// Source: https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006086291
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

export default {
  name: 'App',
  components: { VOffline },
  setup () {
    const store = useStore()
    const $q = useQuasar()
    const theme = computed(() => store?.state?.global?.theme)
    const darkMode = computed(() => store?.state?.darkmode?.darkmode)
    window.toggleDark = () => store.commit('darkmode/setDarkmodeSatus', !darkMode.value)

    watchEffect(() => {
      // Set the theme
      const classes = document.body.classList
      classes.forEach(function (cl) {
        if (cl.startsWith('theme-')) {
          document.body.classList.remove(cl)
        }
      })
      document.body.classList.add(`theme-${theme.value}`)
      
      // Set quasar dark mode true/false
      $q.dark.set(darkMode.value)
    })
  },
  data () {
    return {
      promptedPushNotifications: false,
      subscribedPushNotifications: false,
      assetPricesUpdateIntervalId: null,
      offlineNotif: null
    }
  },
  methods: {
    async onConnectivityChange (online) {
      console.log("CONNECTIVITY CHANGE", online)
      const vm = this
      vm.$store.dispatch('global/updateConnectivityStatus', online)
      if (online) {
        if (vm.offlineNotif) vm.offlineNotif()
      } else {
        vm.offlineNotif = vm.$q.notify({
          group: 'connectivity-offline-notif',
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ],
          type: 'negative',
          icon: 'signal_wifi_off',
          iconColor: 'primary',
          color: 'red-4',
          timeout: 0,
          message: vm.$t('NoInternetConnectionNotice')
        })
      }
    },
    async subscribePushNotifications() {
      if (this.subscribedPushNotifications) return
      const multiWalletIndex = this.$store.getters['global/getWalletIndex']
      const wallet = await loadWallet('BCH', multiWalletIndex)
      const walletHashes = [
        getWalletByNetwork(wallet, 'bch').getWalletHash(),
        getWalletByNetwork(wallet, 'slp').getWalletHash(),
        // wallet.sBCH.getWalletHash(),
      ]

      await this.$pushNotifications.isPushNotificationEnabled().catch(console.log)
      if (!this.$pushNotifications.isEnabled && !this.promptedPushNotifications) {
        await this.$pushNotifications.openPushNotificationsSettingsPrompt({
          message: 'Enable push notifications to receive updates from the app',
        }).catch(console.log)
        this.promptedPushNotifications = true
      }

      this.$pushNotifications.watchtower = new Watchtower(this.$store.state.global.isChipnet)
      await this.$pushNotifications.subscribe(walletHashes, multiWalletIndex)
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
        await bchChipWallet.getNewAddressSet(0).then(function ({ addresses }) {
          vm.$store.commit('global/updateWallet', {
            isChipnet,
            type: 'bch',
            walletHash: bchChipWallet.walletHash,
            derivationPath: bchChipWallet.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0,
          })
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
  beforeMount() {
    if (typeof navigator.onLine === 'boolean') {
      this.onConnectivityChange(navigator.onLine) 
    }
  },
  async mounted () {
    const vm = this

    // Forcibly disable SmartBCH, in preparation for future deprecation
    this.$store.commit('global/disableSmartBCH')

    const index = vm.$store.getters['global/getWalletIndex']
    const mnemonic = await getMnemonic(index)
    if (mnemonic) {
      vm.$q.lang.set(vm.$store.getters['global/language'].value)
      await vm.savingInitialChipnet(mnemonic)
      // first check if vaults are empty
      this.$store.dispatch('global/saveExistingWallet')
      this.$store.dispatch('assets/saveExistingAsset', { index: this.$store.getters['global/getWalletIndex'], walletHash: this.$store.getters['global/getWallet']('bch')?.walletHash })

      if (this.$q.platform.is.mobile) {
        this.$pushNotifications.events.addEventListener('pushNotificationReceived', notification => {
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
      document.body.style.minHeight = '700px'
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
  overscroll-behavior: none;
}

body::-webkit-scrollbar { 
  display: none;  /* Safari and Chrome */
}
</style>
