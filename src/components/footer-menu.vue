<template>
  <div
    class="row justify-center fixed-footer"
    :class="[getDarkModeClass(), { 'footer-hidden': isFooterHidden }]"
    :style="{bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="$router.push('/')">
        <div class="default-text-color footer-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span id="home-button">{{ $t('Home') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="$router.push({ name: 'transaction-list', query: { assetID: 'all' } })">
        <div class="default-text-color footer-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2z"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/></svg>
        </div>
        <span id="send-button">TX</span>
      </button>
      <div style="width: 50px;"></div>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="$router.push({ name: 'apps-dashboard' })">
        <div class="default-text-color footer-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <span id="apps-button" class="ellipsis-2-lines">{{ $t('Apps') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()" @click="$router.push({ name: 'app-settings' })">
        <div class="default-text-color footer-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <span id="settings-button">{{ $t('Settings') }}</span>
      </button>
    </div>

    <div id="qr-button" @click="$router.push({ name: 'qr-reader' })">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <div class="default-text-color footer-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><line x1="22" y1="14" x2="22" y2="18"/><line x1="18" y1="22" x2="22" y2="22"/><line x1="22" y1="22" x2="22" y2="18"/><line x1="18" y1="14" x2="22" y2="14"/><rect x="5" y="5" width="2" height="2" rx="0.25"/><rect x="17" y="5" width="2" height="2" rx="0.25"/><rect x="5" y="17" width="2" height="2" rx="0.25"/></svg>
        </div>
      </button>
      <span
        id="qr-reader-button"
        :class="getDarkModeClass()">{{ 'QR' }}</span>
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
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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

      .footer-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;

        svg {
          width: 24px;
          height: 24px;
          display: block;
        }
      }

      span {
        display: block;
        width: 100%;
        text-align: center;
        padding: 0 2px;
        font-size: 11px;
        line-height: 1.15;
        white-space: normal;
        overflow-wrap: break-word;
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

      .footer-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;

        svg {
          width: 24px;
          height: 24px;
          display: block;
        }
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
