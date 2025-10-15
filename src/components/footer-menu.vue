<template>
  <div
    class="row justify-center fixed-footer"
    :class="[getDarkModeClass(), { 'footer-hidden': isFooterHidden }]"
    :style="{'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ path: '/' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-home.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
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
        <router-link :to="{ name: 'transaction-list' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-send.png" size="30px" />
          <q-icon v-else name="receipt_long" class="default-text-color mb-2" size="30px">
            <!-- <svg>
              <use xlink:href="app-send.svg#icon"></use>
            </svg> -->
          </q-icon>
        </router-link>
        <br>
        <span 
          id="send-button"
          @click="$router.push({ name: 'transaction-list' })">TX</span>
      </button>
      <div style="width: 50px;"></div>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'app-marketplace' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-receive.png" size="30px" />
          <q-icon v-else name="img:marketplace.svg" class="default-text-color-2 mb-2" size="30px">
            <!-- <svg>
              <use xlink:href="marketplace.svg#icon"></use>
            </svg> -->
          </q-icon>
        </router-link>
        <br>
        <span
          id="receive-button" 
          @click="$router.push({ name: 'app-marketplace' })">{{ $t('Market') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'apps-dashboard' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-apps.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
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
    </div>

    <div id="qr-button" @click="$router.push({ name: 'qr-reader' })">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'qr-reader' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-qr.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
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
  computed: {
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] === 'payhero'
    }
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    },
    handleScroll () {
      const currentScrollY = window.scrollY

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
    padding-top: 5px;
    width: calc(100% - 32px) !important;
    max-width: 600px;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 6;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 60px;
      height: 50px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: 20px;
      min-width: 50px;
    }
    .footer-btn-container {
      margin-top: 1px !important;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
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
    margin-top: -25px;
    display: block;
    text-align: center;
    position: absolute;
    button {
      z-index: 100 !important;
      border-radius: 50px;
      border: 2px solid lightgray;
      width: 60px;
      height: 60px;
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
