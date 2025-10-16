<template>
  <div id="apps-page-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Apps')"
      backnavpath="/"
      class="q-px-sm apps-header"
    />
    <div id="apps" ref="apps" class="text-center" :style="{ 'margin-top': '0px', 'padding-bottom': '30px' }">
      <div class="row q-px-xs">
        <div v-for="(app, index) in filteredApps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-px-xs q-py-md text-center" :class="{'bex-app': $q.platform.is.bex}">
          <q-btn class="bg-grad" no-caps round style="padding: 20px;" @click="openApp(app)">
            <q-icon size="30px" color="white" :name="app.iconName"/> <br>                              
          </q-btn>
          <p class="pt-app-name q-mt-xs q-mb-none q-mx-none pt-label" :class="getDarkModeClass(darkMode)">{{ app.name }}</p>
        </div>
      </div>
    </div>

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="toggleMnemonicDisplay" />
    <biometricWarningAttempts :warning-attempts="warningAttemptsStatus" />
  </div>
</template>

<script>
import { vOnLongPress } from '@vueuse/components'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import MarketplaceAppSelectionDialog from 'src/components/marketplace/MarketplaceAppSelectionDialog.vue'
import HeaderNav from '../../components/header-nav'
import pinDialog from '../../components/pin'
import biometricWarningAttempts from '../../components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { webSocketManager } from 'src/exchange/websocket/manager'

export default {
  name: 'apps',
  components: {
    HeaderNav,
    pinDialog,
    biometricWarningAttempts
  },
  directives: {
    'on-long-press': vOnLongPress,
  },
  data () {
    return {
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
          name: 'Marketplace',
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
          name: this.$t('WalletConnect'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          iconStyle: 'font-size: 4.2em',
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
          name: this.$t('Learn'),
          iconName: 'school',
          path: '/apps/learn',
          iconStyle: 'font-size: 4em',
          active: true,
          smartBCHOnly: false
        },
        // {
        //   name: 'Rewards',
        //   iconName: 'workspace_premium',
        //   path: '/apps/rewards',
        //   iconStyle: 'font-size: 4em',
        //   active: !this.$store.getters['global/isChipnet'],
        //   smartBCHOnly: false
        // },
        {
          name: this.$t('Collectibles'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          iconStyle: 'font-size: 4.5em',
          active: true,
          smartBCHOnly: false
        },
        {
          name: 'Stablehedge',
          iconName: 'img:assets/img/stablehedge/stablehedge-icon.svg',
          path: '/apps/stablehedge/wallet',
          iconStyle: 'width:55%; height: 55%;',
          active: true,
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
          name: `LIFT ${this.$t('Token')}`,
          iconName: 'img:lift-token.png',
          path: '/apps/lift-token',
          iconStyle: 'width: 50%; height: 60%;',
          active: !this.$store.getters['global/isChipnet'],
          // property used for checking if user's whitelisting has been approved
          smartBCHOnly: false
        },
        {
          name: this.$t('Map'),
          iconName: 'public',
          path: '/apps/map/',
          iconStyle: 'font-size: 4.2em',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('MerchantAdmin', {}, 'Merchant Admin'),
          iconName: 'point_of_sale',
          path: '/apps/pos-admin',
          iconStyle: 'font-size: 4em',
          active: !this.$store.getters['global/isChipnet'],
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
        },
        // {
        //   name: this.$t('CryptoSwap'),
        //   iconName: 'mdi-swap-horizontal-bold',
        //   path: '/apps/ramp/crypto',
        //   active: true,
        //   iconStyle: 'font-size: 4.7em',
        //   smartBCHOnly: false
        // },
        {
          name: 'Multisig Wallet',
          iconName: 'mdi-account-group',
          path: '/apps/multisig',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false
        },
        {
          name: this.$t('WalletInfo'),
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false
        },
        {
          name: this.$t('WalletBackup'),
          iconName: 'img:wallet-backup.png',
          path: '/apps/wallet-backup',
          active: true,
          iconStyle: 'width:45%; height: 45%;',
          smartBCHOnly: false
        },
        {
          name: this.$t('Settings'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true,
          iconStyle: 'font-size: 4em',
          smartBCHOnly: false
        }
      ],
      filteredApps: [],
      appHeight: null,
      rampAppSelection: false,
      disableRampSelection: false,
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',
      proceedToBackup: false
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
    },
    showTokens () {
      return this.$store.getters['global/showTokens']
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
      if (app.active) {
        if (app.name === this.$t('WalletBackup')) {
          this.executeSecurityChecking()
        } else {
          this.$router.push(app.path)
        }
      }
    },
    onLongPressApp(event, app) {
      event.preventDefault()
      app?.onLongPress?.(event)
    },
    executeSecurityChecking () {
      const vm = this

      if (!vm.proceedToBackup) {
        setTimeout(() => {
          if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
            vm.pinDialogAction = 'VERIFY'
          } else {
            vm.verifyBiometric()
          }
        }, 500)
      } else {
        this.$router.push('/apps/wallet-backup')
      }
    },
    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason2'),
        title: this.$t('SecurityAuthentication'),
        subtitle: this.$t('NativeBiometricSubtitle'),
        description: ''
      })
        .then(() => {
          // Authentication successful
          this.submitLabel = this.$t('Processing')
          this.customKeyboardState = 'dismiss'
          setTimeout(() => {
            this.toggleMnemonicDisplay('proceed')
          }, 1000)
        })
        .catch((error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes(this.$t('MaxAttempts'))) {
            this.warningAttemptsStatus = 'show'
          } else if (error.message.includes(this.$t('AuthenticationFailed'))) {
            this.verifyBiometric()
          } else this.proceedToBackup = false
        })
    },
    toggleMnemonicDisplay (action) {
      const vm = this
      vm.pinDialogAction = ''
      if (action === 'proceed') {
        vm.$router.push('/apps/wallet-backup')
      }
    },
    closeExchangeWebsocket() {
      if (webSocketManager?.isOpen()) {
        webSocketManager.closeConnection()
      }
    }
  },
  created () {
    this.filteredApps = this.apps
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

    if (!this.enableSmartBCH) {
      this.filteredApps = this.apps.filter((app) => {
        if (!app.smartBCHOnly) {
          return true
        }
      })
    }
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
</style>