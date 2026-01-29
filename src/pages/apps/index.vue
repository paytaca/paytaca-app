<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Apps')"
      backnavpath="/"
      class="header-nav q-px-sm apps-header"
      @long-press-title="onLongPressAppsTitle"
    >
      <template #top-right-menu>
        <q-btn
          flat
          round
          dense
          icon="lightbulb"
          class="text-bow"
          :class="getDarkModeClass(darkMode)"
          :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '0px' }"
          data-tour="apps-tour-trigger"
          @click="startAppsTour(false)"
        />
      </template>
    </HeaderNav>
    <div id="apps" ref="apps" class="text-center" :style="{ 'margin-top': '0px', 'padding-bottom': '30px' }">
      <div class="row q-px-xs">
        <div v-for="(app, index) in filteredApps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-px-xs q-py-md text-center" :class="{'bex-app': $q.platform.is.bex}">
          <div
            class="relative-position"
            style="display: inline-block;"
            :data-tour="`apps-app-${app.id || index}`"
          >
            <q-btn class="bg-grad" no-caps round style="padding: 20px;" @click="openApp(app)" :disable="!app.active">
              <q-icon size="30px" color="white" :name="app.iconName"/> <br>                              
              <q-tooltip v-if="app.description" :delay="500" class="text-body2" :class="getDarkModeClass(darkMode)">
                {{ app.description }}
              </q-tooltip>                              
            </q-btn>
            <q-badge 
              v-if="app.beta" 
              color="red" 
              class="beta-badge"
              :label="$t('Beta').toLocaleUpperCase()"
            />
          </div>
          <p
            class="pt-app-name q-mt-xs q-mb-none q-mx-none pt-label"
            :class="[getDarkModeClass(darkMode), !app.active ? 'text-grey' : '']"
            style="word-break: break-all;"
          >
            {{ app.name }}
          </p>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div v-if="appsTour.active" class="apps-tour-overlay" @click.self="endAppsTour">
        <div
          v-if="appsTour.scrims && appsTour.targetRect"
          v-for="(rect, key) in appsTour.scrims"
          :key="key"
          class="apps-tour-scrim"
          :style="{
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
          }"
        />

        <div
          v-if="appsTour.targetRect"
          class="apps-tour-highlight"
          :style="{
            top: appsTour.targetRect.top + 'px',
            left: appsTour.targetRect.left + 'px',
            width: appsTour.targetRect.width + 'px',
            height: appsTour.targetRect.height + 'px',
          }"
        />

        <div
          class="apps-tour-tooltip pt-card text-bow"
          :class="getDarkModeClass(darkMode)"
          :style="{
            top: appsTour.tooltipPos.top + 'px',
            left: appsTour.tooltipPos.left + 'px',
          }"
        >
          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            {{ appsTour.steps[appsTour.stepIndex]?.title }}
          </div>
          <div class="text-body2">
            {{ appsTour.steps[appsTour.stepIndex]?.body }}
          </div>

          <div class="row items-center justify-between q-mt-md">
            <q-btn
              flat
              no-caps
              :label="$t('Skip', {}, 'Skip')"
              @click="endAppsTour"
            />
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat
                no-caps
                :disable="appsTour.stepIndex === 0"
                :label="$t('Back', {}, 'Back')"
                @click="prevAppsTourStep"
              />
              <q-btn
                unelevated
                color="primary"
                no-caps
                :label="appsTour.stepIndex === appsTour.steps.length - 1 ? $t('Done', {}, 'Done') : $t('Next', {}, 'Next')"
                @click="nextAppsTourStep"
              />
            </div>
          </div>
        </div>
      </div>
    </teleport>

  </div>
</template>

<script>
import { vOnLongPress } from '@vueuse/components'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import MarketplaceAppSelectionDialog from 'src/components/marketplace/MarketplaceAppSelectionDialog.vue'
import BetaAppDialog from 'src/components/apps/BetaAppDialog.vue'
import HeaderNav from '../../components/header-nav'
import { webSocketManager } from 'src/exchange/websocket/manager'
import { buildAppsTourSteps, APPS_TOUR_SEEN_KEY } from 'src/utils/apps-tour'
import { isNativeIOS } from 'src/utils/native-platform'

