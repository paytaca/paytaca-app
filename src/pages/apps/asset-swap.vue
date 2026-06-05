<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('AssetSwap')"
      backnavpath="/apps"
      class="apps-header"
    />

    <!-- Deprecated network support removed: Asset swap currently targets BCH -->

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
      selectedNetwork: 'BCH'
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
