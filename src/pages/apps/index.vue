<template>
  <div id="apps-page-container" class="row" :class="getDarkModeClass(darkMode)">
    <div id="apps" ref="apps" class="text-center">
      <div>
        <div :class="{'pt-header apps-header': isNotDefaultTheme(theme)}" :style="{ 'padding-top': $q.platform.is.ios ? '40px' : '0px'}">
          <p
            class="section-title"
            :class="{'text-blue-5': darkMode, 'text-grad': isNotDefaultTheme(theme)}"
            :style="{ 'padding-top': $q.platform.is.ios ? '10px' : '20px'}"
          >
            {{ $t('Applications') }}
          </p>
        </div>
        <div class="row" :class="isNotDefaultTheme(theme) ? 'q-px-md' : 'q-px-xs'">
          <div v-for="(app, index) in filteredApps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-pa-xs text-center" :class="{'bex-app': $q.platform.is.bex}">
            <div
              class="pt-app bg-grad"
              :class="[
                buttonClassByState(app.active),
                {'apps-border' : isNotDefaultTheme(theme)}
              ]"
              @click="openApp(app)"
              v-on-long-press="[e => onLongPressApp(e, app), { delay: 1000, modifiers: { stop: true, prevent: true } }]"
            >
              <q-icon class="app-icon" color="white" size="xl" :name="app.iconName" :style="app.iconStyle"/>
            </div>
            <p class="pt-app-name q-mt-xs q-mb-none q-mx-none pt-label" :class="getDarkModeClass(darkMode)">{{ app.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="toggleMnemonicDisplay" />
    <biometricWarningAttempts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="setwarningAttemptsStatus" />
    <footer-menu />
  </div>
</template>

<script>
import { vOnLongPress } from '@vueuse/components'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import MarketplaceAppSelectionDialog from 'src/components/marketplace/MarketplaceAppSelectionDialog.vue'
import pinDialog from '../../components/pin'
import biometricWarningAttempts from '../../components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  name: 'apps',
  components: {
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
          path: '/apps/ramp/fiat',
          iconStyle: 'width:50%',
          active: true, // !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: 'Marketplace',
          iconName: 'img:marketplace.png',
          path: '/apps/marketplace',
          active: true,
          onLongPress: (event) => {
            event?.preventDefault?.()
            this.$q.dialog({
              component: MarketplaceAppSelectionDialog,
            })
          }
        },
        {
          name: this.$t('Gifts'),
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Collectibles'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          active: true,
          smartBCHOnly: false
        },
        {
          name: 'AnyHedge',
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:50%',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Map'),
          iconName: 'public',
          path: '/apps/map/',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('POSAdmin'),
          iconName: 'point_of_sale',
          path: '/apps/point-of-sale',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Bridge'),
          iconName: 'mdi-bridge',
          path: '/apps/bridge',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        },
        {
          name: this.$t('AssetSwap'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/asset-swap',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        },
        {
          name: 'Crypto Swap',
          iconName: 'mdi-autorenew',
          path: '/apps/ramp/crypto',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('WalletConnect'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Sweep'),
          iconName: 'mdi-broom',
          path: '/apps/sweep',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        // {
        //   name: 'Chat',
        //   iconName: 'mdi-chat',
        //   path: '/apps/chat/',
        //   active: true
        // },
        {
          name: this.$t('WalletInfo'),
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true,
          smartBCHOnly: false
        },
        {
          name: 'Wallet Backup',
          iconName: 'backup',
          path: '/apps/wallet-backup',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('Settings'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true,
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
    isNotDefaultTheme,
    buttonClassByState (active) {
      return active ? '' : 'disabled'
    },
    openApp (app) {
      if (app.active) {
        if (app.name === 'Wallet Backup') {
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
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          this.submitLabel = 'Processing'
          this.customKeyboardState = 'dismiss'
          setTimeout(() => {
            this.toggleMnemonicDisplay()
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            this.proceedToBackup = false
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        })
    },
    setwarningAttemptsStatus () {
      this.verifyBiometric()
    },
    toggleMnemonicDisplay (action) {
      const vm = this
      vm.pinDialogAction = ''
      if (action === 'proceed') {
        vm.$router.push('/apps/wallet-backup')
      }
    }
  },
  created () {
    this.filteredApps = this.apps
    const currentTheme = this.$store.getters['global/theme']
    const themedIconPath = isNotDefaultTheme(this.theme) ? `assets/img/theme/${currentTheme}/` : ''

    try {
      if (this.$router.resolve({name: 'apps-sandbox'})) {
        this.apps.unshift({
          name: 'Sandbox',
          iconName: '',
          path: '/apps/sandbox',
          active: true
        })
      }
    } catch { }

    this.filteredApps.forEach(app => {
      if (isNotDefaultTheme(this.theme)) {
        const iconFileName = app.path.split('/')[2]
        const themedIconLoc = `img:${themedIconPath}${iconFileName}.png`
        app.iconName = themedIconLoc
      }
    })

    if (!this.enableSmartBCH) {
      this.filteredApps = this.apps.filter((app) => {
        if (!app.smartBCHOnly) {
          return true
        }
      })
    }
  },
  mounted () {
    const htmlTag1 = document.querySelector('.pt-app')
    const htmlTag = document.getElementsByClassName('pt-app')
    this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
    for (let i = 0; i < htmlTag.length; i++) {
      htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
    }

    window.addEventListener('resize', function () {
      this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
      for (let i = 0; i < htmlTag.length; i++) {
        htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
      }
    })
  }
}
</script>

<style scoped lang="scss">
  #apps-page-container {
    background-color: #ECF3F3;
    min-height: 100vh;
  }

  .section-title {
    font-size: 22px;
    margin-left: 14px;
    font-weight: 400;
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
