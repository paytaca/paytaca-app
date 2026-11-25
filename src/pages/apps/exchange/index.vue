<template>
  <P2PAvailability :key="availabilityIdentity" :ready="isloaded || showRegistration || appDisabled" :user-type="isloaded ? user.user_type : false" @available="onP2PAvailable" :authentication-error="authenticationError" @authenticate="retryAuthentication">
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)" v-if="!openVersionUpdate">
    <router-view v-if="isloaded" :key="$route.name"></router-view>
    <RampLogin v-else-if="showRegistration" @logged-in="onRegistered" />
    <!-- Skeleton Loading State for Initial Auth -->
    <div v-else class="full-width">
      <!-- Header (visible during loading) -->
      <HeaderNav title="P2P Ramp" backnavpath="/apps" class="header-nav" />
      
      <!-- Content Skeletons -->
      <div class="q-px-md">
        <!-- Tab Buttons Skeleton -->
        <div class="row justify-center q-mb-md">
          <q-skeleton type="rect" width="70%" height="48px" style="border-radius: 24px;" />
        </div>
        
        <!-- Listing Skeletons -->
        <q-list>
        <q-item v-for="n in 5" :key="n" class="q-mb-sm">
          <q-item-section>
            <div class="q-pb-sm">
              <q-skeleton type="text" width="40%" height="18px" class="q-mb-xs" />
              <div class="row q-mb-xs">
                <q-skeleton type="rect" width="100px" height="16px" />
                <q-skeleton type="text" width="40px" height="16px" class="q-ml-xs" />
              </div>
              <q-skeleton type="text" width="60%" height="14px" class="q-mb-xs" />
              <q-skeleton type="text" width="50%" height="22px" class="q-mb-xs" />
              <q-skeleton type="text" width="70%" height="14px" class="q-mb-xs" />
              <q-skeleton type="text" width="65%" height="14px" class="q-mb-sm" />
              <div class="row q-gutter-sm">
                <q-skeleton type="rect" width="80px" height="24px" style="border-radius: 12px;" />
                <q-skeleton type="rect" width="90px" height="24px" style="border-radius: 12px;" />
              </div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
      </div>
    </div>
  </div>
  <OngoingMaintenanceDialog v-if="appDisabled"/>
  </P2PAvailability>
</template>
<script>
import P2PAvailability from 'src/components/ramp/fiat/P2PAvailability.vue'
import HeaderNav from 'src/components/header-nav.vue'
import OngoingMaintenanceDialog from 'src/components/ramp/fiat/dialogs/OngoingMaintenanceDialog.vue'
import versionUpdate from 'src/pages/transaction/dialog/versionUpdate.vue'
import packageInfo from '../../../../package.json'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { availabilityError, isP2PAvailabilityError } from 'src/exchange/availability'
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/exchange/wallet'
import { loadAuthenticatedUser } from 'src/exchange/auth'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'

