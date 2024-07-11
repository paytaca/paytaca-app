<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
    <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
  </div>
</template>
<script>
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  components: {
    RampLogin,
    ProgressLoader
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      user: null,
      showLogin: false,
      isloaded: false
    }
  },
  async mounted () {
    await this.getUser()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async getUser () {
      await backend.get('auth').then((response) => {
        this.showLogin = !response?.data?.is_authenticated
        this.user = response.data
        if (!this.showLogin) {
          this.isloaded = true
          this.goToMainPage()
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
    }
  }
}
</script>