export default {
  name: 'apps',
  components: {
    HeaderNav,
    BetaAppDialog
  },
  directives: {
    'on-long-press': vOnLongPress,
  },
  data () {
    return {
      showDebugApp: localStorage.getItem('debugAppVisible') === 'true',
      appsTour: {
        active: false,
        auto: false,
        steps: [],
        stepIndex: 0,
        targetRect: null,
        scrims: null,
        tooltipPos: { top: 24, left: 24 },
        lastAutoScrollStepIndex: null,
      },
      apps: [
        {
          id: 'p2p-exchange',
          name: this.$t('P2PExchange', {}, 'P2P Ramp'),
          description: this.$t('Apps.P2PExchange.Description', {}, 'Buy and sell BCH peer-to-peer with anyone, secured by smart contract escrow.'),
          iconName: 'img:ramp_icon_white.png',
          path: '/apps/exchange',
          iconStyle: 'width:45%; height: 45%;',
          active: true // !this.$store.getters['global/isChipnet']
        },
        {
          id: 'marketplace',
          name: this.$t('Marketplace'),
          description: this.$t('Apps.Marketplace.Description', {}, 'Buy goods from merchants around your area and get your orders delivered to you.'),
          iconName: 'img:marketplace.png',
          path: '/apps/marketplace',
          active: true,
          iconStyle: 'width:45%; height: 45%;',
          onLongPress: (event) => {
            event?.preventDefault?.()
            this.$q.dialog({
              component: MarketplaceAppSelectionDialog,
            })
          }
        },
        {
          id: 'collectibles',
          name: this.$t('Collectibles'),
          description: this.$t('Apps.Collectibles.Description', {}, 'View and manage your Non-Fungible token collectibles.'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          iconStyle: 'font-size: 4.5em',
          active: true,
          smartBCHOnly: false
        },
        {
          id: 'gifts',
          name: this.$t('Gifts'),
          description: this.$t('Apps.Gifts.Description', {}, 'Create and redeem BCH gifts.'),
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'lift-token',
          name: `LIFT ${this.$t('Token')}`,
          description: this.$t('Apps.LiftToken.Description', {}, 'View your LIFT token activity and manage related actions.'),
          iconName: 'img:lift-token.png',
          path: '/apps/lift-token',
          iconStyle: 'width: 50%; height: 60%;',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'multisig',
          name: this.$t('MultisigWallets', {}, 'Multisig Wallets'),
          description: this.$t('Apps.MultisigWallets.Description', {}, 'Create and manage multi-signature wallets for extra security.'),
          iconName: 'mdi-account-group',
          path: '/apps/multisig',
          active: true,
          iconStyle: 'font-size: 4em',
          beta: true,
          betaMessage: this.$t('MultisigWalletsBetaMessage', {}, 'Multisig Wallets is currently in beta. This feature allows you to create and manage multi-signature wallets that require multiple signatures for transactions. Please note that this is an experimental feature and may have limitations.')
        },
        {
          id: 'cauldron',
          name: 'Cauldron DEX',
          description: this.$t('Apps.CauldronDEX.Description', {}, 'Swap or provide CashTokens liquidity on Cauldron DEX'),
          iconName: 'img:cauldron-logo.svg',
          path: '/apps/cauldron',
          iconStyle: 'width:45%; height: 45%;',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'cryptoswap',
          name: this.$t('CryptoSwap'),
          description: this.$t('Apps.CryptoSwap.Description', {}, 'Swap your other cryptocurrencies (BTC, ETH, SOL, and others) into BCH.'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/crypto-swap',
          active: true,
          iconStyle: 'font-size: 4.7em',
          smartBCHOnly: false
        },
        {
          id: 'anyhedge',
          name: 'AnyHedge',
          description: this.$t('Apps.AnyHedge.Description', {}, 'Create hedges/longs to manage BCH price volatility exposure.'),
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:55%; height: 55%;',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'stablehedge',
          name: 'StableHedge',
          description: this.$t('Apps.Stablehedge.Description', {}, 'Mint and redeem stable tokens backed by BCH.'),
          iconName: 'img:assets/img/stablehedge/stablehedge-icon.svg',
          path: '/apps/stablehedge/wallet',
          iconStyle: 'width:55%; height: 55%;',
          active: true,
          beta: true,
          betaMessage: this.$t('StablehedgeBetaMessage', {}, 'Stablehedge is currently in beta. This feature allows you to create stablecoin positions backed by Bitcoin Cash. Please note that this is an experimental feature and may have limitations or risks.')
        },
        {
          id: 'walletconnect',
          name: this.$t('WalletConnect'),
          description: this.$t('Apps.WalletConnect.Description', {}, 'Connect Paytaca to dApps using WalletConnect.'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          iconStyle: 'font-size: 4.2em',
          active: true,
          smartBCHOnly: false
        },
        {
          id: 'merchant-admin',
          name: this.$t('MerchantAdmin', {}, 'Merchant Admin'),
          description: this.$t('Apps.MerchantAdmin.Description', {}, 'Manage your merchant tools and settings.'),
          iconName: 'point_of_sale',
          path: '/apps/merchant-admin',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'merchant-map',
          name: this.$t('MerchantMap', {}, 'Merchant Map'),
          description: this.$t('Apps.MerchantMap.Description', {}, 'Find merchants that accept BCH.'),
          iconName: 'public',
          path: '/apps/map/',
          iconStyle: 'font-size: 4.2em',
          active: !this.$store.getters['global/isChipnet']
        },
        {
          id: 'support',
          name: this.$t('Support', {}, 'Support'),
          description: this.$t('Apps.Support.Description', {}, 'Get help, guides, and wallet information.'),
          iconName: 'support',
          path: '/apps/wallet-info',
          active: true,
          iconStyle: 'font-size: 4em'
        },
        {
          id: 'settings',
          name: this.$t('Settings'),
          description: this.$t('Apps.Settings.Description', {}, 'Customize your wallet preferences and security settings.'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false
        }
      ],
      debugApp: {
        id: 'debug',
        name: this.$t('Debug', {}, 'Debug'),
        description: this.$t('Apps.Debug.Description', {}, 'Developer tools and diagnostics.'),
        iconName: 'bug_report',
        path: '/apps/debug',
        active: true,
        iconStyle: 'font-size: 4em',
        smartBCHOnly: false
      },
      filteredApps: [],
      appHeight: null,
      rampAppSelection: false,
      disableRampSelection: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isNativeIOS () {
      return isNativeIOS()
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },
  methods: {
    getDarkModeClass,
    // ---- Apps guided tour (no dependency) ----
    async startAppsTour (auto = false) {
      const vm = this

      if (auto && localStorage.getItem(APPS_TOUR_SEEN_KEY) === 'true') return
      if (vm.appsTour.active) return

      vm.appsTour.auto = auto
      vm.appsTour.steps = buildAppsTourSteps((...args) => vm.$t(...args), vm.filteredApps)
      vm.appsTour.stepIndex = 0
      vm.appsTour.active = true

      await vm.$nextTick()
      vm._appsTourBindListeners()
      await vm._appsTourGoTo(0)
    },

    endAppsTour () {
      this.appsTour.active = false
      this._appsTourUnbindListeners()
      localStorage.setItem(APPS_TOUR_SEEN_KEY, 'true')
    },

    nextAppsTourStep () {
      this._appsTourGoTo(this.appsTour.stepIndex + 1)
    },

    prevAppsTourStep () {
      this._appsTourGoTo(this.appsTour.stepIndex - 1)
    },

    async _appsTourGoTo (index) {
      const vm = this
      if (!vm.appsTour.active) return
      if (index < 0) return
      if (index >= vm.appsTour.steps.length) {
        vm.endAppsTour()
        return
      }

      vm.appsTour.stepIndex = index

      // Wait briefly for targets to exist (layout, etc.)
      for (let i = 0; i < 10; i++) {
        const el = vm._appsTourGetTargetEl()
        if (el) break
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 150))
      }

      // If the target is off-screen, scroll it into view first.
      const step = vm.appsTour.steps[vm.appsTour.stepIndex]
      const targetEl = vm._appsTourGetTargetEl()
      if (targetEl && vm.appsTour.lastAutoScrollStepIndex !== index) {
        vm.appsTour.lastAutoScrollStepIndex = index
        vm._appsTourEnsureVisible(targetEl, step?.scroll)
        // Give the scroll a moment to settle before measuring/highlighting.
        await new Promise(r => setTimeout(r, 350))
      }

      vm._appsTourRecalc()
    },

    _appsTourGetTargetEl () {
      const step = this.appsTour.steps[this.appsTour.stepIndex]
      if (!step?.selector) return null
      return document.querySelector(step.selector)
    },

    _appsTourEnsureVisible (el, scrollMode = 'auto') {
      if (!el?.getBoundingClientRect) return

      if (scrollMode === 'top') {
        const scroller = document.scrollingElement || document.documentElement
        try {
          scroller.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (_) {
          scroller.scrollTop = 0
        }
        return
      }

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      } catch (_) {
        // Older browsers
        el.scrollIntoView(true)
      }
    },

    _appsTourRecalc () {
      const step = this.appsTour.steps[this.appsTour.stepIndex]
      const el = this._appsTourGetTargetEl()
      if (!el) {
        this.appsTour.targetRect = null
        this.appsTour.scrims = null
        this.appsTour.tooltipPos = { top: 24, left: 24 }
        return
      }

      const rect = el.getBoundingClientRect()
      const pad = 8
      const targetRect = {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: Math.min(window.innerWidth, rect.width + pad * 2),
        height: Math.min(window.innerHeight, rect.height + pad * 2),
      }
      this.appsTour.targetRect = targetRect

      // Scrims: 4 rectangles around the highlight.
      const bottomTop = targetRect.top + targetRect.height
      const rightLeft = targetRect.left + targetRect.width
      this.appsTour.scrims = {
        top: {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, targetRect.top),
        },
        bottom: {
          top: bottomTop,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - bottomTop),
        },
        left: {
          top: targetRect.top,
          left: 0,
          width: Math.max(0, targetRect.left),
          height: targetRect.height,
        },
        right: {
          top: targetRect.top,
          left: rightLeft,
          width: Math.max(0, window.innerWidth - rightLeft),
          height: targetRect.height,
        },
      }

      // Tooltip placement
      const tooltipW = 320
      const tooltipH = 160
      const margin = 12

      const availableBottom = window.innerHeight - (targetRect.top + targetRect.height)
      const availableTop = targetRect.top

      let place = step?.prefer || 'bottom'
      if (place === 'bottom' && availableBottom < tooltipH + margin && availableTop > availableBottom) place = 'top'
      if (place === 'top' && availableTop < tooltipH + margin && availableBottom > availableTop) place = 'bottom'

      let top = place === 'top'
        ? (targetRect.top - tooltipH - margin)
        : (targetRect.top + targetRect.height + margin)
      top = Math.max(margin, Math.min(window.innerHeight - tooltipH - margin, top))

      let left = targetRect.left + (targetRect.width / 2) - (tooltipW / 2)
      left = Math.max(margin, Math.min(window.innerWidth - tooltipW - margin, left))

      this.appsTour.tooltipPos = { top, left }
    },

    _appsTourBindListeners () {
      if (this._appsTourListenersBound) return
      this._appsTourListenersBound = true
      this._appsTourOnResize = () => this._appsTourRecalc()
      this._appsTourOnScroll = () => this._appsTourRecalc()
      window.addEventListener('resize', this._appsTourOnResize)
      window.addEventListener('scroll', this._appsTourOnScroll, true)
    },

    _appsTourUnbindListeners () {
      if (!this._appsTourListenersBound) return
      this._appsTourListenersBound = false
      window.removeEventListener('resize', this._appsTourOnResize)
      window.removeEventListener('scroll', this._appsTourOnScroll, true)
      this._appsTourOnResize = null
      this._appsTourOnScroll = null
    },

    fetchAppControl () {
      this.$store.dispatch('global/fetchAppControl')
    },
    buttonClassByState (active) {
      return active ? '' : 'disabled'
    },
    openApp (app) {
      if (!app.active) return
      
      // If app is beta, show dialog first
      if (app.beta) {
        this.$q.dialog({
          component: BetaAppDialog,
          componentProps: {
            appName: app.name,
            betaMessage: app.betaMessage
          }
        }).onOk(() => {
          // Only navigate if user clicks Proceed
          this.$router.push(app.path)
        })
      } else {
        // Non-beta apps open directly
        this.$router.push(app.path)
      }
    },
    onLongPressApp(event, app) {
      event.preventDefault()
      app?.onLongPress?.(event)
    },
    closeExchangeWebsocket() {
      if (webSocketManager?.isOpen()) {
        webSocketManager.closeConnection()
      }
    },
    onLongPressAppsTitle () {
      if (!this.showDebugApp) {
        this.$q.dialog({
          class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
          title: this.$t('ShowDebugApp'),
          message: this.$t('DoYouWantToShowTheDebugApp'),
          cancel: { 
            label: this.$t('Cancel'),
            color: 'grey-7',
            flat: true
          },
          ok: { 
            label: this.$t('OK'),
            color: this.themeColor
          },
          persistent: true,
        }).onOk(() => {
          this.showDebugApp = true
          localStorage.setItem('debugAppVisible', 'true')
          this.updateFilteredApps()
        })
      }
    },
    updateFilteredApps () {
      this.filteredApps = [...this.apps]

      // Hide Crypto Swap on native iOS (App Store policy / SideShift licensing)
      if (this.isNativeIOS) {
        this.filteredApps = this.filteredApps.filter(app => app?.id !== 'cryptoswap')
      }
      
      // Add debug app if visible
      if (this.showDebugApp) {
        this.filteredApps.push(this.debugApp)
      }
      
      // SmartBCH filtering removed - no longer needed
    }
  },
  created () {
    const currentTheme = this.$store.getters['global/theme']
    const themedIconPath = ''

    try {
      if (this.$router.resolve({name: 'apps-sandbox'})) {
        this.apps.unshift({
          id: 'sandbox',
          name: this.$t('Sandbox'),
          description: this.$t('Apps.Sandbox.Description', {}, 'Experimental playground for testing features.'),
          iconName: '',
          path: '/apps/sandbox',
          active: true
        })
      }
    } catch { }

    // Removed PayHero theme icon customization

    // Update filtered apps after all modifications
    this.updateFilteredApps()
  },
  mounted () {
    this.fetchAppControl()
    this.closeExchangeWebsocket()
  },
  beforeUnmount () {
    this._appsTourUnbindListeners()
  }
}
</script>

<style scoped lang="scss">
  :global(.apps-tour-overlay) {
    position: fixed;
    inset: 0;
    z-index: 99999;
  }

  :global(.apps-tour-scrim) {
    position: fixed;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    pointer-events: none;
  }

  :global(.apps-tour-highlight) {
    position: fixed;
    border-radius: 14px;
    border: 2px solid rgba(255, 255, 255, 0.75);
    pointer-events: none;
  }

  :global(.apps-tour-highlight)::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 16px;
    pointer-events: none;
    border: 2px solid rgba(59, 123, 246, 0.95);
    box-shadow: 0 0 10px 1px rgba(59, 123, 246, 0.25);
    animation: appsTourGlow 1.6s ease-in-out infinite;
  }

  @keyframes appsTourGlow {
    0% {
      box-shadow:
        0 0 10px 1px rgba(59, 123, 246, 0.22),
        0 0 0 0 rgba(59, 123, 246, 0);
    }
    50% {
      box-shadow:
        0 0 18px 3px rgba(59, 123, 246, 0.38),
        0 0 34px 10px rgba(59, 123, 246, 0.18);
    }
    100% {
      box-shadow:
        0 0 10px 1px rgba(59, 123, 246, 0.22),
        0 0 0 0 rgba(59, 123, 246, 0);
    }
  }

  :global(.apps-tour-tooltip) {
    position: fixed;
    width: min(320px, calc(100vw - 24px));
    padding: 12px 14px;
    border-radius: 14px;
    z-index: 100000;
  }

  /* Hide scrollbar completely on all platforms */
  #apps-page-container {
    background-color: #ECF3F3;
    min-height: 100vh;
    padding-bottom: 30px;
    
    &::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      -webkit-appearance: none !important;
    }
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .bex-app {
    width: 107px;
  }
  .pt-app-name {
    color: #000;
    font-size: 13px
  }
  .app-icon {
    vertical-align: middle;
    align-content: center;
    width: 50%;
    height: 50%;
  }
  .pt-app {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .beta-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 8px;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .relative-position {
    position: relative;
  }
</style>