<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <header-nav :title="$t('Settings')" backnavpath="/" class="header-nav header-nav apps-header" />
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('WalletInfo', {}, 'Wallet Info') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item clickable v-ripple @click="openRenameDialog()">
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletName') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ currentWalletName }}
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-icon name="edit" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="showSensitiveInfo = !showSensitiveInfo">
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                    {{ showSensitiveInfo ? $t('HideWalletDetails', {}, 'Hide Wallet Details') : $t('ShowWalletDetails', {}, 'Show Wallet Details') }}
                  </q-item-label>
                  <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                    {{ showSensitiveInfo ? $t('HideWalletDetailsTooltip', {}, 'Hide Derivation Path, xPub Key and Wallet Hash') : $t('ShowWalletDetailsTooltip', {}, 'Reveal Derivation Path, xPub Key and Wallet Hash') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section avatar>
                  <q-icon :name="showSensitiveInfo ? 'visibility_off' : 'visibility'" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                </q-item-section>
              </q-item>
              <q-item v-if="showSensitiveInfo" :clickable="!!bchWallet.derivationPath" v-ripple @click="bchWallet.derivationPath && copyToClipboard(bchWallet.derivationPath)">
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                    {{ bchWallet.derivationPath || $t('NotAvailable', {}, 'Not available') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="showSensitiveInfo" :clickable="!!bchWallet.xPubKey" v-ripple @click="bchWallet.xPubKey && copyToClipboard(bchWallet.xPubKey)">
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                    {{ bchWallet.xPubKey || $t('NotAvailable', {}, 'Not available') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="showSensitiveInfo" clickable v-ripple @click="copyToClipboard(walletMasterFingerprint)">
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('MasterFingerprint') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                    {{ walletMasterFingerprint }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="showSensitiveInfo" :clickable="!!bchWallet.walletHash" v-ripple @click="bchWallet.walletHash && copyToClipboard(bchWallet.walletHash)">
                <q-item-section>
                  <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
                  <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                    {{ bchWallet.walletHash || $t('NotAvailable', {}, 'Not available') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Authentication', {}, 'Authentication') }}</p>
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
                      <q-icon name="lock" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                  </q-item-section>
              </q-item>
              <q-item>
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('LockApp', {}, 'Lock App') }}
                      </q-item-label>
                      <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                        {{ $t('LockAppDescription', {}, 'Require authentication when opening or resuming the app') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-toggle
                        :model-value="lockAppEnabled"
                        @update:model-value="toggleLockApp"
                        color="brandblue"
                      />
                  </q-item-section>
              </q-item>
            </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Backup') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item clickable v-ripple @click="$router.push('/apps/wallet-backup/seed-phrase')">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('SeedPhrase', {}, 'Seed Phrase') }}
                      </q-item-label>
                      <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                        {{ $t('ViewYour12WordPhrase', {}, 'View your 12-word recovery phrase') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-icon name="vpn_key" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                  </q-item-section>
              </q-item>
              <q-item clickable v-ripple @click="$router.push('/apps/wallet-backup/shards')">
                  <q-item-section>
                      <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                        {{ $t('SeedPhraseShards') }}
                      </q-item-label>
                      <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                        {{ $t('SplitYourPhraseInto3Shards', {}, 'Split your phrase into 3 shards - only 2 needed to recover') }}
                      </q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-icon name="workspaces" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                  </q-item-section>
              </q-item>
            </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md">
            <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Subscription', {}, 'Subscription') }}</p>
            <SubscriptionStatus :dark-mode="darkMode" />
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
                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">{{ $t('Currency') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <CurrencySelector :darkMode="darkMode" />
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
          <AdvertisementsSettings />
        </template>

        <div class="col-12 q-px-lg q-mt-md">
          <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Developer', {}, 'Developer') }}</p>
          <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
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
          </q-list>
        </div>

        <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
          <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('AppInfo') }}</p>
            <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)" caption>{{ $t('Version') }}</q-item-label>
                  <q-item-label class="pt-label text-grad" :class="getDarkModeClass(darkMode)">{{ appVersion }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)" caption>{{ $t('SourceCodeRepo') }}</q-item-label>
                  <q-item-label>
                    <a
                      :href="repoUrl"
                      target="_blank"
                      class="text-grad"
                      style="text-decoration: none;"
                    >
                      {{ repoUrl }}
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

        <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
          <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
            <q-item clickable v-ripple @click="confirmDeleteWallet">
              <q-item-section>
                <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)" style="color: #f44336;">
                  {{ $t('DeleteWallet') }}
                </q-item-label>
                <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                  {{ $t('DeleteWalletWarning', {}, 'Permanently remove this wallet and all its data. This action cannot be undone.') }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-icon name="delete_forever" color="red"></q-icon>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>

      <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" :darkMode="darkMode" />
      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogCallback" :disableClose="disablePinDialogClose"/>
  </div>
</template>

<script>
import { deriveSeedFromBip39Mnemonic, binToHex, deriveHdPrivateNodeFromSeed, deriveHdPublicNode, hash160 } from 'bitauth-libauth-v3'
import pinDialog from '../../components/pin'
import securityOptionDialog from '../../components/authOption'
import HeaderNav from '../../components/header-nav'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'
import packageInfo from '../../../package.json'
import LanguageSelector from '../../components/settings/LanguageSelector'
import CountrySelector from '../../components/settings/CountrySelector'
import CurrencySelector from '../../components/settings/CurrencySelector'
import AdvertisementsSettings from 'src/components/settings/AdvertisementsSettings.vue'
import ThemeSelector from 'src/components/settings/ThemeSelector.vue'
import RenameDialog from 'src/components/multi-wallet/renameDialog.vue'
import SubscriptionStatus from 'src/components/subscription/SubscriptionStatus.vue'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { loadWallet, getMnemonic, pinExists } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import ScreenshotSecurity from 'src/utils/screenshot-security'

export default {
  data () {
    return {
      pinDialogAction: '',
      disablePinDialogClose: false,
      securityOptionDialogStatus: 'dismiss',
      securityAuth: false,
      securityChange: null,
      pinStatus: true,
      pendingLockEnable: false, // Track if lock should be enabled after PIN setup
      appVersion: packageInfo.version,
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      enableStablhedge: this.$store.getters['global/enableStablhedge'],
      currentCountry: this.$store.getters['global/country'].code,
      repoUrl: 'https://github.com/paytaca/paytaca-app',
      enablePushNotifs: false,
      showSensitiveInfo: false,
      walletMasterFingerprint: ''
    }
  },
  components: {
    HeaderNav,
    pinDialog,
    securityOptionDialog,
    LanguageSelector,
    CountrySelector,
    CurrencySelector,
    ThemeSelector,
    AdvertisementsSettings,
    RenameDialog,
    SubscriptionStatus
  },
  computed: {
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    },
    currentWalletName () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const vault = this.$store.getters['global/getVault']
      return vault[walletIndex]?.name || 'Personal Wallet'
    },
    bchWallet () {
      const wallet = this.$store.getters['global/getWallet']('bch')
      // Return wallet if it exists, otherwise return a safe default object
      if (!wallet) {
        return {
          walletHash: '',
          derivationPath: '',
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: 0,
          subscribed: false
        }
      }
      return wallet
    },
    lockAppEnabled () {
      return this.$store.getters['global/lockApp']
    }
  },
  watch: {
    isChipnet (n, o) {
      this.$store.commit('global/toggleIsChipnet')
    },
    darkMode (newVal, oldVal) {
      this.$store.commit('darkmode/setDarkmodeSatus', newVal)
      // Save to vault for wallet-specific settings
      this.$store.commit('global/saveWalletSetting', { key: 'darkMode', value: newVal })
    },
  },
  methods: {
    getDarkModeClass,
    isHongKong,
    getWallet (type) {
      const wallet = this.$store.getters['global/getWallet'](type)
      // Return wallet if it exists, otherwise return a safe default object
      if (!wallet) {
        // Return a minimal wallet object to prevent errors
        return {
          walletHash: '',
          derivationPath: '',
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: 0,
          subscribed: false
        }
      }
      return wallet
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 200,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    async toggleLockApp (value) {
      const vm = this
      
      // If enabling lock, check if PIN exists first
      if (value) {
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const hasPin = await pinExists(walletIndex)
        
        if (!hasPin) {
          // PIN doesn't exist - prompt user to set up PIN first
          vm.$q.dialog({
            title: vm.$t('PinRequired', {}, 'PIN Required'),
            message: vm.$t('PinRequiredForLock', {}, 'A PIN must be set up before enabling app lock. This ensures you can always unlock your wallet even if biometric authentication becomes unavailable.'),
            ok: {
              label: vm.$t('SetupPin', {}, 'Set Up PIN'),
              color: 'brandblue'
            },
            cancel: {
              label: vm.$t('Cancel'),
              flat: true
            },
            persistent: true
          }).onOk(() => {
            // Mark that lock should be enabled after PIN setup
            vm.pendingLockEnable = true
            // Open PIN setup dialog
            vm.pinDialogAction = 'SET UP'
          }).onCancel(() => {
            // User cancelled - don't enable lock
            // Reset toggle to previous state (disabled)
            vm.$nextTick(() => {
              // Force update the toggle to reflect that lock is still disabled
              // The toggle component should handle this via v-model, but we ensure it's synced
            })
          })
          
          // Don't enable lock if PIN doesn't exist
          return
        }
      }
      
      // PIN exists or disabling lock - proceed with toggle
      vm.$store.commit('global/setLockApp', value)
      
      // Update screenshot security based on lock app setting
      if (vm.$q.platform.is.mobile) {
        try {
          await ScreenshotSecurity.setSecureFlag({ enabled: value })
        } catch (error) {
          console.error('[Settings] Failed to set screenshot security:', error)
        }
      }
      
      vm.$q.notify({
        message: value 
          ? vm.$t('LockAppEnabled', {}, 'App lock enabled') 
          : vm.$t('LockAppDisabled', {}, 'App lock disabled'),
        timeout: 1000,
        color: 'brandblue',
        icon: value ? 'lock' : 'lock_open'
      })
    },
    openRenameDialog () {
      const vm = this
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      vm.$q.dialog({
        component: RenameDialog,
        componentProps: {
          index: walletIndex
        }
      })
    },
    setNewPin () {
      this.securityChange = 'change-pin'
      this.pinDialogAction = 'VERIFY'
    },
    async pinDialogCallback (action = '') {
      const vm = this
      vm.pinDialogAction = ''
      if (action !== 'cancel') {
        vm.securityOptionDialogStatus = 'dismiss'
      }
      if (action === 'proceed') {
        if (vm.securityChange === 'change-pin') {
          vm.pinDialogAction = 'SET NEW'
        }
        if (vm.securityChange === 'switch-to-biometric') {
          vm.$store.commit('global/setPreferredSecurity', 'biometric')
          vm.pinStatus = false
        }
        
        // If PIN was just set up and lock is pending, enable it now
        if (vm.pendingLockEnable) {
          vm.pendingLockEnable = false
          
          // Verify PIN exists before enabling lock
          const walletIndex = vm.$store.getters['global/getWalletIndex']
          const hasPin = await pinExists(walletIndex)
          
          if (hasPin) {
            // Enable lock now that PIN is set up
            vm.$store.commit('global/setLockApp', true)
            
            // Update screenshot security
            if (vm.$q.platform.is.mobile) {
              try {
                await ScreenshotSecurity.setSecureFlag({ enabled: true })
              } catch (error) {
                console.error('[Settings] Failed to set screenshot security:', error)
              }
            }
            
            vm.$q.notify({
              message: vm.$t('LockAppEnabled', {}, 'App lock enabled'),
              timeout: 2000,
              color: 'brandblue',
              icon: 'lock'
            })
          } else {
            // PIN setup didn't complete - show error
            vm.$q.notify({
              message: vm.$t('PinSetupIncomplete', {}, 'PIN setup incomplete. Please try again.'),
              timeout: 3000,
              color: 'negative',
              icon: 'error'
            })
          }
        }
      } else if (action === 'cancel') {
        // User cancelled PIN setup - clear pending lock enable
        vm.pendingLockEnable = false
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
            vm.$store.commit('global/setPreferredSecurity', 'pin')
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
      const currentPref = this.$store.getters['global/preferredSecurity']
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
    },
    async ensureXPubKeyLoaded () {
      const walletData = this.bchWallet
      if (!walletData.xPubKey && walletData.walletHash) {
        try {
          const wallet = await loadWallet('BCH', this.$store.getters['global/getWalletIndex'])
          const isChipnet = this.$store.getters['global/isChipnet']
          const bchWallet = getWalletByNetwork(wallet, 'bch')
          const xPubKey = await bchWallet.getXPubKey()
          
          this.$store.commit('global/updateXPubKey', {
            isChipnet,
            type: 'bch',
            xPubKey: xPubKey
          })
        } catch (error) {
          console.error('Error loading xPubKey:', error)
        }
      }
    },
    confirmDeleteWallet () {
      const vm = this
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      const vault = vm.$store.getters['global/getVault']
      const walletCount = vault.filter(w => w && !w.deleted).length

      // Prevent deletion if it's the last wallet
      if (walletCount <= 1) {
        vm.$q.dialog({
          title: vm.$t('DeleteWallet'),
          message: vm.$t('CannotDeleteLastWallet', {}, 'You cannot delete your last wallet. Please create another wallet first.'),
          seamless: true,
          ok: true,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
        return
      }

      vm.$q.dialog({
        title: vm.$t('DeleteWallet'),
        message: vm.$t('DeleteWalletDescription'),
        seamless: true,
        cancel: true,
        ok: {
          label: vm.$t('DeleteWalletNow'),
          color: 'red',
          flat: true
        },
        cancel: {
          label: vm.$t('Cancel'),
          flat: true
        },
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(async () => {
        try {
          await vm.$store.dispatch('global/deleteWallet', walletIndex)
          
          // Check if there are any wallets left
          const updatedVault = vm.$store.getters['global/getVault']
          const remainingWallets = updatedVault.filter(w => w && !w.deleted).length
          
          if (remainingWallets === 0) {
            // No wallets left, redirect to wallet creation
            vm.$router.push('/wallet/create')
          } else {
            // Redirect to home page of the wallet the app switched to
            vm.$router.push('/')
          }
        } catch (error) {
          console.error('Error deleting wallet:', error)
          vm.$q.dialog({
            title: vm.$t('Error'),
            message: vm.$t('ErrorDeletingWallet', {}, 'Failed to delete wallet. Please try again.'),
            seamless: true,
            ok: true,
            class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
          })
        }
      })
    },
    async loadWalletMasterFingerprint(type) {
      const m = await getMnemonic(this.$store.getters['global/getWalletIndex'])
      if (!m) return ''
      this.walletMasterFingerprint = binToHex(
          hash160(
          deriveHdPublicNode(
            deriveHdPrivateNodeFromSeed(
              deriveSeedFromBip39Mnemonic(m)
            )).publicKey
          ).slice(0, 4)
      )
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
        // Handle UNIMPLEMENTED error gracefully (e.g., when running in web browser)
        if (error?.code === 'UNIMPLEMENTED' || error?.message?.includes('not implemented')) {
          this.securityAuth = false
          this.pinStatus = true
          // Silently handle - biometrics not available on this platform
          return
        }
        // Log other errors for debugging
        this.pinStatus = true
        console.warn('Biometric availability check error:', error)
      })
  },
  mounted () {
    const preferredSecurity = this.$store.getters['global/preferredSecurity']
    if (preferredSecurity === 'pin') {
      this.pinStatus = true
    } else {
      this.pinStatus = false
    }

    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('global/refetchWalletPreferences')
    this.ensureXPubKeyLoaded()
    this.loadWalletMasterFingerprint('bch')
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

  .glass-input {
    :deep(.q-field__control) {
      transition: all 0.3s ease;
    }
    
    :deep(.q-field__native) {
      font-weight: 500;
    }
  }
</style>
