<template>
  <div id="app-container" class="spend-bch-page" :class="getDarkModeClass(darkMode)">
    <header-nav 
      :title="$t('SpendBCH', {}, 'Spend BCH')"
      backnavpath="/"
    />
    
    <div class="content-container q-pa-lg">
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <q-icon name="storefront" size="4em" color="primary" class="q-mb-md" />
        <h4 class="text-h4 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
          {{ $t('WhereToSpendBCH', {}, 'Where to Spend BCH') }}
        </h4>
        <p class="text-body1 text-grey-7 q-mb-lg" style="max-width: 600px; margin: 0 auto;">
          {{ $t('SpendBCHDescription', {}, 'Discover the many places where you can use your Bitcoin Cash') }}
        </p>
      </div>

      <!-- Spend Options -->
      <div class="spend-options q-gutter-md">
        
        <!-- Merchant Map -->
        <q-card 
          class="spend-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="goToMap"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="map" size="3em" color="primary" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('MerchantMap', {}, 'Merchant Map') }}
              </div>
              <div class="text-body2 text-grey-7">
                {{ $t('MerchantMapDescription', {}, 'Find nearby merchants in our network accepting Bitcoin Cash') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Marketplace App -->
        <q-card 
          class="spend-option-card br-15 cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="goToMarketplace"
        >
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-auto q-mr-lg">
              <div class="icon-container">
                <q-icon name="img:marketplace.png" size="3em" />
              </div>
            </div>
            <div class="col">
              <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                {{ $t('Marketplace', {}, 'Marketplace') }}
              </div>
              <div class="text-body2 text-grey-7">
                {{ $t('MarketplaceDescription', {}, 'Shop directly within Paytaca from merchants selling products for BCH') }}
              </div>
            </div>
            <div class="col-auto">
              <q-icon name="chevron_right" size="md" color="grey-6" />
            </div>
          </q-card-section>
        </q-card>

      </div>

      <!-- Footer Info -->
      <div class="footer-info q-mt-xl q-mb-lg">
        <q-banner 
          rounded 
          class="info-banner" 
          :class="getDarkModeClass(darkMode)"
        >
          <template v-slot:avatar>
            <q-icon name="info" color="primary" />
          </template>
          <div class="text-body2">
            {{ $t('SpendBCHFooter', {}, 'More merchants are joining the BCH network every day. Check back often for new options!') }}
          </div>
        </q-banner>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'

export default {
  name: 'SpendBCH',
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
    goToMarketplace() {
      this.$router.push({ name: 'app-marketplace' })
    },
    goToMap() {
      this.$router.push({ name: 'app-map' })
    }
  }
}
</script>

<style lang="scss">
/* Unscoped to ensure it applies properly */
#app-container.spend-bch-page {
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



#app-container.spend-bch-page .content-container {
  max-width: 800px;
  margin: 0 auto;
}


#app-container.spend-bch-page .hero-section {
  padding: 20px 0;
}


#app-container.spend-bch-page .spend-options {
  .spend-option-card {
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



#app-container.spend-bch-page.dark {
  .spend-option-card {
    &.cursor-pointer:hover {
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
    }
    
    .icon-container {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}


#app-container.spend-bch-page .footer-info {
  max-width: 600px;
  margin: 0 auto;
  padding-top: 40px;
  
  .info-banner {
    border: 1px solid rgba(59, 123, 246, 0.2);
    background: rgba(59, 123, 246, 0.05);
  }
}

#app-container.spend-bch-page.dark .footer-info .info-banner {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
</style>

