<template>
  <div id="app-container" :class="{'pt-dark': darkMode}">
    <div>
      <header-nav :title="$t('WalletInfo')" backnavpath="/apps" />
      <div :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
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
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Scan') }}</q-item-label>
                    <q-banner
                      v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.completedAt"
                      dense
                      :class="[
                        darkMode ? 'pt-dark text-white' : 'bg-grey-2',
                        'rounded-borders q-mt-sm q-mb-md',
                      ]"
                    >
                      UTXO scan completed at {{ formatTimestampToText(bchUtxoScanTaskInfo?.completedAt) }}
                      <template v-slot:action>
                        <q-btn
                          no-caps flat
                          color="blue-9" :label="$t('Dismiss')"
                          @click="$store.commit('global/removeUtxoScanTask', bchUtxoScanTaskInfo?.walletHash)"
                        />
                      </template>
                    </q-banner>
                    <q-item-label
                      :class="[
                        darkMode ? 'pt-dark-label' : 'pp-text',
                        'row items-center justify-around q-mb-sm',
                      ]"
                      style="word-wrap: break-word;"
                    >
                      <q-btn-group rounded spread class="q-space">
                        <q-btn
                          no-caps
                          color="blue-9"
                          padding="xs sm"
                          :disable="bchUtxoScanOngoing"
                          :loading="bchUtxoScanOngoing"
                          :label="$t('UtxoScan')"
                          @click="scanBCHUtxos()"
                        />
                        <q-btn
                          no-caps
                          color="blue-9"
                          padding="xs sm"
                          :disable="scanningBchAddresses"
                          :loading="scanningBchAddresses"
                          :label="$t('AddressScan')"
                          @click="scanBCHAddresses()"
                        />
                      </q-btn-group>
                      <div v-if="bchUtxoScanOngoing || scanningBchAddresses" class="text-center text-grey q-my-sm">
                        <template v-if="bchUtxoScanOngoing && scanningBchAddresses">
                          {{ $t('ScanningForUtxosAndAddr') }}
                        </template>
                        <template v-else-if="bchUtxoScanOngoing">
                          <template v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.queueInfo?.time_start">
                            UTXO scan ongoing, started {{ formatRelativeTime(bchUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
                          </template>
                          <template>
                            {{ $t('ScanningForUtxos') }}
                          </template>
                        </template>
                        <template v-else-if="scanningBchAddresses">
                          {{ $t('ScanningForUntrackedAddr') }}
                        </template>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <!-- {{ bchUtxoScanTaskInfo }}
            {{ bchUtxoScanOngoing }} -->
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
                    <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Scan') }}</q-item-label>
                    <q-banner
                      v-if="slpUtxoScanTaskInfo?.taskId && slpUtxoScanTaskInfo?.completedAt"
                      dense
                      :class="[
                        darkMode ? 'pt-dark text-white' : 'bg-grey-2',
                        'rounded-borders q-mt-sm q-mb-md',
                      ]"
                    >
                      UTXO scan completed at {{ formatTimestampToText(slpUtxoScanTaskInfo?.completedAt) }}
                      <template v-slot:action>
                        <q-btn
                          no-caps flat
                          color="blue-9" :label="$t('Dismiss')"
                          @click="$store.commit('global/removeUtxoScanTask', slpUtxoScanTaskInfo?.walletHash)"
                        />
                      </template>
                    </q-banner>
                    <q-item-label
                      :class="[
                        darkMode ? 'pt-dark-label' : 'pp-text',
                        'row items-center justify-around q-mb-sm',
                      ]"
                      style="word-wrap: break-word;"
                    >
                      <q-btn-group rounded spread class="q-space">
                        <q-btn
                          no-caps
                          color="blue-9"
                          padding="xs sm"
                          :disable="slpUtxoScanOngoing"
                          :loading="slpUtxoScanOngoing"
                          :label="$t('UtxoScan')"
                          @click="scanSLPUtxos()"
                        />
                        <q-btn
                          no-caps
                          color="blue-9"
                          padding="xs sm"
                          :disable="scanningSlpAddresses"
                          :loading="scanningSlpAddresses"
                          :label="$t('AddressScan')"
                          @click="scanSLPAddresses()"
                        />
                      </q-btn-group>
                      <div v-if="slpUtxoScanOngoing || scanningSlpAddresses" class="text-center text-grey q-my-sm">
                        <template v-if="slpUtxoScanOngoing && scanningSlpAddresses">
                          {{ $t('ScanningForUtxosAndAddr') }}
                        </template>
                        <template v-else-if="slpUtxoScanOngoing">
                          <template v-if="slpUtxoScanTaskInfo?.taskId && slpUtxoScanTaskInfo?.queueInfo?.time_start">
                            UTXO scan ongoing, started {{ formatRelativeTime(slpUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
                          </template>
                          <template>
                            {{ $t('ScanningForUtxos') }}
                          </template>
                        </template>
                        <template v-else-if="scanningSlpAddresses">
                          {{ $t('ScanningForUntrackedAddr') }}
                        </template>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <!-- {{ slpUtxoScanTaskInfo }}
            {{ slpUtxoScanOngoing }} -->
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
                  <q-item-section class="text-black">
                    <q-item-label :class="{'text-white': darkMode}" v-if="showMnemonic">{{ mnemonicDisplay }}</q-item-label>
                    <q-item-label class="text-center" :class="{'text-white': darkMode}" v-else>{{ $t('ClickToReveal') }}</q-item-label>
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
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { Plugins } from '@capacitor/core'
import { markRaw } from '@vue/reactivity'
import ago from 's-ago'

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
      sbchLnsName: '',
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',

      wallet: null,
      scanningBchUtxos: false,
      scanningSlpUtxos: false,

      scanningBchAddresses: false,
      scanningSlpAddresses: false,

      bchAddressScanResponseDialog: null,
      slpAddressScanResponseDialog: null,

      prevUtxoStatusUpdateTimeout: null,
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    bchUtxoScanTaskInfo() {
      let walletHash = this.getWallet('bch')?.walletHash
      if (this.wallet) walletHash = getWalletByNetwork(this.wallet, 'bch').walletHash

      const utxoScanInfo = this.$store.getters['global/getUtxoScanInfo'](walletHash)
      if (utxoScanInfo) {
        // if task was added 1 hour ago, consider as not scanning anymore
        const expiry = Date.now() - (60 * 60 * 1000 )
        utxoScanInfo.expired = expiry > utxoScanInfo.timestamp

        utxoScanInfo.walletHash = walletHash
      }
      return utxoScanInfo
    },
    slpUtxoScanTaskInfo() {
      let walletHash = this.getWallet('slp')?.walletHash
      if (this.wallet) walletHash = this.wallet.SLP.walletHash

      const utxoScanInfo = this.$store.getters['global/getUtxoScanInfo'](walletHash)
      if (utxoScanInfo) {
        // if task was added 1 hour ago, consider as not scanning anymore
        const expiry = Date.now() - (60 * 60 * 1000 )
        utxoScanInfo.expired = expiry > utxoScanInfo.timestamp

        utxoScanInfo.walletHash = walletHash
      }
      return utxoScanInfo
    },
    bchUtxoScanOngoing() {
      if (this.scanningBchUtxos) return true
      if (this.bchUtxoScanTaskInfo?.taskId) {
        if (this.bchUtxoScanTaskInfo.completedAt) return false
        if (this.bchUtxoScanTaskInfo.expired) return false
        return true
      }
      return false
    },
    slpUtxoScanOngoing() {
      if (this.scanningBchUtxos) return true
      if (this.slpUtxoScanTaskInfo?.taskId) {
        if (this.slpUtxoScanTaskInfo.completedAt) return false
        if (this.slpUtxoScanTaskInfo.expired) return false
        return true
      }
      return false
    },
    mnemonicDisplay() {
      if (this.showMnemonic) {
        return this.mnemonic
      } else {
        const wordList = [
          'church',
          'zebra',
          'tunnel',
          'cactus',
          'brake',
          'juggle',
          'truffle',
          'vortex',
          'glimmer',
          'grind',
          'silver',
          'patience'
        ]
        return wordList.join(' ')
      }
    }
  },
  methods: {
    formatTimestampToText(timestamp) {
      const dateObj = new Date(timestamp)
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
    },
    formatRelativeTime (date) {
      return ago(new Date(date))
    },
    loadWallet () {
      const vm = this
      return getMnemonic(vm.$store.getters['global/getWalletIndex'])
        .then(function (mnemonic) {
          const wallet = new Wallet(mnemonic, 'BCH')
          vm.wallet = markRaw(wallet)
        })
    },
    updateUtxoScanTasksStatus(nextUpdate=5*1000, age=0) {
      const bchWalletHash = getWalletByNetwork(this.wallet, 'bch').getWalletHash()  
      const slpWalletHash = this.wallet.SLP.getWalletHash()  
      
      const updateScanPromises = [
        this.$store.dispatch('global/updateUtxoScanTaskStatus', { walletHash: bchWalletHash, age: age }),
        this.$store.dispatch('global/updateUtxoScanTaskStatus', { walletHash: slpWalletHash, age: age }),
      ]

      Promise.all(updateScanPromises)
        .finally(() => {
          if (Number.isSafeInteger(nextUpdate)) {
            clearTimeout(this.prevUtxoStatusUpdateTimeout)
            this.prevUtxoStatusUpdateTimeout = setTimeout(
              () => this.updateUtxoScanTasksStatus(nextUpdate),
              nextUpdate,
            )
          }
        })
    },
    async scanBCHUtxos() {
      if (!this.wallet) await this.loadWallet()

      this.scanningBchUtxos = true
      getWalletByNetwork(this.wallet, 'bch').scanUtxos({ background: true })
        .then(response => {
          if (response?.data?.task_id) {
            this.$store.commit('global/setUtxoScanTask', {
              walletHash: getWalletByNetwork(this.wallet, 'bch').getWalletHash(),
              taskId: response.data.task_id,
            })
            this.updateUtxoScanTasksStatus()
          }
        })
        .finally(() => {
          this.scanningBchUtxos = false
        })
    },
    async scanSLPUtxos() {
      if (!this.wallet) await this.loadWallet()

      this.scanningSlpUtxos = true
      this.wallet.SLP.scanUtxos({ background: true })
        .then(response => {
          if (response?.data?.task_id) {
            this.$store.commit('global/setUtxoScanTask', {
              walletHash: this.wallet.SLP.getWalletHash(),
              taskId: response.data.task_id,
            })
            this.updateUtxoScanTasksStatus()
          }
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
      getWalletByNetwork(this.wallet, 'bch').scanAddresses({ startIndex: lastAddressIndex+1, count: count })
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
          // return Promise.reject()
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
  beforeUnmount() {
    clearTimeout(this.prevUtxoStatusUpdateTimeout)
  },
  mounted () {
    this.loadWallet().then(() => this.updateUtxoScanTasksStatus())
    const divHeight = screen.availHeight - 120
    this.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')
    this.updateSbchLnsName()
  },
  created () {
    const vm = this
    getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
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
