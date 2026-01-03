<template>
    <div>
      <router-view />
      <v-offline @detected-condition="onConnectivityChange" />
    </div>
</template>

<script>
import { updateCssThemeColors } from './utils/theme-utils'
import { getMnemonic, Wallet, loadWallet } from './wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { useStore } from "vuex"
import { is, useQuasar } from 'quasar'
import { computed, watchEffect } from "@vue/runtime-core"
import Watchtower from 'watchtower-cash-js'
import { VOffline } from 'v-offline'
import { checkWatchtowerStatus } from './utils/watchtower-status'
import AppVersionUpdate from './components/dialogs/AppVersionUpdate.vue'
import { App as CapacitorApp } from '@capacitor/app'

// Module-level variable to track version update dialog instance
// This persists across component remounts (important for iOS/Capacitor)
let versionUpdateDialogInstance = null

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

    // Migrate old 'default' theme to 'glassmorphic-blue'
    if (theme.value === 'default') {
      store.commit('global/setTheme', 'glassmorphic-blue')
    }

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
      offlineNotif: null,
      appStateListener: null,
      wasInBackground: false, // Track if app was in background
      lastBackgroundTime: null, // Timestamp when app went to background
      appInitialized: false, // Track if app has been initialized
      isCurrentlyActive: true, // Track current active state to detect real transitions
      unlockStateResetDisabled: false // Flag to prevent resetting unlock state
    }
  },
  methods: {
    async setupAppLifecycleListener() {
      const vm = this
      
      // Get initial app state
      CapacitorApp.getState().then(({ isActive }) => {
        console.log('[App] Initial app state:', isActive)
        vm.appInitialized = true
        vm.isCurrentlyActive = isActive
        // If app starts inactive, mark as was in background
        if (!isActive) {
          vm.wasInBackground = true
          vm.lastBackgroundTime = Date.now()
        }
      }).catch(err => {
        console.warn('[App] Could not get initial app state:', err)
        vm.appInitialized = true
        vm.isCurrentlyActive = true // Assume active if we can't determine
      })
      
      // Listen for app state changes (background/foreground)
      // In Capacitor 5, addListener returns a Promise<PluginListenerHandle>
      vm.appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        // Wait for initialization to complete
        if (!vm.appInitialized) {
          console.log('[App] App state change before initialization, ignoring')
          return
        }
        
        const lockAppEnabled = vm.$store.getters['global/lockApp']
        const currentUnlockState = vm.$store.getters['global/isUnlocked']
        
        // CRITICAL FIX FOR iOS: If app is already unlocked, completely ignore appStateChange events
        // iOS fires these events erratically (on dialog open, route change, etc.)
        // Once unlocked, the app should stay unlocked until a REAL background transition
        // Only ignore if we were NOT in background (to allow genuine background->foreground transitions to reset lock)
        if (currentUnlockState && isActive && !vm.wasInBackground) {
          console.log('[App] App already unlocked - ignoring appStateChange event (iOS false trigger protection)')
          // Still update the active state tracking, but don't reset unlock state
          if (!vm.isCurrentlyActive) {
            vm.isCurrentlyActive = true
          }
          return
        }
        
        // Only process if there's an actual state change
        if (isActive === vm.isCurrentlyActive) {
          console.log('[App] App state unchanged (isActive:', isActive, '), ignoring duplicate event')
          return
        }
        
        if (!isActive) {
          // App went to background - mark timestamp
          console.log('[App] App went to background, current unlock state:', currentUnlockState)
          vm.wasInBackground = true
          vm.lastBackgroundTime = Date.now()
          vm.isCurrentlyActive = false
        } else {
          // App came to foreground - only reset if we have clear evidence of background transition
          const timeSinceBackground = vm.lastBackgroundTime ? Date.now() - vm.lastBackgroundTime : 0
          console.log('[App] App came to foreground, wasInBackground:', vm.wasInBackground, 
                     'timeSinceBackground:', timeSinceBackground, 'ms, current unlock state:', currentUnlockState)
          
          // SECURITY FIX: Check if ANY wallet has lock enabled, not just the current wallet
          // This prevents the attack where: unlock wallet A (lock enabled), switch to wallet B (no lock),
          // background/foreground (no reset because B has no lock), switch back to A (still unlocked)
          // Since isUnlocked is session-global, we must reset it if ANY wallet has lock enabled
          const anyWalletHasLock = vm.$store.getters['global/anyWalletHasLockEnabled']
          
          // Only reset unlock state if:
          // 1. We actually transitioned from background to foreground (wasInBackground is true)
          // 2. ANY wallet has lock enabled (not just current wallet - security fix)
          // 3. We were in background for at least 500ms (prevents false triggers from rapid events)
          // 4. We're not in a state where reset is disabled
          if (vm.wasInBackground && anyWalletHasLock && timeSinceBackground >= 500 && !vm.unlockStateResetDisabled) {
            vm.$store.commit('global/setIsUnlocked', false)
            console.log('[App] At least one wallet has lock enabled - reset unlock state after background transition (was:', currentUnlockState, ')')
          } else {
            if (!vm.wasInBackground) {
              console.log('[App] Ignoring - was not in background, definitely false trigger')
            } else if (!anyWalletHasLock) {
              console.log('[App] Ignoring - no wallets have lock enabled')
            } else if (timeSinceBackground < 500) {
              console.log('[App] Ignoring rapid state change (timeSinceBackground:', timeSinceBackground, 'ms < 500ms)')
            } else if (vm.unlockStateResetDisabled) {
              console.log('[App] Ignoring - unlock state reset is disabled')
            }
          }
          
          // Reset the flag after handling the transition
          vm.wasInBackground = false
          vm.lastBackgroundTime = null
          vm.isCurrentlyActive = true
        }
      })
    },
    async onConnectivityChange (online) {
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
        getWalletByNetwork(wallet, 'slp').getWalletHash()
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

    // Ensure current wallet index is valid (points to undeleted wallet)
    // This should run before any wallet operations
    // Skip if we just switched wallets (check for a flag or recent switch)
    await vm.$store.dispatch('global/ensureValidWalletIndex')

    // Set up app lifecycle listener for lock screen
    if (vm.$q.platform.is.mobile) {
      await vm.setupAppLifecycleListener()
    }

    // On initial mount (cold start), reset unlock state if lock is enabled
    const lockAppEnabled = vm.$store.getters['global/lockApp']
    if (lockAppEnabled) {
      vm.$store.commit('global/setIsUnlocked', false)
    }

    // Note: Removed autoGenerateAddress calls - no longer needed since balances
    // are fetched via wallet hash API (cashtokens/fungible) instead of individual addresses

    // Forcibly disable SmartBCH, in preparation for future deprecation
    this.$store.commit('global/disableSmartBCH')

    const index = vm.$store.getters['global/getWalletIndex']
    const mnemonic = await getMnemonic(index)

    // Check watchtower status (with wallet hash if available)
    const walletHash = vm.$store.getters['global/getWallet']('bch')?.walletHash
    checkWatchtowerStatus(walletHash).then(response => {
      if (response.status === 200 && response.data.status === 'up') {
        console.log('Watchtower status: up')
      }
      
      // Check for app version update (check regardless of status being 'up')
      if (response.data?.app_version_check === 'outdated' && response.data?.app_upgrade) {
        const upgradeType = response.data.app_upgrade
        if (upgradeType === 'optional' || upgradeType === 'required') {
          // Show dialog if not already open (prevent duplicates)
          // Use module-level variable to persist across component remounts (important for iOS)
          // No need to track if optional dialog was shown - user can dismiss it
          if (!versionUpdateDialogInstance) {
            versionUpdateDialogInstance = vm.$q.dialog({
              component: AppVersionUpdate,
              componentProps: {
                upgradeType: upgradeType
              }
            })
            
            // Clear reference when dialog is closed
            versionUpdateDialogInstance.onOk(() => {
              versionUpdateDialogInstance = null
            }).onCancel(() => {
              versionUpdateDialogInstance = null
            }).onDismiss(() => {
              versionUpdateDialogInstance = null
            })
          }
        }
      }
    }).catch(error => {
      console.warn('Watchtower status check failed:', error)
    })

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
    // Clean up app state listener
    if (this.appStateListener) {
      this.appStateListener.remove()
    }
  },
  created () {
    const vm = this
    setTimeout(() => {
      updateCssThemeColors(this.$store.getters['global/theme']);
    }, 100)
    setTimeout(function () {
      if (vm.$refs?.container?.style?.display) vm.$refs.container.style.display = 'block'

      vm.$store.commit('market/updateCoinsList', [])
      vm.assetPricesUpdateIntervalId = setInterval(() => {
        vm.$store.dispatch('market/updateAssetPrices', {})
      }, 60 * 1000)
    }, 500)
  }
}
</script>

<style lang="scss">
#q-app {
  overflow: auto;
  
  /* Hide scrollbar completely on all platforms */
  &::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    -webkit-appearance: none !important;
  }
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
  -webkit-overflow-scrolling: touch !important;
}

#app-container {
  position: relative !important;
  background-color: #ECF3F3;
  min-height: 100vh;
  flex-direction: column;
  display: flex;
  
  /* Hide scrollbar completely on all platforms */
  &::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    -webkit-appearance: none !important;
  }
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
  -webkit-overflow-scrolling: touch !important;
}

body {
  -ms-overflow-style: none !important;  /* Internet Explorer 10+ */
  scrollbar-width: none !important;  /* Firefox */
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch !important;
}

body::-webkit-scrollbar { 
  display: none !important;  /* Safari and Chrome */
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none !important;
}

html {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
  -webkit-overflow-scrolling: touch !important;
  
  &::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    -webkit-appearance: none !important;
  }
}
</style>
