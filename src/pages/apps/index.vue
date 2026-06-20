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
    <div class="category-chips-bar" :class="getDarkModeClass(darkMode)" :style="{ '--chip-active-bg': themePrimaryHex }">
      <div class="chips-scroll">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :ref="`chip-${cat.id}`"
          class="category-chip"
          :class="[
            getDarkModeClass(darkMode),
            { 'chip-active': activeCategory === cat.id, 'chip-beta': cat.isBeta }
          ]"
          @click="scrollToCategory(cat.id)"
        >
          <span v-if="cat.isBeta" class="chip-beta-dot"></span>
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div id="apps" ref="apps" class="apps-list-container" :class="getDarkModeClass(darkMode)">
      <section
        v-for="cat in categorizedApps"
        :key="cat.id"
        :ref="`section-${cat.id}`"
        class="app-section"
        :class="[getDarkModeClass(darkMode), { 'beta-section': cat.isBeta }]"
        :data-category="cat.id"
      >
        <div class="section-header">
          <span class="section-title">{{ cat.label }}</span>
          <span v-if="cat.isBeta" class="beta-pill">BETA</span>
          <span v-if="cat.isBeta" class="section-subtitle">{{ $t('BetaSectionHint', {}, 'Experimental features — try them out') }}</span>
        </div>

        <div class="section-divider" :class="getDarkModeClass(darkMode)"></div>

        <div class="app-rows">
          <div
            v-for="(app, index) in cat.apps"
            :key="app.id || index"
            class="app-row"
            :class="[
              getDarkModeClass(darkMode),
              { 'app-inactive': !app.active, 'app-beta-row': cat.isBeta }
            ]"
            :data-tour="`apps-app-${app.id || index}`"
            @click="openApp(app)"
          >
            <div class="app-icon-tile bg-grad" :class="{ 'tile-inactive': !app.active }">
              <q-icon size="26px" color="white" :name="app.iconName" />
            </div>

            <div class="app-info">
              <div class="app-name">{{ app.name }}</div>
              <div class="app-desc">{{ app.description }}</div>
            </div>

            <div class="app-row-end">
              <div v-if="app.id === 'chat' && chatUnreadCount > 0" class="app-unread-badge">
                {{ chatUnreadCountLabel }}
              </div>
              <q-icon
                v-if="app.active"
                name="chevron_right"
                size="22px"
                class="app-chevron"
                :class="getDarkModeClass(darkMode)"
              />
            </div>
          </div>
        </div>
      </section>
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
import { Platform } from 'quasar';
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
          active: !this.$store.getters['global/isChipnet'],
          category: 'ramp-payments'
        },
        {
          id: 'marketplace',
          name: this.$t('Marketplace'),
          description: this.$t('Apps.Marketplace.Description', {}, 'Buy goods from merchants around your area and get your orders delivered to you.'),
          iconName: 'img:marketplace.png',
          path: '/apps/marketplace',
          active: !this.$store.getters['global/isChipnet'],
          iconStyle: 'width:45%; height: 45%;',
          category: 'marketplace',
          onLongPress: (event) => {
            event?.preventDefault?.()
            this.$q.dialog({
              component: MarketplaceAppSelectionDialog,
            })
          }
        },
        {
          id: 'eload-service',
          name: this.$t('EloadService'),
          description: this.$t('Apps.Eload.Description', {}, 'Buy Telco loads, Cable Subscription and Gamepins'),
          iconName: 'card_membership',
          path: '/apps/eload',
          iconStyle: 'width:45%; height: 45%;',
          active: !this.$store.getters['global/isChipnet'],
          category: 'ramp-payments'
        },
        {
          id: 'collectibles',
          name: this.$t('Collectibles'),
          description: this.$t('Apps.Collectibles.Description', {}, 'View and manage your Non-Fungible token collectibles.'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          iconStyle: 'font-size: 4.5em',
          active: true,
          smartBCHOnly: false,
          category: 'assets-rewards'
        },
        {
          id: 'address-book',
          name: this.$t('AddressBook'),
          description: this.$t('Apps.AddressBook.Description', {}, 'Create and manage contacts and addresses.'),
          iconName: 'mdi-book-account',
          path: '/apps/address-book/',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false,
          category: 'wallet-connections'
        },
        {
          id: 'chat',
          name: this.$t('Chat'),
          description: this.$t('Apps.Chat.Description', {}, 'Private and group messaging over Nostr.'),
          iconName: 'chat',
          path: '/apps/chat',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          beta: true,
          category: 'beta'
        },
        {
          id: 'gifts',
          name: this.$t('Gifts'),
          description: this.$t('Apps.Gifts.Description', {}, 'Create and redeem BCH gifts.'),
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          category: 'ramp-payments'
        },
        {
          id: 'lift-token',
          name: `LIFT ${this.$t('Token')}`,
          description: this.$t('Apps.LiftToken.Description', {}, 'View your LIFT token activity and manage related actions.'),
          iconName: 'img:lift-token.png',
          path: '/apps/lift-token',
          iconStyle: 'width: 50%; height: 60%;',
          active: !this.$store.getters['global/isChipnet'],
          category: 'assets-rewards'
        },
        {
          id: 'rewards',
          name: this.$t('Rewards'),
          description: this.$t('Apps.Rewards.Description', {}, 'Keep track of points you earn as you interact with the Paytaca ecosystem.'),
          iconName: 'stars',
          path: '/apps/rewards',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false,
          category: 'assets-rewards'
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
          category: 'beta'
        },
        {
          id: 'cauldron',
          name: 'Cauldron DEX',
          description: this.$t('Apps.CauldronDEX.Description', {}, 'Swap or provide CashTokens liquidity on Cauldron DEX'),
          iconName: 'img:cauldron-logo.svg',
          path: '/apps/cauldron',
          iconStyle: 'width:45%; height: 45%;',
          active: !this.$store.getters['global/isChipnet'],
          category: 'trade-defi'
        },
        {
          id: 'cryptoswap',
          name: this.$t('CryptoSwap'),
          description: this.$t('Apps.CryptoSwap.Description', {}, 'Swap your other cryptocurrencies (BTC, ETH, SOL, and others) into BCH.'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/crypto-swap',
          active: !this.$store.getters['global/isChipnet'],
          iconStyle: 'font-size: 4.7em',
          smartBCHOnly: false,
          category: 'trade-defi'
        },
        {
          id: 'anyhedge',
          name: 'AnyHedge',
          description: this.$t('Apps.AnyHedge.Description', {}, 'Create hedges/longs to manage BCH price volatility exposure.'),
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:55%; height: 55%;',
          active: !this.$store.getters['global/isChipnet'],
          category: 'trade-defi'
        },
        {
          id: 'stablehedge',
          name: 'StableHedge',
          description: this.$t('Apps.Stablehedge.Description', {}, 'Mint and redeem stable tokens backed by BCH.'),
          iconName: 'img:assets/img/stablehedge/stablehedge-icon.svg',
          path: '/apps/stablehedge/wallet',
          iconStyle: 'width:55%; height: 55%;',
          active: !this.$store.getters['global/isChipnet'],
          beta: true,
          betaMessage: this.$t('StablehedgeBetaMessage', {}, 'Stablehedge is currently in beta. This feature allows you to create stablecoin positions backed by Bitcoin Cash. Please note that this is an experimental feature and may have limitations or risks.'),
          category: 'beta'
        },
        {
          id: 'walletconnect',
          name: this.$t('WalletConnect'),
          description: this.$t('Apps.WalletConnect.Description', {}, 'Connect Paytaca to dApps using WalletConnect.'),
          iconName: 'img:walletconnect.svg',
          path: '/apps/wallet-connect',
          iconStyle: 'width:45%; height: 45%;',
          active: true,
          smartBCHOnly: false,
          category: 'wallet-connections'
        },
        {
          id: 'wizardconnect',
          name: 'WizardConnect',
          description: 'Connect Paytaca to dApps using WizardConnect relay protocol.',
          iconName: 'mdi-wizard-hat',
          path: '/apps/wizard-connect',
          iconStyle: 'font-size: 4.2em',
          active: true,
          smartBCHOnly: false,
          category: 'wallet-connections'
        },
        {
          id: 'merchant-admin',
          name: this.$t('MerchantAdmin', {}, 'Merchant Admin'),
          description: this.$t('Apps.MerchantAdmin.Description', {}, 'Manage your merchant tools and settings.'),
          iconName: 'point_of_sale',
          path: '/apps/merchant-admin',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          category: 'marketplace'
        },
        {
          id: 'merchant-map',
          name: this.$t('MerchantMap', {}, 'Merchant Map'),
          description: this.$t('Apps.MerchantMap.Description', {}, 'Find merchants that accept BCH.'),
          iconName: 'public',
          path: '/apps/map/',
          iconStyle: 'font-size: 4.2em',
          active: !this.$store.getters['global/isChipnet'],
          category: 'marketplace'
        },
        {
          id: 'support',
          name: this.$t('Support', {}, 'Support'),
          description: this.$t('Apps.Support.Description', {}, 'Get help, guides, and wallet information.'),
          iconName: 'support',
          path: '/apps/wallet-info',
          active: true,
          iconStyle: 'font-size: 4em',
          category: 'utilities'
        },
        {
          id: 'settings',
          name: this.$t('Settings'),
          description: this.$t('Apps.Settings.Description', {}, 'Customize your wallet preferences and security settings.'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false,
          category: 'utilities'
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
        smartBCHOnly: false,
        category: 'utilities'
      },
      filteredApps: [],
      appHeight: null,
      rampAppSelection: false,
      disableRampSelection: false,
      activeCategory: null,
      categoryObserver: null
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
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    },
    themePrimaryHex () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f63b7b'
      if (theme === 'glassmorphic-green') return '#43a047'
      if (theme === 'glassmorphic-gold') return '#e18908'
      if (theme === 'payhero') return '#9b8447'
      return '#3b7bf6'
    },
    chatUnreadCount () {
      return this.$store.getters['nostrChat/getTotalUnreadCount'] || 0
    },
    chatUnreadCountLabel () {
      return this.chatUnreadCount > 99 ? '99+' : String(this.chatUnreadCount)
    },
    categoryDefinitions () {
      return [
        { id: 'ramp-payments', label: this.$t('RampAndPayments', {}, 'Ramp & Payments') },
        { id: 'trade-defi', label: this.$t('TradeAndDeFi', {}, 'Trade & DeFi') },
        { id: 'assets-rewards', label: this.$t('AssetsAndRewards', {}, 'Assets & Rewards') },
        { id: 'wallet-connections', label: this.$t('WalletAndConnections', {}, 'Wallet & Connections') },
        { id: 'marketplace', label: this.$t('MarketplaceAndMerchant', {}, 'Marketplace & Merchant') },
        { id: 'utilities', label: this.$t('Utilities', {}, 'Utilities') },
        { id: 'beta', label: this.$t('Beta', {}, 'Beta'), isBeta: true },
      ]
    },
    categorizedApps () {
      const result = []
      for (const cat of this.categoryDefinitions) {
        const apps = this.filteredApps.filter(app => app.category === cat.id)
        if (apps.length > 0) {
          result.push({ ...cat, apps })
        }
      }
      return result
    },
    categories () {
      return this.categorizedApps.map(cat => ({ id: cat.id, label: cat.label, isBeta: cat.isBeta }))
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
      
      if (app.id === 'wizardconnect') {
        const loadingGroupName = 'wizardconnect-init';
        this.$q.loading.show({
          group: loadingGroupName,
          message: this.$t('InitializingWizardConnect', {}, 'Initializing wizard connect')
        })
        // Initialize WizardConnect at app startup
        this.$store.dispatch('wizardconnect/init')
          .then((manager) => {
            if (!manager) {
              const errorMessage = this.$t('NoWizardConnectServiceFound', {}, 'No wizard connect service found');
              throw new Error(errorMessage);
            }
            this.$router.push(app.path)
          })
          .catch((error) => {
            const errorMessages = [this.$t('WizardConnectFailedToLoad', {}, 'Wizard Connect failed to load')]
            if (Platform.is.ios) {
              errorMessages.push(this.$t('ConsiderUpdatingIOSVersion', {}, 'Consider updating iOS version'))
            }

            this.$q.notify({
              type: 'negative',
              message: errorMessages.join('. '),
              caption: String(error?.message ?? error),
            })
            console.error('Failed to initialize WizardConnect:', error)
          })
          .finally(() => {
            this.$q.loading.hide(loadingGroupName);
          })
        return
      }
      
      // If app has a beta message, show warning dialog first
      if (app.beta && app.betaMessage) {
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
        // Apps without beta message open directly
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
      
      // Deprecated network filtering removed - no longer needed
    },
    scrollToCategory (categoryId) {
      this.activeCategory = categoryId
      const el = this.$refs[`section-${categoryId}`]?.[0]
      if (!el) return
      const headerHeight = 56
      const chipsHeight = 52
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - chipsHeight - 4
      try {
        window.scrollTo({ top, behavior: 'smooth' })
      } catch (_) {
        window.scrollTo(0, top)
      }
      const chip = this.$refs[`chip-${categoryId}`]?.[0]
      if (chip) {
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    },
    setupCategoryObserver () {
      if (this.categoryObserver) this.categoryObserver.disconnect()
      this.$nextTick(() => {
        const sections = this.categorizedApps
          .map(cat => this.$refs[`section-${cat.id}`]?.[0])
          .filter(Boolean)
        if (!sections.length) return
        this.categoryObserver = new IntersectionObserver((entries) => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (visible[0]) {
            const id = visible[0].target.getAttribute('data-category')
            if (id && this.activeCategory !== id) {
              this.activeCategory = id
              const chip = this.$refs[`chip-${id}`]?.[0]
              if (chip) chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
            }
          }
        }, { rootMargin: '-120px 0px -60% 0px', threshold: 0 })
        sections.forEach(s => this.categoryObserver.observe(s))
      })
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
          active: true,
          category: 'utilities'
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
    this.setupCategoryObserver()
  },
  beforeUnmount () {
    this._appsTourUnbindListeners()
    if (this.categoryObserver) {
      this.categoryObserver.disconnect()
      this.categoryObserver = null
    }
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

  /* ---- Category chips bar ---- */
  .category-chips-bar {
    position: sticky;
    top: 55px;
    z-index: 2900;
    padding: 8px 0;
    &.dark { background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); }
    &.light { background: rgba(236, 243, 243, 0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); }
  }
  .chips-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 16px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar { display: none; width: 0; height: 0; }
  }
  .category-chip {
    flex-shrink: 0;
    border: none;
    padding: 7px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    &.dark {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6);
      &.chip-active { background: var(--chip-active-bg, #3b7bf6); color: #fff; }
    }
    &.light {
      background: rgba(0,0,0,0.05);
      color: rgba(0,0,0,0.55);
      &.chip-active { background: var(--chip-active-bg, #3b7bf6); color: #fff; }
    }
    &.chip-beta {
      &.dark { border: 1px solid rgba(225, 137, 8, 0.4); }
      &.light { border: 1px solid rgba(225, 137, 8, 0.3); }
    }
  }
  .chip-beta-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e18908;
    flex-shrink: 0;
  }

  /* ---- Apps list container ---- */
  .apps-list-container {
    padding: 4px 16px 120px;
    &.dark { background: transparent; }
    &.light { background: transparent; }
  }

  /* ---- Section ---- */
  .app-section {
    margin-top: 28px;
    animation: sectionEnter 0.4s ease-out;
    &:first-child { margin-top: 12px; }
  }
  @keyframes sectionEnter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 0 2px;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    &.dark { color: rgba(255,255,255,0.45); }
    &.light { color: rgba(0,0,0,0.4); }
  }
  .beta-pill {
    font-size: 9px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 6px;
    background: linear-gradient(135deg, #e18908, #e65100);
    color: #fff;
    letter-spacing: 0.8px;
  }
  .section-subtitle {
    font-size: 11px;
    font-weight: 400;
    margin-left: 4px;
    &.dark { color: rgba(255,255,255,0.35); }
    &.light { color: rgba(0,0,0,0.35); }
  }
  .section-divider {
    height: 1px;
    margin-bottom: 4px;
    &.dark { background: rgba(255,255,255,0.06); }
    &.light { background: rgba(0,0,0,0.05); }
  }

  /* ---- Beta section ---- */
  .beta-section {
    padding: 0 0 4px;
    border-radius: 16px;
    &.dark {
      background: linear-gradient(180deg, rgba(225, 137, 8, 0.06) 0%, rgba(225, 137, 8, 0.01) 100%);
      border: 1px solid rgba(225, 137, 8, 0.12);
    }
    &.light {
      background: linear-gradient(180deg, rgba(225, 137, 8, 0.04) 0%, rgba(225, 137, 8, 0.01) 100%);
      border: 1px solid rgba(225, 137, 8, 0.10);
    }
    .section-header { padding: 14px 14px 8px; }
    .section-divider { margin: 0 14px; }
    .app-rows { padding: 0 4px 8px; }
  }

  /* ---- App row ---- */
  .app-rows {
    border-radius: 12px;
    overflow: hidden;
  }
  .app-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 10px;
    cursor: pointer;
    transition: background 0.15s ease;
    position: relative;

    &.dark {
      &:active { background: rgba(255,255,255,0.06); }
      & + .app-row { border-top: 1px solid rgba(255,255,255,0.04); }
    }
    &.light {
      &:active { background: rgba(0,0,0,0.04); }
      & + .app-row { border-top: 1px solid rgba(0,0,0,0.04); }
    }
    &.app-inactive {
      cursor: default;
      .app-name, .app-desc { opacity: 0.35; }
    }
  }

  .app-icon-tile {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    &.tile-inactive { filter: grayscale(1) opacity(0.4); }
  }

  .app-info {
    flex: 1;
    min-width: 0;
  }
  .app-name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &.dark { color: rgba(255,255,255,0.9); }
    &.light { color: rgba(0,0,0,0.85); }
  }
  .app-desc {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    &.dark { color: rgba(255,255,255,0.4); }
    &.light { color: rgba(0,0,0,0.4); }
  }

  .app-row-end {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .app-chevron {
    &.dark { color: rgba(255,255,255,0.2); }
    &.light { color: rgba(0,0,0,0.2); }
  }

  .app-unread-badge {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
  }
</style>
