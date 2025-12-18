<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
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
  </div>
</template>

<script>
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
