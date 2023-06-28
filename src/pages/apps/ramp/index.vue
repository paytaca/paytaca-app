<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="Ramp"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-tabs
      active-color="brandblue"
      class="col-12 q-px-sm q-pb-md pp-fcolor q-mx-md"
      style="padding-bottom: 16px;"
      v-model="selectedCurrency"
      :style="{ 'margin-top': $q.platform.is.ios ? '10px' : '-35px'}"
    >
      <q-tab
        name="fiat"
        :class="{'text-blue-5': darkMode}"
        label="fiat"
        @click="selectedCurrency = 'fiat'"
      />
        <!-- <q-popup-proxy>
          <q-banner :class="darkMode ? 'pt-dark text-white' : 'text-black'" class="q-pa-md br-15 text-center">
            Our peer-to-peer BCH-to-fiat exchange will be here soon. Stay tuned!
          </q-banner>
        </q-popup-proxy> -->
      <!-- </q-tab> -->
      <q-tab
        name="crypto"
        :class="{'text-blue-5': darkMode}"
        label="crypto"
        @click="selectedCurrency = 'crypto'"
      />
    </q-tabs>

    <!-- CRYPTO Tab -->
    <div v-if="selectedCurrency === 'crypto'">
      <RampShiftForm v-if="isAllowed"/>
      <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
        <div>
          Sorry. This feature is blocked in your country &#128533;
        </div>
      </div>
    </div>

    <!-- Add FIAT tab content here -->
    <div v-if="selectedCurrency === 'fiat'">
      <FiatRampIndex/>
    </div>

  </div>
</template>
<script>
// import { ref } from 'vue'
import HeaderNav from '../../../components/header-nav'
import RampShiftForm from '../../../components/ramp/RampShiftForm'
import FiatRampIndex from '../../../components/ramp/fiat/Index.vue'
import { loadWallet } from 'src/wallet'
import { markRaw, provide, ref } from 'vue'

export default {
  setup () {
    const walletHash = ref(null)

    async function fetchWalletHash () {
      const wallet = await markRaw(loadWallet())
      walletHash.value = wallet.BCH.getWalletHash()
    }

    fetchWalletHash()
    provide('walletHash', walletHash)

    return { walletHash }
  },
  components: {
    HeaderNav,
    RampShiftForm,
    FiatRampIndex
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: 'fiat', // crypto
      isAllowed: true,
      error: false
    }
  },
  async mounted () {
    const vm = this
    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })
    if (!permission.data.createShift) {
      vm.isAllowed = false
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
