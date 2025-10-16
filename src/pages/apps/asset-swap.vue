<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('AssetSwap')"
      backnavpath="/apps"
      class="apps-header"
    />

    <q-tabs
      active-color="brandblue"
      
      class="col-12 q-px-sm q-pb-md q-pt-lg pp-fcolor q-mx-md"
      v-model="selectedNetwork"
      style="padding-bottom: 16px;"
      :style="{ 'margin-top': $q.platform.is.ios ? '10px' : '-35px'}"
    >
      <q-tab
        name="BCH"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        disable
        label="BCH"
      >
        <q-popup-proxy>
          <q-banner
            class="q-pa-md br-15 text-center pt-card-2 text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            {{ $t(isHongKong(currentCountry) ? 'SmartSwapBchSoonPoints' : 'SmartSwapBchSoonTokens') }}
          </q-banner>
        </q-popup-proxy>
      </q-tab>
      <q-tab
        name="sBCH"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        label="SmartBCH"
      />
    </q-tabs>

    <SmartSwapForm
      :darkMode="darkMode"
      :currentCountry="currentCountry"
      :denomination="denomination"
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
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'AssetSwap',
  components: {
    SmartSwapForm,
    HeaderNav
  },
  data () {
    return {
      selectedNetwork: 'sBCH'
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass,
    isHongKong
  }
}
</script>
