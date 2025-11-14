<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('WalletInfo')" backnavpath="/apps" class="header-nav header-nav apps-header" />
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('WalletManagement', {}, 'Wallet Management') }}</p>
        <q-list class="pt-card wallet-info-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletName') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                {{ currentWalletName }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :label="$t('Rename')"
                @click="openRenameDialog()"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('BchAddresses') }}</p>
        <q-list class="pt-card wallet-info-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple>
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                {{ getWallet('bch').derivationPath }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').xPubKey)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWallet('bch').xPubKey }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWalletMasterFingerprint('bch'))">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('MasterFingerprint') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWalletMasterFingerprint('bch') }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWallet('bch').walletHash)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWallet('bch').walletHash }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('UtxoScan') }}
              </q-item-label>
              <q-banner
                v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.completedAt"
                dense
                class="rounded-borders q-mt-sm pt-card-2 text-bow"
                :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
              >
                {{ $t('UTXOScanComplete') }} {{ formatTimestampToText(bchUtxoScanTaskInfo?.completedAt) }}
                <template v-slot:action>
                  <q-btn
                    no-caps flat
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('Dismiss')"
                    @click="$store.commit('global/removeUtxoScanTask', bchUtxoScanTaskInfo?.walletHash)"
                  />
                </template>
              </q-banner>
              <div v-if="bchUtxoScanOngoing" class="text-center text-grey q-mt-sm">
                <template v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.queueInfo?.time_start">
                  {{ $t('UTXOScanOngoing') }} {{ formatRelativeTime(bchUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
                </template>
                <template v-else>
                  {{ $t('ScanningForUtxos') }}
                </template>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="bchUtxoScanOngoing"
                :loading="bchUtxoScanOngoing"
                :label="$t('Scan')"
                @click="scanBCHUtxos()"
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('AddressScan') }}
              </q-item-label>
              <div v-if="scanningBchAddresses" class="text-center text-grey q-mt-sm">
                {{ $t('ScanningForUntrackedAddr') }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="scanningBchAddresses"
                :loading="scanningBchAddresses"
                :label="$t('Scan')"
                @click="scanBCHAddresses()"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-if="enableSLP" class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('SlpAddresses') }}</p>
        <q-list class="pt-card wallet-info-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple>
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                {{ getWallet('slp').derivationPath }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').xPubKey)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWallet('slp').xPubKey }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWallet('slp').walletHash)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWallet('slp').walletHash }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('UtxoScan') }}
              </q-item-label>
              <q-banner
                v-if="slpUtxoScanTaskInfo?.taskId && slpUtxoScanTaskInfo?.completedAt"
                dense
                class="rounded-borders q-mt-sm pt-card-2 text-bow"
                :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
              >
                {{ $t('UTXOScanComplete') }} {{ formatTimestampToText(slpUtxoScanTaskInfo?.completedAt) }}
                <template v-slot:action>
                  <q-btn
                    no-caps flat
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('Dismiss')"
                    @click="$store.commit('global/removeUtxoScanTask', slpUtxoScanTaskInfo?.walletHash)"
                  />
                </template>
              </q-banner>
              <div v-if="slpUtxoScanOngoing" class="text-center text-grey q-mt-sm">
                <template v-if="slpUtxoScanTaskInfo?.taskId && slpUtxoScanTaskInfo?.queueInfo?.time_start">
                  {{ $t('UTXOScanOngoing') }} {{ formatRelativeTime(slpUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
                </template>
                <template v-else>
                  {{ $t('ScanningForUtxos') }}
                </template>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="slpUtxoScanOngoing"
                :loading="slpUtxoScanOngoing"
                :label="$t('Scan')"
                @click="scanSLPUtxos()"
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('AddressScan') }}
              </q-item-label>
              <div v-if="scanningSlpAddresses" class="text-center text-grey q-mt-sm">
                {{ $t('ScanningForUntrackedAddr') }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="scanningSlpAddresses"
                :loading="scanningSlpAddresses"
                :label="$t('Scan')"
                @click="scanSLPAddresses()"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-if="enableSmartBCH" class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('SmartBchAddresses') }}</p>
        <q-list class="pt-card wallet-info-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple>
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
                {{ getWallet('sbch').derivationPath }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="copyToClipboard(getWallet('sbch').walletHash)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ getWallet('sbch').walletHash }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="sbchLnsName" clickable v-ripple @click="copyToClipboard(sbchLnsName)">
            <q-item-section>
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>LNS Name</q-item-label>
              <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
                {{ sbchLnsName }}
              </q-item-label>
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
      <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('WalletDeletion') }}</p>
        <q-list class="pt-card wallet-info-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-btn color="red" style="width: 100%;" @click="showDeleteDialog()" :disable="disableDeleteButton">
                {{ $t('DeleteWalletNow') }}
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getMnemonic, Wallet } from '../../wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { markRaw } from '@vue/reactivity'
import ago from 's-ago'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { marketplacePushNotificationsManager } from 'src/marketplace/push-notifications'
import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog'
import RenameDialog from 'src/components/multi-wallet/renameDialog.vue'
import { binToHex, deriveHdPrivateNodeFromSeed, deriveHdPublicNode, hash160 } from '@bitauth/libauth'
import { deriveSeedFromBip39Mnemonic } from 'bitauth-libauth-v3' 
export default {
  name: 'app-wallet-info',
  components: {
    HeaderNav,
    RenameDialog
  },
  data () {
    return {
      sbchLnsName: '',

      wallet: null,
      scanningBchUtxos: false,
      scanningSlpUtxos: false,

      scanningBchAddresses: false,
      scanningSlpAddresses: false,

      bchAddressScanResponseDialog: null,
      slpAddressScanResponseDialog: null,

      prevUtxoStatusUpdateTimeout: null,

      disableDeleteButton: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    enableSLP () {
      return this.$store.getters['global/enableSLP']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    currentWalletName () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const vault = this.$store.getters['global/getVault']
      return vault[walletIndex]?.name || `Personal Wallet #${walletIndex + 1}`
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
    }
  },
  methods: {
    getDarkModeClass,
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
    deletingWalletDialog () {
      return this.$q.dialog({
        component: LoadingWalletDialog,
        componentProps: {
          loadingText: `${this.$t('DeletingWallet')}`
        }
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
                seamless: true,
                class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
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
                seamless: true,
                class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
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
    updateSbchLnsName () {
      const sbchWallet = this.getWallet('sbch')
      if (!sbchWallet) return
      
      const { lastAddress: address } = sbchWallet
      if (!address) return

      return this.$store.dispatch('lns/resolveAddress', { address: address })
        .then(response => {
          if (response && response.name) {
            this.sbchLnsName = response.name
            return Promise.resolve(response)
          }
          this.sbchLnsName = ''
        })
        .catch(error => {
          // Handle network connection errors gracefully
          console.error('LNS resolution error:', error)
          this.sbchLnsName = ''
        })
    },
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
    getWalletMasterFingerprint(type) {
      const w = this.$store.getters['global/getWallet'](type)

      console.log('w', w)
      console.log('w', this.wallet)
      if (!this.wallet?.mnemonic) return 
      return binToHex(
          hash160(
          deriveHdPublicNode(
            deriveHdPrivateNodeFromSeed(
              deriveSeedFromBip39Mnemonic(this.wallet.mnemonic)
            )).publicKey
          ).slice(0, 4)
      )
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
    showDeleteDialog () {
      const vm = this
      vm.disableDeleteButton = true
      vm.$q.dialog({
        title: this.$t('DeleteWallet'),
        message: this.$t('DeleteWalletDescription'),
        dark: true,
        cancel: this.$t('Cancel'),
        seamless: true,
        ok: this.$t('Yes')
      }).onOk(() => {
        vm.deletingWalletDialog()
        vm.deleteWallet(vm)
      }).onCancel(() => {
        vm.disableDeleteButton = false
      })
    },
    switchWallet (index) {
      const vm = this
      const currentWalletIndex = this.$store.getters['global/getWalletIndex']
      if (index !== currentWalletIndex) {
        const asset = this.$store.getters['assets/getAllAssets']
        vm.$store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex, snapshot: asset })
        vm.$store.commit('assets/updatedCurrentAssets', index)

        vm.$store.dispatch('global/switchWallet', index).then(function () {
          vm.$router.push('/')
          setTimeout(() => { location.reload() }, 500)
        })
      }
    },
    async deleteWallet (vm) {
      if (!vm.wallet) await vm.loadWallet()
      if (vm.$q.platform.is.mobile) {
        const walletHashes = [
          vm.wallet.BCH.walletHash,
          vm.wallet.BCH_CHIP.walletHash,
          vm.wallet.SLP.walletHash,
          vm.wallet.SLP_TEST.walletHash,
          vm.wallet.sBCH.walletHash,
        ]
        const marketplaceCustomerRef = await vm.$store.dispatch('marketplace/getCartRef')
        console.log({ marketplaceCustomerRef })

        const promises = [
          vm.$pushNotifications.unsubscribe(walletHashes)?.catch(console.error)
        ]
        if (marketplaceCustomerRef) {
          promises.push(
            marketplacePushNotificationsManager.unsubscribe({ customerRef: marketplaceCustomerRef }),
          )
        }
        await Promise.all(promises)
      }
      const currentWalletIndex = vm.$store.getters['global/getWalletIndex']
      vm.$store.dispatch('global/deleteWallet', currentWalletIndex).then(() => {
      }).then(function () {
        const vault = vm.$store.state.global.vault
        const undeletedWallets = []
        const vaultCheck = vault.filter(function (wallet, index) {
          if (wallet.deleted !== true) {
            undeletedWallets.push(index)
            return wallet
          }
        })
        if (vaultCheck.length === 0) {
          vm.$store.commit('global/clearVault')
          vm.$router.push('/accounts')
          setTimeout(() => { location.reload() }, 500)
        } else {
          vm.switchWallet(undeletedWallets[0])
        }
      })
    }
  },
  beforeUnmount() {
    clearTimeout(this.prevUtxoStatusUpdateTimeout)
  },
  mounted () {
    this.loadWallet().then(() => this.updateUtxoScanTasksStatus())
    this.updateSbchLnsName()
  }
}
</script>

<style lang="scss" scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
  }

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

  .wallet-info-list {
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
      .wallet-info-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .wallet-info-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }
</style>
