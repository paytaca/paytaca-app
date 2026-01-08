<template>
  <div id="app-container" class="get-bch-page text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav 
      :title="$t('GetBCH', {}, 'Get BCH')"
      backnavpath="/"
    />
    
    <div class="content-container q-pa-lg">
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <div class="receive-bch-icon-wrapper q-mb-md">
          <q-icon name="volunteer_activism" size="4em" color="primary" />
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
      <div class="get-bch-options q-gutter-md">
        
        <!-- Buy BCH with Fiat -->
        <q-card 
          class="get-bch-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="openBuyBCH"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="img:cashin.svg" size="3em" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('BuyBCHWithLocalCurrency', {}, 'Buy BCH With Local Currency') }}
              </div>
              <div class="text-body2" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('BuyBCHDescription', {}, 'Purchase Bitcoin Cash through P2P Exchange with your local currency') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Swap from other Cryptos -->
        <q-card 
          class="get-bch-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="goToCryptoSwap"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="swap_horiz" size="3em" color="primary" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('SwapFromOtherCryptocurrencies', {}, 'Swap From Other Cryptocurrencies') }}
              </div>
              <div class="text-body2" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('SwapFromCryptosDescription', {}, 'Exchange other cryptocurrencies for Bitcoin Cash') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Earn BCH with WorkHippo -->
        <q-card 
          class="get-bch-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="goToWorkHippo"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="work" size="3em" color="primary" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('EarnBCHWithWorkHippo', {}, 'Earn BCH With WorkHippo') }}
              </div>
              <div class="text-body2" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('WorkHippoDescription', {}, 'Earn Bitcoin Cash by completing freelance work on WorkHippo') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Collect BCH cashdrops with PurelyPeer -->
        <q-card 
          class="get-bch-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="goToPurelyPeer"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="explore" size="3em" color="primary" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('CollectBCHCashdrops', {}, 'Collect BCH Cashdrops With PurelyPeer') }}
              </div>
              <div class="text-body2" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('PurelyPeerDescription', {}, 'Find and collect hidden Bitcoin Cash cashdrops around quest centers') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'

export default {
  name: 'GetBCH',
  components: {
    HeaderNav
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    openBuyBCH() {
      this.$router.push({ name: 'p2p-store' })
    },
    goToCryptoSwap() {
      this.$router.push({ name: 'crypto-swap-form' })
    },
    goToWorkHippo() {
      this.$router.push({ name: 'app-workhippo' })
    },
    goToPurelyPeer() {
      this.$router.push({ name: 'app-purelypeer' })
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

#app-container.get-bch-page .get-bch-options {
  .get-bch-option-card {
    transition: all 0.3s ease;
    border: 1px solid transparent;
    
    &.cursor-pointer:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 123, 246, 0.15);
      border-color: rgba(59, 123, 246, 0.2);
    }
    
    .icon-container {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(59, 123, 246, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      
      // Apply primary color to all icons for consistency
      .q-icon {
        color: #3B7BF6 !important;
        
        // For image icons inside q-icon
        img {
          filter: brightness(0) saturate(100%) invert(37%) sepia(93%) saturate(1264%) hue-rotate(203deg) brightness(99%) contrast(93%) !important;
        }
      }
    }
  }
}

#app-container.get-bch-page.dark {
  .get-bch-option-card {
    &.cursor-pointer:hover {
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
    }
    
    .icon-container {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}
</style>

