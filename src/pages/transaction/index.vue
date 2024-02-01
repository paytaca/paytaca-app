<template>
  <div id="app-container" class="scroll-y" :class="getDarkModeClass(darkMode)">
    <div>
      <q-pull-to-refresh @refresh="refresh">
        <div ref="fixedSection" class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
          <div :class="{'pt-header home-header' : isNotDefaultTheme(theme)}">
            <connected-dialog v-if="$q.platform.is.bex" @click="() => $refs['connected-dialog'].show()" ref="connected-dialog"></connected-dialog>
            <v-offline @detected-condition="onConnectivityChange" />
            <div
              class="row q-pb-xs"
              :class="enableSmartBCH ? 'q-pt-lg': 'q-pt-sm'"
              :style="{'margin-top': $q.platform.is.ios ? '55px' : '0px'}"
            >
              <template v-if="enableSmartBCH">
                <q-tabs
                  class="col-12 q-px-sm q-pb-md"
                  :modelValue="selectedNetwork"
                  @update:modelValue="changeNetwork"
                  style="margin-top: -25px;"
                  :indicator-color="(isNotDefaultTheme(theme) && denomination !== $t('DEEM')) && 'transparent'"
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
                  :indicator-color="isNotDefaultTheme(theme) && 'transparent'"
                >
                  <q-tab
                    :name="$t('DEEM')"
                    class="network-selection-tab denominations-tab"
                    :class="[getDarkModeClass(darkMode), {'main-tab': !enableSmartBCH}]"
                  >
                    <template v-slot:default>
                      <div class="q-tab__content">
                        <div class="q-tab__label">
                          <span>{{ `${$t('DEEM')}` }}</span>
                        </div>
                        <div class="q-tab__icon">
                          <q-icon name="img:assets/img/theme/payhero/hk-flag.png" />
                        </div>
                      </div>
                    </template>
                  </q-tab>
                  <q-icon
                    name="sync_alt"
                    size="sm"
                    style="margin: 10px 10px 0px 10px;"
                    class="button button-icon"
                    :class="getDarkModeClass(darkMode)"
                  />
                  <q-tab
                    name="BCH"
                    class="network-selection-tab denominations-tab"
                    :class="[getDarkModeClass(darkMode), {'main-tab': !enableSmartBCH}]"
                    label="BCH &#x1F30F;"
                  />
                </q-tabs>
              </template>
            </div>
            <div class="row q-mt-sm">
              <div class="col text-white" @click="selectBch">
                <q-card id="bch-card">
                  <q-card-section horizontal>
                    <q-card-section class="col flex items-center" style="padding: 10px 5px 10px 16px">
                      <div v-if="!balanceLoaded && selectedAsset.id === 'bch'" class="bch-skeleton">
                        <q-skeleton class="text-h5" type="rect"/>
                      </div>
                      <div v-else>
                        <p>
                          <span ellipsis class="text-h5" :class="{'text-grad' : isNotDefaultTheme(theme)}">
                            {{
                              selectedNetwork === 'sBCH'
                                ? `${String(bchAsset.balance).substring(0, 10)} ${selectedNetwork}`
                                : parsedBCHBalance
                            }}
                          </span>
                        </p>
                        <div style="margin-top: -15px;">
                          {{ getAssetMarketBalance(bchAsset) }}
                        </div>
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
                      <img
                        :src="
                          selectedNetwork === 'sBCH'
                            ? 'sep20-logo.png'
                            : denomination === $t('DEEM') && denominationTabSelected === $t('DEEM')
                              ? 'assets/img/theme/payhero/deem-logo.png'
                              : 'bch-logo.png'
                        "
                        alt=""
                        style="height: 75px;"
                      />
                    </q-card-section>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
          <div
            v-if="!showTokens"
            class="text-center button button-text-primary show-tokens-label"
            :class="getDarkModeClass(darkMode)"
            @click.native="toggleShowTokens"
          >
            {{ $t(isHongKong(currentCountry) ? 'ShowPoints' : 'ShowTokens') }}
          </div>
          <div class="row q-mt-sm" v-if="showTokens">
            <div class="col">
              <p
                class="q-ml-lg q-mb-sm q-gutter-x-sm button button-text-primary"
                style="font-size: 20px;"
                :class="getDarkModeClass(darkMode)"
              >
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
                <q-btn
                  flat
                  padding="none"
                  size="sm"
                  class="settings-button"
                  :icon="settingsButtonIcon"
                  :class="getDarkModeClass(darkMode)"
                  @click="updateTokenMenuPosition"
                >
                  <q-menu
                    ref="tokenMenu"
                    class="text-bow token-menu"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <q-list class="pt-card token-menu-list" :class="getDarkModeClass(darkMode)">
                      <q-item clickable v-close-popup>
                        <q-item-section @click="toggleManageAssets">
                          {{ $t(isHongKong(currentCountry) ? 'ManagePoints' : 'ManageTokens') }}
                        </q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section @click="checkMissingAssets({autoOpen: true})">
                          {{ $t(isHongKong(currentCountry) ? 'ScanForPoints' : 'ScanForTokens') }}
                        </q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section @click="toggleShowTokens">
                          {{ $t(isHongKong(currentCountry) ? 'HidePoints' : 'HideTokens') }}
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </p>
            </div>

            <div class="col-3 q-mt-sm" style="margin-top: -5px !important;" v-show="selectedNetwork === networks.BCH.name">
              <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
            </div>
          </div>
          <asset-info v-if="showTokens" ref="asset-info" :network="selectedNetwork"></asset-info>
          <!-- Cards without drag scroll on mobile -->
          <template v-if="showTokens && $q.platform.is.mobile">
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
            >
            </asset-cards>
          </template>
          <!-- Cards with drag scroll on other platforms -->
          <template v-if="showTokens && !$q.platform.is.mobile">
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
            >
            </asset-cards>
          </template>
          <div v-if="showTokens && assets.length == 0" style="height: 10px;"></div>
        </div>
      </q-pull-to-refresh>
      <div ref="transactionSection" class="row transaction-row">
        <transaction
          ref="transaction"
          :wallet="wallet"
          :denominationTabSelected="denominationTabSelected"
        />
        <div class="col transaction-container" :class="getDarkModeClass(darkMode)">
          <div class="row no-wrap justify-between">
            <p class="q-ma-lg section-title transaction-wallet" :class="getDarkModeClass(darkMode)">
              {{ selectedAsset.symbol }} {{ $t('Transactions') }}
            </p>
            <div class="row items-center justify-end q-mr-lg" v-if="selectedAsset.symbol.toLowerCase() === 'bch'">
              <q-btn
                v-if="isNotDefaultTheme(theme) && darkMode"
                unelevated
                @click="openPriceChart"
                icon="img:assets/img/theme/payhero/price-chart.png"
              />
              <q-btn
                v-else
                round
                color="blue-9"
                padding="xs"
                icon="mdi-chart-line-variant"
                class="q-ml-md"
                :class="getDarkModeClass(darkMode, '', 'price-chart-icon')"
                @click="openPriceChart"
              />
            </div>
          </div>
          <div
            class="col q-gutter-xs q-mx-lg q-mb-sm text-center pt-card btn-transaction"
            :class="getDarkModeClass(darkMode, '', 'btn-transaction-bg')"
          >
            <button
              class="btn-custom q-mt-none btn-all"
              :class="[getDarkModeClass(darkMode), {'active-transaction-btn border': transactionsFilter == 'all'}]"
              @click="setTransactionsFilter('all')"
            >
              {{ $t('All') }}
            </button>
            <button
              class="btn-custom q-mt-none btn-sent"
              :class="[getDarkModeClass(darkMode), {'active-transaction-btn border': transactionsFilter == 'sent'}]"
              @click="setTransactionsFilter('sent')"
            >
              {{ $t('Sent') }}
            </button>
            <button
              class="btn-custom q-mt-none btn-received"
              :class="[getDarkModeClass(darkMode), {'active-transaction-btn border': transactionsFilter == 'received'}]"
              @click="setTransactionsFilter('received')"
            >
              {{ $t('Received') }}
            </button>
          </div>
          <div class="transaction-list">
            <template v-if="transactionsLoaded">
              <TransactionListItem
                v-for="(transaction, index) in transactions"
                :key="'tx-' + index"
                :transaction="transaction"
                :selected-asset="selectedAsset"
                :denominationTabSelected="denominationTabSelected"
                @click="showTransactionDetails(transaction)"
              />
              <div ref="bottom-transactions-list"></div>
              <TransactionListItemSkeleton v-if="transactionsAppending"/>
              <div
                v-else-if="transactionsPageHasNext"
                class="pt-label show-more-label"
                :class="getDarkModeClass(darkMode, '', isNotDefaultTheme(theme) ? '' : 'default')"
              >
                <p @click="() => { getTransactions(transactionsPage + 1, { scrollToBottom: true }) }">{{ $t('ShowMore') }}</p>
              </div>
              <div v-if="transactions.length === 0" class="relative text-center q-pt-md">
                <q-img class="vertical-top q-my-md no-transaction-img" src="empty-wallet.svg" />
                <p class="text-bow" :class="getDarkModeClass(darkMode)">{{ $t('NoTransactionsToDisplay') }}</p>
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
      :bch-wallet-hash="getWallet('bch').walletHash"
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
import PriceChart from '../../pages/transaction/dialog/PriceChart.vue'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
import connectedDialog from '../connect/connectedDialog.vue'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import TransactionListItem from 'src/components/transactions/TransactionListItem.vue'
import TransactionListItemSkeleton from 'src/components/transactions/TransactionListItemSkeleton.vue'
import { parseTransactionTransfer } from 'src/wallet/sbch/utils'
import { dragscroll } from 'vue-dragscroll'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'
import { VOffline } from 'v-offline'
import AssetFilter from '../../components/AssetFilter'
import axios from 'axios'
import Watchtower from 'watchtower-cash-js'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'

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
    VOffline,
    connectedDialog,
    PriceChart,
    AssetFilter
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
      prevPath: null,
      showTokenSuggestionsDialog: false,
      showTokens: this.$store.getters['global/showTokens'],
      isCashToken: true,
      settingsButtonIcon: 'settings',
      assetsCloseButtonColor: 'color: #3B7BF6;',
      denominationTabSelected: this.$t('DEEM'),
      parsedBCHBalance: '0',
      walletYield: null
    }
  },

  watch: {
    showTokens (n, o) {
      this.$store.commit('global/showTokens')
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
    'openedNotification.id': {
      handler() {
        if (!this.openedNotification?.id) return
        this.handleOpenedNotification()
      }
    },
    balanceLoaded (val) {
      if (val) {
        this.formatBCHCardBalance(this.denomination)
      }
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
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
    openedNotification() {
      return this.$store.getters['notification/openedNotification']
    },
    isDenominationTabEnabled () {
      return (isNotDefaultTheme(this.theme) &&
        (this.denomination === this.$t('DEEM') || this.denomination === 'DEEM') &&
        this.selectedNetwork !== 'sBCH')
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
      this.formatBCHCardBalance(this.denomination, asset?.balance || 0)
      return asset
    },
    mainchainAssets() {
      console.log('assets', this.$store.getters['assets/getAssets'])
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
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    isNotDefaultTheme,
    isHongKong,
    openPriceChart () {
      this.$q.dialog({
        component: PriceChart
      })
    },
    async updateTokenMenuPosition () {
      await this.$nextTick()
      this.$refs.tokenMenu.updatePosition()
    },
    toggleShowTokens () {
      this.showTokens = !this.showTokens
      this.adjustTransactionsDivHeight()
    },
    adjustTransactionsDivHeight (opts={timeout: 500}) {
      const vm = this
      let timeout = opts?.timeout
      if (Number.isNaN(timeout)) timeout = 500
      setTimeout(() => {
        const sectionHeight = vm.$refs.fixedSection.clientHeight
        vm.$refs.transactionSection.setAttribute(
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
      const vm = this
      vm.manageAssets = !vm.manageAssets
    },
    getAssetMarketBalance (asset) {
      if (!asset?.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)
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
      vm.hideAssetInfo()
      const txCheck = setInterval(function () {
        if (transaction) {
          if (!transaction?.asset) transaction.asset = vm.selectedAsset
          vm.$refs.transaction.show(transaction)
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
      this.$store.dispatch('assets/getAssetMetadata', asset.id)
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
    async getBchBalance (id) {
      const vm = this
      if (!id) {
        id = vm.selectedAsset.id
      }

      const tokenId = id.split('/')[1]
      vm.transactionsPageHasNext = false
      const updateAssetBalance = 'assets/updateAssetBalance'

      if (id.indexOf('slp/') > -1) {
        getWalletByNetwork(vm.wallet, 'slp').getBalance(tokenId).then(function (response) {
          vm.$store.commit(updateAssetBalance, { id, balance: response.balance })
          vm.balanceLoaded = true
        })
      } else if (id.indexOf('ct/') > -1) {
        getWalletByNetwork(vm.wallet, 'bch').getBalance(tokenId).then(response => {
          vm.$store.commit(updateAssetBalance, { id, balance: response.balance })
          vm.balanceLoaded = true
        })
      } else {
        getWalletByNetwork(vm.wallet, 'bch').getBalance().then(function (response) {
          vm.$store.commit(updateAssetBalance, {
            id: id,
            balance: response.balance,
            spendable: response.spendable,
            yield: response.yield
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
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions(tokenId, page, recordType)
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(page, recordType, tokenId)
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(page, recordType)
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
        .catch(error => {
          console.error('error:', error.response)
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

    // logIn () {
    //   const vm = this
    //   setTimeout(() => {
    //     // Security Authentication
    //     if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
    //       SecureStoragePlugin.get({ key: 'pin' })
    //         .then(() => {
    //           vm.setVerifyDialogAction()
    //         })
    //         .catch(_err => {
    //           vm.pinDialogAction = 'SET UP'
    //         })
    //     } else if (vm.$q.localStorage.getItem('preferredSecurity') === 'biometric') {
    //       vm.verifyBiometric()
    //     } else {
    //       vm.checkFingerprintAuthEnabled()
    //     }
    //   }, 500)
    // },

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
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)

      const wallet = new Wallet(mnemonic, vm.selectedNetwork)
      vm.wallet = markRaw(wallet)

      const storedWalletHash = vm.$store.getters['global/getWallet']('bch').walletHash
      const derivedWalletHash = getWalletByNetwork(vm.wallet, 'bch').walletHash

      if (storedWalletHash !== derivedWalletHash) {
        console.log('INCONSISTENCY DETECTED!')
        console.log('Wallet index:', walletIndex)
        this.$store.commit('global/updateCurrentWallet', walletIndex)
        // location.reload()
      }

      if (vm.selectedNetwork === 'BCH') {
        // Create change addresses if nothing is set yet
        // This is to make sure that v1 wallets auto-upgrades to v2 wallets
        const bchChangeAddress = vm.getChangeAddress('bch')
        getWalletByNetwork(vm.wallet, 'bch').getNewAddressSet(0).then(function ({
          addresses,
          purelypeerVaultSigner
        }) {
          if (bchChangeAddress.length === 0) {
            vm.$store.commit('global/updateWallet', {
              type: 'bch',
              walletHash: getWalletByNetwork(vm.wallet, 'bch').walletHash,
              derivationPath: getWalletByNetwork(vm.wallet, 'bch').derivationPath,
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: 0,
              purelypeerVaultSigner
            })
          }

          const ppvs = vm.$store.getters['global/getPurelypeerVaultSigner']
          const ppvsData = ppvs.receiving && ppvs.change
          if (!ppvsData) {
            vm.$store.commit('global/updatePurelypeerVaultSigner', {
              type: 'bch',
              purelypeerVaultSigner,
            })
          }
        })
        const slpChangeAddress = vm.getChangeAddress('slp')
        if (slpChangeAddress.length === 0) {
          getWalletByNetwork(vm.wallet, 'slp').getNewAddressSet(0).then(function (addresses) {
            vm.$store.commit('global/updateWallet', {
              type: 'slp',
              walletHash: getWalletByNetwork(vm.wallet, 'slp').walletHash,
              derivationPath: getWalletByNetwork(vm.wallet, 'slp').derivationPath,
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
      const offlineNotif = vm.$q.notify({
        type: 'negative',
        icon: 'signal_wifi_off',
        iconColor: 'primary',
        color: 'red-4',
        timeout: 0,
        message: this.$t('NoInternetConnectionNotice')
      })
      if (online === true) {
        if (!vm.wallet) await vm.loadWallets()
        console.log('connectivity assets', vm.assets)
        vm.assets.map((asset) => vm.getBalance(asset.id))

        if (Array.isArray(vm.assets) && vm.assets.length > 0) {
          const selectedAssetExists = vm.assets.find(asset => asset?.id == vm.selectedAsset?.id)
          if (!selectedAssetExists) vm.selectedAsset = vm.bchAsset
        }
        vm.getBalance(vm.selectedAsset.id)
        vm.getTransactions()

        vm.$store.dispatch('assets/updateTokenIcons', { all: false })
        vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
        offlineNotif()
      } else {
        vm.balanceLoaded = true
        vm.transactionsLoaded = true
      }
      this.adjustTransactionsDivHeight()
    },
    async handleOpenedNotification() {
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
          seamless: true,
          ok: true,
          class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
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
    formatBCHCardBalance (currentDenomination, currentBalance = 0) {
      const balance = currentBalance || this.bchAsset?.balance || 0
      this.parsedBCHBalance = parseAssetDenomination(currentDenomination, {
        id: '',
        balance,
        symbol: 'BCH',
        decimals: 0
      }, false, 10)
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
    }
  },

  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.prevPath = from.path
    })
  },

  async mounted () {
    const vm = this

    if (isNotDefaultTheme(vm.theme) && vm.darkMode) {
      vm.settingsButtonIcon = 'img:assets/img/theme/payhero/settings.png'
      vm.assetsCloseButtonColor = 'color: #ffbf00;'
    } else {
      vm.settingsButtonIcon = 'settings'
      vm.assetsCloseButtonColor = 'color: #3B7BF6;'
    }

    // Check if preferredSecurity and if it's set as PIN
    const preferredSecurity = this.$q.localStorage.getItem('preferredSecurity')
    let forceRecreate = false
    if (preferredSecurity === null) {
      forceRecreate = true
    } else if (preferredSecurity === 'pin') {
      // If using PIN, check if it's 6 digits
      try {
        const pin =  await SecureStoragePlugin.get({ key: 'pin' })
        if (pin.value.length < 6) {
          forceRecreate = true
        }
      } catch {
        forceRecreate = true
      }
    }
    if (forceRecreate) {
      await vm.$store.dispatch('global/updateOnboardingStep', 0)
      vm.$router.push('/accounts?recreate=true')
    }

    window.vm = this
    this.handleOpenedNotification()

    vm.adjustTransactionsDivHeight({ timeout: 50 })

    if (navigator.onLine) {
      vm.onConnectivityChange(true)
    } else {
      vm.loadWallets()
    }

    // If asset prices array is empty, immediately fetch asset prices
    if (vm.$store.state.market.assetPrices.length === 0) {
      vm.$store.dispatch('market/updateAssetPrices', {})
    }

    const assets = this.$store.getters['assets/getAssets']
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

    // Check for slow internet and/or accessibility of the backend
    axios.get('https://watchtower.cash', { timeout: 1000 * 60 }).then((resp) => {
      console.log('ONLINE')
    }).catch((error) => {
      console.log(error)
      vm.$store.dispatch('global/updateConnectivityStatus', false)
      vm.balanceLoaded = true
      vm.transactionsLoaded = true
    })

    vm.formatBCHCardBalance(vm.denomination)
    vm.$store.dispatch('market/updateAssetPrices', {})
    vm.computeWalletYield()
  }
}
</script>

<style lang="scss" scoped>
  #bch-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    .bch-skeleton {
      height: 53px;
      width: 100%
    }
  }
  .fixed-container {
    position: fixed;
    top: 0 !important;
    right: 0;
    left: 0;

  }
  .transaction-row {
    position: relative;
    margin-top: 355px;
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
  .transaction-container {
    min-height: 80vh;
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
  .show-more-label {
    margin-top: 20px;
    width: 100%;
    text-align: center;
    &.light.default {
      color: #3b7bf6 !important;
    }
  }
  .no-transaction-img {
    width: 75px;
    fill: gray;
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
  .show-tokens-label {
    margin-top: 0px;
    font-size: 13px;
    padding-bottom: 15px;
  }
</style>

<style>
.q-notifications__list--bottom {
  margin-bottom: 70px;
}
</style>
