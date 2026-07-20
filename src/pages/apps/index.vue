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
          :icon="viewMode === 'list' ? 'apps' : 'view_list'"
          class="text-bow"
          :class="getDarkModeClass(darkMode)"
          :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '0px' }"
          @click="toggleViewMode"
        />
      </template>
    </HeaderNav>
    <div v-if="!searchQuery" class="category-chips-bar" :class="getDarkModeClass(darkMode)" :style="{ '--chip-active-bg': themePrimaryHex }">
      <div class="chips-scroll">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :ref="`chip-${cat.id}`"
          class="category-chip"
          :class="[
            getDarkModeClass(darkMode),
            { 'chip-active': activeCategory === cat.id, 'chip-beta': cat.isBeta, 'chip-pinned': cat.isPinned }
          ]"
          @click="scrollToCategory(cat.id)"
        >
          <q-icon v-if="cat.isPinned" name="mdi-pin" size="14px" />
          <span v-if="cat.isBeta" class="chip-beta-dot"></span>
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="apps-search-bar" :class="getDarkModeClass(darkMode)">
      <q-icon name="search" size="20px" class="search-icon" :class="getDarkModeClass(darkMode)" />
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="search-input"
        :class="getDarkModeClass(darkMode)"
        :placeholder="$t('SearchApps', {}, 'Search apps...')"
      />
      <q-icon
        v-if="searchQuery"
        name="close"
        size="18px"
        class="search-clear"
        :class="getDarkModeClass(darkMode)"
        @click="searchQuery = ''"
      />
    </div>
    <div class="apps-hint-text q-px-md q-mt-xs" :class="getDarkModeClass(darkMode)">
      {{ $t('LongPressToPin', {}, 'Long press on the app to pin or unpin.') }}
      <template v-if="dragSupported">{{ $t('DragToReorder', {}, 'Drag pinned apps to reorder.') }}</template>
    </div>

    <div id="apps" ref="apps" class="apps-list-container" :class="[getDarkModeClass(darkMode), `view-${viewMode}`]">
      <section
        v-for="cat in categorizedApps"
        :key="cat.id"
        :ref="`section-${cat.id}`"
        class="app-section"
        :class="[getDarkModeClass(darkMode), { 'beta-section': cat.isBeta, 'pinned-section': cat.isPinned }]"
        :data-category="cat.id"
      >
        <div class="section-header">
          <q-icon v-if="cat.isPinned" name="mdi-pin" size="14px" class="section-pin-icon" :class="getDarkModeClass(darkMode)" />
          <span class="section-title">{{ cat.label }}</span>
        </div>

        <div class="section-divider" :class="getDarkModeClass(darkMode)"></div>

        <!-- List view -->
        <div v-if="viewMode === 'list'" class="app-rows">
          <div
            v-for="(app, index) in cat.apps"
            :key="app.id || index"
            :data-app-id="app.id"
            class="app-row"
            :class="[
              getDarkModeClass(darkMode),
              { 'app-inactive': !app.active, 'app-beta-row': cat.isBeta, 'app-pinned-row': cat.isPinned, 'drag-over': cat.isPinned && dragSupported && dragOverAppId === app.id }
            ]"
            @click="openApp(app)"
            v-on-long-press="cat.isPinned ? undefined : [(event) => showAppContextMenu(app, event)]"
            @dragover="cat.isPinned && dragSupported && onDragOver(app, $event)"
            @dragleave="cat.isPinned && dragSupported && onDragLeave()"
            @drop="cat.isPinned && dragSupported && onDrop(app, $event)"
            @dragend="cat.isPinned && dragSupported && onDragEnd()"
          >
            <div
              v-if="cat.isPinned && dragSupported"
              class="app-drag-handle"
              :class="getDarkModeClass(darkMode)"
              @mousedown.stop="onHandleDragStart(app, $event, 'mouse')"
              @touchstart.stop="onHandleDragStart(app, $event, 'touch')"
            >
              <q-icon name="drag_indicator" size="20px" />
            </div>
            <div class="app-icon-tile bg-grad" :class="{ 'tile-inactive': !app.active }">
              <q-icon size="26px" color="white" :name="app.iconName" />
            </div>

            <div class="app-info">
              <div class="app-name" :class="getDarkModeClass(darkMode)">{{ app.name }}</div>
              <div class="app-desc" :class="getDarkModeClass(darkMode)">{{ app.description }}</div>
            </div>

            <div class="app-row-end">
              <span v-if="app.beta" class="app-beta-pill">BETA</span>
              <div v-if="app.id === 'chat' && chatUnreadCount > 0" class="app-unread-badge">
                {{ chatUnreadCountLabel }}
              </div>
              <q-icon
                v-if="cat.isPinned"
                name="mdi-pin-off"
                size="18px"
                class="app-unpin-icon"
                :class="getDarkModeClass(darkMode)"
                @click.stop="togglePin(app.id)"
              />
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

        <!-- Grid view -->
        <div v-else class="app-grid">
          <div
            v-for="(app, index) in cat.apps"
            :key="app.id || index"
            :draggable="(cat.isPinned && dragSupported) ? 'true' : false"
            class="app-grid-item"
            :class="[
              getDarkModeClass(darkMode),
              { 'app-inactive': !app.active, 'drag-over': cat.isPinned && dragSupported && dragOverAppId === app.id }
            ]"
            @click="openApp(app)"
            v-on-long-press="(cat.isPinned && dragSupported) ? undefined : [(event) => showAppContextMenu(app, event)]"
            @dragstart="cat.isPinned && dragSupported && onDragStart(app, $event)"
            @dragover="cat.isPinned && dragSupported && onDragOver(app, $event)"
            @dragleave="cat.isPinned && dragSupported && onDragLeave()"
            @drop="cat.isPinned && dragSupported && onDrop(app, $event)"
            @dragend="cat.isPinned && dragSupported && onDragEnd()"
          >
            <div class="relative-position" draggable="false" style="display: inline-block;">
              <div class="app-grid-tile bg-grad" :class="{ 'tile-inactive': !app.active }">
                <q-icon size="30px" color="white" :name="app.iconName" draggable="false" />
              </div>
              <span v-if="app.beta" class="app-beta-pill-grid" draggable="false">BETA</span>
              <div
                v-if="app.id === 'chat' && chatUnreadCount > 0"
                class="app-unread-badge"
                draggable="false"
              >
                {{ chatUnreadCountLabel }}
              </div>
            </div>
            <p
              draggable="false"
              class="app-grid-name pt-label"
              :class="[getDarkModeClass(darkMode), !app.active ? 'text-grey' : '']"
            >
              {{ app.name }}
            </p>
          </div>
        </div>

        <div
          v-if="viewMode !== 'list'"
          class="unpin-bin"
          :class="[getDarkModeClass(darkMode), { 'unpin-bin-visible': cat.isPinned && draggedAppId && dragSupported }]"
          @dragover.prevent
          @drop="onUnpinDrop"
        >
          <q-icon name="mdi-pin-off" size="20px" />
          <span>{{ $t('DropToUnpin', {}, 'Drop here to unpin') }}</span>
        </div>
      </section>

      <div v-if="searchQuery && categorizedApps.length === 0" class="no-results" :class="getDarkModeClass(darkMode)">
        {{ $t('NoAppsFound', {}, 'No apps found') }}
      </div>
    </div>

  </div>
