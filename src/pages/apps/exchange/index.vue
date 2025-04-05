<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)" v-if="!openVersionUpdate">
    <router-view :key="$route.path"></router-view>
  </div>
  <OngoingMaintenanceDialog v-if="appDisabled"/>
</template>
<script>
import OngoingMaintenanceDialog from 'src/components/ramp/fiat/dialogs/OngoingMaintenanceDialog.vue'
import versionUpdate from 'src/pages/transaction/dialog/versionUpdate.vue'
import packageInfo from '../../../../package.json'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/exchange/wallet'

export default {
  components: {
    OngoingMaintenanceDialog
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      user: null,
      isloaded: false,
      openVersionUpdate: false,
      appDisabled: false
    }
  },
  async created () {
    bus.on('websocket-disconnected', this.handleDisconnectedWS)
  },
  beforeUnmount () {
    this.$store.commit('ramp/resetListingTabs')
    this.$store.commit('ramp/resetAppealListingTab')
  },
  async mounted () {
    const appEnabled = this.$store.getters['global/appControl']
    if (appEnabled && appEnabled.P2P_EXCHANGE === false) {
      this.appDisabled = !appEnabled
    } else {
      await this.checkVersionUpdate()
      loadRampWallet()
      await this.getUser()
      if (this.$route.name === 'exchange') {
        this.goToMainPage()
      }
    }
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async getUser () {
      await backend.get('auth')
        .then(async (response) => {
          this.user = response.data
        })
        .catch(error => {
          console.log(error.response || error)
        })
    },
    goToMainPage () {
      if (this.user?.is_arbiter) {
        this.$router?.push({ name: 'arbiter-appeals' })
      } else {
        if ('ad_id' in this.$route.query) {
          this.$router?.push({ name: 'p2p-store', query: this.$route.query })
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
        // fetching version check
        await backend.get(`ramp-p2p/version/check/${platform}/`)
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
            console.error(error)
            this.appDisabled = true
          })
      }
    }
  }
}
</script>
