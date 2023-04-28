<template>
  <div class="scroll-y" style="background-color: #ECF3F3;" :class="{'pt-dark': darkMode}">

    <startPage v-if="startPageStatus" v-on:logIn="logIn" />

    <div v-else>
      <q-pull-to-refresh @refresh="refresh">
        <div ref="fixedSection" class="fixed-container" :class="{'pt-dark': darkMode}" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
          <v-offline @detected-condition="onConnectivityChange">
            <q-banner v-if="$store.state.global.online === false" class="bg-red-4">
              <template v-slot:avatar>
                <q-icon name="signal_wifi_off" color="primary" />
              </template>
              You have lost connection to the internet. This app is offline.
            </q-banner>
          </v-offline>
          <div class="row q-pt-lg q-pb-xs">
            <q-tabs
              active-color="brandblue"
              class="col-12 q-px-sm q-pb-md pp-fcolor"
              :modelValue="selectedNetwork"
              @update:modelValue="changeNetwork"
              :style="{'margin-top': $q.platform.is.ios ? '25px' : '-20px', 'padding-bottom': '16px'}"
            >
              <q-tab name="BCH" :class="{'text-blue-5': darkMode}" :label="networks.BCH.name"/>
              <q-tab name="sBCH" :class="{'text-blue-5': darkMode}" :label="networks.sBCH.name"/>
            </q-tabs>
          </div>
          <div class="row q-mt-sm">
            <div class="col text-white" :class="{'text-white': darkMode}" @click="selectBch">
              <img :src="selectedNetwork === 'sBCH' ? '/sep20-logo.png' : '/bch-logo.png'" style="height: 75px; position: absolute; right: 34px; margin-top: 15px; z-index: 1;"/>
              <q-card id="bch-card">
                <q-card-section style="padding-top: 10px; padding-bottom: 12px;">
                  <div class="text-h6">{{ { BCH: 'Bitcoin Cash', sBCH: 'Smart Bitcoin Cash'}[selectedNetwork] }}</div>
                  <div v-if="!balanceLoaded && selectedAsset.id === 'bch'" style="width: 60%; height: 53px;">
                    <q-skeleton style="font-size: 22px;" type="rect"/>
                  </div>
                  <div v-else style="margin-top: -5px; z-index: 20; position: relative;">
                    <p style="font-size: 24px;">{{ String(bchAsset.balance).substring(0, 10) }} {{ selectedNetwork }}</p>
                    <div style="padding: 0; margin-top: -15px;">{{ getAssetMarketBalance(bchAsset) }} {{ String(selectedMarketCurrency).toUpperCase() }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <div class="row q-mt-sm">
            <div class="col">
              <p class="q-ml-lg q-mb-sm payment-methods q-gutter-x-sm" :class="{'pt-dark-label': darkMode}">
                {{ $t('Tokens') }}
                <q-btn
                  flat
                  padding="none"
                  size="sm"
                  icon="app_registration"
                  style="color: #3B7BF6;"
                  @click="toggleManageAssets"
                />
                <q-btn
                  v-if="manageAssets"
                  flat
                  padding="none"
                  size="sm"
                  icon="search"
                  style="color: #3B7BF6;"
                  @click="checkMissingAssets({autoOpen: true})"
                />
              </p>
            </div>
          </div>
          <asset-info ref="asset-info" :network="selectedNetwork"></asset-info>
          <!-- Cards without drag scroll on mobile -->
          <template v-if="$q.platform.is.mobile">
            <asset-cards
              :assets="assets"
              :manage-assets="manageAssets"
              :selected-asset="selectedAsset"
              :balance-loaded="balanceLoaded"
              :network="selectedNetwork"
              :wallet="wallet"
              @select-asset="asset => setSelectedAsset(asset)"
              @show-asset-info="asset => showAssetInfo(asset)"
              @hide-asset-info="hideAssetInfo()"
            >
            </asset-cards>
          </template>
          <!-- Cards with drag scroll on other platforms -->
          <template v-else>
            <asset-cards
              :assets="assets"
              :manage-assets="manageAssets"
              :selected-asset="selectedAsset"
              :balance-loaded="balanceLoaded"
              v-dragscroll.x="true"
              :network="selectedNetwork"
              :wallet="wallet"
              @select-asset="asset => setSelectedAsset(asset)"
              @show-asset-info="asset => showAssetInfo(asset)"
              @hide-asset-info="hideAssetInfo()"
            >
            </asset-cards>
          </template>
        </div>
      </q-pull-to-refresh>
      <div ref="transactionSection" class="row transaction-row">
        <transaction ref="transaction" :wallet="wallet"></transaction>
        <div class="col transaction-container" :class="{'pt-dark-card-2': darkMode}">
          <div class="row no-wrap justify-between">
            <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': darkMode}">
              {{ selectedAsset.symbol }} {{ $t('Transactions') }}
            </p>
            <div class="row items-center justify-end q-mr-lg" v-if="selectedAsset.symbol.toLowerCase() === 'bch'">
              <q-btn
                round
                color="blue-9"
                padding="xs"
                icon="mdi-chart-line-variant"
                class="q-ml-md"
                @click="openPriceChart"
              />
            </div>
          </div>
          <div class="col q-gutter-xs q-mx-lg q-mb-sm text-center btn-transaction" :class="{'pt-dark-card': darkMode}">
            <button class="btn-custom q-mt-none btn-all" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionsFilter == 'all' }" @click="setTransactionsFilter('all')">{{ $t('All') }}</button>
            <button class="btn-custom q-mt-none btn-sent" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionsFilter == 'sent'}" @click="setTransactionsFilter('sent')">{{ $t('Sent') }}</button>
            <button class="btn-custom q-mt-none btn-received" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionsFilter == 'received'}" @click="setTransactionsFilter('received')">{{ $t('Received') }}</button>
          </div>
          <div class="transaction-list">
            <template v-if="transactionsLoaded">
              <TransactionListItem
                v-for="(transaction, index) in transactions"
                :key="'tx-' + index"
                :transaction="transaction"
                :selected-asset="selectedAsset"
                @click="showTransactionDetails(transaction)"
              />
              <div ref="bottom-transactions-list"></div>
              <TransactionListItemSkeleton v-if="transactionsAppending"/>
              <div v-else-if="transactionsPageHasNext" :class="{'pt-dark-label': darkMode}" style="margin-top: 20px; width: 100%; text-align: center; color: #3b7bf6;">
                <p @click="() => { getTransactions(transactionsPage + 1, { scrollToBottom: true }) }">{{ $t('ShowMore') }}</p>
              </div>
              <div v-if="transactions.length === 0" class="relative text-center q-pt-md">
                <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
                <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
              </div>
            </template>
            <div v-else>
              <TransactionListItemSkeleton v-for="i in 5"/>
            </div>
          </div>
        </div>
      </div>
      <footer-menu />
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

    <TokenSuggestionsDialog
      ref="tokenSuggestionsDialog"
      v-model="showTokenSuggestionsDialog"
      :slp-wallet-hash="getWallet('slp').walletHash"
      :sbch-address="getWallet('sbch').lastAddress"
    />
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getMnemonic, Wallet } from '../../wallet'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import TokenSuggestionsDialog from '../../components/TokenSuggestionsDialog'
import Transaction from '../../components/transaction'
import AssetCards from '../../components/asset-cards'
import AssetInfo from '../../pages/transaction/dialog/AssetInfo.vue'
import startPage from '../../pages/transaction/dialog/StartPage.vue'
import PriceChart from '../../pages/transaction/dialog/PriceChart.vue'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
import TransactionListItem from 'src/components/transactions/TransactionListItem.vue'
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton.vue'
import { parseTransactionTransfer } from 'src/wallet/sbch/utils'
import { dragscroll } from 'vue-dragscroll'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'
import { VOffline } from 'v-offline'
import axios from 'axios'
import Watchtower from 'watchtower-cash-js'

