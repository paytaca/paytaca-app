<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="Asset Swap"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-tabs
      active-color="brandblue"
      class="col-12 q-px-sm q-pb-md pp-fcolor q-mx-md"
      v-model="selectedNetwork"
      style="margin-top: -20px; padding-bottom: 16px;"
    >
      <q-tab
        name="BCH"
        :class="{'pt-dark-label': darkMode}"
        disable
        label="BCH"
      >
        <q-popup-proxy>
          <q-banner :class="darkMode ? 'pt-dark' : 'text-black'" class="q-pa-md br-15 text-center">
            We will integrate SLP DEX for SLP tokens soon!
          </q-banner>
        </q-popup-proxy>
      </q-tab>
      <q-tab
        name="sBCH"
        :class="{'pt-dark-label': darkMode}"
        label="SmartBCH"
      />
    </q-tabs>

    <SmartSwapForm
      :darkMode="darkMode"
      class="q-mx-md"
    />

    <!-- <div class="q-px-md" style="margin-top: 7%; text-align: center; font-size: 20px; padding: 30px;" :class="darkMode ? 'text-white' : 'text-black'">
      <p style="font-size: 24px;">Soon, you will be able to swap tokens!</p>
      <p>We will integrate SLP DEX for SLP tokens and SmartSwap DEX aggregator for SEP20 tokens.</p><br>
      <p>If you want to bridge BCH to SmartBCH or vice-versa, use the <router-link to="/apps/bridge">Bridge</router-link>.</p>
    </div> -->
  </div>
</template>

<script>
import SmartSwapForm from '../../components/asset-swap/SmartSwapForm.vue'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'AssetSwap',
  components: {
    SmartSwapForm,
    HeaderNav
  },
  data () {
    return {
      selectedNetwork: 'sBCH',
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>