export default {
  components: {
    P2PAvailability,
    HeaderNav,
    RampLogin,
    OngoingMaintenanceDialog
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      user: null,
      isloaded: false,
      openVersionUpdate: false,
      appDisabled: false,
      checking: false,
      showRegistration: false,
      authAttempt: 0,
      authenticationError: null,
      sessionRecoveryScope: null,
      sessionRecoveryAt: 0,
      disposed: false
    }
  },
  async created () {
    bus.on('websocket-disconnected', this.handleDisconnectedWS)
    bus.on('session-expired', this.onSessionExpired)
    bus.on('p2p-authentication-failed', this.onAuthenticationFailed)
  },
  beforeUnmount () {
    this.disposed = true
    this.authAttempt++
    bus.off('websocket-disconnected', this.handleDisconnectedWS)
    bus.off('session-expired', this.onSessionExpired)
    bus.off('p2p-authentication-failed', this.onAuthenticationFailed)
    this.$store.commit('ramp/resetListingTabs')
    this.$store.commit('ramp/resetAppealListingTab')
  },
  computed: {
    availabilityIdentity () {
      const arbiter = this.$route.matched.some(route => route.name === 'exchange-arbiter')
      return JSON.stringify([this.walletIdentity, arbiter, this.user?.user_type, this.$store.getters['ramp/getUser']?.user_type])
    },
    walletIdentity () {
      return JSON.stringify([
        this.$store.getters['global/getWallet']('bch')?.walletHash,
        this.$store.getters['global/getWalletIndex'],
        this.$store.getters['global/isChipnet']
      ])
    }
  },
  watch: {
    walletIdentity: {
      flush: 'sync',
      handler () {
        this.authAttempt++
        this.authenticationError = null
        this.sessionRecoveryScope = null
        this.checking = false
        this.isloaded = false
        this.showRegistration = false
        this.getUser()
      }
    },
    $route (to, from) {
      const arbiter = to.matched.some(route => route.name === 'exchange-arbiter')
      const wasArbiter = from.matched.some(route => route.name === 'exchange-arbiter')
      if (arbiter !== wasArbiter && this.isloaded && arbiter !== this.user?.is_arbiter) this.getUser()
      if (from.path.includes('apps/exchange')) {        
        if ('ad_id' in to.query) {
          this.$router?.push({ name: 'p2p-store', query: to.query })
        }             
      }      
    }
  },
  async mounted () {
    const appEnabled = this.$store.getters['global/appControl']
    if (appEnabled && appEnabled.P2P_EXCHANGE === false) {
      this.appDisabled = true
    } else {
      // Ensure wallet state is initialized before accessing getters
      const wallet = this.$store.getters['global/getWallet']('bch')
      const walletHash = wallet?.walletHash
      if (walletHash) {
        // Initialize wallet-specific state if not already initialized
        this.$store.commit('ramp/initializeWalletState', walletHash)
        this.$store.commit('paytacapos/initializeWalletState', walletHash)
      }
      
      await this.getUser()
      if (!this.disposed && this.isloaded) this.checkVersionUpdate()
    }
  },
  methods: {
    getDarkModeClass,
    onAuthenticationFailed (error) {
      if (this.disposed) return
      this.authAttempt++
      this.checking = false
      this.authenticationError = error
      this.isloaded = false
      this.showRegistration = false
    },
    onSessionExpired () {
      if (this.checking || this.disposed || this.authenticationError) return
      const scope = this.availabilityIdentity
      if (this.sessionRecoveryScope === scope && Date.now() - this.sessionRecoveryAt < 60000) {
        this.authenticationError = availabilityError()
        this.isloaded = false
        return
      }
      this.sessionRecoveryScope = scope
      this.sessionRecoveryAt = Date.now()
      return this.getUser(true)
    },
    retryAuthentication () {
      if (this.checking || this.disposed) return
      this.authenticationError = null
      this.sessionRecoveryScope = null
      return this.getUser()
    },
    onP2PAvailable () {
      if (!this.isloaded && !this.showRegistration) return this.getUser()
    },
    async onRegistered () {
      this.showRegistration = false
      await this.getUser()
    },
    async getUser (forceLogin = false) {
      if (this.checking || this.disposed || this.appDisabled) return
      const attempt = ++this.authAttempt
      const identity = this.walletIdentity
      const isCurrent = () => !this.disposed && attempt === this.authAttempt && identity === this.walletIdentity
      this.checking = true
      this.isloaded = false
      try {
        const rampWallet = await loadRampWallet()
        if (!isCurrent()) return
        this.$store.commit('ramp/updateWallet', rampWallet)
        const user = await loadAuthenticatedUser(forceLogin)
        if (!isCurrent()) return
        const arbiterRoute = this.$route.matched.some(route => route.name === 'exchange-arbiter')
        if (this.$route.name !== 'exchange' && arbiterRoute !== !!user.is_arbiter) {
          throw Object.assign(new Error('Use the correct P2P account type.'), { code: 'p2p_account_type_mismatch' })
        }
        this.user = user
        this.$store.commit('ramp/updateUser', user)
        this.showRegistration = false
        this.isloaded = true
        if (this.$route.name === 'exchange') this.goToMainPage()
      } catch (error) {
        if (!isCurrent()) return
        if (isP2PAvailabilityError(error)) {
          bus.emit('p2p-unavailable', error)
          return
        }
        const arbiterRoute = this.$route.matched.some(route => route.name === 'exchange-arbiter')
        if ((error?.code === 'p2p_account_missing' || error?.response?.status === 404) && !arbiterRoute) {
          this.showRegistration = true
        } else {
          this.$q.notify({
            type: 'error',
            message: this.$t('P2PLoginFailed', {}, 'Unable to log in to P2P. Please try again.'),
            timeout: 5000
          })
          await this.$router.replace('/apps')
        }
      } finally {
        if (isCurrent()) this.checking = false
      }
    },
     goToMainPage () {
        this.$store.commit('ramp/updateUser', this.user)
       if (this.user?.is_arbiter) {
         if ('appeal_id' in this.$route.query) {
           this.$router?.replace({ name: 'arbiter-appeals', query: this.$route.query})
         } else {
           this.$router?.replace({ name: 'arbiter-appeals' })
         }        
       } else {
         if ('ad_id' in this.$route.query) {
           this.$router?.replace({ name: 'p2p-store', query: this.$route.query })
         }
         else if ('order_id' in this.$route.query) {
           // Preserve source parameter when navigating to orders page
           const queryParams = { order_id: this.$route.query.order_id }
           if (this.$route.query.source) {
             queryParams.source = this.$route.query.source
           }
            this.$router?.replace({ name: 'p2p-orders', query: queryParams })
         } else {
           this.$router?.replace({ name: 'p2p-store' })
         }
       }
     },
    handleDisconnectedWS (url) {
    },
    async checkVersionUpdate () {
      const vm = this
      const appVer = packageInfo.version

      /// get platform
      let platform = null

      if (vm.$q.platform.is.mobile) {
        platform = 'android'
      }
      if (vm.$q.platform.is.ios) {
        platform = 'ios'
      }
      if (vm.$q.platform.is.bex) {
        platform = 'web'
      }

      if (platform) {
        // fetching version check - non-blocking, don't prevent UI from showing
        backend.get(`/ramp-p2p/version/check/${platform}/`, { authorize: this.user.user_type })
          .then(response => {
            if (!('error' in response.data)) {
              const latestVer = response.data?.latest_version
              const minReqVer = response.data?.min_required_version

              if (appVer !== latestVer) {
                const appV = appVer.split('.').map(Number)
                const minV = minReqVer.split('.').map(Number)

                for (let i = 0; i < Math.max(appV.length, minV.length); i++) {
                  const v1 = appV[i] || 0
                  const v2 = minV[i] || 0

                  if (v1 < v2) {
                    this.openVersionUpdate = true
                    break
                  } else if (v1 > v2) {
                    this.openVersionUpdate = false
                    break
                  } else {
                    this.openVersionUpdate = false
                  }
                }

                // open version update dialog
                if (this.openVersionUpdate) {
                  this.$q.dialog({
                    component: versionUpdate,
                    componentProps: {
                      type: 'ramp',
                      data: response.data
                    }
                  }).onOk(() => {
                    this.openVersionUpdate = false
                  })
                }
              }
            }
          })
          .catch(error => {
            console.error('Version check failed:', error?.response?.status || error?.code || 'Request failed')
            // Don't set appDisabled or isloaded here - version check is non-critical
          })
      }
    }
  }
}
</script>
