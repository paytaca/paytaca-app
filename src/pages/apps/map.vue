<template>
  <div class="map-app" :class="getDarkModeClass(darkMode)">
    <!-- Header -->
    <div class="map-header bg-grad" :class="{'ios-safe-area': $q.platform.is.ios}">
      <div class="row items-center q-px-md q-py-sm">
        <q-btn
          flat
          round
          dense
          icon="home"
          color="white"
          @click="goToHome"
        />
        <div class="col text-center">
          <div class="text-subtitle1 text-weight-medium text-white">
            {{ $t('Map') }}
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          @click="closeApp"
        />
      </div>
    </div>

    <!-- WebView iframe -->
    <div class="map-content-container">
      <iframe
        ref="mapIframe"
        :src="mapUrl"
        class="map-iframe"
        frameborder="0"
        allow="geolocation"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation allow-downloads"
        allowtransparency="true"
        scrolling="auto"
        @load="onIframeLoad"
      ></iframe>
      
      <!-- Loading overlay -->
      <div v-if="loading" class="loading-overlay">
        <q-spinner-dots
          color="primary"
          size="50px"
        />
        <div class="text-caption q-mt-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
          {{ $t('Loading content...') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const MAP_WEB_URL = process.env.MAP_WEB_URL || 'https://www.paytaca.com/map/'

export default {
  name: 'MapApp',
  data() {
    return {
      loading: true,
      mapUrl: MAP_WEB_URL
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    currentTheme() {
      return this.darkMode ? 'dark' : 'light'
    },
    currentLanguage() {
      return this.$store.getters['global/language'] || 'en-us'
    },
    mapUrlWithTheme() {
      const url = new URL(MAP_WEB_URL)
      url.searchParams.set('theme', this.currentTheme)
      url.searchParams.set('lang', this.currentLanguage)
      return url.toString()
    }
  },
  watch: {
    darkMode() {
      // Reload iframe when dark mode changes
      this.updateTheme()
    },
    currentLanguage() {
      // Reload iframe when language changes
      this.updateUrl()
    }
  },
  methods: {
    getDarkModeClass,
    onIframeLoad() {
      this.loading = false
    },
    updateTheme() {
      // Reload iframe with new theme
      // Note: Cross-origin console warnings are expected and harmless
      // We only set iframe.src (allowed), not accessing iframe content
      if (this.$refs.mapIframe) {
        this.loading = true
        this.$refs.mapIframe.src = this.mapUrlWithTheme + '&t=' + Date.now()
      }
    },
    updateUrl() {
      // Reload iframe with updated parameters
      if (this.$refs.mapIframe) {
        this.loading = true
        this.$refs.mapIframe.src = this.mapUrlWithTheme + '&t=' + Date.now()
      }
    },
    goToHome() {
      // Navigate to the home page of the Map site in the iframe
      if (this.$refs.mapIframe) {
        this.loading = true
        this.mapUrl = this.mapUrlWithTheme
        this.$refs.mapIframe.src = this.mapUrlWithTheme + '&t=' + Date.now()
      }
    },
    closeApp() {
      // Check if we came from apps page by looking at router history
      const fromRoute = this.$router.options.history.state.back
      
      if (fromRoute && fromRoute.includes('/apps')) {
        // If launched from apps page, go back to apps
        this.$router.push({ name: 'apps-dashboard' })
      } else {
        // Otherwise, go to home page
        this.$router.push({ path: '/' })
      }
    }
  },
  mounted() {
    // Set initial URL with theme and language
    this.mapUrl = this.mapUrlWithTheme
    console.log('Map URL:', this.mapUrl) // Debug log
  }
}
</script>

<style scoped lang="scss">
.map-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  
  &.dark {
    background-color: #121212;
  }
}

.map-header {
  flex-shrink: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  .dark & {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
  
  .text-subtitle1 {
    color: white !important;
  }
}

.ios-safe-area {
  padding-top: max(env(safe-area-inset-top), 44px) !important;
}

.map-content-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 50;
  
  .dark & {
    background-color: rgba(18, 18, 18, 0.9);
  }
}
</style>