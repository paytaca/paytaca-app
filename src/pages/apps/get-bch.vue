<template>
  <div id="app-container" class="get-bch-page text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav 
      :title="headerTitle"
      :backnavpath="headerBackPath"
    />
    
    <div class="content-container q-pa-lg">
      <cash-in-swap
        v-if="showSwapLeg"
      />

      <template v-else>
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <div class="receive-bch-icon-wrapper q-mb-md">
          <q-icon name="volunteer_activism" size="4em" class="text-grad" />
          <img src="bitcoin-cash-circle.svg" class="bch-overlay-icon" alt="BCH" />
        </div>
        <h4 class="text-h4 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
          {{ $t('HowToGetBCH', {}, 'How to Get BCH') }}
        </h4>
        <p class="text-body1 q-mb-lg" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="max-width: 600px; margin: 0 auto;">
          {{ $t('GetBCHDescription', {}, 'Discover the many ways to acquire Bitcoin Cash') }}
        </p>
      </div>

      <!-- Get BCH Options -->
      <cash-in-methods
        :crypto-swap-enabled="cryptoSwapEnabled"
        @select="onSelectMethod"
      />
      </template>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import CashInMethods from 'src/components/cash-in/CashInMethods.vue'
import CashInSwap from 'src/components/cash-in/CashInSwap.vue'

export default {
  name: 'GetBCH',
  components: {
    HeaderNav,
    CashInMethods,
    CashInSwap
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    cryptoSwapEnabled () {
      return !this.$store.getters['global/isChipnet']
    },
    showSwapLeg () {
      return this.cryptoSwapEnabled && this.$route.query.method === 'swap'
    },
    headerTitle () {
      return this.showSwapLeg
        ? this.$t('CashIn.ConvertToBCH', {}, 'Convert to BCH')
        : this.$t('GetBCH', {}, 'Get BCH')
    },
    headerBackPath () {
      return this.showSwapLeg ? { name: 'app-get-bch' } : '/'
    }
  },
  methods: {
    getDarkModeClass,
    onSelectMethod (method) {
      if (method === 'swap') {
        this.$router.push({ name: 'app-get-bch', query: { method: 'swap' } })
      } else {
        this.$router.push({ name: 'p2p-store', query: { from: 'get-bch' } })
      }
    }
  }
}
</script>

<style lang="scss">
/* Unscoped to ensure it applies properly */
#app-container.get-bch-page {
  height: 100vh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  display: block !important;
  padding-bottom: 80px;
  
  .header-nav-wrapper {
    position: -webkit-sticky !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 1000 !important;
  }
}

#app-container.get-bch-page .content-container {
  max-width: 800px;
  margin: 0 auto;
}

#app-container.get-bch-page .hero-section {
  padding: 20px 0;
}

#app-container.get-bch-page .receive-bch-icon-wrapper {
  position: relative;
  display: inline-block;
  
  .bch-overlay-icon {
    position: absolute;
    top: 30%;
    left: 67%;
    transform: translate(-50%, -50%);
    width: 1.2em;
    height: 1.2em;
    pointer-events: none;
  }
}
</style>

