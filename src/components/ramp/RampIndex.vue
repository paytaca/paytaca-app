<template>
    <div id="app-container" :class="{'pt-dark': darkMode}">
      <HeaderNav
        :title="`${appTitle.toLocaleUpperCase()} Ramp`"
        backnavpath="/apps"
      />

      <!-- Progress Loader -->
      <div v-if="!appSelection && !isloaded">
        <div class="row justify-center q-py-lg" style="margin-top: 50%">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-pt-xs">
        <!-- CRYPTO Tab Content -->
        <div v-if="selectedApp === 'crypto'">
          <!-- Shift form -->
          <RampShiftForm v-if="isAllowed"/>
          <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>
              Sorry. This feature is blocked in your country &#128533;
            </div>
          </div>
        </div>

        <!-- FIAT Tab Content-->
        <div v-if="selectedApp === 'fiat'">
          <div v-if="!loggedIn" class="q-mt-md">
              <RampLogin @loggedIn="loggedInAs"/>
          </div>
          <div v-else>
              <FiatIndex v-if="userType === 'peer'"/>
              <AppealIndex v-if="userType === 'arbiter'"/>
          </div>
        </div>
      </div>
    </div>

    <!-- App Select Dialog -->
    <appSelectionDialog
      v-if="appSelection"
      @back="$router.go(-1)"
      @submit="selectApp"
    />
  </template>
<script>
import HeaderNav from '../header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import appSelectionDialog from 'src/components/ramp/appSelectionDialog.vue'
import RampShiftForm from './crypto/RampShiftForm.vue'
import AppealIndex from './appeal/AppealIndex.vue'
import FiatIndex from './fiat/FiatIndex.vue'
import RampLogin from './RampLogin.vue'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    RampShiftForm,
    FiatIndex,
    AppealIndex,
    appSelectionDialog,
    RampLogin
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedApp: '',
      error: false,
      pageName: 'ramp-fiat-store',
      appSelection: true,
      isAllowed: true,
      isloaded: false,
      loggedIn: false,
      userType: null
    }
  },
  computed: {
    appTitle () {
      if (this.userType === 'arbiter') return 'appeal'
      return 'fiat'
    }
  },
  methods: {
    loggedInAs (userType) {
      this.loggedIn = true
      this.userType = userType
    },
    selectApp (app) {
      const vm = this
      vm.selectedApp = app
      // vm.pageName = 'ramp-' + app
      // console.log('pageName:', vm.pageName)
      // if (app === 'fiat') {
      //   this.$router.push({ name: 'ramp-fiat-login' })
      // } else {
      //   this.$router.push({ name: vm.pageName })
      // }
      vm.appSelection = false
    }
  },
  async mounted () {
    const vm = this
    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })
    if (!permission.data.createShift) {
      vm.isAllowed = false
    }
    await vm.$store.dispatch('ramp/loadWallet')
    vm.isloaded = true
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
