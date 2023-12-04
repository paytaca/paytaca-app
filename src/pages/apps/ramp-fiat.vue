<template>
  <div id="app-container" class="row" :class="{'pt-dark': darkMode}">
    <HeaderNav :title="`${appTitle.toLocaleUpperCase()} Ramp`" backnavpath="/apps"/>
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader/>
    </div>
    <div v-else-if="!loggedIn" class="q-mt-md">
      <RampLogin @loggedIn="loggedInAs" :error="errorMessage"/>
    </div>
    <div v-else>
      <FiatIndex v-if="userType === 'peer'"/>
      <AppealIndex v-if="userType === 'arbiter'"/>
    </div>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AppealIndex from 'src/components/ramp/appeal/AppealIndex.vue'
import FiatIndex from 'src/components/ramp/fiat/FiatIndex.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    FiatIndex,
    AppealIndex,
    RampLogin
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      error: false,
      pageName: 'ramp-fiat-store',
      loggedIn: false,
      userType: null,
      errorMessage: null,
      isloaded: false
    }
  },
  computed: {
    appTitle () {
      if (this.userType === 'arbiter') return 'appeal'
      return 'fiat'
    }
  },
  created () {
    bus.on('session-expired', this.handleSessionEvent)
  },
  async mounted () {
    this.isloaded = true
  },
  methods: {
    handleSessionEvent (data) {
      this.loggedIn = false
      this.errorMessage = 'Session expired'
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    },
    loggedInAs (userType) {
      this.loggedIn = true
      this.userType = userType
    }
  }
}
</script>
<style lang="scss" scoped>
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>