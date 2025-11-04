<template>
  <q-pull-to-refresh id="app-container" :class="getDarkModeClass(darkMode)" @refresh="onRefresh">
    <div>
      <div ref="fixedSection" class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
          <q-resize-observer @resize="onFixedSectionResize" />
          <div >
            <connected-dialog v-if="$q.platform.is.bex" @click="() => $refs['connected-dialog'].show()" ref="connected-dialog"></connected-dialog>

            <div
              class="row q-px-sm q-pt-sm"
              :style="{'margin-top': $q.platform.is.ios ? '55px' : '0px'}"
            >
              <MultiWalletDropdown ref="multi-wallet-component"/>
              <NotificationButton
                @hide-multi-wallet-dialog="hideMultiWalletDialog"
                @find-and-open-transaction="findAndOpenTransaction"
              />
            </div>

            <div class="row" :class="enableSmartBCH ? 'q-pt-lg': 'q-pt-sm'">
              <template v-if="enableSmartBCH">
                <q-tabs
                  class="col-12 q-px-sm q-pb-md"
                  :modelValue="selectedNetwork"
                  @update:modelValue="changeNetwork"
                  style="margin-top: -25px;"
                  indicator-color=""
                >
                  <q-tab
                    name="BCH"
                    class="network-selection-tab"
                    :class="[getDarkModeClass(darkMode), {'transactions-page': denomination === $t('DEEM')}]"
                    :label="networks.BCH.name"
                  />
                  <q-tab
                    name="sBCH"
                    class="network-selection-tab"
                    :class="[getDarkModeClass(darkMode), {'transactions-page': denomination === $t('DEEM')}]"
                    :label="networks.sBCH.name"
                    :disable="isChipnet"
                  />
                </q-tabs>
              </template>
              <template v-if="isDenominationTabEnabled">
                <q-tabs
                  inline-label
                  class="col-12 q-px-sm q-pb-md"
                  :model-value="denominationTabSelected"
                  @update:model-value="onDenominationTabSelected"
                  style="margin-top: -15px;"
                  indicator-color=""
                >
                  <q-tab
                    name="BCH"
                    class="network-selection-tab denominations-tab"
                    :class="[getDarkModeClass(darkMode), {'main-tab': !enableSmartBCH}]"
                    label="BCH &#x1F30F;"
                  />
                  <q-icon
                    name="sync_alt"
                    size="sm"
                    style="margin: 10px 10px 0px 10px;"
                    class="button button-icon"
                    :class="getDarkModeClass(darkMode)"
                  />
                  <q-tab
                    :name="$t('DEEM')"
                    class="network-selection-tab denominations-tab"
                    :class="[getDarkModeClass(darkMode), {'main-tab': !enableSmartBCH}]"
                  >
                    <template v-slot:default>
                      <div class="q-tab__content">
                        <div class="q-tab__label">
                          <span>{{ $t('ButtonDeem') }}</span>
                        </div>
                        <div class="q-tab__icon">
                          <q-icon name="img:assets/img/theme/payhero/hk-flag.png" />
                        </div>
                      </div>
                    </template>
                  </q-tab>
                </q-tabs>
              </template>
            </div>
            <div class="row q-mt-xs">
              <div class="col text-white" @click="selectBch">
                <q-card id="bch-card">
                  <q-card-section horizontal>
                    <q-card-section class="col flex items-center" style="padding: 10px 5px 10px 16px">
                      <div v-if="!balanceLoaded && selectedAsset.id === 'bch'" class="bch-skeleton">
                        <q-skeleton class="text-h5" type="rect"/>
                      </div>
                      <div v-else>
                        <p class="q-mb-none">
                          <span ellipsis class="text-h5" >
                            {{ bchBalanceText }}
                          </span>
                        </p>
                        <div>{{ getAssetMarketBalance(bchAsset) }}</div>
                        <q-badge
                          rounded
                          class="flex justify-start items-center yield-container"
                          v-if="walletYield"
                        >
                          <q-icon
                            size="sm"
                            :name="walletYield > 0 ? 'arrow_drop_up' : 'arrow_drop_down'"
                            :color="walletYield > 0 ? 'green-5' : 'red-5'"
                          />
                          <span class="yield text-weight-bold" :class="walletYield > 0 ? 'positive' : 'negative'">
                            {{ `${walletYield} ${selectedMarketCurrency}` }}
                          </span>
                        </q-badge>
                      </div>
                    </q-card-section>
                    <q-card-section class="col-4 flex items-center justify-end" style="padding: 10px 16px">
                      <div v-if="selectedNetwork === 'sBCH'">
                        <img src="sep20-logo.png" alt="" style="height: 75px;"/>
                      </div>
                      <div v-else>
                        <img
                          :src="denominationTabSelected === $t('DEEM') ? 'assets/img/theme/payhero/deem-logo.png' : 'bch-logo.png'"
                          alt=""
                          style="height: 75px;"
                        />
                      </div>
                    </q-card-section>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <asset-options 
            :loaded="balanceLoaded"
            :selectedDenomination="selectedDenomination"
            :hasCashin="hasCashin"
            @cashin="openCashIn()"
            @spend-bch="openSpendBch()"
          />
          <div class="row items-center justify-between q-mb-sm q-mt-sm">
            <div class="q-ml-lg button button-text-primary" style="font-size: 20px;">
              {{ $t(isHongKong(currentCountry) ? 'Points' : 'Tokens') }}
              <q-btn
                flat
                padding="none"
                v-if="manageAssets"
                size="sm"
                icon="close"
                class="settings-button"
                :style="assetsCloseButtonColor"
                :class="getDarkModeClass(darkMode)"
                @click="toggleManageAssets"
              />
            </div>
            <div class="row items-center q-gutter-sm">
              <AssetFilter 
                v-if="hasAssetFilter && selectedNetwork === networks.BCH.name" 
                @filterTokens="isCT => isCashToken = isCT" 
              />
              <q-btn
                flat
                dense
                no-caps
                :label="$t('Manage')"
                :color="darkMode ? 'blue-4' : 'blue-6'"
                @click="goToAssetList"
                padding="4px 8px"
                class="q-mr-md"
              />
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
              :isCashToken="isCashToken"
              :currentCountry="currentCountry"
              @select-asset="asset => setSelectedAsset(asset)"
              @show-asset-info="asset => showAssetInfo(asset)"
              @hide-asset-info="hideAssetInfo()"
              @removed-asset="selectBch()"
              @click="() => {txSearchActive = false; txSearchReference = ''}"
            >
            </asset-cards>
          </template>
          <!-- Cards with drag scroll on other platforms -->
          <template v-if="!$q.platform.is.mobile">
            <asset-cards
              :assets="assets"
              :manage-assets="manageAssets"
              :selected-asset="selectedAsset"
              :balance-loaded="balanceLoaded"
              v-dragscroll.x="true"
              :network="selectedNetwork"
              :wallet="wallet"
              :isCashToken="isCashToken"
              :currentCountry="currentCountry"
              @select-asset="asset => setSelectedAsset(asset)"
              @show-asset-info="asset => showAssetInfo(asset)"
              @hide-asset-info="hideAssetInfo()"
              @removed-asset="selectBch()"
              @click="() => {txSearchActive = false; txSearchReference = ''}"
            >
            </asset-cards>
          </template>
          <div v-if="assets.length == 0" style="margin-bottom: 10px;">
            <div class="text-center">
              <q-btn
                outline
                no-caps
                class="br-15"
                color="grey-7"
                icon="call_received"
                padding="xs md"
                label="Receive Tokens"
                @click="$router.push({ name: 'transaction-receive', query: { assetId: 'ct/unlisted', network: 'BCH' } })"
              />
            </div>
          </div>

          <PendingTransactions :key="pendingTransactionsKey"/>
          
          <LearnLessonsCarousel :key="learnCarouselKey" />
        </div>
      <!-- <div ref="transactionSection" class="row transaction-row">
        <transaction
          ref="transaction"
          :wallet="wallet"
          :denominationTabSelected="denominationTabSelected"
        />
        <div class="col transaction-container" :class="getDarkModeClass(darkMode)">
          <div class="row no-wrap justify-between">
            <p class="q-ma-lg section-title transaction-wallet" :class="getDarkModeClass(darkMode)">
              <template v-if="!txSearchActive">
                {{ selectedAsset.symbol }} {{ $t('Transactions') }}
                <span>
                  &nbsp;<q-icon name="search" @click="() => { txSearchActive = !txSearchActive }"></q-icon>
                </span>
              </template>
            </p>
            <div class="row items-center justify-end q-mr-lg" :style="{width: txSearchActive ? '100%' : 'auto'}">
              <div v-if="txSearchActive" class="full-width">
                <q-input
                  ref="tx-search"
                  style="margin-left: -20px; padding-bottom: 22px;"
                  maxlength="6"
                  label="Search by Reference ID"
                  v-model="txSearchReference"
                  debounce="200"
                  @update:model-value="(val) => { txSearchReference = val.toUpperCase().slice(0, 6); executeTxSearch(val) }"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                  <template v-slot:append>
                    <q-icon name="close" @click="() => { txSearchActive = false; txSearchReference = ''; $refs['transaction-list-component'].getTransactions() }" />
                  </template>
                </q-input>
              </div>
            </div>
          </div>
          <div
            class="col q-gutter-xs q-mx-lg q-mb-sm text-center pt-card btn-transaction"
            :class="getDarkModeClass(darkMode, '', 'btn-transaction-bg')"
          >
            <button
              v-for="(transactionFilterOpt, index) in transactionsFilterOpts" :key="index"
              class="btn-custom q-mt-none"
              :class="[
                getDarkModeClass(darkMode), 
                `btn-${transactionFilterOpt.value}`,
                {'active-transaction-btn border': transactionsFilter == transactionFilterOpt?.value },
              ]"
              @click="setTransactionsFilter(transactionFilterOpt.value)"
            >
              {{ transactionFilterOpt?.label }}
            </button>
          </div>
          <TransactionList
            ref="transaction-list-component"
            :selectedAssetProps="selectedAsset"
            :denominationTabSelected="denominationTabSelected"
            :wallet="wallet"
            :selectedNetworkProps="selectedNetwork"
            @on-show-transaction-details="showTransactionDetails"
          />
        </div>
      </div> -->
      <footer-menu ref="footerMenu" />
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

    <TokenSuggestionsDialog
      ref="tokenSuggestionsDialog"
      v-model="showTokenSuggestionsDialog"
      :bch-wallet-hash="getWallet('bch').walletHash"
      :slp-wallet-hash="getWallet('slp').walletHash"
      :sbch-address="getWallet('sbch').lastAddress"
    />
  </q-pull-to-refresh>
