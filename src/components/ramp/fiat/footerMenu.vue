<template>
  <div
    class="row justify-center fixed-footer"
    :class="[getDarkModeClass(), { 'footer-hidden': isFooterHidden }]"
    :style="{bottom: $q.platform.is.ios ? '36px' : '16px'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="onSelectMenu('FiatStore')">
        <q-icon class="mb-2" :class="isActive('FiatStore') ? 'default-text-color' : 'default-text-color'" size="30px" name="sym_o_storefront"/>
        <br>
        <span>{{ $t('Home') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="onSelectMenu('FiatAds')">
        <q-icon class="mb-2" :class="isActive('FiatAds') ? 'default-text-color' : 'default-text-color'" size="30px" name="sym_o_sell"/>
        <br>
        <span>{{ $t('Ads') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="onSelectMenu('FiatOrders')">
        <div class="icon-wrapper">
          <q-icon class="mb-2" :class="isActive('FiatOrders') ? 'default-text-color' : 'default-text-color'" size="30px" name="sym_o_receipt_long"></q-icon>
          <q-badge v-if="data?.unreadOrdersCount > 0" rounded color="red" floating>{{ data?.unreadOrdersCount }}</q-badge>
        </div>
        <br>
        <span>{{ $t('Orders') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="onSelectMenu('FiatProfileCard')">
        <q-icon class="mb-2" :class="isActive('FiatProfileCard') ? 'default-text-color' : 'default-text-color'" size="30px" name="o_account_circle"/>
        <br>
        <span>{{ $t('Profile') }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      activeButton: 'FiatStore',
      lastScrollY: 0,
      isFooterHidden: false,
      scrollThreshold: 50
    }
  },
  emits: ['clicked'],
  props: {
    tab: String,
    data: Object
  },
  computed: {
  },
  mounted () {
    if (this.tab) this.activeButton = this.tab
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    async onSelectMenu (menu) {
      // this.activeButton = menu
      let pageName = null
      switch (menu) {
        case 'FiatStore':
          pageName = 'p2p-store'
          break
        case 'FiatAds':
          pageName = 'p2p-ads'
          break
        case 'FiatOrders':
          pageName = 'p2p-orders'
          break
        case 'FiatProfileCard':
          pageName = 'p2p-profile'
          break
      }
      this.$store.commit('ramp/resetListingTabs')
      await this.$router.replace({ name: pageName })
      this.$emit('clicked', { name: menu })
    },
    isActive (menu) {
      switch (menu) {
        case 'FiatStore':
          return this.$route.name === 'p2p-store'
        case 'FiatAds':
          return this.$route.name === 'p2p-ads'
        case 'FiatOrders':
          return this.$route.name === 'p2p-orders'
        case 'FiatProfileCard':
          return this.$route.name === 'p2p-profile'
      }
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
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
  }
}
</script>

<style lang="scss" scoped>
  .mb-2 {
    margin-bottom: 2px;
  }
  .icon-wrapper {
    position: relative;
    display: inline-block;
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
  .footer-hidden {
    transform: translateX(-50%) translateY(120px);
    opacity: 0;
    pointer-events: none;
  }
</style>
