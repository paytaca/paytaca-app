<template>
  <div class="learn-app" :class="getDarkModeClass(darkMode)">
    <!-- Header -->
    <div class="learn-header bg-grad" :class="{'q-pt-lg': $q.platform.is.ios}">
      <div class="row items-center q-px-md q-py-sm">
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          color="white"
          @click="$router.back()"
        />
        <div class="col text-center">
          <div class="text-subtitle1 text-weight-medium text-white">
            {{ $t('Learn') }}
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
    <div class="learn-content-container">
      <iframe
        ref="learnIframe"
        :src="learnUrl"
        class="learn-iframe"
        frameborder="0"
        allow="clipboard-write"
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

const LEARN_WEB_URL = process.env.LEARN_WEB_URL || 'https://learn.paytaca.com'

export default {
  name: 'LearnApp',
  data() {
    return {
      loading: true,
      learnUrl: LEARN_WEB_URL
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    currentTheme() {
      return this.darkMode ? 'dark' : 'light'
    },
    learnUrlWithTheme() {
      const url = new URL(LEARN_WEB_URL)
      url.searchParams.set('theme', this.currentTheme)
      return url.toString()
    }
  },
  watch: {
    darkMode() {
      // Reload iframe when dark mode changes
      this.updateTheme()
    },
    '$route.query.url'(newUrl) {
      // Reload iframe when lesson URL changes
      if (newUrl) {
        this.loading = true
        const baseUrl = new URL(LEARN_WEB_URL)
        const finalUrl = baseUrl.origin + newUrl
        const urlWithTheme = new URL(finalUrl)
        urlWithTheme.searchParams.set('theme', this.currentTheme)
        this.learnUrl = urlWithTheme.toString()
      }
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
      if (this.$refs.learnIframe) {
        this.loading = true
        this.$refs.learnIframe.src = this.learnUrlWithTheme + '&t=' + Date.now()
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
    // Set initial URL with theme
    let finalUrl = LEARN_WEB_URL
    
    // If url query parameter is present (lesson URL from carousel), use it
    if (this.$route.query.url) {
      // lesson.url from API is like "/learn/what-is-bch"
      // Construct full URL: https://learn.paytaca.com + /learn/what-is-bch
      const baseUrl = new URL(LEARN_WEB_URL)
      finalUrl = baseUrl.origin + this.$route.query.url
    }
    
    // Add theme parameter
    const urlWithTheme = new URL(finalUrl)
    urlWithTheme.searchParams.set('theme', this.currentTheme)
    
    this.learnUrl = urlWithTheme.toString()
    
    console.log('Learn URL:', this.learnUrl) // Debug log
  }
}
</script>

<style scoped lang="scss">
.learn-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  
  &.dark {
    background-color: #121212;
  }
}

.learn-header {
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

.learn-content-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.learn-iframe {
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
