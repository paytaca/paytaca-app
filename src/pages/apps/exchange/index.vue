<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)" v-if="!networkError">
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
    <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
  </div>
  <NetworkError v-else/>
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

export default {
  components: {
    RampLogin,
    ProgressLoader,
    NetworkError,
    versionUpdate
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      user: null,
      showLogin: false,
      isloaded: false,
      networkError: false,
      appVersion: packageInfo.version
    }
  },
  async created () {
    bus.on('network-error', this.openNetworkError)
  },
  async mounted () {
    // this.checkVersionUpdate() // WIP
    loadRampWallet()
    await this.getUser()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async getUser () {
      await backend.get('auth')
        .then((response) => {
          this.showLogin = !response?.data?.is_authenticated
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
        this.$router?.push({ name: 'p2p-store' })
      }
    },
    openNetworkError () {
      this.showLogin = false
      this.networkError = true
    },
    checkVersionUpdate () {
      const vm = this
      // console.log('current version: ', this.appVersion)

      // restricting version update dialog to mobile, ios & browser extentions
      const platformCont = [vm.$q.platform.is.mobile, vm.$q.platform.is.ios, vm.$q.platform.is.bex].includes(true)

      // fetch allowed versions

      // if continue
      if (platformCont) {
        this.$q.dialog({
          component: versionUpdate,
        })
      }
    }
  }
}
</script>
