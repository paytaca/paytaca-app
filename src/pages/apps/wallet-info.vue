<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('WalletInfo')" backnavpath="/apps" class="apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <div class="col-12 q-px-lg q-mt-lg">
        <p class="section-title">{{ $t('BchAddresses') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple style="padding-top: 15px">
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
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Scan') }}</q-item-label>
              <q-banner
                v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.completedAt"
                dense
                class="rounded-borders q-mt-sm q-mb-md pt-card-2 text-bow"
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
              <q-item-label
                class="row items-center justify-around q-mb-sm pt-label"
                :class="getDarkModeClass(darkMode)"
                style="word-wrap: break-word;"
              >
                <q-btn-group rounded spread class="q-space">
                  <q-btn
                    no-caps
                    padding="xs sm"
                    class="button"
                    :disable="bchUtxoScanOngoing"
                    :loading="bchUtxoScanOngoing"
                    :label="$t('UtxoScan')"
                    @click="scanBCHUtxos()"
                  />
                  <q-btn
                    no-caps
                    padding="xs sm"
                    class="button"
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
                      {{ $t('UTXOScanOngoing') }} {{ formatRelativeTime(bchUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
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
      <div class="col-12 q-px-lg q-mt-md">
        <p class="section-title">{{ $t('SlpAddresses') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple style="padding-top: 15px">
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
              <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('Scan') }}</q-item-label>
              <q-banner
                v-if="slpUtxoScanTaskInfo?.taskId && slpUtxoScanTaskInfo?.completedAt"
                dense
                class="rounded-borders q-mt-sm q-mb-md pt-card-2 text-bow"
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
              <q-item-label
                class="row items-center justify-around q-mb-sm pt-label"
                :class="getDarkModeClass(darkMode)"
                style="word-wrap: break-word;"
              >
                <q-btn-group rounded spread class="q-space">
                  <q-btn
                    no-caps
                    padding="xs sm"
                    class="button"
                    :disable="slpUtxoScanOngoing"
                    :loading="slpUtxoScanOngoing"
                    :label="$t('UtxoScan')"
                    @click="scanSLPUtxos()"
                  />
                  <q-btn
                    no-caps
                    padding="xs sm"
                    class="button"
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
                      {{ $t('UTXOScanOngoing') }} {{ formatRelativeTime(slpUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
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
      <div class="col-12 q-px-lg q-mt-md">
        <p class="section-title">{{ $t('SmartBchAddresses') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)" style="padding: 5px 0;">
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
      <div class="col-12 q-px-lg q-mt-md q-mb-lg">
        <p class="section-title">{{ $t('WalletDeletion') }}</p>
        <q-btn color="red" style="width: 100%;" @click="showDeleteDialog()" :disable="disableDeleteButton">
          {{ $t('DeleteWalletNow') }}
        </q-btn>
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

export default {
  name: 'app-wallet-info',
  components: {
    HeaderNav
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
      const { lastAddress: address } = this.getWallet('sbch')
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
          setTimeout(() => { location.reload() }, 1500)
        })
      }
    },
    async deleteWallet (vm) {
      console.log('[deleteWallet] Component method called')
      
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
      console.log('[deleteWallet] Component - Current wallet index before deletion:', currentWalletIndex)
      console.log('[deleteWallet] Component - Current vault before deletion:', vm.$store.state.global.vault)
      
      try {
        // The deleteWallet action now handles switching to the next available wallet
        console.log('[deleteWallet] Component - Calling deleteWallet action...')
        await vm.$store.dispatch('global/deleteWallet', currentWalletIndex)
        console.log('[deleteWallet] Component - Action completed successfully')
        
        // Check if there are any wallets left
        const vault = vm.$store.state.global.vault
        const undeletedWallets = vault.filter(wallet => wallet && wallet.deleted !== true)
        console.log('[deleteWallet] Component - Undeleted wallets after action:', undeletedWallets)
        console.log('[deleteWallet] Component - Current wallet index after action:', vm.$store.getters['global/getWalletIndex'])
        
        if (undeletedWallets.length === 0) {
          // No wallets left, go to accounts page
          console.log('[deleteWallet] Component - No wallets left, going to accounts page')
          vm.$store.commit('global/clearVault')
          vm.$router.push('/accounts')
          setTimeout(() => { location.reload() }, 1500)
        } else {
          // The action should have already switched to the first available wallet
          // Just reload to ensure everything is properly updated
          console.log('[deleteWallet] Component - Wallets remain, reloading page')
          vm.$router.push('/')
          setTimeout(() => { location.reload() }, 1500)
        }
      } catch (error) {
        console.error('[deleteWallet] Component - Error during wallet deletion:', error)
        vm.$q.notify({
          color: 'negative',
          message: 'Failed to delete wallet. Please try again.',
          icon: 'error'
        })
      }
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

<style scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
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
</style>
