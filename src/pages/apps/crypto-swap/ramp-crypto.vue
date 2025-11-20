<template>
<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <!-- back button -->
    <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="state != 'form'" @click="clickBack"></div>
    <HeaderNav :title="$t('CryptoSwap')" :backnavpath="backnav" class="header-nav" />
    <div v-if="!isloaded" class="q-mx-sm">
      <!-- <ProgressLoader/> -->

      <div class="row justify-end q-mr-lg q-mb-md">
        <q-skeleton type="circle" height="30px" width="30px"/>
      </div>
      <!-- Swap Info -->
      <div class="q-mx-md q-mb-sm">
        <q-skeleton type="rect" height="300px" style="border-radius: 15px;" />
      </div>

      <!-- Address Input -->
      <div class="q-mx-md q-mt-md">
        <q-skeleton type="rect" height="140px" style="border-radius: 15px;" />
      </div>

      <div class="row q-mx-md q-py-md text-center justify-center">
        <q-skeleton type="text" width="50%" />
      </div>    

      <!-- Action Button Skeleton -->
      <div class="q-mx-md">
        <q-skeleton type="rect" height="50px" style="border-radius: 25px;" />
      </div>    
    </div>
    <div v-else>
        <!-- CRYPTO Tab Content -->
        <RampShiftForm v-if="isAllowed" ref="shiftForm" @deposit="backnav='/apps/crypto-swap/history/'"/>
        <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>{{ $t('FeatureBlockedInYourCountry') }} &#128533;</div>
        </div>
    </div>
</div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftForm from 'src/components/ramp/crypto/RampShiftForm.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    RampShiftForm
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isAllowed: true,
      isloaded: false,
      state: 'form',
      backnav: '/apps'
    }
  },
  created () {
    // Register bus event listener for state updates
    bus.on('update-state', this.updateState)
  },
  beforeUnmount () {
    // Clean up bus event listener to prevent memory leaks
    bus.off('update-state', this.updateState)
  },
  async mounted () {
    const vm = this
    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })
    if (!permission.data.createShift) {
      vm.isAllowed = false
    }
    vm.isloaded = true
  },
  methods: {
    getDarkModeClass,
    updateState (state) {
      this.state = state
    },
    clickBack () {
      this.$refs.shiftForm.state = 'form'
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
.back-btn {
  background-color: transparent;
  height: 50px;
  width: 70px;
  z-index: 1;
  left: 10px;
}
</style>
