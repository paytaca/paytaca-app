<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)" v-if="!openVersionUpdate">
    <router-view v-if="isloaded" :key="$route.path"></router-view>
    
    <!-- Skeleton Loading State for Initial Auth -->
    <div v-else class="full-width">
      <!-- Header (visible during loading) -->
      <HeaderNav title="P2P Exchange" backnavpath="/apps" class="header-nav" />
      
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
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import OngoingMaintenanceDialog from 'src/components/ramp/fiat/dialogs/OngoingMaintenanceDialog.vue'
import versionUpdate from 'src/pages/transaction/dialog/versionUpdate.vue'
import packageInfo from '../../../../package.json'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/exchange/wallet'

export default {
  components: {
    HeaderNav,
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
      continue: false
    }
  },
  async created () {
    bus.on('websocket-disconnected', this.handleDisconnectedWS)
  },
  beforeUnmount () {
    this.$store.commit('ramp/resetListingTabs')
    this.$store.commit('ramp/resetAppealListingTab')
  },
  watch: {
    $route (to, from) {
      if (from.path.includes('apps/exchange')) {        
        if ('ad_id' in to.query) {
          this.$router?.push({ name: 'p2p-store', query: to.query })
        }             
      }      
    },
    continue (val) {
      if (val) {
        this.goToMainPage()
      }
    }
  },
  async mounted () {
    const appEnabled = this.$store.getters['global/appControl']
    if (appEnabled && appEnabled.P2P_EXCHANGE === false) {
      this.appDisabled = !appEnabled
    } else {
      // Ensure wallet state is initialized before accessing getters
      const wallet = this.$store.getters['global/getWallet']('bch')
      const walletHash = wallet?.walletHash
      if (walletHash) {
        // Initialize wallet-specific state if not already initialized
        this.$store.commit('ramp/initializeWalletState', walletHash)
        this.$store.commit('paytacapos/initializeWalletState', walletHash)
      }
      
      // Parallelize independent operations
      const [versionCheckResult, rampWallet, userResult] = await Promise.allSettled([
        this.checkVersionUpdate(),
        loadRampWallet(),
        this.getUser()
      ])
      
      // Store wallet instance in Vuex to avoid duplicate loading
      if (rampWallet.status === 'fulfilled') {
        this.$store.commit('ramp/updateWallet', rampWallet.value)
      }
      
      // Handle version check errors gracefully (non-blocking)
      if (versionCheckResult.status === 'rejected') {
        console.error('Version check failed:', versionCheckResult.reason)
      }
      
      if (this.$route.name === 'exchange') {
        this.goToMainPage()
      }
    }
  },
  methods: {
    getDarkModeClass,
    async getUser () {
      await backend.get('auth')
        .then(async (response) => {
          this.user = response.data
          // Store user in Vuex for use by other components
          this.$store.commit('ramp/updateUser', response.data)
          this.continue = true
          // Set isloaded earlier - don't wait for version check
          this.isloaded = true
        })
        .catch(error => {
          if (error.response?.data?.error === 'user does not exist') {
            this.continue = true
          } else {
            console.error(error.response || error)
          }
          // Set isloaded even on error so UI can render
          this.isloaded = true
        })
    },
    goToMainPage () {
      this.$store.commit('ramp/updateUser', this.user)
      if (this.user?.is_arbiter) {
        if ('appeal_id' in this.$route.query) {
          this.$router?.push({ name: 'arbiter-appeals', query: this.$route.query})
        } else {
          this.$router?.push({ name: 'arbiter-appeals' })
        }        
      } else {
        if ('ad_id' in this.$route.query) {
          this.$router?.push({ name: 'p2p-store', query: this.$route.query })
        }
        else if ('order_id' in this.$route.query) {
          this.$router?.push({ name: 'p2p-orders', query: this.$route.query })
        } else {
          this.$router?.push({ name: 'p2p-store' })
        }
      }
    },
    handleDisconnectedWS (url) {
      console.log('handleDisconnectedWS:', url)
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
        backend.get(`ramp-p2p/version/check/${platform}/`)
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
            console.error('Version check failed:', error)
            // Don't set appDisabled or isloaded here - version check is non-critical
          })
      }
    }
  }
}
</script>
