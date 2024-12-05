<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)" v-if="!networkError && !openVersionUpdate">
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
    <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
  </div>
  <NetworkError v-if="networkError"/>
</template>
<script>
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import NetworkError from 'src/components/ramp/fiat/NetworkError.vue'
import versionUpdate from 'src/pages/transaction/dialog/versionUpdate.vue'
import packageInfo from '../../../../package.json'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/exchange/wallet'
import { getAuthToken } from 'src/exchange/auth'

export default {
  components: {
    RampLogin,
    ProgressLoader,
    NetworkError
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      user: null,
      showLogin: false,
      isloaded: false,
      networkError: false,
      openVersionUpdate: false
    }
  },
  async created () {
    bus.on('network-error', this.openNetworkError)
  },
  beforeUnmount () {
    this.$store.commit('ramp/resetListingTabs')
    this.$store.commit('ramp/resetAppealListingTab')
  },
  async mounted () {
    await this.checkVersionUpdate()
    loadRampWallet()
    await this.getUser()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async getUser () {
      await backend.get('auth')
        .then(async (response) => {
          const token = await getAuthToken()
          this.showLogin = !response?.data?.is_authenticated || !token
          this.user = response.data
          if (!this.showLogin) {
            this.isloaded = true
            this.goToMainPage()
          }
        })
        .catch(error => {
          console.log(error.response || error)
          if (error.response) {
            if (error.response?.status === 404) {
              this.showLogin = true
            }
          } else {
            this.networkError = true
          }
        })
    },
    onLoggedIn () {
      this.showLogin = false
      this.isloaded = true
      this.goToMainPage()
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
    openNetworkError () {
      this.showLogin = false
      this.networkError = true
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
            this.networkError = true
          })
      }
    }
  }
}
</script>
