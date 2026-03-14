<template>
  <div id="app-container" class="eload-page" :class="getDarkModeClass(darkMode)">
    <HeaderNav title="Eload Service" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <div class="q-mr-sm">
          <q-btn flat round disable>
            <q-icon name="receipt_long" size="30px"/>
          </q-btn>					
        </div>				 
      </template>
    </HeaderNav>

    <div v-if="!isloaded && !errorMsg" class="eload-skeleton q-px-lg q-pt-md full-width">
      <!-- Country Selector -->
      <q-skeleton animation="wave" type="text" height="25px" width="80px" class="br-10 q-mb-lg" />

      <!-- Search input -->
      <q-skeleton animation="wave" type="rect" height="45px" class="br-10 q-mb-lg" />

      <!-- "Select Purchase Type" label -->
      <q-skeleton animation="wave" type="text" width="190px" class="q-mb-md" />

      <!-- Service cards (stacked like the home page) -->
      <q-skeleton
        v-for="i in 3"
        :key="'svc-' + i"
        animation="wave"
        type="rect"
        height="80px"
        class="br-15 q-mb-md"
      />

      <div class="text-center q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
        Powered by Gbits
      </div>
    </div>

    <div v-else-if="errorMsg" class="q-pa-lg full-width">
      <div class="text-center" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
        {{ errorMsg }}
      </div>
    </div>			

    <template v-else>
      <!-- Tabs Section -->
      <div class="tabs-wrapper q-mt-sm q-mb-sm pt-header">
        <div 
          class="eload-tabs" 
          :class="getDarkModeClass(darkMode)"
        >
          <button
            class="eload-tab"
            :class="[
              darkMode ? 'dark' : '',
              tabButtonClass('products'),
              `theme-${theme}`
            ]"
            :style="activeTab === 'products' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
            @click="changeTab('products')"
          >
            <q-icon name="shopping_cart" size="18px" class="q-mr-xs"/>
            Products
          </button>
          <button
            class="eload-tab"
            :class="[
              darkMode ? 'dark' : '',
              tabButtonClass('orders'),
              `theme-${theme}`
            ]"
            :style="activeTab === 'orders' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
            @click="changeTab('orders')"
          >
            <q-icon name="receipt_long" size="18px" class="q-mr-xs"/>
            Orders
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="eload-content">
        <router-view :key="$route.path"></router-view>
      </div>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import * as eloadServiceAPI from 'src/utils/eload-service.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isloaded: false,
      errorMsg: '',
      activeTab: 'products'
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  components: {
    HeaderNav
  },
  methods: {
    getDarkModeClass,
    changeTab (tab) {
      this.activeTab = tab
      if (tab === 'products') {
        this.$router.replace({ name: 'eload-service-form' })
      } else if (tab === 'orders') {
        this.$router.replace({ name: 'eload-service-orders' })
      }
    },
    tabButtonClass (tab) {
      return this.activeTab === tab ? 'active-theme-btn' : ''
    },
    getThemeColor () {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[this.theme] || '#42a5f5'
    },
    syncTabWithRoute () {
      // Sync active tab with current route
      const routeName = this.$route.name
      if (routeName === 'eload-service-form') {
        this.activeTab = 'products'
      } else if (routeName === 'eload-service-orders') {
        this.activeTab = 'orders'
      }
    }
  },
  watch: {
    '$route.name' () {
      this.syncTabWithRoute()
    }
  },
  async mounted () {
    const vm = this
    const minSkeletonMs = 400
    const startTs = Date.now()

    // Give the browser a chance to paint the skeleton before awaiting network.
    await vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 16))

    // Request Services & check api availability
    const resp = await eloadServiceAPI.authUser()

    // Keep skeleton visible for a minimum time (avoids "no loader" flash).
    const elapsed = Date.now() - startTs
    if (elapsed < minSkeletonMs) {
      await new Promise(resolve => setTimeout(resolve, minSkeletonMs - elapsed))
    }

    if (resp) {
      vm.isloaded = true
      // Sync tab with current route
      vm.syncTabWithRoute()
      // If we're at the base eload route, redirect to form
      if (vm.$route.name === 'app-eload') {
        vm.$router.replace({ name: 'eload-service-form' })
      }
    } else {
      vm.errorMsg = 'Unable to get Auth Token or Register User'
    }
  }
}
</script>

<style lang="scss" scoped>
.eload-page {
  &.dark {
    background-color: #1a1a1a;
  }
  
  &.light {
    background-color: #f5f5f7;
  }
}

// Tabs Section
.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 8px;
}

.eload-tabs {
  display: inline-flex;
  gap: clamp(4px, 1.5vw, 8px);
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  max-width: 100%;
  box-sizing: border-box;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.eload-tab {
  min-width: clamp(90px, 25vw, 120px);
  height: 40px;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: clamp(12px, 3vw, 14px);
  padding: 0 clamp(12px, 4vw, 20px);
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(.active-theme-btn) {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.dark {
    color: rgba(255, 255, 255, 0.7);
    
    &:hover:not(.active-theme-btn) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}

// Theme-based active tab styles
.eload-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.eload-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.eload-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.eload-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

.eload-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.eload-skeleton .br-10 {
  border-radius: 10px;
}

.eload-skeleton .br-15 {
  border-radius: 15px;
}

.pt-header {
  padding-top: 10px;
}
</style>
