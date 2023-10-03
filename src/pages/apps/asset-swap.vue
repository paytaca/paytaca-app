<template>
  <div id="app-container" :class="getDarkModeClass()">
    <HeaderNav
      :title="$t('AssetSwap')"
      backnavpath="/apps"
      class="apps-header"
    />

    <q-tabs
      :active-color="isDefaultTheme ? 'rgba(0, 0, 0, 0.5)' : brandblue"
      :indicator-color="isDefaultTheme && 'transparent'"
      class="col-12 q-px-sm q-pb-md q-pt-lg pp-fcolor q-mx-md"
      v-model="selectedNetwork"
      style="padding-bottom: 16px;"
      :style="{ 'margin-top': $q.platform.is.ios ? '10px' : '-35px'}"
    >
      <q-tab
        name="BCH"
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        disable
        label="BCH"
      >
        <q-popup-proxy>
          <q-banner :class="darkMode ? 'pt-dark info-banner text-white' : 'text-black'" class="q-pa-md br-15 text-center">
            {{ $t('SmartSwapBchSoon') }}
          </q-banner>
        </q-popup-proxy>
      </q-tab>
      <q-tab
        name="sBCH"
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        label="SmartBCH"
      />
    </q-tabs>

    <SmartSwapForm
      :darkMode="darkMode"
      :currentCountry="currentCountry"
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
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentCountry: this.$store.getters['global/country'].code
    }
  },
  computed: {
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    }
  }
}
</script>