</template>

<script>
import { mapState } from 'vuex'
import Watchtower from 'watchtower-cash-js'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import { markRaw } from '@vue/reactivity'
import { bus } from 'src/wallet/event-bus'
import { getMnemonic } from '../../wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { parseTransactionTransfer } from 'src/wallet/sbch/utils'
import { dragscroll } from 'vue-dragscroll'
import { NativeBiometric } from 'capacitor-native-biometric'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { sha256 } from 'js-sha256'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { debounce } from 'quasar'

import TokenSuggestionsDialog from '../../components/TokenSuggestionsDialog'
import Transaction from '../../components/transaction'
import AssetCards from '../../components/asset-cards'
import AssetInfo from '../../pages/transaction/dialog/AssetInfo.vue'
import AddNewAsset from 'src/pages/transaction/dialog/AddNewAsset'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
import connectedDialog from '../connect/connectedDialog.vue'
import AssetFilter from '../../components/AssetFilter'
import TransactionList from 'src/components/transactions/TransactionList'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown'
import CashIn from 'src/components/cash-in/CashinIndex.vue'
import packageInfo from '../../../package.json'
import versionUpdate from './dialog/versionUpdate.vue'
import NotificationButton from 'src/components/notifications/NotificationButton.vue'
import AssetOptions from 'src/components/asset-options.vue'
import PendingTransactions from 'src/components/transactions/PendingTransactions.vue'
import LearnLessonsCarousel from 'src/components/LearnLessonsCarousel.vue'
import * as assetSettings from 'src/utils/asset-settings'
import { asyncSleep } from 'src/wallet/transaction-listener'
import { cachedLoadWallet } from '../../wallet'