</template>

<script>
import { Platform } from 'quasar';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import MarketplaceAppSelectionDialog from 'src/components/marketplace/MarketplaceAppSelectionDialog.vue'
import BetaAppDialog from 'src/components/apps/BetaAppDialog.vue'
import HeaderNav from '../../components/header-nav'
import { webSocketManager } from 'src/exchange/websocket/manager'
import { isNativeIOS } from 'src/utils/native-platform'
import { DISPLAY_SUBS_APP } from 'src/wallet/payment-hub';

export default {
  name: 'apps',
  components: {
    HeaderNav,
    BetaAppDialog
  },
  directives: {
    'on-long-press': {
      mounted (el, binding) {
        const handler = typeof binding.value === 'function'
          ? binding.value
          : Array.isArray(binding.value) ? binding.value[0] : null
        if (!handler) return

        let timer = null
        let startX = 0
        let startY = 0
        let isPending = false
        let longPressTriggered = false
        let activeSource = null
        let lastLongPressTime = 0

        function start (x, y, e, source) {
          if (activeSource && activeSource !== source) return
          if (Date.now() - lastLongPressTime < 100) return
          startX = x
          startY = y
          isPending = true
          longPressTriggered = false
          activeSource = source
          timer = setTimeout(() => {
            timer = null
            isPending = false
            longPressTriggered = true
            lastLongPressTime = Date.now()
            handler(e)
          }, 500)
        }

        function cancel () {
          if (timer) {
            clearTimeout(timer)
            timer = null
          }
          isPending = false
          activeSource = null
        }

        function move (x, y) {
          if (!isPending) return
          const dx = Math.abs(x - startX)
          const dy = Math.abs(y - startY)
          if (dx > 10 || dy > 10) cancel()
        }

        function suppressClick (e) {
          if (longPressTriggered) {
            e.preventDefault()
            e.stopPropagation()
            longPressTriggered = false
            lastLongPressTime = 0
          }
        }

        function onTouchStart (e) {
          const t = e.touches[0]
          start(t.clientX, t.clientY, e, 'touch')
        }

        function onTouchMove (e) {
          const t = e.touches[0]
          move(t.clientX, t.clientY)
        }

        function onMouseDown (e) {
          start(e.clientX, e.clientY, e, 'mouse')
        }

        function onMouseMove (e) {
          move(e.clientX, e.clientY)
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: true })
        el.addEventListener('touchend', cancel)
        el.addEventListener('touchcancel', cancel)
        el.addEventListener('mousedown', onMouseDown)
        el.addEventListener('mousemove', onMouseMove)
        el.addEventListener('mouseup', cancel)
        el.addEventListener('mouseleave', cancel)
        el.addEventListener('click', suppressClick, true)

        el._longPressCleanup = () => {
          cancel()
          el.removeEventListener('touchstart', onTouchStart)
          el.removeEventListener('touchmove', onTouchMove)
          el.removeEventListener('touchend', cancel)
          el.removeEventListener('touchcancel', cancel)
          el.removeEventListener('mousedown', onMouseDown)
          el.removeEventListener('mousemove', onMouseMove)
          el.removeEventListener('mouseup', cancel)
          el.removeEventListener('mouseleave', cancel)
          el.removeEventListener('click', suppressClick, true)
        }
      },
      unmounted (el) {
        el._longPressCleanup?.()
      }
    },
  },
  data () {
    return {
      showDebugApp: localStorage.getItem('debugAppVisible') === 'true',
      viewMode: localStorage.getItem('appsViewMode') || 'list',
      searchQuery: '',
      pinnedAppIds: JSON.parse(localStorage.getItem('pinnedAppIds') || '[]'),
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
          iconName: 'o_chat',
          path: '/apps/chat',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          category: 'wallet-connections'
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
          id: 'payment-hub',
          name: this.$t('PaymentHub', {}, 'Payment Hub'),
          description: this.$t('Apps.PaymentHub.Description', {}, 'Manage Payment Hub Stores, API Keys, and Invoices.'),
          iconName: 'hub',
          path: '/apps/payment-hub/',
          iconStyle: 'width: 100%; height: 100%;',
          active: true,
          beta: false,
          category: 'marketplace'
        },
        ...(DISPLAY_SUBS_APP ? [{
          id: 'payment-hub-subscriptions',
          name: this.$t('RecurringPayments', {}, 'Recurring Payments'),
          description: this.$t('Apps.RecurringPayments.Description', {}, 'Manage your recurring payments.'),
          iconName: 'autorenew',
          path: '/apps/payment-hub-subscriptions/',
          iconStyle: 'font-size: 4.2em',
          active: true,
          beta: true,
          category: 'payment-hub'
        }]: []),
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
      categoryObserver: null,
      draggedAppId: null,
      dragOverAppId: null
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isNativeIOS () {
      return isNativeIOS()
    },
    dragSupported () {
      return !this.isNativeIOS
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
        { id: 'pinned', label: this.$t('Pinned', {}, 'Pinned'), isPinned: true },
        { id: 'ramp-payments', label: this.$t('RampAndPayments', {}, 'Ramp & Payments') },
        { id: 'trade-defi', label: this.$t('TradeAndDeFi', {}, 'Trade & DeFi') },
        { id: 'assets-rewards', label: this.$t('AssetsAndRewards', {}, 'Assets & Rewards') },
        { id: 'wallet-connections', label: this.$t('WalletAndConnections', {}, 'Wallet & Connections') },
        { id: 'marketplace', label: this.$t('MarketplaceAndMerchant', {}, 'Marketplace & Merchant') },
        { id: 'payment-hub', label: this.$t('PaymentHub', {}, 'Payment Hub') },
        { id: 'utilities', label: this.$t('Utilities', {}, 'Utilities') },
        { id: 'beta', label: this.$t('Experimental', {}, 'Experimental'), isBeta: true },
      ]
    },
    categorizedApps () {
      const query = this.searchQuery.trim().toLowerCase()
      const result = []
      for (const cat of this.categoryDefinitions) {
        let apps
        if (cat.isPinned) {
          apps = this.filteredApps
            .filter(app => this.pinnedAppIds.includes(app.id))
            .sort((a, b) => this.pinnedAppIds.indexOf(a.id) - this.pinnedAppIds.indexOf(b.id))
        } else {
          apps = this.filteredApps.filter(app => app.category === cat.id)
        }
        if (query) {
          apps = apps.filter(app => this.fuzzyMatch(app.name, query))
        }
        if (apps.length > 0) {
          result.push({ ...cat, apps })
        }
      }
      return result
    },
    categories () {
      return this.categorizedApps.map(cat => ({ id: cat.id, label: cat.label, isBeta: cat.isBeta, isPinned: cat.isPinned }))
    }
  },
  methods: {
    getDarkModeClass,
    fuzzyMatch (text, query) {
      if (!text) return false
      const str = String(text).toLowerCase()
      let qi = 0
      for (let i = 0; i < str.length && qi < query.length; i++) {
        if (str[i] === query[qi]) qi++
      }
      return qi === query.length
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
    isPinned (appId) {
      return this.pinnedAppIds.includes(appId)
    },
    togglePin (appId) {
      if (this.pinnedAppIds.includes(appId)) {
        this.pinnedAppIds = this.pinnedAppIds.filter(id => id !== appId)
      } else {
        this.pinnedAppIds = [...this.pinnedAppIds, appId]
      }
      localStorage.setItem('pinnedAppIds', JSON.stringify(this.pinnedAppIds))
    },
    onHandleDragStart (app, event, source) {
      event.preventDefault()
      this.draggedAppId = app.id
      const getPos = (e) => source === 'mouse'
        ? { x: e.clientX, y: e.clientY }
        : { x: e.touches[0].clientX, y: e.touches[0].clientY }
      let pos = getPos(event)
      const onMove = (e) => {
        e.preventDefault()
        pos = getPos(e)
        const el = document.elementFromPoint(pos.x, pos.y)
        const row = el && el.closest('[data-app-id]')
        if (row) {
          const id = row.getAttribute('data-app-id')
          this.dragOverAppId = id !== this.draggedAppId ? id : null
        } else {
          this.dragOverAppId = null
        }
      }
      const onEnd = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onEnd)
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
        if (this.draggedAppId && this.dragOverAppId) {
          this.completeReorder(this.draggedAppId, this.dragOverAppId)
        }
        this.draggedAppId = null
        this.dragOverAppId = null
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onEnd)
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    },
    onDragStart (app, event) {
      this.draggedAppId = app.id
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', app.id)
      // Transparent drag image to prevent iOS Safari black square ghost
      const img = new Image()
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      event.dataTransfer.setDragImage(img, 0, 0)
    },
    onDragOver (app, event) {
      if (!this.draggedAppId || this.draggedAppId === app.id) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      this.dragOverAppId = app.id
    },
    onDragLeave () {
      this.dragOverAppId = null
    },
    onDrop (app, event) {
      event.preventDefault()
      const fromId = this.draggedAppId
      const toId = app.id
      if (!fromId || !toId || fromId === toId) {
        this.draggedAppId = null
        this.dragOverAppId = null
        return
      }
      const ids = [...this.pinnedAppIds]
      const fromIndex = ids.indexOf(fromId)
      const toIndex = ids.indexOf(toId)
      if (fromIndex === -1 || toIndex === -1) {
        this.draggedAppId = null
        this.dragOverAppId = null
        return
      }
      ids.splice(fromIndex, 1)
      ids.splice(toIndex, 0, fromId)
      this.pinnedAppIds = ids
      localStorage.setItem('pinnedAppIds', JSON.stringify(ids))
      this.draggedAppId = null
      this.dragOverAppId = null
    },
    completeReorder (fromId, toId) {
      const ids = [...this.pinnedAppIds]
      const fromIndex = ids.indexOf(fromId)
      const toIndex = ids.indexOf(toId)
      if (fromIndex === -1 || toIndex === -1) return
      ids.splice(fromIndex, 1)
      ids.splice(toIndex, 0, fromId)
      this.pinnedAppIds = ids
      localStorage.setItem('pinnedAppIds', JSON.stringify(ids))
    },
    onDragEnd () {
      this.draggedAppId = null
      this.dragOverAppId = null
    },
    onUnpinDrop () {
      if (this.draggedAppId) {
        this.togglePin(this.draggedAppId)
      }
      this.draggedAppId = null
      this.dragOverAppId = null
    },
    showAppContextMenu (app, event) {
      if (!app.active) return
      if (app.onLongPress) {
        app.onLongPress(event)
        return
      }
      const pinned = this.isPinned(app.id)
      this.$q.bottomSheet({
        class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
        actions: [
          {
            label: pinned ? this.$t('Unpin', {}, 'Unpin') : this.$t('Pin', {}, 'Pin'),
            icon: pinned ? 'mdi-pin-off' : 'mdi-pin',
            id: 'pin',
            color: this.themeColor,
          },
          {
            label: this.$t('Open', {}, 'Open'),
            icon: 'open_in_new',
            id: 'open',
          },
        ],
      }).onOk(action => {
        if (action.id === 'pin') {
          this.togglePin(app.id)
        } else if (action.id === 'open') {
          this.openApp(app)
        }
      })
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
    },
    toggleViewMode () {
      this.viewMode = this.viewMode === 'list' ? 'grid' : 'list'
      localStorage.setItem('appsViewMode', this.viewMode)
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
    if (this.categoryObserver) {
      this.categoryObserver.disconnect()
      this.categoryObserver = null
    }
  }
}
</script>

