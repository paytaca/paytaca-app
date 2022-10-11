<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
    <div>
<<<<<<< HEAD
      <header-nav title="Wallet Info" backnavpath="/apps" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
      <div :style="{ 'padding-top': $q.platform.is.ios ? '90px' : '60px'}">
=======
      <header-nav :title="$t('WalletInfo')" backnavpath="/apps" style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"></header-nav>
      <div :style="{ 'padding-top': $q.platform.is.ios ? '70px' : '60px'}">
>>>>>>> 84e6e58... Translated texts to Spanish (WIP)
        <div id="app" ref="app">
          <div class="row">
            <div class="col">
              <p class="section-title">{{ $t('BchAddresses') }}</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': darkMode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('bch').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').xPubKey)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('bch').xPubKey }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').walletHash)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('bch').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>Scan</q-item-label>
                    <q-item-label
                      :class="[
                        darkMode ? 'pt-dark-label' : 'pp-text',
                        'row items-center justify-around',
                      ]"
                      style="word-wrap: break-word;"
                    >
                      <q-btn-group spread class="q-space">
                        <q-btn
                          no-caps
                          padding="xs sm"
                          :disable="scanningBchUtxos"
                          :loading="scanningBchUtxos"
                          label="UTXO Scan"
                          @click="scanBCHUtxos()"
                        />
                        <q-btn
                          no-caps
                          padding="xs sm"
                          :disable="scanningBchAddresses"
                          :loading="scanningBchAddresses"
                          label="Address Scan"
                          @click="scanBCHAddresses()"
                        />
                      </q-btn-group>
                      <div v-if="scanningBchUtxos || scanningBchAddresses" class="text-center text-grey q-my-sm">
                        <template v-if="scanningBchUtxos && scanningBchAddresses">
                          Scanning for UTXOs and addresses
                        </template>
                        <template v-else-if="scanningBchUtxos">
                          Scanning for UTXOs
                        </template>
                        <template v-else-if="scanningBchAddresses">
                          Scanning for untracked addresses
                        </template>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">{{ $t('SlpAddresses') }}</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': darkMode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('slp').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').xPubKey)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('slp').xPubKey }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').walletHash)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('slp').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>Scan</q-item-label>
                    <q-item-label
                      :class="[
                        darkMode ? 'pt-dark-label' : 'pp-text',
                        'row items-center justify-around',
                      ]"
                      style="word-wrap: break-word;"
                    >
                      <q-btn-group spread class="q-space">
                        <q-btn
                          no-caps
                          padding="xs sm"
                          :disable="scanningSlpUtxos"
                          :loading="scanningSlpUtxos"
                          label="UTXO Scan"
                          @click="scanSLPUtxos()"
                        >
                        </q-btn>
                        <q-btn
                          no-caps
                          padding="xs sm"
                          :disable="scanningSlpAddresses"
                          :loading="scanningSlpAddresses"
                          label="Address Scan"
                          @click="scanSLPAddresses()"
                        />
                      </q-btn-group>
                      <div v-if="scanningSlpUtxos || scanningSlpAddresses" class="text-center text-grey q-my-sm">
                        <template v-if="scanningSlpUtxos && scanningSlpAddresses">
                          Scanning for UTXOs and addresses
                        </template>
                        <template v-else-if="scanningSlpUtxos">
                          Scanning for UTXOs
                        </template>
                        <template v-else-if="scanningSlpAddresses">
                          Scanning for untracked addresses
                        </template>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">{{ $t('SmartBchAddresses') }}</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': darkMode}">
                <q-item clickable v-ripple>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']">{{ getWallet('sbch').derivationPath }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="copyToClipboard(getWallet('sbch').walletHash)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ getWallet('sbch').walletHash }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="sbchLnsName" clickable v-ripple @click="copyToClipboard(sbchLnsName)">
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>LNS Name</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="word-wrap: break-word;">{{ sbchLnsName }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      type="a"
                      flat
                      padding="none"
                      icon="open_in_new"
                      :href="`https://app.bch.domains/name/${sbchLnsName}/details`"
                      target="_blank"
                      @click.stop
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <p class="section-title">{{ $t('MnemonicBackupPhrase') }}</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': darkMode}">
                <q-item clickable @click="executeSecurityChecking">
                  <q-item-section>
                    <q-item-label :class="[darkMode && !showMnemonic ? 'blurry-text-d' : darkMode ? 'pp-text-d' : '', !darkMode && !showMnemonic ? 'blurry-text' : !darkMode ? 'pp-text' : '']">{{ mnemonic }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="showMnemonic" :class="darkMode ? 'text-red-5' : 'text-red-6'" class="q-ma-sm">
                <span class="text-weight-medium">
                  {{ $t('SeedPhraseCaution1') }}
                </span>
                <br>{{ $t('SeedPhraseCaution2') }}
              </div>
            </div>
          </div>
          <div class="row" style="margin-top: 20px; margin-bottom: 50px;">
            <div class="col">
            <p class="section-title">{{ $t('AboutTheApp') }}</p>
              <q-list bordered separator class="list" :class="{'pt-dark-card': darkMode}">
                <q-item>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Version') }}</q-item-label>
                    <q-item-label :class="[darkMode ? 'pt-dark-label' : 'pp-text']">v{{ appVersion }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('OpenSourceCode') }}</q-item-label>
                    <q-item-label>
                      <a href="https://github.com/paytaca/paytaca-app" target="_blank" :class="darkMode ? 'text-grad' : 'text-blue-9'" style="text-decoration: none;">
                        https://github.com/paytaca/paytaca-app
                      </a>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
      </div>
    </div>

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="toggleMnemonicDisplay" />
    <biometricWarningAttmepts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="setwarningAttemptsStatus" />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import pinDialog from '../../components/pin'
import biometricWarningAttmepts from '../../components/authOption/biometric-warning-attempt.vue'
import { getMnemonic, Wallet } from '../../wallet'
import { NativeBiometric } from 'capacitor-native-biometric'
import packageInfo from '../../../package.json'
import { Plugins } from '@capacitor/core'
import { markRaw } from '@vue/reactivity'

const { SecureStoragePlugin } = Plugins

export default {
  name: 'app-wallet-info',
  components: {
    HeaderNav,
    pinDialog,
    biometricWarningAttmepts
  },
  data () {
    return {
      mnemonic: '',
      showMnemonic: false,
      appVersion: packageInfo.version,
      sbchLnsName: '',
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',
      darkMode: this.$store.getters['darkmode/getStatus'],

      wallet: null,
      scanningBchUtxos: false,
      scanningSlpUtxos: false,

      scanningBchAddresses: false,
      scanningSlpAddresses: false,

      bchAddressScanResponseDialog: null,
      slpAddressScanResponseDialog: null,
    }
  },
  methods: {
    loadWallet () {
      const vm = this
      return getMnemonic()
        .then(function (mnemonic) {
          const wallet = new Wallet(mnemonic, 'BCH')
          vm.wallet = markRaw(wallet)
        })
    },
    async scanBCHUtxos() {
      if (!this.wallet) await this.loadWallet()
      const walletHash = this.wallet.BCH.getWalletHash()

      this.scanningBchUtxos = true
      this.wallet.BCH.scanUtxos()
        .then(() => {
          this.$q.notify({
            message: 'Scan complete',
            caption: 'UTXO scan for BCH wallet complete',
            closeBtn: true,
            icon: 'mdi-clipboard-check',
            color: 'blue-9'
          })
        })
        .finally(() => {
          this.scanningBchUtxos = false
        })
    },
    async scanSLPUtxos() {
      if (!this.wallet) await this.loadWallet()

      this.scanningSlpUtxos = true
      this.wallet.SLP.scanUtxos()
        .then(() => {
          this.$q.notify({
            message: 'Scan complete',
            caption: 'UTXO scan for SLP wallet complete',
            closeBtn: true,
            icon: 'mdi-clipboard-check',
            color: 'blue-9'
          })
        })
        .finally(() => {
          this.scanningSlpUtxos = false
        })
    },
    async scanBCHAddresses() {
      if (!this.wallet) await this.loadWallet()
      const lastAddressFromStore = this.$store.getters['global/getWallet']('bch')?.lastAddress
      const lastAddressIndexFromStore = this.$store.getters['global/getWallet']('bch')?.lastAddressIndex
      const lastAddressIndex = (Number.isSafeInteger(lastAddressIndexFromStore) && lastAddressIndexFromStore >= 0)
        ? lastAddressIndexFromStore
        : -1
      const count = 5

      this.scanningBchAddresses = true
      this.wallet.BCH.scanAddresses({ startIndex: lastAddressIndex+1, count: count })
        .then(response => {
          if (!response.success) return Promise.reject(response)
          if (!Array.isArray(response?.subscriptionResponses)) return Promise.reject(response)

          const subscribedAddressSets = response.subscriptionResponses
            .filter(subscriptionResponse => subscriptionResponse?.success)
            .map(subscriptionResponse => subscriptionResponse?.address_set)
            .filter(addressSet => {
              if (!Number.isSafeInteger(addressSet.address_index)) return false
              if (!addressSet.addresses.receiving) return false
              if (!addressSet.addresses.change) return false
              return true
            })

          // extract address set with greatest address_index
          const latestAddressSet = subscribedAddressSets
            .reduce((_latest, addressSet) => {
              if (addressSet.address_index < _latest?.address_index) return _latest
              return addressSet
            }, null)

          if (latestAddressSet?.address_index >= lastAddressIndex) {
            this.$store.commit('global/generateNewAddressSet', {
              type: 'bch',
              lastAddress: latestAddressSet.addresses.receiving,
              lastChangeAddress: latestAddressSet.addresses.change,
              lastAddressIndex: latestAddressSet.address_index
            })
            if (latestAddressSet.addresses.receiving !== lastAddressFromStore) {
              this.bchAddressScanResponseDialog?.hide?.()
              this.bchAddressScanResponseDialog = this.$q.dialog({
                title: 'BCH address scan complete',
                html: true,
                message: [
                  `Latest address is now:<br/>`,
                  latestAddressSet.addresses.receiving,
                  lastAddressFromStore ? `<br/><br/>Previous:<br/>${lastAddressFromStore}` : '',
                ].join(''), 
                ok: true,
                class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
                style: 'word-break:break-word;',
              })
            }
          }
          return Promise.resolve({
            scanMore: subscribedAddressSets?.length >= count
          })
        })
        .then(postScanResponse => {
          if (postScanResponse?.scanMore) this.scanBCHAddresses()
        })
        .finally(() => {
          this.scanningBchAddresses = false
        })
    },
    async scanSLPAddresses() {
      if (!this.wallet) await this.loadWallet()
      const lastAddressFromStore = this.$store.getters['global/getWallet']('slp')?.lastAddress
      const lastAddressIndexFromStore = this.$store.getters['global/getWallet']('slp')?.lastAddressIndex
      const lastAddressIndex = (Number.isSafeInteger(lastAddressIndexFromStore) && lastAddressIndexFromStore >= 0)
        ? lastAddressIndexFromStore
        : -1
      const count = 5

      this.scanningSlpAddresses = true
      this.wallet.SLP.scanAddresses({ startIndex: lastAddressIndex+1, count: count })
        .then(response => {
          if (!response.success) return Promise.reject(response)
          if (!Array.isArray(response?.subscriptionResponses)) return Promise.reject(response)

          const subscribedAddressSets = response.subscriptionResponses
            .filter(subscriptionResponse => subscriptionResponse?.success)
            .map(subscriptionResponse => subscriptionResponse?.address_set)
            .filter(addressSet => {
              if (!Number.isSafeInteger(addressSet.address_index)) return false
              if (!addressSet.addresses.receiving) return false
              if (!addressSet.addresses.change) return false
              return true
            })

          // extract address set with greatest address_index
          const latestAddressSet = subscribedAddressSets
            .reduce((_latest, addressSet) => {
              if (addressSet.address_index < _latest?.address_index) return _latest
              return addressSet
            }, null)

          if (latestAddressSet?.address_index >= lastAddressIndex) {
            this.$store.commit('global/generateNewAddressSet', {
              type: 'slp',
              lastAddress: latestAddressSet.addresses.receiving,
              lastChangeAddress: latestAddressSet.addresses.change,
              lastAddressIndex: latestAddressSet.address_index
            })

            if (latestAddressSet.addresses.receiving !== lastAddressFromStore) {
              this.slpAddressScanResponseDialog?.hide?.()
              this.slpAddressScanResponseDialog = this.$q.dialog({
                title: 'SLP address scan complete',
                html: true,
                message: [
                  `Latest address is now:<br/>`,
                  latestAddressSet.addresses.receiving,
                  lastAddressFromStore ? `<br/><br/>Previous:<br/>${lastAddressFromStore}` : '',
                ].join(''),
                ok: true,
                class: this.darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
                style: 'word-break:break-word;',
              })
            }
          }
          return Promise.resolve({
            scanMore: subscribedAddressSets?.length >= count
          })
        })
        .then(postScanResponse => {
          if (postScanResponse?.scanMore) this.scanBCHAddresses()
        })
        .finally(() => {
          this.scanningSlpAddresses = false
        })
    },
    executeSecurityChecking () {
      const vm = this
      if (vm.showMnemonic === false) {
        SecureStoragePlugin.get({ key: 'pin' })
          .then(() => {
            setTimeout(() => {
              if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
                vm.pinDialogAction = 'VERIFY'
              } else {
                vm.verifyBiometric()
              }
            }, 500)
          })
          .catch(() => {
            setTimeout(() => {
              vm.verifyBiometric()
            }, 500)
          })
      } else {
        vm.toggleMnemonicDisplay('proceed')
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
            this.toggleMnemonicDisplay('proceed')
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            this.showMnemonic = false
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        }
        )
    },
    setwarningAttemptsStatus () {
      this.verifyBiometric()
    },
    updateSbchLnsName () {
      const { lastAddress: address } = this.getWallet('sbch')
      if (!address) return

      return this.$store.dispatch('lns/resolveAddress', { address: address })
        .then(response => {
          if (response && response.name) {
            this.sbchLnsName = response.name
            return Promise.resolve(response)
          }
          this.sbchLnsName = ''
          return Promise.reject()
        })
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
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
    toggleMnemonicDisplay (action) {
      if (action === 'proceed') {
        this.pinDialogAction = ''
        this.showMnemonic = !this.showMnemonic
      } else {
        this.pinDialogAction = ''
      }
    }
  },
  mounted () {
    const divHeight = screen.availHeight - 120
    this.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')
    this.updateSbchLnsName()
  },
  created () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.mnemonic = mnemonic
    })
  }
}
</script>

<style scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
  }
  .text-gray {
    color: gray;
  }
  .section-title {
    font-size: 18px;
    margin-left: 10px;
    color: #ed5f59;
    font-weight: 400;
  }
  .list {
    background-color: #fff;
    border-radius: 12px;
    z-index: 1 !important;
  }
  .blurry-text {
    color: transparent;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
  }
  .blurry-text-d {
    color: transparent;
    text-shadow: 0 0 5px rgba(255,255,255,0.5);
  }
  .pp-text {
    color: #000 !important;
  }
  .pp-text-d {
    color: #fff !important;
  }
</style>
