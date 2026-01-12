<template>
    <div>
      <router-view />
      <v-offline @detected-condition="onConnectivityChange" />
      
      <!-- Privacy overlay for app switcher/background preview -->
      <!-- Always present in DOM, controlled by CSS class for instant visibility -->
      <!-- Shows immediately on pause to prevent sensitive content in app preview -->
      <div 
        id="privacy-overlay" 
        class="privacy-overlay" 
        :class="[privacyOverlayTheme, privacyOverlayDarkMode]">
        <div class="privacy-overlay-content">
          <div class="logo-container">
            <img src="~/assets/paytaca_logo.png" height="60" alt="Paytaca" class="privacy-logo">
          </div>
        </div>
      </div>
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
import ScreenshotSecurity from './utils/screenshot-security'

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
      pauseListener: null, // Listener for app pause (background) events
      resumeListener: null, // Listener for app resume (foreground) events
      lastPauseTime: 0, // Timestamp of last pause event (to detect genuine background/foreground transitions)
      showPrivacyOverlay: false // Controls privacy overlay visibility for app preview protection
    }
  },
  computed: {
    privacyOverlayTheme() {
      const theme = this.$store?.state?.global?.theme || 'glassmorphic-blue'
      return `theme-${theme}`
    },
    privacyOverlayDarkMode() {
      const darkMode = this.$store?.state?.darkmode?.darkmode
      return darkMode ? 'dark' : 'light'
    },
    walletIndex() {
      return this.$store.getters['global/getWalletIndex']
    },
    lockAppEnabled() {
      return this.$store.getters['global/lockApp']
    }
  },
  watch: {
    // Watch for wallet switches to update screenshot security
    walletIndex() {
      this.updateScreenshotSecurity()
    },
    // Watch for changes to lock app setting
    lockAppEnabled() {
      this.updateScreenshotSecurity()
    }
  },
  methods: {
    async updateScreenshotSecurity() {
      const vm = this
      if (!vm.$q.platform.is.mobile) {
        return
      }
      
      const lockAppEnabled = vm.$store.getters['global/lockApp']
      try {
        await ScreenshotSecurity.setSecureFlag({ enabled: lockAppEnabled })
      } catch (error) {
        console.error('[App] Failed to set screenshot security:', error)
      }
    },
    async setupAppLifecycleListener() {
      const vm = this
      
      // Use pause/resume events instead of appStateChange
      // These are more reliable and only fire on actual background/foreground transitions
      // They don't fire on dialogs, route changes, or other UI events
      
      // Listen for app going to background (pause event)
      vm.pauseListener = await CapacitorApp.addListener('pause', () => {
        // Get current route and wallet state
        const currentRoute = vm.$router.currentRoute.value.path
        const currentWalletIndex = vm.$store.getters['global/getWalletIndex']
        
        // SECURITY: Immediately show privacy overlay to prevent sensitive content in app preview
        // This overlay appears SYNCHRONOUSLY before OS takes the app switcher snapshot
        // The lock screen navigation happens after, but this overlay ensures the preview is protected
        const lockAppEnabled = vm.$store.getters['global/lockApp']
        const currentUnlockState = vm.$store.getters['global/isUnlocked']
        
        // Wallet backup routes have their own authentication (PIN/biometric) separate from app lock
        // They should not be interrupted by app lock logic, as they handle their own security
        const isWalletBackupRoute = currentRoute.startsWith('/apps/wallet-backup')
        
        if (lockAppEnabled && !isWalletBackupRoute) {
          // Show privacy overlay IMMEDIATELY by directly manipulating DOM (synchronous, before OS snapshot)
          // This bypasses Vue's reactivity delay to ensure overlay is visible before OS captures snapshot
          const overlay = document.getElementById('privacy-overlay')
          if (overlay) {
            overlay.style.display = 'flex'
            overlay.style.visibility = 'visible'
            overlay.style.opacity = '1'
            // Force immediate reflow/repaint to ensure overlay is rendered before OS captures snapshot
            overlay.offsetHeight // eslint-disable-line no-unused-expressions
          } else {
            console.warn('[App] Privacy overlay element not found in DOM')
          }
          
          // Also set the data property for consistency
          vm.showPrivacyOverlay = true
          
          // Reset unlock state immediately
          vm.$store.commit('global/setIsUnlocked', false)
          
          // Navigate to lock screen (asynchronous, after overlay is shown)
          // Use replace to avoid adding to history
          const currentRouteObj = vm.$router.currentRoute.value
          const currentPath = currentRouteObj.path
          const currentFullPath = currentRouteObj.fullPath
          
          // Only navigate if not already on lock screen (check path, not fullPath with query params)
          if (currentPath !== '/lock') {
            vm.$router.replace({
              path: '/lock',
              query: { redirect: currentFullPath }
            }).catch(() => {
              // Navigation failed, likely already on lock screen
            })
          }
        }
        
        // Record pause timestamp - this helps distinguish genuine backgrounding
        // from spurious resume events (e.g., from showing dialogs on Android)
        vm.lastPauseTime = Date.now()
      })
      
      // Listen for app coming to foreground (resume event)
      vm.resumeListener = await CapacitorApp.addListener('resume', () => {
        // Get current route and wallet state
        const currentRoute = vm.$router.currentRoute.value.path
        const currentWalletIndex = vm.$store.getters['global/getWalletIndex']
        const lockAppEnabled = vm.$store.getters['global/lockApp']
        
        // Check unlock state using multiple methods to avoid race conditions
        // This is critical because the state might be in transition after authentication
        let isUnlocked = Boolean(vm.$store.getters['global/isUnlocked'])
        // Also check state directly as a fallback
        const stateUnlocked = vm.$store.state?.global?.isUnlocked
        if (typeof stateUnlocked === 'boolean') {
          isUnlocked = Boolean(stateUnlocked)
        }
        
        const isOnLockScreen = currentRoute === '/lock'
        
        // CRITICAL SECURITY CHECK: If we're on lock screen and app is locked, NEVER unlock automatically
        // This prevents app switcher previews on Android from bypassing the lock screen
        // The lock screen can ONLY be dismissed through successful authentication
        // IMPORTANT: Only force lock if unlock state is actually false (not just falsy)
        // This prevents race conditions where unlock state was just set to true but hasn't propagated yet
        if (lockAppEnabled && isOnLockScreen && isUnlocked === false) {
          // Only force unlock state to false if it's not already true
          // This prevents race conditions where authentication just succeeded
          const currentUnlockState = vm.$store.getters['global/isUnlocked']
          if (currentUnlockState !== true) {
            vm.$store.commit('global/setIsUnlocked', false)
          }
          // Ensure we stay on lock screen (router guard should handle this, but be defensive)
          if (currentRoute !== '/lock') {
            const currentFullPath = vm.$router.currentRoute.value.fullPath
            vm.$router.replace({
              path: '/lock',
              query: { redirect: currentFullPath }
            }).catch(() => {
              // Navigation failed
            })
          }
          // Hide privacy overlay now that lock screen is visible
          const overlay = document.getElementById('privacy-overlay')
          if (overlay) {
            overlay.style.display = 'none'
            overlay.style.visibility = 'hidden'
            overlay.style.opacity = '0'
          }
          vm.showPrivacyOverlay = false
          // Don't process any resume logic - lock screen must stay until authentication
          return
        }
        
        const now = Date.now()
        const timeSincePause = now - vm.lastPauseTime
        const isAndroid = vm.$q.platform.is.android
        
        // Platform-specific logic:
        // - Android: Dialogs/sidebars trigger rapid pause/resume (< 2 seconds), so we need to filter these out
        // - iOS: Pause/resume events are more reliable, but we still check pause duration for safety
        
        if (vm.lastPauseTime === 0) {
          // No pause event recorded - this is a spurious resume (can happen on Android)
          return
        }
        
        // On Android, dialogs/sidebars trigger rapid pause/resume (< 2 seconds)
        // On iOS, pause/resume is more reliable, but dialogs can still cause short pauses
        // Wallet switching and UI interactions happen in < 1 second
        // We use different thresholds to distinguish real backgrounding from UI interactions
        const minPauseDuration = isAndroid ? 2000 : 500
        
        if (timeSincePause < minPauseDuration) {
          // App was paused for less than threshold - this is a dialog/UI interaction, not real backgrounding
          // CRITICAL: On Android, app switcher previews can trigger resume events even when app isn't in foreground
          // We should NEVER auto-unlock when on lock screen - user must authenticate
          // Only auto-unlock if we're NOT on lock screen (meaning pause didn't navigate to lock, so it was a dialog)
          
          if (lockAppEnabled && isOnLockScreen) {
            // We're on lock screen - DO NOT auto-unlock
            // On Android, app switcher previews trigger resume events, so we must require authentication
            // On iOS, we could auto-unlock, but for security consistency, we require authentication here too
            // Hide privacy overlay now that lock screen is visible
            const overlay = document.getElementById('privacy-overlay')
            if (overlay) {
              overlay.style.display = 'none'
              overlay.style.visibility = 'hidden'
              overlay.style.opacity = '0'
            }
            vm.showPrivacyOverlay = false
          } else if (lockAppEnabled && !isOnLockScreen) {
            // We're not on lock screen - this means pause didn't navigate to lock (likely a dialog)
            // Only unlock if we're not already on lock screen (for iOS dialogs that don't trigger navigation)
            // Don't change unlock state - it should already be unlocked if we're not on lock screen
            // Hide privacy overlay (may have been shown on pause)
            const overlay = document.getElementById('privacy-overlay')
            if (overlay) {
              overlay.style.display = 'none'
              overlay.style.visibility = 'hidden'
              overlay.style.opacity = '0'
            }
            vm.showPrivacyOverlay = false
          }
          
          // Reset pause timestamp to prevent stale timestamps from interfering with future checks
          vm.lastPauseTime = 0
          return
        }
        
        // App was genuinely backgrounded (paused for > threshold)
        // Since we already locked on pause (to protect app preview), we just need to verify
        // the lock state is correct and ensure we're on the lock screen
        
        if (lockAppEnabled) {
          // Verify lock state is correct (should already be locked from pause event)
          const currentUnlockState = vm.$store.getters['global/isUnlocked']
          
          if (currentUnlockState) {
            // Lock state wasn't reset on pause (shouldn't happen, but handle it)
            vm.$store.commit('global/setIsUnlocked', false)
          }
          
          // Ensure we're on lock screen (should already be there from pause event)
          if (!isOnLockScreen) {
            const currentFullPath = vm.$router.currentRoute.value.fullPath
            vm.$router.replace({
              path: '/lock',
              query: { redirect: currentFullPath }
            }).catch(() => {
              // Navigation failed, likely already on lock screen
            })
          }
          
          // Hide privacy overlay now that lock screen is visible
          const overlay = document.getElementById('privacy-overlay')
          if (overlay) {
            overlay.style.display = 'none'
            overlay.style.visibility = 'hidden'
            overlay.style.opacity = '0'
          }
          vm.showPrivacyOverlay = false
        } else {
          // No lock enabled - unlock if we're on lock screen (shouldn't happen, but handle it)
          if (isOnLockScreen) {
            vm.$store.commit('global/setIsUnlocked', true)
            const redirectPath = vm.$router.currentRoute.value.query.redirect || '/'
            vm.$router.replace(redirectPath).catch(() => {
              // Navigation failed
            })
          }
          // Hide privacy overlay (no lock enabled)
          const overlay = document.getElementById('privacy-overlay')
          if (overlay) {
            overlay.style.display = 'none'
            overlay.style.visibility = 'hidden'
            overlay.style.opacity = '0'
          }
          vm.showPrivacyOverlay = false
        }
        
        // Reset pause timestamp to prevent stale timestamps from interfering with future checks
        // This prevents spurious resume events on Android from incorrectly triggering genuine background handling
        vm.lastPauseTime = 0
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
    },
    setupImageContextMenuPrevention() {
      const vm = this
      
      // Track touch start times and positions to detect long presses
      // Use touch identifier as key to handle cases where touch moves off element
      const touchStartData = new Map()
      
      // Helper to check if target is an asset image
      const isAssetImage = (target) => {
        if (!target) return false
        return target.tagName === 'IMG' && (
          target.classList.contains('asset-icon') ||
          target.closest('.asset-card') ||
          target.closest('.method-cards') ||
          target.closest('.transaction-item') ||
          target.closest('q-avatar')
        )
      }
      
      // Helper to find the parent clickable element
      const findClickableParent = (element) => {
        // First try to find the closest parent with known clickable classes
        const clickableParent = element.closest('.method-cards, .asset-card, .transaction-item, [clickable]')
        if (clickableParent) {
          return clickableParent
        }
        // Check for BCH card specifically (has id="bch-card")
        const bchCard = element.closest('#bch-card')
        if (bchCard) {
          // Find the parent div that has the click handler
          // The structure is: div.col.text-white (@click) > q-card#bch-card > ...
          let parentWithClick = bchCard.parentElement
          // Walk up to find the div with click handler (should be immediate parent)
          while (parentWithClick && parentWithClick !== document.body) {
            // Look for div with col or text-white class (the clickable container)
            if (parentWithClick.tagName === 'DIV' && 
                parentWithClick.classList && 
                (parentWithClick.classList.contains('col') || 
                 parentWithClick.classList.contains('text-white'))) {
              return parentWithClick
            }
            // Also check if it's a row container that might wrap the clickable div
            if (parentWithClick.tagName === 'DIV' && 
                parentWithClick.classList && 
                parentWithClick.classList.contains('row')) {
              // The clickable div should be a child of this row
              const clickableChild = Array.from(parentWithClick.children).find(
                child => child.classList && (child.classList.contains('col') || child.classList.contains('text-white'))
              )
              if (clickableChild) {
                return clickableChild
              }
            }
            parentWithClick = parentWithClick.parentElement
          }
        }
        // Fallback: walk up the DOM tree looking for clickable elements
        let current = element.parentElement
        while (current && current !== document.body) {
          // Check for known clickable classes
          if (current.classList.contains('method-cards') ||
              current.classList.contains('asset-card') ||
              current.classList.contains('transaction-item') ||
              current.hasAttribute('clickable')) {
            return current
          }
          // Check if element has click handler (native)
          if (current.onclick || current.style.cursor === 'pointer') {
            return current
          }
          // Check for Vue components (Vue 2 and Vue 3 store references differently)
          if (current.__vue__ || current.__vueParentComponent || current._vnode) {
            // If it's a Vue component, it might have click handlers
            // Check if it's a container element that typically has click handlers
            if (current.classList.contains('col') || 
                current.classList.contains('row') ||
                current.tagName === 'DIV' && current.children.length > 0) {
              // This might be a clickable container, return it
              return current
            }
          }
          current = current.parentElement
        }
        return null
      }
      
      // Prevent iOS image context menu for all asset images
      // Prevent default on touchstart to stop context menu, then manually trigger clicks for quick taps
      const handleTouchStart = (e) => {
        const target = e.target
        if (isAssetImage(target) && e.touches.length > 0) {
          // Prevent default to stop iOS context menu from appearing
          e.preventDefault()
          const touch = e.touches[0]
          // Store touch start time and position using touch identifier
          touchStartData.set(touch.identifier, {
            time: Date.now(),
            x: touch.clientX,
            y: touch.clientY,
            target: target,
            clickableParent: findClickableParent(target)
          })
        }
      }

      const handleTouchMove = (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0]
          const data = touchStartData.get(touch.identifier)
          if (data) {
            // If user moved significantly, clear the touch data (not a tap)
            const deltaX = Math.abs(touch.clientX - data.x)
            const deltaY = Math.abs(touch.clientY - data.y)
            if (deltaX > 10 || deltaY > 10) {
              touchStartData.delete(touch.identifier)
            }
          }
        }
      }

      const handleTouchEnd = (e) => {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0]
          const data = touchStartData.get(touch.identifier)
          if (data && isAssetImage(data.target)) {
            const duration = Date.now() - data.time
            // If it was a quick tap (<500ms) and didn't move much, trigger click on parent
            if (duration < 500 && data.clickableParent) {
              // Use setTimeout to ensure the touch event has fully completed
              setTimeout(() => {
                // Create and dispatch a click event to the parent element
                // Use the touch coordinates for the click event
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  detail: 1,
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  screenX: touch.screenX,
                  screenY: touch.screenY
                })
                data.clickableParent.dispatchEvent(clickEvent)
              }, 0)
            }
            // For long presses, we already prevented default on touchstart, so context menu won't show
          }
          touchStartData.delete(touch.identifier)
        }
      }

      const preventDefaultContext = (e) => {
        // Only prevent for images with asset-icon class or inside asset-related containers
        const target = e.target
        if (target.tagName === 'IMG' && (
          target.classList.contains('asset-icon') ||
          target.closest('.asset-card') ||
          target.closest('.method-cards') ||
          target.closest('.transaction-item') ||
          target.closest('q-avatar')
        )) {
          // Prevent default and stop propagation for context menu events
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }

      // Use event delegation on document body for all current and future images
      // Touch events: prevent default on touchstart to stop context menu, then manually trigger clicks
      document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true })
      // Context menu events: prevent default and stop propagation
      document.addEventListener('contextmenu', preventDefaultContext, { capture: true })
      document.addEventListener('selectstart', preventDefaultContext, { capture: true })

      // Store reference for cleanup
      vm._imageContextMenuPreventionHandlers = {
        touchstart: handleTouchStart,
        touchmove: handleTouchMove,
        touchend: handleTouchEnd,
        contextmenu: preventDefaultContext,
        selectstart: preventDefaultContext
      }
    }
  },
  beforeUnmount() {
    // Clean up global event listeners
    if (this._imageContextMenuPreventionHandlers) {
      const handlers = this._imageContextMenuPreventionHandlers
      document.removeEventListener('touchstart', handlers.touchstart, { capture: true })
      document.removeEventListener('touchmove', handlers.touchmove, { capture: true })
      document.removeEventListener('touchend', handlers.touchend, { capture: true })
      document.removeEventListener('contextmenu', handlers.contextmenu, { capture: true })
      document.removeEventListener('selectstart', handlers.selectstart, { capture: true })
      delete this._imageContextMenuPreventionHandlers
    }
  },
  beforeMount() {
    if (typeof navigator.onLine === 'boolean') {
      this.onConnectivityChange(navigator.onLine) 
    }
  },
  async mounted () {
    const vm = this

    // Clear session-based backup reminder dismissal on fresh app start
    // App.vue only mounts on fresh app start (not during navigation), so always clear
    sessionStorage.removeItem('backupReminderDismissedTimestamp')

    // Ensure current wallet index is valid (points to undeleted wallet)
    // This should run before any wallet operations
    // Skip if we just switched wallets (check for a flag or recent switch)
    await vm.$store.dispatch('global/ensureValidWalletIndex')

    // Set up app lifecycle listener for lock screen
    if (vm.$q.platform.is.mobile) {
      await vm.setupAppLifecycleListener()
    }

    // Initialize privacy overlay to hidden state
    const overlay = document.getElementById('privacy-overlay')
    if (overlay) {
      overlay.style.display = 'none'
      overlay.style.visibility = 'hidden'
      overlay.style.opacity = '0'
    }

    // On initial mount (cold start), reset unlock state if lock is enabled
    const lockAppEnabled = vm.$store.getters['global/lockApp']
    if (lockAppEnabled) {
      vm.$store.commit('global/setIsUnlocked', false)
    }

    // Initialize screenshot security based on current wallet's lock setting
    await vm.updateScreenshotSecurity()

    // Prevent iOS image context menu for all asset images
    vm.setupImageContextMenuPrevention()

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
        // Watchtower is up
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
    // Clean up app lifecycle listeners
    if (this.pauseListener) {
      this.pauseListener.remove()
    }
    if (this.resumeListener) {
      this.resumeListener.remove()
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

/* Privacy overlay for app switcher/background preview */
.privacy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: none; /* Hidden by default */
  visibility: hidden;
  opacity: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 0.1s ease; /* Quick transition for smooth appearance */
  
  /* Glassmorphic animated gradient background */
  &.light {
    background: linear-gradient(-45deg, #f5f7fa, #e8eef5, #f0f4f8, #e3e9f0);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  &.dark {
    background: linear-gradient(-45deg, #1a1d23, #252930, #1e2229, #2a2f38);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  /* Theme-specific gradient overlays */
  &.theme-glassmorphic-blue {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-gold {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-green {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-red {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-payhero {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
}

.privacy-overlay-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  border-radius: 50%;
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: pulse 3s ease-in-out infinite;
}

.privacy-logo {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}
</style>
