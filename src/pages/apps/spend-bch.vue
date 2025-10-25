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
                <q-icon name="shopping_bag" size="3em" color="primary" />
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

        <!-- Online Sites -->
        <q-card 
          class="spend-option-card br-15"
          :class="getDarkModeClass(darkMode)"
        >
          <q-card-section class="q-pa-lg">
            <div class="row items-center q-mb-md">
              <div class="col-auto q-mr-lg">
                <div class="icon-container">
                  <q-icon name="language" size="3em" color="primary" />
                </div>
              </div>
              <div class="col">
                <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
                  {{ $t('OnlineSites', {}, 'Online Sites') }}
                </div>
                <div class="text-body2 text-grey-7">
                  {{ $t('OnlineSitesDescription', {}, 'Shop at thousands of online stores accepting BCH worldwide') }}
                </div>
              </div>
            </div>

            <!-- Site Links -->
            <div class="online-sites-list q-gutter-sm q-mt-md">
              <q-btn
                v-for="site in onlineSites"
                :key="site.url"
                :label="site.name"
                unelevated
                outline
                rounded
                color="primary"
                class="site-btn"
                :href="site.url"
                target="_blank"
                no-caps
                padding="8px 20px"
              >
                <q-icon name="open_in_new" size="xs" class="q-ml-xs" />
              </q-btn>
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
  data() {
    return {
      onlineSites: [
        { name: 'Bitcoin.com', url: 'https://www.bitcoin.com/buy-bch/' },
        { name: 'Purse.io', url: 'https://purse.io/' },
        { name: 'Newegg', url: 'https://www.newegg.com/' },
        { name: 'Namecheap', url: 'https://www.namecheap.com/' },
        { name: 'eGifter', url: 'https://www.egifter.com/' },
        { name: 'Travala', url: 'https://www.travala.com/' }
      ]
    }
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

<style lang="scss" scoped>
.spend-bch-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

.hero-section {
  padding: 20px 0;
}

.spend-options {
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
    }
  }
}

.online-sites-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  
  .site-btn {
    font-size: 14px;
    font-weight: 500;
  }
}

.dark {
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

.footer-info {
  max-width: 600px;
  margin: 0 auto;
  padding-top: 40px;
  
  .info-banner {
    border: 1px solid rgba(59, 123, 246, 0.2);
    background: rgba(59, 123, 246, 0.05);
    
    .dark & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
    }
  }
}
</style>

