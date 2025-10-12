<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
      <header-nav :title="$t('Settings')" backnavpath="/apps" class="apps-header" />
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Security') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item clickable v-ripple v-if="securityAuth" @click="securityOptionDialogStatus='show in settings'">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('SecurityAuthenticationSetup') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-icon name="security" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                  </q-item-section>
              </q-item>
              <q-item :disable="!pinStatus" clickable v-ripple @click="setNewPin">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('ChangePin') }} {{ !pinStatus ? $t('(disabled)') : '' }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-icon name="mdi-pin" class="q-pr-sm pin-icon"></q-icon>
                  </q-item-section>
              </q-item>
            </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Wallet') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                  <q-item-section>
                    <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                      {{ $t('Currency') }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <CurrencySelector :darkMode="darkMode" />
                  </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                    {{ $t(isHongKong(currentCountry) ? 'ShowPoints' : 'ShowTokens') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                    <q-toggle
                      v-model="showTokens"
                      :color="toggleColor"
                      keep-color
                    />
                  </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                    {{ $t(isHongKong(currentCountry) ? 'ManageIgnoredPoints' : 'ManageIgnoredTokens') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    :label="$t('Manage')"
                    no-caps
                    :to="{
                      path: '/apps/settings/ignored-tokens',
                      query: { backNavPath: '/apps/settings' }
                    }"
                  />
                </q-item-section>
              </q-item>

              <q-item clickable v-ripple @click="isChipnet = !isChipnet">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('UseChipnetNetwork') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-toggle
                      v-model="isChipnet"
                      :color="toggleColor"
                      keep-color
                    />
                  </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="autoGenerateAddress = !autoGenerateAddress">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('AutoGenerateAddress', {}, 'Auto generate address') }}
                      </q-item-label>
                      <q-item-label caption style="line-height:1;margin-top:3px;" >
                        {{ $t('AutoGenerateAddressToolTip', {}, 'A new address will be generated after receiving assets.') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-toggle
                      v-model="autoGenerateAddress"
                      :color="toggleColor"
                      keep-color
                    />
                  </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="enableStablhedge = !enableStablhedge">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('EnableStablhedge') }} <q-badge color="red" align="top">ALPHA</q-badge>
                      </q-item-label>
                      <q-item-label caption style="line-height:1;margin-top:3px;" >
                        {{ $t('StablehedgeIntroText', {}, 'Safeguard your funds from market volatlity and access them whenever you need.') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-toggle
                      v-model="enableStablhedge"
                      :color="toggleColor"
                      keep-color
                    />
                  </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                    Enable SLP
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                    <q-toggle
                      v-model="enableSLP"
                      :color="toggleColor"
                      keep-color
                    />
                  </q-item-section>
              </q-item>
              <!-- <q-item clickable v-ripple @click="enableSmartBCH = !enableSmartBCH">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('EnableSmartBCH') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-toggle
                      v-model="enableSmartBCH"
                      color="blue-9"
                      keep-color
                    />
                  </q-item-section>
              </q-item> -->
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                    {{ $t('SelectBCHDenomination') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <DenominatorSelector :darkMode="darkMode" />
                </q-item-section>
              </q-item>
            </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md">
          <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Personalize') }}</p>
          <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Country') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <CountrySelector :darkMode="darkMode" />
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Language') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <LanguageSelector :darkMode="darkMode" />
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Theme') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <ThemeSelector :darkMode="darkMode" />
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="darkMode = !darkMode">
                <q-item-section>
                    <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('DarkMode') }}</q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-toggle
                    v-model="darkMode"
                    :color="toggleColor"
                    keep-color
                  />
                </q-item-section>
            </q-item>
          </q-list>
        </div>

        <template v-if="isMobile">
          <PushNotifsSettings />
        </template>

        <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
          <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('AppInfo') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Version') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">v{{ appVersion }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('SourceCodeRepo') }}</q-item-label>
                  <q-item-label>
                    <a
                      :href="repoUrl"
                      target="_blank"
                      :class="darkMode ? 'text-grad' : 'text-blue-9'"
                      style="text-decoration: none;"
                    >
                      {{ repoUrl }}
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
      </div>

      <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" :darkMode="darkMode" />
      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogCallback" :disableClose="disablePinDialogClose"/>

      <StablehedgePlatformInfoDialog v-model="showStablehedgeInfoDialog"/>
  </div>
</template>

<script>
import pinDialog from '../../components/pin'
import securityOptionDialog from '../../components/authOption'
import HeaderNav from '../../components/header-nav'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'
import packageInfo from '../../../package.json'
import LanguageSelector from '../../components/settings/LanguageSelector'
import CountrySelector from '../../components/settings/CountrySelector'
import CurrencySelector from '../../components/settings/CurrencySelector'
import DenominatorSelector from 'src/components/settings/DenominatorSelector'
import PushNotifsSettings from 'src/components/settings/PushNotifsSettings.vue'
import ThemeSelector from 'src/components/settings/ThemeSelector.vue'
import StablehedgePlatformInfoDialog from 'src/components/stablehedge/StablehedgePlatformInfoDialog.vue'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      pinDialogAction: '',
      disablePinDialogClose: false,
      securityOptionDialogStatus: 'dismiss',
      securityAuth: false,
      securityChange: null,
      pinStatus: true,
      appVersion: packageInfo.version,
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      autoGenerateAddress: this.$store.getters['global/autoGenerateAddress'],
      showTokens: this.$store.getters['global/showTokens'],
      enableStablhedge: this.$store.getters['global/enableStablhedge'],
      enableSmartBCH: this.$store.getters['global/enableSmartBCH'],
      enableSLP: this.$store.getters['global/enableSLP'],
      currentCountry: this.$store.getters['global/country'].code,
      repoUrl: 'https://github.com/paytaca/paytaca-app',
      showStablehedgeInfoDialog: false,
      enablePushNotifs: false
    }
  },
  components: {
    HeaderNav,
    pinDialog,
    securityOptionDialog,
    LanguageSelector,
    CountrySelector,
    CurrencySelector,
    DenominatorSelector,
    ThemeSelector,
    StablehedgePlatformInfoDialog,
    PushNotifsSettings
  },
  computed: {
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      return 'blue-6'
    }
  },
  watch: {
    isChipnet (n, o) {
      this.$store.commit('global/toggleIsChipnet')
    },
    autoGenerateAddress (n, o) {
      this.$store.commit('global/toggleAutoGenerateAddress')
    },
    showTokens (n, o) {
      this.$store.commit('global/showTokens')
    },
    enableStablhedge(newVal, oldVal) {
      this.$store.commit('global/enableStablhedge', newVal)

      // uncomment when stablehedge's info dialog is completed
      if (newVal) {
        this.showStablehedgeInfoDialog = true
      }
    },
    enableSmartBCH (n, o) {
      this.$store.commit('global/enableSmartBCH')
    },
    enableSLP (n, o) {
      this.$store.commit('global/enableSLP')
    },
    darkMode (newVal, oldVal) {
      this.$store.commit('darkmode/setDarkmodeSatus', newVal)
    },
  },
  methods: {
    getDarkModeClass,
    isHongKong,
    setNewPin () {
      this.securityChange = 'change-pin'
      this.pinDialogAction = 'VERIFY'
    },
    pinDialogCallback (action = '') {
      this.pinDialogAction = ''
      if (action !== 'cancel') {
        this.securityOptionDialogStatus = 'dismiss'
      }
      if (action === 'proceed') {
        if (this.securityChange === 'change-pin') {
          this.pinDialogAction = 'SET NEW'
        }
        if (this.securityChange === 'switch-to-biometric') {
          this.$q.localStorage.set('preferredSecurity', 'biometric')
          this.pinStatus = false
        }
      }
    },
    verifyBiometric () {
      const vm = this
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          setTimeout(() => {
            vm.$q.localStorage.set('preferredSecurity', 'pin')
            vm.pinStatus = true
            vm.pinDialogAction = 'SET NEW'
            vm.disablePinDialogClose = true
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          console.log(error)
        }
        )
    },
    setPreferredSecurity (auth) {
      const vm = this
      const currentPref = this.$q.localStorage.getItem('preferredSecurity')
      if (currentPref === 'pin' && auth === 'biometric') {
        vm.securityChange = 'switch-to-biometric'
        vm.pinDialogAction = 'VERIFY'
      }
      if (currentPref === 'biometric' && auth === 'pin') {
        vm.verifyBiometric()
      }
      if (currentPref === auth) {
        vm.securityOptionDialogStatus = 'dismiss'
      }
    }
  },
  created () {
    NativeBiometric.isAvailable()
      .then(result => {
        if (result.isAvailable !== false) {
          this.securityAuth = true
        } else {
          this.securityAuth = false
          this.pinStatus = true
        }
      },
      (error) => {
        this.pinStatus = true
        console.log('Implementation error: ', error)
      })
  },
  mounted () {
    if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
      this.pinStatus = true
    } else {
      this.pinStatus = false
    }

    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('global/refetchWalletPreferences')
  }
}
</script>

<style lang="scss" scoped>
  .section-title {
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    
    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .pt-setting-menu {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-setting-avatar-dark {
    color: #A6ACAF;
  }

  .pt-label {
    font-size: 14px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .settings-list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
      
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      &.dark:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }

  #app-container {
    &.dark {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }
</style>