<style scoped lang="scss">

  /* ---- Category chips bar ---- */
  .apps-header {
    margin-bottom: 0 !important;
  }
  .category-chips-bar {
    position: sticky;
    top: calc(-1px + env(safe-area-inset-top, 0px) + 53px);
    z-index: 2900;
    padding: 6px 0;
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

  /* ---- Search bar ---- */
  .apps-search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 16px 6px;
    padding: 8px 18px;
    border-radius: 999px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    transition: box-shadow 0.2s ease;
    &:focus-within {
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
    }
    &.dark { background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.08); }
    &.light { background: #ffffff; border: 1px solid rgba(0,0,0,0.06); }
  }
  .search-icon {
    flex-shrink: 0;
    &.dark { color: rgba(255,255,255,0.4); }
    &.light { color: rgba(0,0,0,0.35); }
  }
  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    font-weight: 400;
    padding: 6px 0;
    &.dark { color: rgba(255,255,255,0.9); &::placeholder { color: rgba(255,255,255,0.3); } }
    &.light { color: rgba(0,0,0,0.85); &::placeholder { color: rgba(0,0,0,0.3); } }
  }
  .search-clear {
    flex-shrink: 0;
    cursor: pointer;
    &.dark { color: rgba(255,255,255,0.4); }
    &.light { color: rgba(0,0,0,0.35); }
  }
  .apps-hint-text {
    text-align: center;
    font-size: 14px;
    &.dark { color: #ffffff; }
    &.light { color: #000000; }
  }

  .no-results {
    text-align: center;
    padding: 48px 20px;
    font-size: 15px;
    font-weight: 500;
    &.dark { color: rgba(255,255,255,0.35); }
    &.light { color: rgba(0,0,0,0.35); }
  }

  /* ---- Apps list container ---- */
  #apps.apps-list-container {
    padding: 4px 16px 80px !important;
    &.dark { background: transparent; }
    &.light { background: transparent; }
  }

  .sticky-header-container {
    padding-bottom: 0;
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

  /* ---- Pinned section ---- */
  .pinned-section {
    padding: 0 0 4px;
    border-radius: 16px;
    &.dark {
      background: linear-gradient(180deg, rgba(59, 123, 246, 0.08) 0%, rgba(59, 123, 246, 0.01) 100%);
      border: 1px solid rgba(59, 123, 246, 0.15);
    }
    &.light {
      background: linear-gradient(180deg, rgba(59, 123, 246, 0.05) 0%, rgba(59, 123, 246, 0.01) 100%);
      border: 1px solid rgba(59, 123, 246, 0.12);
    }
    .section-header { padding: 14px 14px 8px; }
    .section-divider { margin: 0 14px; }
    .app-rows { padding: 0 4px 8px; }
  }
  .section-pin-icon {
    &.dark { color: rgba(59, 123, 246, 0.7); }
    &.light { color: rgba(59, 123, 246, 0.6); }
  }
  .unpin-bin {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 0 14px 8px;
    padding: 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s ease, border-color 0.15s ease;
    &.unpin-bin-visible { display: flex; }
    &.dark {
      background: rgba(239, 83, 80, 0.08);
      border: 2px dashed rgba(239, 83, 80, 0.4);
      color: rgba(239, 83, 80, 0.7);
      &:hover { background: rgba(239, 83, 80, 0.15); border-color: rgba(239, 83, 80, 0.6); }
    }
    &.light {
      background: rgba(239, 83, 80, 0.06);
      border: 2px dashed rgba(239, 83, 80, 0.3);
      color: rgba(239, 83, 80, 0.65);
      &:hover { background: rgba(239, 83, 80, 0.12); border-color: rgba(239, 83, 80, 0.5); }
    }
  }
  .pin-indicator {
    &.dark { color: rgba(59, 123, 246, 0.6); }
    &.light { color: rgba(59, 123, 246, 0.5); }
  }
  .pin-indicator-grid {
    position: absolute;
    top: -2px;
    right: -2px;
    &.dark { color: rgba(59, 123, 246, 0.7); }
    &.light { color: rgba(59, 123, 246, 0.6); }
  }
  .app-beta-pill {
    font-size: 8px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 4px;
    background: linear-gradient(135deg, #e18908, #e65100);
    color: #fff;
    letter-spacing: 0.6px;
    margin-left: 4px;
  }
  .app-beta-pill-grid {
    position: absolute;
    top: -2px;
    left: -2px;
    font-size: 7px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 4px;
    background: linear-gradient(135deg, #e18908, #e65100);
    color: #fff;
    letter-spacing: 0.5px;
  }
  .chip-pinned {
    &.dark { border: 1px solid rgba(59, 123, 246, 0.3); }
    &.light { border: 1px solid rgba(59, 123, 246, 0.2); }
  }

  /* ---- App row ---- */
  .app-rows {
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .app-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 10px;
    cursor: pointer;
    transition: background 0.15s ease;
    position: relative;
    -webkit-user-select: none;
    user-select: none;
    border-radius: 10px;

    &.dark {
      background: rgba(255,255,255,0.03);
      &:active { background: rgba(255,255,255,0.08); }
    }
    &.light {
      background: rgba(0,0,0,0.025);
      &:active { background: rgba(0,0,0,0.06); }
    }
    &.app-inactive {
      cursor: default;
      .app-name, .app-desc { opacity: 0.35; }
    }
    &.drag-over {
      background: rgba(59, 123, 246, 0.12) !important;
      outline: 2px dashed rgba(59, 123, 246, 0.5);
      outline-offset: -2px;
    }
  }

  .app-drag-handle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 48px;
    cursor: grab;
    transition: color 0.15s ease;
    -webkit-user-select: none;
    user-select: none;
    &:active { cursor: grabbing; }
    &.dark {
      color: rgba(255,255,255,0.4);
      &:hover { color: rgba(255,255,255,0.8); }
    }
    &.light {
      color: rgba(0,0,0,0.25);
      &:hover { color: rgba(0,0,0,0.6); }
    }
  }

  .app-unpin-icon {
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.15s ease;
    &:hover { opacity: 1; }
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
    &.dark { color: #ffffff; }
    &.light { color: #000000; }
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
    &.dark { color: rgba(255,255,255,0.75); }
    &.light { color: rgba(0,0,0,0.65); }
  }

  .app-row-end {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .app-chevron {
    &.dark { color: rgba(255,255,255,0.3); }
    &.light { color: rgba(0,0,0,0.25); }
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

  /* ---- Grid view ---- */
  .view-grid .app-rows { display: none; }

  .app-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 0;
  }
  .app-grid-item {
    flex: 0 0 calc(33.333% - 4px);
    max-width: calc(33.333% - 4px);
    text-align: center;
    cursor: pointer;
    padding: 12px 4px 8px;
    -webkit-user-select: none;
    user-select: none;
    @media (min-width: 600px) {
      flex: 0 0 calc(16.666% - 4px);
      max-width: calc(16.666% - 4px);
    }
    &.app-inactive { cursor: default; }
    &[draggable="true"] {
      cursor: grab;
      &:active { cursor: grabbing; }
    }
    &[draggable="true"] {
      -webkit-user-drag: element;
      user-drag: element;
    }
    &.drag-over {
      .app-grid-tile {
        outline: 3px solid rgba(59, 123, 246, 0.6);
        outline-offset: 3px;
      }
    }
  }
  .app-grid-tile {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    &.tile-inactive { filter: grayscale(1) opacity(0.4); }
    .app-grid-item[draggable="true"] & { pointer-events: none; }
  }
  .app-grid-name {
    margin: 6px 0 0;
    font-size: 12px;
    font-weight: 500;
    word-break: break-all;
    line-height: 1.2;
    &.dark { color: rgba(255,255,255,0.85); }
    &.light { color: rgba(0,0,0,0.8); }
  }
  .view-grid .app-unread-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    z-index: 11;
  }
  .view-grid .relative-position {
    position: relative;
    display: inline-block;
  }
</style>