const sep20IdRegexp = /sep20\/(.*)/

export default {
  name: 'Transaction-page',
  components: {
    TransactionList,
    TokenSuggestionsDialog,
    Transaction,
    AssetInfo,
    AssetCards,
    pinDialog,
    securityOptionDialog,
    connectedDialog,
    AssetFilter,
    MultiWalletDropdown,
    NotificationButton,
    AssetOptions,
    PendingTransactions,
    LearnLessonsCarousel,
    AddNewAsset
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
        logo: 'bch-logo.png',
        balance: 0
      },
      txSearchActive: false,
      txSearchReference: '',
      transactionsFilter: 'all',
      activeBtn: 'btn-all',
      balanceLoaded: false,
      wallet: null,
      manageAssets: false,
      assetInfoShown: false,
      pinDialogAction: '',
      securityOptionDialogStatus: 'dismiss',
      prevPath: null,
      showTokenSuggestionsDialog: false,
      isCashToken: true,
      settingsButtonIcon: 'settings',
      assetsCloseButtonColor: 'color: #3B7BF6;',
      denominationTabSelected: 'BCH',
      parsedBCHBalance: '0',
      walletYield: null,
      hasCashin: false,
      hasCashinAlert: false,
      availableCashinFiat: null,
      websocketManager: null,
      assetClickTimer: null,
      assetClickCounter: 0 ,
      pendingTransactionsKey: 0,
      learnCarouselKey: 0
    }
  },

  watch: {
    online(newValue, oldValue) {
      this.onConnectivityChange(newValue)
    },
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
    selectedAsset () {
      this.transactions = []
    },
    balanceLoaded (val) {
      if (val) {
        this.formatBCHCardBalance(this.denomination)
      }
    },
    selectedNetwork (value) {
      this.checkCashinAvailable()
    }
  },

  computed: {
    ...mapState('global', ['online']),
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    selectedDenomination() {
      return this.isDenominationTabEnabled
        ? this.denominationTabSelected
        : this.denomination
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    enableSLP () {
      return this.$store.getters['global/enableSLP']
    },
    hasAssetFilter () {
      return this.enableSLP
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    isDenominationTabEnabled () {
      return ((this.denomination === this.$t('DEEM') || this.denomination === 'BCH') &&
        this.selectedNetwork !== 'sBCH' &&
        this.currentCountry === 'HK' &&
        this.selectedMarketCurrency === 'HKD')
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

      const asset = this.$store.getters['assets/getAssets'][0]
      return asset
    },
    bchBalanceText() {
      if (!this.balanceLoaded && this.selectedAsset?.id === this?.bchAsset?.id) return '0'
      const currentDenomination = this.selectedDenomination
      const balance = this.bchAsset.balance

      if (this.selectedNetwork === 'sBCH') {
        return `${String(balance).substring(0, 10)} ${selectedNetwork}`
      }

      const parsedBCHBalance = getAssetDenomination(currentDenomination, balance)

      if (currentDenomination === this.$t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
    },
    mainchainAssets() {
      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') return item
      })
    },
    smartchainAssets() {
      return this.$store.getters['sep20/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') return item
      })
    },
    assets () {
      const vm = this
      if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets

      return vm.mainchainAssets.filter(token => {
        const assetId = token.id?.split?.('/')?.[0]
        return (
          vm.isCashToken && assetId === 'ct' ||
          !vm.isCashToken && assetId === 'slp'
        )
      })
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
    transactionsFilterOpts() {
      return [
        { label: this.$t('All'), value: 'all' },
        { label: this.$t('Sent'), value: 'sent' },
        { label: this.$t('Received'), value: 'received' },
      ]
    }
  },
  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    isHongKong,
    async onRefresh (done) {
      try {
        // Refresh wallet balances and token icons
        await this.onConnectivityChange(true)
        
        // Refresh transaction list
        if (this.$refs['transaction-list-component']) {
          await this.$refs['transaction-list-component'].getTransactions(1)
        }
        
        // Refresh pending transactions
        this.pendingTransactionsKey++
        
        // Refresh Learn carousel
        this.learnCarouselKey++
      } catch (error) {
        console.error('Error refreshing:', error)
      } finally {
        done()
      }
    },
    executeTxSearch (value) {
      if (String(value).length == 0 || String(value).length >= 6) {
        const opts = {txSearchReference: value}
        this.$refs['tx-search'].blur()
        this.$refs['transaction-list-component'].getTransactions(1, opts)
      }
    },
    onFixedSectionResize: debounce(function (size) {
      this.adjustTransactionsDivHeight({ timeout: 50 })
      this.$refs['transaction-list-component']?.computeTransactionsListHeight?.()
    }, 500),
    handleRampNotif (notif) {
      // console.log('Handling Ramp Notification')
      this.$router.push({ name: 'ramp-fiat', query: notif })
    },
    openSpendBch () {
      this.$router.push({ name: 'spend-bch' })
    },
    goToAssetList () {
      this.$router.push({ name: 'asset-list' })
    },
    async openCashIn () {
      await this.checkCashinAvailable()
      this.$q.dialog({
        component: CashIn,
        componentProps: {
          fiatCurrencies: this.availableCashinFiat
        }
      }).onOk(() => {
        // Refresh data
        this.resetAndRefetchData()
      })
    },
    handleCashinOrderCreated (data) {
      console.log('Cashin order created event received:', data)
      if (data && data.orderId) {
        console.log('Navigating to order page:', data.orderId)
        // Wait a bit for dialog to fully close before navigation
        setTimeout(() => {
          console.log('Executing navigation with order_id query param:', data.orderId)
          // Navigate to P2P Exchange with order_id as query parameter
          // This prevents the exchange/index.vue from redirecting to store page
          this.$router.push({
            path: '/apps/exchange/peer-to-peer/',
            query: { order_id: data.orderId }
          })
            .then(() => {
              console.log('Navigation successful')
            })
            .catch((err) => {
              console.error('Navigation error:', err)
            })
        }, 500)
      }
    },
    async checkCashinAvailable () {
      this.hasCashin = false
      // check network
      if (this.selectedNetwork === 'BCH') {
        // check availableCashinFiat is empty to avoid duplicate requests
        if (this.availableCashinFiat) {
          this.hasCashin = true
        } else {
          let fetchCurrency = false

          await backend.get('/auth')
            .then(response => {
              const user = response.data

              if (!user?.is_arbiter) {
                fetchCurrency = true
              }
            })
            .catch(error => {
              if (error.response?.status === 404) {
                fetchCurrency = true
              }
            })

          if (fetchCurrency) {
            backend.get('/ramp-p2p/currency/fiat')
              .then(response => {
                this.availableCashinFiat = response.data
                const selectedFiat = this.$store.getters['market/selectedCurrency']
                const fiatSymbol = this.availableCashinFiat.map(item => item.symbol)

                this.hasCashin = fiatSymbol.includes(selectedFiat.symbol)
              })
              .catch(error => {
                console.error(error)
              })
          }
        }
      } else {
        this.hasCashin = false
      }
    },
    async checkCashinAlert () {
      if (this.hasCashin) {
        const walletHash = this.$store.getters['global/getWallet']('bch').walletHash
        await backend.get('/ramp-p2p/order/cash-in/alerts/', { params: { wallet_hash: walletHash } })
          .then(response => {
            this.hasCashinAlert = response.data.has_cashin_alerts
          })
          .catch(error => {
            console.log(error.response || error)
          })
      }
    },
    setupCashinWebSocket () {
      this.closeCashinWebSocket()
      const walletHash = this.$store.getters['global/getWallet']('bch').walletHash
      const url = `${getBackendWsUrl()}${walletHash}/cash-in/`
      this.websocketManager = new WebSocketManager()
      this.websocketManager.setWebSocketUrl(url)
      this.websocketManager.subscribeToMessages((message) => {
        if (message?.type === 'ConnectionMessage') return
        bus.emit('cashin-alert', true)
      })
    },
    closeCashinWebSocket () {
      this.websocketManager?.closeConnection()
    },
    async updateTokenMenuPosition () {
      await this.$nextTick()
      this.$refs.tokenMenu.updatePosition()
    },
    adjustTransactionsDivHeight (opts={timeout: 500}) {
      const vm = this
      let timeout = opts?.timeout
      if (Number.isNaN(timeout)) timeout = 500
      setTimeout(() => {
        const fixedSection = vm.$refs?.fixedSection
        if (!fixedSection) return
        
        const sectionHeight = fixedSection.clientHeight
        const clientWidth = document.body.clientWidth
        const elem = vm.$refs.transactionSection
        if (!elem?.style) return

        elem.style.marginTop = `${sectionHeight - 24}px`;
        elem.style.transition = `margin-top 0.25s ease-in-out`;
        elem.style.width = `${clientWidth}px;`
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
        // vm.$refs['transaction-list-component'].resetValues(null, newNetwork, setAsset)
        vm.assets.map(function (asset) {
          return vm.getBalance(asset.id)
        })
        // vm.$refs['transaction-list-component'].getTransactions()
      }
    },
    selectBch () {     
      const vm = this       
      // vm.selectedAsset = this.bchAsset
      // vm.getBalance(this.bchAsset.id)
      // vm.txSearchActive = false
      // vm.txSearchReference = ''
      
      // vm.$nextTick(() => {
        // vm.$refs['transaction-list-component'].resetValues(null, null, vm.selectedAsset)
        // vm.$refs['transaction-list-component'].getTransactions()
      // })
      vm.assetClickCounter += 1
      if (vm.assetClickCounter >= 2) {        
        vm.showAssetInfo(this.bchAsset)
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
      } else {        
        // vm.hideAssetInfo()
        vm.assetClickTimer = setTimeout(() => {          
          if (vm.assetClickCounter === 1) {
            this.$router.push({ name: 'transaction-list'}) 
          }            
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)       
      }

      // this.$router.push({ name: 'transaction-list'})
    },
    toggleManageAssets () {
      const vm = this
      vm.manageAssets = !vm.manageAssets
    },
    getAssetMarketBalance (asset) {
      if (!asset?.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      let balance = Number(asset.balance || 0)
      const computedBalance = balance * Number(assetPrice)
      this.computeWalletYield()

      return parseFiatCurrency(computedBalance.toFixed(2), this.selectedMarketCurrency)
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
      try {
        this.assetInfoShown = false
        this.$refs['asset-info'].hide()
      } catch {}
    },
    toggleHideBalances () {
      this.hideBalances = !this.hideBalances
    },
    showTransactionDetails (transaction) {
      const vm = this
      vm.hideMultiWalletDialog()
      vm.hideAssetInfo()
      // const txCheck = setInterval(function () {
      //   if (transaction) {
      //     if (!transaction?.asset) transaction.asset = vm.selectedAsset
      //     vm.$refs.transaction.show(transaction)
      //     vm.hideBalances = true
      //     clearInterval(txCheck)
      //   }
      // }, 100)
    },
    setSelectedAsset(asset) {
      const assetExists = this.assets.find(a => a?.id == asset?.id)
      if (!assetExists) return
      this.$refs['asset-info'].hide()
      this.selectedAsset = asset
      this.getBalance(asset.id)
      // this.$nextTick(() => {
      //   this.$refs['transaction-list-component'].resetValues(null, null, asset)
      //   this.$refs['transaction-list-component'].getTransactions()
      // })
      this.$store.dispatch('assets/getAssetMetadata', asset.id)

      this.$router.push({name: 'transaction-list', query: { assetID: asset.id }})
    },
    getBalance (id) {
      const vm = this
      vm.balanceLoaded = false
      if (vm.selectedNetwork === 'sBCH') return vm.getSbchBalance(id, vm)
      return vm.getBchBalance(id, vm)
    },
    getSbchBalance (id, vm) {
      if (!id) {
        id = vm.selectedAsset.id
      }
      const parsedId = String(id)

      const address = vm.$store.getters['global/getAddress']('sbch')
      if (sep20IdRegexp.test(parsedId)) {
        const contractAddress = parsedId.match(sep20IdRegexp)[1]
        return vm.wallet.sBCH.getSep20TokenBalance(contractAddress, address)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      } else {
        return vm.wallet.sBCH.getBalance(address)
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
    async getBchBalance (id, vm) {
      if (!id) {
        id = vm.selectedAsset.id
      }
      vm.transactionsPageHasNext = false
      await updateAssetBalanceOnLoad(id, vm.wallet, vm.$store)
      vm.balanceLoaded = true
    },
    resetAndRefetchData () {
      this.checkCashinAlert()
      this.assets.map((asset) => {
        return this.getBalance(asset.id)
      })
      this.transactions = []
      this.pendingTransactionsKey++
        // this.$refs['transaction-list-component'].getTransactions()
    },
    setTransactionsFilter(value) {
      const transactionsFilters = this.transactionsFilterOpts.map(opt => opt?.value)
      if (transactionsFilters.indexOf(value) >= 0) this.transactionsFilter = value
      else this.transactionsFilter = 'all'

      this.$nextTick(() => {
        this.$refs['transaction-list-component'].resetValues(value)
        this.$refs['transaction-list-component'].getTransactions()
      })
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

    executeActionTaken (action) {
      if (action !== 'cancel') {
        this.pinDialogAction = ''
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
      const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
      vm.wallet = markRaw(wallet)

      const storedWalletHash = vm.$store.getters['global/getWallet']('bch').walletHash
      const derivedWalletHash = getWalletByNetwork(vm.wallet, 'bch').walletHash
      
      // console.log('Stored wallet hash:', storedWalletHash)
      // console.log('Derived wallet hash:', derivedWalletHash)
      
      if (storedWalletHash !== derivedWalletHash) {
        console.log('INCONSISTENCY DETECTED!')
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        // console.log('Wallet index:', this.$store.getters['global/getWalletIndex'])
        console.log('Wallet index:', walletIndex)
        this.$store.commit('global/updateCurrentWallet', walletIndex)
        // location.reload()
      }

      // COMMENTED OUT SINCE V1 WALLETS ARE ALREADY NOT IN USE
      //
      // if (vm.selectedNetwork === 'BCH') {
      //   // Create change addresses if nothing is set yet
      //   // This is to make sure that v1 wallets auto-upgrades to v2 wallets
      //   const bchChangeAddress = vm.getChangeAddress('bch')
      //   getWalletByNetwork(vm.wallet, 'bch').getNewAddressSet(0).then(function ({ addresses }) {
      //     if (bchChangeAddress.length === 0) {
      //       vm.$store.commit('global/updateWallet', {
      //         type: 'bch',
      //         walletHash: getWalletByNetwork(vm.wallet, 'bch').walletHash,
      //         derivationPath: getWalletByNetwork(vm.wallet, 'bch').derivationPath,
      //         lastAddress: addresses.receiving,
      //         lastChangeAddress: addresses.change,
      //         lastAddressIndex: 0,
      //       })
      //     }
      //   })
      //   const slpChangeAddress = vm.getChangeAddress('slp')
      //   if (slpChangeAddress.length === 0) {
      //     getWalletByNetwork(vm.wallet, 'slp').getNewAddressSet(0).then(function (addresses) {
      //       vm.$store.commit('global/updateWallet', {
      //         type: 'slp',
      //         walletHash: getWalletByNetwork(vm.wallet, 'slp').walletHash,
      //         derivationPath: getWalletByNetwork(vm.wallet, 'slp').derivationPath,
      //         lastAddress: addresses.receiving,
      //         lastChangeAddress: addresses.change,
      //         lastAddressIndex: 0
      //       })
      //     })
      //   }
      // } else if (vm.selectedNetwork === 'sBCH') {
      //   const lastAddress = vm.getWallet('sbch').lastAddress
      //   let subscribeSbchAddress = !vm.getWallet('sbch').subscribed
      //   if (lastAddress.length === 0) {
      //     await vm.wallet.sBCH.getOrInitWallet()
      //     subscribeSbchAddress = true
      //     vm.$store.commit('global/updateWallet', {
      //       type: 'sbch',
      //       derivationPath: vm.wallet.sBCH.derivationPath,
      //       walletHash: vm.wallet.sBCH.walletHash,
      //       lastAddress: vm.wallet.sBCH._wallet ? vm.wallet.sBCH._wallet.address : ''
      //     })

      //     if (subscribeSbchAddress) {
      //       wallet.sBCH.subscribeWallet()
      //         .then(response => {
      //           if (response && response.success) {
      //             vm.$store.commit('global/setWalletSubscribed', {
      //               type: 'sbch',
      //               subscribed: true
      //             })
      //           }
      //         })
      //     }
      //   }
      // }
    },
    async onConnectivityChange (online) {
      const vm = this
      if (online === true) {
        if (!vm.wallet) await vm.loadWallets()

        if (Array.isArray(vm.assets) && vm.assets.length > 0) {
          const selectedAssetExists = vm.assets.find(asset => asset?.id == vm.selectedAsset?.id)
          if (!selectedAssetExists) vm.selectedAsset = vm.bchAsset
        }

        const balancePromise = vm.getBalance(vm.selectedAsset.id)
        // const txFetchPromise = vm.$refs['transaction-list-component'].getTransactions()

        let tokenIconUpdatePromise
        if (this.selectedNetwork === 'sBCH') {
          tokenIconUpdatePromise = vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
        } else {
          tokenIconUpdatePromise = vm.$store.dispatch('assets/updateTokenIcons', { all: false })
        }

        return Promise.allSettled([
          balancePromise,
          // txFetchPromise,
          tokenIconUpdatePromise,
        ])
      } else {
        vm.balanceLoaded = true
        vm.transactionsLoaded = true
      }
      this.adjustTransactionsDivHeight()
    },
    async handleOpenedNotification() {
      const openedNotification = this.$store.getters['notification/openedNotification']

      if(openedNotification) {
        const notificationTypes = this.$store.getters['notification/types']
        if (openedNotification?.data?.type === notificationTypes.MAIN_TRANSACTION) {
          const txid = openedNotification?.data?.txid
          const tokenId = openedNotification?.data?.token_id
          this.findAndOpenTransaction({txid, tokenId, chain: 'BCH' })
        } else if (openedNotification?.data?.type === notificationTypes.SBCH_TRANSACTION) {
          const txid = openedNotification?.data?.txid
          const tokenId = openedNotification?.data?.token_address
          const logIndex = openedNotification?.data?.log_index
          this.findAndOpenTransaction({ txid, tokenId, logIndex, chain: 'sBCH' })
        } else if (Object.prototype.hasOwnProperty.call(openedNotification?.data, 'order_id')) {
          this.handleRampNotif(openedNotification?.data)
        }
      }
    },
    async findAndOpenTransaction(data={txid: '', tokenId: '', logIndex: null, chain: 'BCH' }) {
      if (!data) return
      const { txid, tokenId, logIndex, chain } = data

      let transaction = null
      let assetId = ''
      let asset = null
      if (tokenId.split('/')[0] === 'ct') {
        assetId = tokenId
        asset = this.mainchainAssets.find(asset => asset?.id === assetId)
      } else {
        const isToken = tokenId && String(tokenId) !== 'bch'
        const tokenPrefix = chain === 'sBCH' ? 'sep20' : 'slp'
        assetId = isToken ? `${tokenPrefix}/${tokenId}` : 'bch'
        const assets = chain === 'sBCH' ? this.smartchainAssets : this.mainchainAssets
        asset = isToken ? assets.find(asset => asset?.id === assetId) : this.bchAsset
      }

      transaction = await this.findTransaction({ txid, assetId, logIndex, chain })

      if (!transaction) {
        this.$q.dialog({
          message: 'Transaction not found',
          seamless: true,
          ok: true,
          class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
        return
      }

      if (!asset?.id && tokenId.startsWith('ct/')) {
        asset = await this.wallet.BCH.getTokenDetails(tokenId.split('/')[1])
        this.$store.commit(`assets/addNewAsset`, asset)
        this.$store.commit(`assets/moveAssetToBeginning`)
      }

      if (asset?.id) {
        if (this.selectedNetwork != chain) this.changeNetwork(chain, asset)
        const refetchTxList = this.selectedAsset?.id != asset?.id
        if (refetchTxList) {
          if (asset?.id === 'bch') this.selectBch()
          else this.setSelectedAsset(asset)
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
        let tokenId = ''
        let walletHash = ''
        let apiPath = ''
        if (assetId.split('/')[0] === 'ct') {
          tokenId = assetId.split('/')[1]
          walletHash = this.getWallet('bch')?.walletHash
          apiPath = `history/wallet/${walletHash}/${tokenId}/`
        } else {
          const isToken = assetId !== 'bch'
          tokenId = isToken ? assetId.split('/')[1] : assetId
          walletHash = isToken ? this.getWallet('slp')?.walletHash : this.getWallet('bch')?.walletHash
          apiPath = isToken ? `history/wallet/${walletHash}/${tokenId}/` : `history/wallet/${walletHash}/`
        }

        return watchtower.BCH._api(apiPath, { params: { txids: txid } })
          .then(response => {
            return response?.data?.history?.find?.(tx => tx?.txid === txid)
          })
      }
    },
    formatBCHCardBalance (currentDenomination, currentBalance = 0) {
      const balance = currentBalance || this.bchAsset?.balance || 0
      const parsedBCHBalance = parseAssetDenomination(currentDenomination, {
        id: '',
        balance,
        symbol: 'BCH',
        decimals: 0
      }, false, 10)

      if (currentDenomination === this.$t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        this.parsedBCHBalance = `${commaBalance} ${currentDenomination}`
      } else {
        this.parsedBCHBalance = parsedBCHBalance
      }
    },
    onDenominationTabSelected (value) {
      this.denominationTabSelected = value
      this.formatBCHCardBalance(value)
    },
    computeWalletYield () {
      if (this.bchAsset.yield) {
        const payloadYield = this.bchAsset.yield[this.selectedMarketCurrency]
        if (payloadYield) {
          this.walletYield = Number(payloadYield.toFixed(2)) === 0.00 || Number(payloadYield.toFixed(2)) === 0
            ? Math.abs(payloadYield)
            : payloadYield
          return
        }
      }
      this.walletYield = null
    },
    async getMainchainTokens () {
      const tokenWalletHashes = [this.getWallet('bch').walletHash, this.getWallet('slp').walletHash]
      const mainchainTokens = []

      for (const tokenWalletHash of tokenWalletHashes) {
        const isCashToken = tokenWalletHashes.indexOf(tokenWalletHash) === 0

        const tokens = await this.$store.dispatch(
          'assets/getMissingAssets',
          {
            isCashToken,
            walletHash: tokenWalletHash,
            includeIgnoredTokens: false
          }
        )

        mainchainTokens.push(...tokens)
      }

      return mainchainTokens
    },
    async getSmartchainTokens () {
      const tokens = await this.$store.dispatch(
        'sep20/getMissingAssets',
        {
          address: this.getWallet('sbch').lastAddress,
          icludeIgnoredTokens: false
        }
      )
      return tokens
    },
    /**
     * Returns boolean if app update prompt is shown
     */
    async checkVersionUpdate () {
      const vm = this
      const appVer = packageInfo.version

      /// get platform
      let platform = null

      if (vm.$q.platform.is.mobile) {
        platform = 'android'
      }
      if (vm.$q.platform.is.ios) {
        platform = 'ios'
      }
      if (vm.$q.platform.is.bex) {
        platform = 'web'
      }

      if (platform) {
        // fetching version check
        await backend.get(`version/check/${platform}/`)
          .then(response => {
            if (!('error' in response.data)) {
              const latestVer = response.data?.latest_version
              const minReqVer = response.data?.min_required_version

              if (appVer !== latestVer) {
                const openVersionUpdate = this.checkOutdatedVersion(appVer, minReqVer)

                // open version update dialog
                if (openVersionUpdate) {
                  this.$q.dialog({
                    component: versionUpdate,
                    componentProps: {
                      data: response.data
                    }
                  })
                  return true
                }
              }
            }
          })
      }
      return false
    },
    checkOutdatedVersion (appVer, minReqVer) {
      let isOutdated = false
      const appV = appVer.split('.').map(Number)
      const minV = minReqVer.split('.').map(Number)

      for (let i = 0; i < Math.max(appV.length, minV.length); i++) {
        const v1 = appV[i] || 0
        const v2 = minV[i] || 0

        if (v1 < v2) {
          isOutdated = true
          break
        } else if (v1 > v2) {
          isOutdated = false
          break
        } else {
          isOutdated = false
        }
      }
      return isOutdated
    },
    /**
     * Return boolean if security preference is set up
     */
    async checkSecurityPreferenceSetup() {
      const vm = this
      // Check if preferredSecurity and if it's set as PIN
      const preferredSecurity = this.$q.localStorage.getItem('preferredSecurity')
      let forceRecreate = false
      if (preferredSecurity === null) {
        forceRecreate = true
      } else if (preferredSecurity === 'pin') {
        // If using PIN, check if it's 6 digits
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const mnemonic = await getMnemonic(walletIndex)
        try {
          let pin = null
          try {
            pin = await SecureStoragePlugin.get({ key: `pin-${sha256(mnemonic)}` })
          } catch (error) {
            try {
              // fallback for retrieving pin using unhashed mnemonic
              pin = await SecureStoragePlugin.get({ key: `pin ${mnemonic}` })
            } catch (error1) {
              // fallback for old process of pin retrieval
              pin = await SecureStoragePlugin.get({ key: 'pin' })
            }
          }
          if (pin?.value.length < 6) {
            forceRecreate = true
          }
        } catch {
          forceRecreate = true
        }
      }
      if (forceRecreate) {
        this.securityOptionDialogStatus = 'show'
        // await vm.$store.dispatch('global/updateOnboardingStep', 0)
        // vm.$router.push('/accounts?recreate=true')
      }

      return !forceRecreate
    },
    resetCashinOrderPagination () {
      this.$store.commit('ramp/resetCashinOrderList')
      this.$store.commit('ramp/resetCashinOrderListPage')
      this.$store.commit('ramp/resetCashinOrderListTotalPage')
    },
    hideMultiWalletDialog () {
      this.$refs['multi-wallet-component'].$refs['multi-wallet-parent'].$refs['multi-wallet'].hide()
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        // need both in passing props for now for backwards compatibility
        componentProps: {
          network: vm.selectedNetwork,
          darkMode: vm.darkMode,
          isCashToken: vm.isCashToken,
          wallet: vm.wallet,
          currentCountry: vm.currentCountry
        },
        component: AddNewAsset
      }).onOk((asset) => {        
        // vm.assetList = this.assets
        this.$router.push({ name: 'asset-list' })
        // if (asset.data?.id) vm.selectAsset(null, asset.data)
      })
    },
    async checkUnappliedUnlistedTokens () {
      const vm = this      
      const unlisted_tokens = await assetSettings.fetchUnlistedTokens()
      const assetIDs = vm.assets.map(asset => asset.id)

      if(Array.isArray(unlisted_tokens) && unlisted_tokens.length > 0) {
        let diff = assetIDs.filter(asset => unlisted_tokens.includes(asset))

        if (diff.length > 0) {
          const walletIndex = vm.$store.getters['global/getWalletIndex']
          
          diff.forEach(asset => {
            if (vm.selectedNetwork === 'sBCH') {
              vm.$store.commit('sep20/addRemovedAssetIds', asset)
              const commitName = 'sep20/removeAsset'
              return vm.$store.commit(commitName, asset)
            }
            vm.$store.commit('assets/removeAsset', asset)
            vm.$store.commit('assets/addRemovedAssetIds', {
              vaultIndex: walletIndex,
              id: asset
            })
          })        
        }
      }      
    }
  },

  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.prevPath = from.path
    })
  },

  unmounted () {
    bus.off('handle-push-notification', this.handleOpenedNotification)
    bus.off('cashin-order-created', this.handleCashinOrderCreated)
    this.closeCashinWebSocket()
  },
  created () {
    bus.on('cashin-alert', (value) => { this.hasCashinAlert = value })
    bus.on('handle-push-notification', this.handleOpenedNotification)
    bus.on('cashin-order-created', this.handleCashinOrderCreated)
  },
  beforeMount () {
    const vm = this

    // Removed PayHero theme icon customization
    vm.settingsButtonIcon = 'settings'
    vm.assetsCloseButtonColor = 'color: #3B7BF6;'

  },
  async mounted () {
    const vm = this
    let walletLoadPromise
    if (navigator.onLine) {
      walletLoadPromise = vm.onConnectivityChange(true)
    } else {
      walletLoadPromise = vm.loadWallets()
    }
    await Promise.race([ asyncSleep(500), walletLoadPromise ])

    this.checkVersionUpdate()
      .catch(error => {
        console.error('Error checking version update:', error)
        return false
      })
      .then(updatePromptShown => {
        if (updatePromptShown) return true
        this.checkSecurityPreferenceSetup()
      })

    // Only handle notifications that were just received
    const openedNotification = this.$store.getters['notification/openedNotification']
    if (openedNotification?.id) {
      this.handleOpenedNotification()
    }

    try {
      await Promise.all([
        this.checkCashinAvailable(),
        this.setupCashinWebSocket(),
        this.resetCashinOrderPagination(),
        this.checkCashinAlert(),
      ])
    } catch(error) {
      console.error(error)
    }

    // refactored to fetch tokens in batch by 3 instead of all at once
    const assets = vm.$store.getters['assets/getAssets']
    for (var i = 0; i < assets.length; i = i + 3) {
      const chunk = assets.slice(i, i + 3).map(a => {
        return vm.$store.dispatch('assets/getAssetMetadata', a.id)
      })
      await Promise.allSettled(chunk)
    }

    // check if newly-received token is already stored in vuex store,
    // if not, then add it to the very first of the list
    const tokens = vm.selectedNetwork === 'sBCH' ? await vm.getSmartchainTokens() : await vm.getMainchainTokens()
    const walletIndex = vm.$store.getters['global/getWalletIndex']
    const vaultRemovedAssetIds = vm.$store.getters['assets/getRemovedAssetIds'][walletIndex].removedAssetIds ?? []

    if (tokens.length > 0) {
      const assetsId = assets.map(a => a.id)
      const newTokens = tokens.filter(b => !assetsId.includes(b.id) && !vaultRemovedAssetIds.includes(b.id))

      newTokens.forEach(token => {
        vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, token)
        vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
      })
    }

    vm.$store.dispatch('market/updateAssetPrices', {})
    vm.computeWalletYield()

    // add unapplied unlisted token
    vm.checkUnappliedUnlistedTokens()
  }
}
</script>

<style lang="scss" scoped>
  /* Hide scrollbar completely on all platforms */
  #app-container {
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

  #bch-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    .bch-skeleton {
      height: 53px;
      width: 100%
    }
  }
  .fixed-container {
    
    top: 0 !important;
    right: 0;
    left: 0;

  }
  .transaction-row {
    position: fixed;
    margin-top: 355px;
    width: 100%;
  }
  .transaction-container {
    overflow: hidden;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    margin-top: 24px;
  }
  .transaction-wallet {
    font-size: 20px;
  }
  .btn-all {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
    font-weight: 500;
  }
  .btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
  .q-tab__content {
    display: flex;
    align-items: center;
  }
  .q-tab__icon {
    font-size: 14px !important;
  }
  .token-menu {
    position: fixed;
    left: 0;
    &.token-menu-list {
      min-width: 100px;
    }
  }
  .yield-container {
    margin-top: 5px;
    background-color: #ecf3f3;
    .yield {
      padding-right: 5px;
      &.positive {
        color: $green-5;
      }
      &.negative {
        color: $red-5;
      }
    }
  }
  .cash-in {
    background-color: #ECF3F3;
    color: #3b7bf6;
  }
</style>

<style>
.q-notifications__list--bottom {
  margin-bottom: 70px;
}
</style>
