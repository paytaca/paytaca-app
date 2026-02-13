<template>
  <div
    class="row justify-center fixed-footer"
    :class="[getDarkModeClass(), { 'footer-hidden': isFooterHidden }]"
    :style="{bottom: $q.platform.is.ios ? '36px' : '16px'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ path: '/' }">
          <q-icon class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-home.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span 
          id="home-button"
          @click="$router.push('/')">{{ $t('Home') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'transaction-list', query: { assetID: 'all' } }">
          <q-icon name="receipt_long" class="default-text-color mb-2" size="30px">
            <!-- <svg>
              <use xlink:href="app-send.svg#icon"></use>
            </svg> -->
          </q-icon>
        </router-link>
        <br>
        <span 
          id="send-button"
          @click="$router.push({ name: 'transaction-list', query: { assetID: 'all' } })">TX</span>
      </button>
      <div style="width: 50px;"></div>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'apps-dashboard' }">
          <q-icon class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="apps.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span 
          id="apps-button"
          @click="$router.push({ name: 'apps-dashboard' })" class="ellipsis-2-lines">{{ $t('Apps') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'app-settings' }">
          <q-icon name="settings" class="default-text-color mb-2" size="30px">
          </q-icon>
        </router-link>
        <br>
        <span 
          id="settings-button"
          @click="$router.push({ name: 'app-settings' })">{{ $t('Settings') }}</span>
      </button>
    </div>

    <div id="qr-button" @click="$router.push({ name: 'qr-reader' })">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'qr-reader' }">
          <q-icon class="default-text-color" size="30px">
            <svg>
              <use xlink:href="app-qr.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
      </button>
      <br>
      <span 
        id="qr-reader-button"
        :class="getDarkModeClass()" @click="$router.push({ name: 'qr-reader' })">{{ 'QR' }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      lastScrollY: 0,
      isFooterHidden: false,
      scrollThreshold: 50
    }
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    },
    hideFooter () {
      this.isFooterHidden = true
    },
    showFooter () {
      this.isFooterHidden = false
    },
    handleScroll () {
      const currentScrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // If at the top of the page, always show the footer
      if (currentScrollY <= 10) {
        this.isFooterHidden = false
        this.lastScrollY = currentScrollY
        return
      }

      // If at the bottom of the page, always hide the footer
      if (currentScrollY + windowHeight >= documentHeight - 10) {
        this.isFooterHidden = true
        this.lastScrollY = currentScrollY
        return
      }

      // Only hide/show if scrolled past threshold
      if (Math.abs(currentScrollY - this.lastScrollY) < this.scrollThreshold) {
        return
      }

      if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide footer
        this.isFooterHidden = true
      } else if (currentScrollY < this.lastScrollY) {
        // Scrolling up - show footer
        this.isFooterHidden = false
      }

      this.lastScrollY = currentScrollY
    }
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
  }
}
</script>

<style lang="scss" scoped>
  .mb-2 {
    margin-bottom: 2px;
  }
  .fixed-footer {
    position: fixed;
    height: 67px;
    padding-top: 0;
    width: calc(100% - 32px) !important;
    max-width: 600px;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    align-items: center;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 6;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: auto;
      flex: 1 1 0;
      max-width: 88px;
      height: 56px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: normal;
      min-width: 50px;
      text-align: center;
      padding: 0;
      padding-bottom: 2px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;

      a {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        color: inherit;
        text-decoration: none;
      }

      br {
        display: none;
      }

      :deep(.q-icon) {
        line-height: 1;
      }

      span {
        display: block;
        width: 100%;
        text-align: center;
        padding: 0 2px;
        font-size: 11px;
        line-height: 1.15;
        white-space: normal;
        overflow-wrap: break-word; // only breaks long words when needed
        word-break: normal;
      }
    }
    .footer-btn-container {
      margin-top: 0 !important;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
      align-items: center;
    }
  }
  .fixed-footer.dark {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 
                0 2px 8px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  #qr-button {
    z-index: 100 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: absolute;
    left: 50%;
    top: -24px;
    transform: translateX(-50%);
    gap: 2px;
    .footer-icon-btn {
      flex: 0 0 auto;
      width: 60px;
      max-width: 60px;
      height: 60px;
      min-width: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      
      a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
      
      :deep(.q-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        margin: 0;
      }
    }
    button {
      z-index: 100 !important;
      border-radius: 50%;
      border: 2px solid lightgray;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    br {
      display: none;
    }
    span {
      font-size: 12px;
    }
    span.light {
      font-size: 12px;
      color: black;
    }
  }
  .footer-hidden {
    transform: translateX(-50%) translateY(120px);
    opacity: 0;
    pointer-events: none;
  }
</style>
