<template>
<div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <!-- back button -->
    <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="state != 'form'" @click="clickBack"></div>
    <HeaderNav :title="$t('CryptoSwap')" backnavpath="/apps"/>
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader/>
    </div>
    <div v-else>
        <!-- CRYPTO Tab Content -->
        <RampShiftForm v-if="isAllowed" ref="shiftForm"/>
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
      state: 'form'
    }
  },
  created () {
    bus.on('update-state', this.updateState)
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