const { SecureStoragePlugin } = Plugins

const ago = require('s-ago')

const sep20IdRegexp = /sep20\/(.*)/

export default {
  name: 'Transaction-page',
  components: {
    TransactionListItem,
    TransactionListItemSkeleton,
    TokenSuggestionsDialog,
    Transaction,
    AssetInfo,
    AssetCards,
    pinDialog,
    securityOptionDialog,
    startPage,
    VOffline,
    PriceChart
  },
  directives: {
    dragscroll
  },
  mixins: [
    walletAssetsMixin
  ],
  data () {
    return {
      hideBalances: false,
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bitcoin-cash-bch-logo.png',
        balance: 0
      },
      transactionsFilter: 'all',
      activeBtn: 'btn-all',
      transactions: [],
      transactionsPage: 0,
      transactionsPageHasNext: false,
      transactionsLoaded: false,
      transactionsAppending: false,
      balanceLoaded: false,
      wallet: null,
      manageAssets: false,
      assetInfoShown: false,
      pinDialogAction: '',
      securityOptionDialogStatus: 'dismiss',
      startPageStatus: true,
      prevPath: null,
      showTokenSuggestionsDialog: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },

  watch: {
    'assets.length': {
      handler(before, after) {
        // e.g. if one network has assets but the other has none then changes network,
        // the spacing becomes off
        const assetsWasEmpty = before == 0
        const assetsIsEmpty = after == 0
        if (assetsWasEmpty !== assetsIsEmpty) this.adjustTransactionsDivHeight({ timeout: 100 })
      }
    },
    manageAssets() {
      // must adjust height when asset list is empty
      // the add button is hidden behind tx list & unclickable without this
      if (!this.assets?.length) this.adjustTransactionsDivHeight({ timeout: 100 })
    },
    startPageStatus (n, o) {
      this.adjustTransactionsDivHeight()
    },
    selectedAsset () {
      this.transactions = []
    },
    'openedNotification.id': {
      handler() {
        if (!this.openedNotification?.id) return
        this.handleOpenedNotification()
      }
    }
  },

  computed: {
    openedNotification() {
      return this.$store.getters['notification/openedNotification']
    },
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      }
    },
    bchAsset () {
      if (this.selectedNetwork === 'sBCH') {
        return this.$store.getters['sep20/getAssets'][0]
      }

      return this.$store.getters['assets/getAssets'][0]
    },
    mainchainAssets () {
      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') {
          return item
        }
      })
    },
    smartchainAssets() {
      return this.$store.getters['sep20/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') {
          return item
        }
      })
    },
    assets () {
      if (this.selectedNetwork === 'sBCH') return this.smartchainAssets
      return this.mainchainAssets
    },
    selectedAssetMarketPrice () {
      if (!this.selectedAsset || !this.selectedAsset.id) return
      if (!this.selectedMarketCurrency) return
      return this.$store.getters['market/getAssetPrice'](this.selectedAsset.id, this.selectedMarketCurrency)
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    earliestBlock () {
      if (!Array.isArray(this.transactions) || !this.transactions.length) return 0
      return Math.min(
        ...this.transactions
          .map(tx => tx && tx.block)
          .filter(Boolean)
          .filter(Number.isSafeInteger)
      )
    }
  },
  methods: {
    openPriceChart () {
      // console.log('opening price chart')
      this.$q.dialog({
        component: PriceChart
      })
    },
    adjustTransactionsDivHeight (opts={timeout: 500}) {
      let timeout = opts?.timeout
      if (Number.isNaN(timeout)) timeout = 500
      setTimeout(() => {
        const sectionHeight = this.$refs.fixedSection.clientHeight
        this.$refs.transactionSection.setAttribute(
          'style',
          `position: relative; margin-top: ${sectionHeight - 24}px; z-index: 1; transition: margin-top 0.25s ease-in-out`
        )
      }, timeout)
    },
    changeNetwork (newNetwork = 'BCH', setAsset) {
      const vm = this
      const prevNetwork = vm.selectedNetwork
      vm.selectedNetwork = newNetwork
      if (prevNetwork !== vm.selectedNetwork) {
        vm.selectedAsset = vm.bchAsset
        if (setAsset?.id && vm.assets.find(asset => asset?.id == setAsset?.id)) {
          vm.selectedAsset = setAsset
        }
        vm.transactions = []
        vm.transactionsLoaded = false
        vm.transactionsPage = 0
        vm.assets.map(function (asset) {
          return vm.getBalance(asset.id)
        })
        vm.getTransactions()
      }
    },
    selectBch () {
      const vm = this
      vm.selectedAsset = this.bchAsset
      vm.getBalance(this.bchAsset.id)
      vm.transactions = []
      vm.transactionsPage = 0
      vm.getTransactions()
      vm.assetClickCounter += 1
      if (vm.assetClickCounter >= 2) {
        vm.showAssetInfo(this.bchAsset)
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
      } else {
        vm.hideAssetInfo()
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
      }
    },
    toggleManageAssets () {
      this.manageAssets = !this.manageAssets
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
    },
    showAssetInfo (asset) {
      const vm = this
      vm.assetInfoShown = true
      const assetCheck = setInterval(function () {
        if (asset) {
          vm.$refs['asset-info'].show(asset)
          clearInterval(assetCheck)
        }
      }, 100)
    },
    hideAssetInfo () {
      this.$refs['asset-info'].hide()
      this.assetInfoShown = false
    },
    toggleHideBalances () {
      this.hideBalances = !this.hideBalances
    },
    showTransactionDetails (transaction) {
      const vm = this
      vm.hideAssetInfo()
      const txCheck = setInterval(function () {
        if (transaction) {
          if (!transaction?.asset) transaction.asset = vm.selectedAsset
          vm.$refs.transaction.show(transaction, vm.darkMode)
          vm.hideBalances = true
          clearInterval(txCheck)
        }
      }, 100)
    },
    setSelectedAsset(asset) {
      const assetExists = this.assets.find(a => a?.id == asset?.id)
      if (!assetExists) return
      this.$refs['asset-info'].hide()
      this.selectedAsset = asset
      this.transactions = []
      this.transactionsPage = 0
      this.transactionsPageHasNext = false
      this.getBalance()
      this.getTransactions()
    },
    getBalance (id) {
      this.balanceLoaded = false
      if (this.selectedNetwork === 'sBCH') return this.getSbchBalance(id)
      return this.getBchBalance(id)
    },
    getSbchBalance (id) {
      const vm = this
      if (!id) {
        id = vm.selectedAsset.id
      }
      const parsedId = String(id)

      const address = vm.$store.getters['global/getAddress']('sbch')
      if (sep20IdRegexp.test(parsedId)) {
        const contractAddress = parsedId.match(sep20IdRegexp)[1]
        vm.wallet.sBCH.getSep20TokenBalance(contractAddress, address)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      } else {
        vm.wallet.sBCH.getBalance(address)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      }
    },
    getBchBalance (id) {
      const vm = this
      if (!id) {
        id = vm.selectedAsset.id
      }
      vm.transactionsPageHasNext = false
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        vm.wallet.SLP.getBalance(tokenId).then(function (response) {
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance
          })
          vm.balanceLoaded = true
        })
      } else {
        vm.wallet.BCH.getBalance().then(function (response) {
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance,
            spendable: response.spendable
          })
          vm.balanceLoaded = true
        })
      }
    },
    scrollToBottomTransactionList() {
      this.$refs['bottom-transactions-list']?.scrollIntoView({ behavior: 'smooth' })
    },
    getTransactions (page = 1, opts={ scrollToBottom: false }) {
      if (this.selectedNetwork === 'sBCH') {
        const address = this.$store.getters['global/getAddress']('sbch')
        return this.getSbchTransactions(address, opts)
      }
      return this.getBchTransactions(page, opts)
    },
    getSbchTransactions (address, opts={ scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = String(vm.selectedAsset.id)

      const filterOpts = { limit: 10, includeTimestamp: true }
      if (vm.transactionsFilter === 'sent') {
        filterOpts.type = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        filterOpts.type = 'incoming'
      }

      let appendResults = false
      if (Number.isSafeInteger(this.earliestBlock) && this.earliestBlock > 0) {
        filterOpts.before = '0x' + (this.earliestBlock - 1).toString(16)
        appendResults = true
      }

      let requestPromise = null
      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          address,
          filterOpts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          address,
          filterOpts
        )
      }

      if (!requestPromise) return
      if (!appendResults) vm.transactionsLoaded = false
      vm.transactionsAppending = true
      requestPromise
        .then(response => {
          vm.transactionsPageHasNext = false
          if (Array.isArray(response.transactions)) {
            vm.transactionsPageHasNext = response.hasNextPage
            if (!appendResults) vm.transactions = []
            vm.transactions.push(...response.transactions
              .map(tx => {
                tx.senders = [tx.from]
                tx.recipients = [tx.to]
                tx.asset = asset
                return tx
              })
            )
            if (opts?.scrollToBottom) setTimeout(() => vm.scrollToBottomTransactionList(), 100)
          }
        })
        .finally(() => {
          vm.transactionsAppending = false
          vm.transactionsLoaded = true
        })
    },
    getBchTransactions (page, opts={ scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = vm.selectedAsset.id
      if (page == 1) vm.transactionsLoaded = false
      let recordType = 'all'
      if (vm.transactionsFilter === 'sent') {
        recordType = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        recordType = 'incoming'
      }
      let requestPromise
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = vm.wallet.SLP.getTransactions(tokenId, page, recordType)
      } else {
        requestPromise = vm.wallet.BCH.getTransactions(page, recordType)
      }

      if (!requestPromise) return
      vm.transactionsAppending = true
      requestPromise
        .then(function (response) {
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next
          if (!Array.isArray(transactions)) return
          if (page > vm.transactionsPage) vm.transactionsPage = page
          transactions.map(function (item) {
            item.asset = asset
            return vm.transactions.push(item)
          })
          vm.transactionsLoaded = true
          setTimeout(() => {
            vm.transactionsPageHasNext = hasNext
          }, 250)
          if (opts?.scrollToBottom) setTimeout(() => vm.scrollToBottomTransactionList(), 100)
        })
        .finally(() => {
          vm.transactionsAppending = false
        })
    },
    refresh (done) {
      this.getBalance(this.bchAsset.id)
      this.getBalance(this.selectedAsset.id)
      this.transactions = []
      this.getTransactions()
      done()
    },
    setTransactionsFilter(value) {
      if (['sent', 'received'].indexOf(value) >= 0) this.transactionsFilter = value
      else this.transactionsFilter = 'all'

      this.transactions = []
      this.transactionsPage = 0
      this.transactionsLoaded = false
      this.getTransactions()
    },
    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
    },

    verifyBiometric () {
      const vm = this
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For easy log in',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          console.log('Successful fingerprint credential')
          setTimeout(() => {
            vm.startPageStatus = false
            vm.securityOptionDialogStatus = 'dismiss'
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          console.log('Verification error: ', error)
          // eslint-disable-next-line no-empty
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled')) {
          } else {
            this.verifyBiometric()
          }
        }
        )
    },

    setVerifyDialogAction () {
      const vm = this
      let pinVerificationCount
      pinVerificationCount = vm.$q.localStorage.getItem('pinVerificationCount')
      pinVerificationCount = isNaN(pinVerificationCount) ? 0 : parseInt(pinVerificationCount)
      if (pinVerificationCount % 10 === 0) {
        // Verify PIN every 10th load of this index page
        vm.$q.localStorage.set('pinVerificationCount', pinVerificationCount + 1)
        vm.pinDialogAction = 'VERIFY'
      } else {
        vm.pinDialogAction = 'SKIP'
        vm.$q.localStorage.set('pinVerificationCount', pinVerificationCount + 1)
      }
    },

    verifyOrSetupPIN () {
      if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
        this.setVerifyDialogAction()
      } else {
        this.setPreferredSecurity('pin')
      }
    },

    checkFingerprintAuthEnabled () {
      NativeBiometric.isAvailable()
        .then(result => {
          if (result.isAvailable !== false) {
            this.securityOptionDialogStatus = 'show'
          } else {
            console.log('Not available: ', result.isAvailable)
            this.verifyOrSetupPIN()
          }
        },
        (error) => {
          console.log('Error: ', error)
          this.verifyOrSetupPIN()
        })
    },
    setPreferredSecurity (auth) {
      this.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
    },

    logIn () {
      const vm = this
      setTimeout(() => {
        // Security Authentication
        if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
          SecureStoragePlugin.get({ key: 'pin' })
            .then(() => {
              vm.setVerifyDialogAction()
            })
            .catch(_err => {
              vm.pinDialogAction = 'SET UP'
            })
        } else if (vm.$q.localStorage.getItem('preferredSecurity') === 'biometric') {
          vm.verifyBiometric()
        } else {
          vm.checkFingerprintAuthEnabled()
        }
      }, 500)
    },

    executeActionTaken (action) {
      if (action !== 'cancel') {
        this.pinDialogAction = ''
        this.startPageStatus = false
        this.securityOptionDialogStatus = 'dismiss'
      } else {
        this.pinDialogAction = ''
      }
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },

    async checkMissingAssets (opts = { autoOpen: false }) {
      if (!this.$refs.tokenSuggestionsDialog) return Promise.reject()
      this.showTokenSuggestionsDialog = Boolean(opts && opts.autoOpen)
      return this.$refs.tokenSuggestionsDialog.updateList(opts)
    },

    async loadWallets () {
      const vm = this
      const mnemonic = await getMnemonic()

      const wallet = new Wallet(mnemonic, vm.selectedNetwork)
      vm.wallet = markRaw(wallet)

      if (vm.selectedNetwork === 'BCH') {
        // Create change addresses if nothing is set yet
        // This is to make sure that v1 wallets auto-upgrades to v2 wallets
        const bchChangeAddress = vm.getChangeAddress('bch')
        if (bchChangeAddress.length === 0) {
          vm.wallet.BCH.getNewAddressSet(0).then(function ({ addresses }) {
            vm.$store.commit('global/updateWallet', {
              type: 'bch',
              walletHash: vm.wallet.BCH.walletHash,
              derivationPath: vm.wallet.BCH.derivationPath,
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: 0
            })
          })
        }
        const slpChangeAddress = vm.getChangeAddress('slp')
        if (slpChangeAddress.length === 0) {
          vm.wallet.SLP.getNewAddressSet(0).then(function (addresses) {
            vm.$store.commit('global/updateWallet', {
              type: 'slp',
              walletHash: vm.wallet.SLP.walletHash,
              derivationPath: vm.wallet.SLP.derivationPath,
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: 0
            })
          })
        }
      } else if (vm.selectedNetwork === 'sBCH') {
        const lastAddress = vm.getWallet('sbch').lastAddress
        let subscribeSbchAddress = !vm.getWallet('sbch').subscribed
        if (lastAddress.length === 0) {
          await vm.wallet.sBCH.getOrInitWallet()
          subscribeSbchAddress = true
          vm.$store.commit('global/updateWallet', {
            type: 'sbch',
            derivationPath: vm.wallet.sBCH.derivationPath,
            walletHash: vm.wallet.sBCH.walletHash,
            lastAddress: vm.wallet.sBCH._wallet ? vm.wallet.sBCH._wallet.address : ''
          })

          if (subscribeSbchAddress) {
            wallet.sBCH.subscribeWallet()
              .then(response => {
                if (response && response.success) {
                  vm.$store.commit('global/setWalletSubscribed', {
                    type: 'sbch',
                    subscribed: true
                  })
                }
              })
          }
        }
      }
    },
    async onConnectivityChange (online) {
      const vm = this
      vm.$store.dispatch('global/updateConnectivityStatus', online)
      if (online === true) {
        if (!vm.wallet) await vm.loadWallets()
        vm.assets.map((asset) => vm.getBalance(asset.id))

        if (Array.isArray(vm.assets) && vm.assets.length > 0) {
          const selectedAssetExists = vm.assets.find(asset => asset?.id == vm.selectedAsset?.id)
          if (!selectedAssetExists) vm.selectedAsset = vm.bchAsset
        }
        vm.getBalance(vm.selectedAsset.id)
        vm.getTransactions()

        vm.$store.dispatch('assets/updateTokenIcons', { all: false })
        vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
      } else {
        vm.balanceLoaded = true
        vm.transactionsLoaded = true
      }
      this.adjustTransactionsDivHeight()
    },
    async handleOpenedNotification() {
      console.log('Handling opened notification')
      const openedNotification = this.$store.getters['notification/openedNotification']
      const notificationTypes = this.$store.getters['notification/types']
      if (openedNotification?.data?.type === notificationTypes.MAIN_TRANSACTION) {
        const txid = openedNotification?.data?.txid
        const tokenId = openedNotification?.data?.token_id
        this.findAndOpenTransaction({txid, tokenId, chain: 'BCH' })
        this.$store.commit('notification/clearOpenedNotification')
      } else if (openedNotification?.data?.type === notificationTypes.SBCH_TRANSACTION) {
        const txid = openedNotification?.data?.txid
        const tokenId = openedNotification?.data?.token_address
        const logIndex = openedNotification?.data?.log_index
        this.findAndOpenTransaction({ txid, tokenId, logIndex, chain: 'sBCH' })
        this.$store.commit('notification/clearOpenedNotification')
      }
    },
    async findAndOpenTransaction(data={txid: '', tokenId: '', logIndex: null, chain: 'BCH' }) {
      if (!data) return
      const {txid, tokenId, logIndex, chain } = data
      const isToken = tokenId && String(tokenId) != 'bch'
      const tokenPrefix = chain === 'sBCH' ? 'sep20' : 'slp'
      const assetId = isToken ? `${tokenPrefix}/${tokenId}` : 'bch'

      const assets = chain === 'sBCH' ? this.smartchainAssets : this.mainchainAssets
      const asset = isToken ? assets.find(asset => asset?.id == assetId) : this.bchAsset

      const transaction = await this.findTransaction({ txid, assetId, logIndex, chain })

      if (!transaction) {
        this.$q.dialog({
          message: 'Transaction not found',
          class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
        })
        return
      }
      if (asset?.id) {
        if (this.selectedNetwork != chain) this.changeNetwork(chain, asset)
        const refetchTxList = this.selectedAsset?.id != asset?.id
        this.selectedAsset = asset
        if (refetchTxList) {
          this.transactions = []
          this.transactionsPage = 0
          this.transactionsLoaded = false
          this.getTransactions()
        }
      } else {
        transaction.asset = {
          id: assetId,
        }
      }
      this.showTransactionDetails(transaction)
    },
    async findTransaction(data = {txid, assetId, logIndex, chain: 'BCH'}) {
      if (!data) return
      const { txid, assetId, chain, logIndex } = data
      const transaction = this.transactions?.find?.(tx => (tx?.txid || tx?.tx_hash) === txid)
      if (transaction) return transaction

      const watchtower = new Watchtower()
      if (chain === 'sBCH') {
        return watchtower.BCH._api(`smartbch/transactions/${txid}/transfers/`)
          .then(response => {
            const txTransfer = response?.data?.find?.(tx => {
              if (typeof logIndex === 'number') return tx?.log_index === logIndex
              return true
            })
            const address = this.$store.getters['global/getAddress']('sbch')
            return parseTransactionTransfer(txTransfer, { address })
          })
          .catch(error => {
            console.error(error)
            return null
          })
      } else {
        const isToken = assetId != 'bch'
        const tokenId = isToken ? assetId.split('/')[1] : assetId
        const walletHash = isToken ? this.getWallet('slp')?.walletHash : this.getWallet('bch')?.walletHash
        const apiPath = isToken ? `history/wallet/${walletHash}/${tokenId}/` : `history/wallet/${walletHash}/`
        return watchtower.BCH._api(apiPath, { params: { txids: txid } })
          .then(response => {
            return response?.data?.history?.find?.(tx => tx?.txid === txid)
          })
      }
    },
  },

  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.prevPath = from.path
    })
  },

  mounted () {
    window.vm = this
    this.handleOpenedNotification()
    const vm = this

    if (vm.prevPath === '/') {
      vm.logIn()
    } else {
      vm.startPageStatus = false
    }

    vm.adjustTransactionsDivHeight({ timeout: 50 })

    if (navigator.onLine) {
      vm.onConnectivityChange(true)
    }

    // Check for slow internet and/or accessibility of the backend
    axios.get('https://watchtower.cash', { timeout: 1000 * 60 }).then((resp) => {
      console.log('ONLINE')
    }).catch((error) => {
      console.log(error)
      vm.$store.dispatch('global/updateConnectivityStatus', false)
      vm.balanceLoaded = true
      vm.transactionsLoaded = true
    })
  }
}
</script>

<style scoped>
  .fixed-container {
    position: fixed;
    top: 0 !important;
    background-color: #ECF3F3;
    right: 0;
    left: 0;
  }
  .transaction-row {
    position: relative;
    margin-top: 305px;
    z-index: 5;
  }
  .transaction-list {
    height: 440px;
    overflow: auto;
    padding-bottom: 80px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .transaction-list {
      height: 430px;
    }
  }
  .payment-methods {
    color: #000;
    font-size: 20px;
  }
  .transaction-container {
    min-height: 80vh;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    background-color: #F9F8FF;
    margin-top: 24px;
  }
  .transaction-wallet {
    font-size: 20px;
    color: #444646;
  }
  .btn-all {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
    font-weight: 500;
  }
  .btn-custom:hover {
    background-color: #fff;
  }
  .btn-custom.active-transaction-btn {
    background-color: rgb(60, 100, 246) !important;
    color: #fff;
  }
  .btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
  #bch-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
</style>
