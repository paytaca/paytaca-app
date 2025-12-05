<template>
  <div id="apps-page-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Apps')"
      backnavpath="/"
      class="q-px-sm apps-header"
      @long-press-title="onLongPressAppsTitle"
    />
    <div id="apps" ref="apps" class="text-center" :style="{ 'margin-top': '0px', 'padding-bottom': '30px' }">
      <div class="row q-px-xs">
        <div v-for="(app, index) in filteredApps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-px-xs q-py-md text-center" :class="{'bex-app': $q.platform.is.bex}">
          <div class="relative-position" style="display: inline-block;">
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
              :label="$t('BETA', {}, 'BETA')"
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

  </div>
</template>

<script>
import { vOnLongPress } from '@vueuse/components'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import MarketplaceAppSelectionDialog from 'src/components/marketplace/MarketplaceAppSelectionDialog.vue'
import BetaAppDialog from 'src/components/apps/BetaAppDialog.vue'
import HeaderNav from '../../components/header-nav'
import { webSocketManager } from 'src/exchange/websocket/manager'

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
      apps: [
        {
          name: 'P2P Exchange',
          iconName: 'img:ramp_icon_white.png',
          path: '/apps/exchange',
          iconStyle: 'width:45%; height: 45%;',
          active: true, // !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Marketplace'),
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
          name: this.$t('Collectibles'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          iconStyle: 'font-size: 4.5em',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('Gifts'),
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: `LIFT ${this.$t('Token')}`,
          iconName: 'img:lift-token.png',
          path: '/apps/lift-token',
          iconStyle: 'width: 50%; height: 60%;',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: 'Multisig Wallets',
          iconName: 'mdi-account-group',
          path: '/apps/multisig',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false,
          beta: true,
          betaMessage: this.$t('MultisigWalletsBetaMessage', {}, 'Multisig Wallets is currently in beta. This feature allows you to create and manage multi-signature wallets that require multiple signatures for transactions. Please note that this is an experimental feature and may have limitations.')
        },
        {
          name: 'Cauldron DEX',
          iconName: 'img:cauldron-logo.svg',
          path: '/apps/cauldron',
          iconStyle: 'width:45%; height: 45%;',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('CryptoSwap'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/crypto-swap',
          active: true,
          iconStyle: 'font-size: 4.7em',
          smartBCHOnly: false
        },
        {
          name: 'AnyHedge',
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:55%; height: 55%;',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: 'Stablehedge',
          iconName: 'img:assets/img/stablehedge/stablehedge-icon.svg',
          path: '/apps/stablehedge/wallet',
          iconStyle: 'width:55%; height: 55%;',
          active: true,
          smartBCHOnly: false,
          beta: true,
          betaMessage: this.$t('StablehedgeBetaMessage', {}, 'Stablehedge is currently in beta. This feature allows you to create stablecoin positions backed by Bitcoin Cash. Please note that this is an experimental feature and may have limitations or risks.')
        },
        {
          name: this.$t('WalletConnect'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          iconStyle: 'font-size: 4.2em',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('MerchantAdmin', {}, 'Merchant Admin'),
          iconName: 'point_of_sale',
          path: '/apps/merchant-admin',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('MerchantMap', {}, 'Merchant Map'),
          iconName: 'public',
          path: '/apps/map/',
          iconStyle: 'font-size: 4.2em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Support', {}, 'Support'),
          iconName: 'support',
          path: '/apps/wallet-info',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false
        },
        {
          name: this.$t('Bridge'),
          iconName: 'mdi-bridge',
          path: '/apps/bridge',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        },
        {
          name: this.$t('AssetSwap'),
          iconName: 'mdi-autorenew',
          path: '/apps/asset-swap',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        }
      ],
      debugApp: {
        name: 'Debug',
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
    theme () {
      return this.$store.getters['global/theme']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    }
  },
  methods: {
    getDarkModeClass,
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
          cancel: { label: this.$t('Cancel'), },
          ok: { label: this.$t('OK'), },
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
      
      // Add debug app if visible
      if (this.showDebugApp) {
        this.filteredApps.push(this.debugApp)
      }
      
      // Filter by smartBCH if needed
      if (!this.enableSmartBCH) {
        this.filteredApps = this.filteredApps.filter((app) => {
          if (!app.smartBCHOnly) {
            return true
          }
        })
      }
    }
  },
  created () {
    const currentTheme = this.$store.getters['global/theme']
    const themedIconPath = ''

    try {
      if (this.$router.resolve({name: 'apps-sandbox'})) {
        this.apps.unshift({
          name: this.$t('Sandbox'),
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
  }
}
</script>

<style scoped lang="scss">
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