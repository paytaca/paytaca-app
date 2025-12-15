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
              <div class="col text-white" @click="selectBch" v-touch-hold.mouse="() => showAssetInfo(bchAsset)">
                <q-card id="bch-card">
                  <q-card-section horizontal>
                    <q-card-section class="col flex items-center" style="padding: 10px 5px 10px 16px; min-height: 80px;">
                      <div v-if="!balanceLoaded && selectedAsset.id === 'bch'" style="min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; width: 100%;">
                        <div>
                          <q-skeleton type="rect" width="120px" height="24px" class="q-mb-xs" />
                          <q-skeleton type="rect" width="100px" height="16px" class="q-mb-xs" />
                        </div>
                        <div>
                          <q-skeleton type="rect" width="180px" height="24px" />
                        </div>
                      </div>
                      <div v-else style="min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; width: 100%;">
                        <div>
                          <p class="q-mb-none">
                            <span ellipsis class="text-h5" >
                              {{ bchBalanceText }}
                            </span>
                          </p>
                          <div v-if="getAssetMarketBalance(bchAsset)">
                            {{ getAssetMarketBalance(bchAsset) }}
                          </div>
                          <div v-else-if="loadingBchPrice" class="row justify-start">
                            <q-skeleton type="rect" width="100px" height="16px" />
                          </div>
                        </div>
                        <div>
                          <div @click.stop style="display: inline-block;">
                            <q-select
                              :model-value="bchBalanceMode"
                              :options="balanceModeOptions"
                              :dark="darkMode"
                              label-color="white"
                              option-label="label"
                              option-value="value"
                              emit-value
                              map-options
                              dense
                              borderless
                              class="balance-mode-selector q-mt-xs"
                              :popup-content-class="`text-bow ${getDarkModeClass(darkMode)}`"
                              style="max-width: 200px; font-size: 12px; height: 24px;"
                              @update:model-value="onBalanceModeChange"
                            />
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
              :refreshing-token-ids="refreshingTokenIds"
              :network="selectedNetwork"
              :wallet="wallet"
              :isCashToken="isCashToken"
              :currentCountry="currentCountry"
              :is-loading-initial="isLoadingAssets && !hasTokensButNoFavorites"
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
              :refreshing-token-ids="refreshingTokenIds"
              v-dragscroll.x="true"
              :network="selectedNetwork"
              :wallet="wallet"
              :isCashToken="isCashToken"
              :currentCountry="currentCountry"
              :is-loading-initial="isLoadingAssets && !hasTokensButNoFavorites"
              @select-asset="asset => setSelectedAsset(asset)"
              @show-asset-info="asset => showAssetInfo(asset)"
              @hide-asset-info="hideAssetInfo()"
              @removed-asset="selectBch()"
              @click="() => {txSearchActive = false; txSearchReference = ''}"
            >
            </asset-cards>
          </template>
          <div v-if="assets.length == 0 && !isLoadingAssets" style="margin-bottom: 10px;">
            <div class="text-center">
              <q-btn
                outline
                no-caps
                class="br-15"
                color="grey-7"
                icon="qr_code"
                padding="xs md"
                label="Receive Tokens"
                @click="$router.push({ name: 'transaction-receive', query: { assetId: 'ct/unlisted', network: 'BCH' } })"
              />
            </div>
          </div>

          <div v-if="hasTokensButNoFavorites" class="q-px-lg q-py-md" :class="darkMode ? 'text-light' : 'text-dark'">
            <div class="text-center q-pa-md" :class="getDarkModeClass(darkMode)">
              <q-icon name="star_outline" size="48px" :color="darkMode ? 'grey-6' : 'grey-7'" class="q-mb-sm"/>
              <p class="text-body1 q-mb-md" :class="getDarkModeClass(darkMode)">
                {{ $t('MarkTokensAsFavorites', {}, 'Mark tokens as favorites to show them here') }}
              </p>
              <q-btn
                flat
                no-caps
                :color="darkMode ? 'blue-4' : 'blue-6'"
                :label="$t('Manage')"
                icon-right="arrow_forward"
                @click="goToAssetList"
                padding="xs md"
                class="br-15"
              />
            </div>
          </div>

          <PendingTransactions :key="pendingTransactionsKey"/>

          <LatestTransactions 
            v-if="wallet"
            ref="latest-transactions"
            :wallet="wallet"
            :denominationTabSelected="denominationTabSelected"
          />
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
                  maxlength="8"
                  label="Search by Reference ID"
                  v-model="txSearchReference"
                  debounce="200"
                  placeholder="00000000"
                  @update:model-value="(val) => { 
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 8);
                    txSearchReference = cleaned;
                    executeTxSearch(txSearchReference);
                  }"
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
      :bch-wallet-hash="getWallet('bch')?.walletHash || ''"
      :slp-wallet-hash="getWallet('slp')?.walletHash || ''"
      :sbch-address="getWallet('sbch')?.lastAddress || ''"
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
import { refToHex } from 'src/utils/reference-id-utils'
import { generateSbchAddress } from 'src/utils/address-generation-utils.js'

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
import LatestTransactions from 'src/components/transactions/LatestTransactions.vue'
import * as assetSettings from 'src/utils/asset-settings'
import { asyncSleep } from 'src/wallet/transaction-listener'
import { cachedLoadWallet } from '../../wallet'
import axios from 'axios'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'

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
    LatestTransactions,
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
      refreshingTokenIds: [],
      wallet: null,
      isLoadingAssets: true,
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
      loadingBchPrice: false,
      bchBalanceMode: localStorage.getItem('bchBalanceMode') || 'bch-only',
      favoriteTokenIds: [], // Store favorite token IDs for synchronous access (deprecated, kept for compatibility)
      favoriteTokensFromAPI: [], // Store favorite tokens fetched from API with balances
      allTokensFromAPI: [] // Store all tokens fetched from API with balances (for favorites note logic)
    }
  },

  watch: {
    online(newValue, oldValue) {
      this.onConnectivityChange(newValue)
    },
    selectedNetwork() {
      // Refetch API data when network changes
      if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
        this.fetchAllTokensFromAPI()
      }
    },
    isCashToken() {
      // Refetch API data when token type changes
      if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
        this.fetchAllTokensFromAPI()
      }
    },
    'assets.length': {
      handler(before, after) {
        // e.g. if one network has assets but the other has none then changes network,
        // the spacing becomes off
        const assetsWasEmpty = before == 0
        const assetsIsEmpty = after == 0
        if (assetsWasEmpty !== assetsIsEmpty) this.adjustTransactionsDivHeight({ timeout: 100 })
        
        // Mark assets as loaded once they're available
        if (this.isLoadingAssets) {
          this.$nextTick(() => {
            this.isLoadingAssets = false
          })
        }
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
      
      // Use aggregated balance if mode is 'bch+favorites', otherwise use BCH balance only
      const balance = this.bchBalanceMode === 'bch+favorites' 
        ? this.aggregatedBchBalance 
        : this.bchAsset.balance

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

      // For CashTokens on BCH network, use favorite tokens from API (favorites_only=true)
      // This ensures we only fetch and display favorited tokens
      if (vm.selectedNetwork !== 'sBCH' && vm.isCashToken) {
        return this.favoriteTokensFromAPI || []
      }

      // For sBCH network, use store data (API doesn't support sBCH yet)
      if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets

      // For SLP tokens, use store data (API doesn't support SLP yet)
      return vm.mainchainAssets.filter(token => {
        const assetId = token.id?.split?.('/')?.[0]
        return (
          vm.isCashToken && assetId === 'ct' ||
          !vm.isCashToken && assetId === 'slp'
        )
      })
    },
    hasTokensButNoFavorites () {
      // Check if there are tokens (excluding BCH) but no favorites
      // Only show this message when:
      // 1. There are tokens available from API (not from Vuex store)
      // 2. No favorites are set (check favoriteTokensFromAPI directly since favoriteTokens might be empty for sBCH/SLP)
      // 3. Balance is loaded (indicates assets have been processed)

      // For CashTokens, use API data exclusively - never use Vuex store
      let hasTokens = false
      if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
        hasTokens = this.allTokensFromAPI && this.allTokensFromAPI.length > 0
      } else {
        // For sBCH or SLP, fall back to Vuex store (since API doesn't support these yet)
        hasTokens = this.assets && this.assets.length > 0
      }

      // Check if favoriteTokensFromAPI is populated (uses API data exclusively)
      // For CashTokens, check API data directly
      let hasFavorites = false
      if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
        hasFavorites = this.favoriteTokensFromAPI && this.favoriteTokensFromAPI.length > 0
      } else {
        // For sBCH or SLP, check favoriteTokens computed property
        hasFavorites = this.favoriteTokens && this.favoriteTokens.length > 0
      }

      const assetsLoaded = this.balanceLoaded // Use balanceLoaded as indicator that assets are ready
      const result = hasTokens && !hasFavorites && assetsLoaded

      return result
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
    },
    balanceModeOptions () {
      return [
        { label: this.$t('BCHOnly', {}, 'BCH only'), value: 'bch-only' },
        { label: this.$t('BCHPlusFavorites', {}, 'BCH + favorite tokens'), value: 'bch+favorites' }
      ]
    },
    favoriteTokens () {
      // Always use API data only - never use Vuex store for favorite tokens
      // For CashTokens on BCH network, return API data
      if (this.selectedNetwork !== 'sBCH' && this.isCashToken) {
        return this.favoriteTokensFromAPI || []
      }

      // For sBCH or SLP, the API doesn't support favorites_only yet
      // Return empty array instead of using store data
      return []
    },
    aggregatedBchBalance () {
      // If mode is 'bch-only', just return BCH balance in satoshis
      if (this.bchBalanceMode !== 'bch+favorites') {
        return Number(this.bchAsset?.balance || 0)
      }

      // Get BCH price in fiat
      const bchPriceInFiat = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchPriceInFiat || bchPriceInFiat === 0) {
        // If BCH price not available, return BCH balance only
        return Number(this.bchAsset?.balance || 0)
      }

      // Get BCH balance - balance is already in BCH units
      const bchBalanceInBch = Number(this.bchAsset?.balance || 0)
      let totalBalanceInBch = bchBalanceInBch

      // Get favorite tokens
      const favoriteAssets = this.favoriteTokens

      // Calculate aggregated balance - sum all values in BCH
      for (const token of favoriteAssets) {
        try {
          // Get token balance and account for decimals
          let tokenBalance = Number(token.balance || 0)
          if (token.decimals) {
            const decimals = parseInt(token.decimals) || 0
            if (decimals > 0) {
              tokenBalance = tokenBalance / (10 ** decimals)
            }
          }

          // Get token price in fiat
          const tokenPriceInFiat = this.$store.getters['market/getAssetPrice'](token.id, this.selectedMarketCurrency)
          if (!tokenPriceInFiat || tokenPriceInFiat === 0) {
            // Skip tokens without prices
            continue
          }

          // Calculate token value in BCH: (tokenBalance * tokenPriceInFiat) / bchPriceInFiat
          const tokenValueInBch = (tokenBalance * tokenPriceInFiat) / bchPriceInFiat
          
          // Add to total in BCH
          totalBalanceInBch += tokenValueInBch
        } catch (error) {
          // Skip tokens with errors
          console.debug('Error calculating token value for aggregated balance:', token.id, error)
          continue
        }
      }

      // Return total in BCH (balance is already in BCH units)
      return totalBalanceInBch
    },
    aggregatedFiatValue () {
      if (this.bchBalanceMode !== 'bch+favorites') {
        return this.getAssetMarketBalance(this.bchAsset)
      }

      // Start with BCH balance fiat conversion
      const bchBalance = Number(this.bchAsset?.balance || 0)
      const bchPriceInFiat = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      
      if (!bchPriceInFiat || bchPriceInFiat === 0) {
        return ''
      }

      // BCH balance is already in BCH units, not satoshis
      const bchBalanceInBch = bchBalance
      const bchFiatValue = bchBalanceInBch * Number(bchPriceInFiat)
      let totalFiatValue = bchFiatValue

      // Get favorite tokens
      const favoriteAssets = this.favoriteTokens

      // Add fiat conversion of each token balance directly
      for (const token of favoriteAssets) {
        try {
          // Get token balance and account for decimals
          let tokenBalance = Number(token.balance || 0)
          if (token.decimals) {
            const decimals = parseInt(token.decimals) || 0
            if (decimals > 0) {
              tokenBalance = tokenBalance / (10 ** decimals)
            }
          }

          // Get token price in fiat
          const tokenPriceInFiat = this.$store.getters['market/getAssetPrice'](token.id, this.selectedMarketCurrency)
          if (!tokenPriceInFiat || tokenPriceInFiat === 0) {
            // Skip tokens without prices
            continue
          }

          // Calculate token value in fiat directly: tokenBalance * tokenPriceInFiat
          const tokenValueInFiat = tokenBalance * tokenPriceInFiat
          
          totalFiatValue += tokenValueInFiat
        } catch (error) {
          // Skip tokens with errors
          console.debug('Error calculating token fiat value for aggregated balance:', token.id, error)
          continue
        }
      }

      return parseFiatCurrency(totalFiatValue.toFixed(2), this.selectedMarketCurrency)
    }
  },
  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    isHongKong,
    serializeTransaction (tx) {
      if (!tx) return null
      
      // Create a serializable copy of the transaction
      // Remove functions, circular references, and non-serializable objects
      try {
        const serialized = JSON.parse(JSON.stringify(tx, (key, value) => {
          // Skip functions
          if (typeof value === 'function') {
            return undefined
          }
          // Skip symbols
          if (typeof value === 'symbol') {
            return undefined
          }
          // Convert BigNumber-like objects to strings if they have toString
          if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
            try {
              return value.toString()
            } catch (e) {
              return undefined
            }
          }
          return value
        }))
        return serialized
      } catch (error) {
        console.error('Error serializing transaction:', error)
        // Fallback: return only essential properties
        return {
          txid: tx.txid || tx.tx_hash || tx.hash,
          asset: tx.asset,
          record_type: tx.record_type,
          amount: tx.amount,
          date_created: tx.date_created,
          block: tx.block,
          from: tx.from,
          to: tx.to,
          senders: tx.senders,
          recipients: tx.recipients
        }
      }
    },
    onBalanceModeChange (value) {
      // Save to localStorage for persistence
      localStorage.setItem('bchBalanceMode', value)
      this.bchBalanceMode = value
    },
    async fetchFavoriteTokensFromAPI () {
      // Fetch favorite tokens directly from API with balances included
      // Uses favorites_only=true to only get favorite tokens - no need for favorites API endpoint
      if (this.selectedNetwork === 'sBCH' || !this.isCashToken) {
        // For sBCH or SLP, API doesn't support favorites_only yet
        this.favoriteTokensFromAPI = []
        return []
      }

      if (!this.wallet) {
        console.warn('Wallet not loaded, cannot fetch favorite tokens')
        this.favoriteTokensFromAPI = []
        return []
      }

      const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
      if (!walletHash) {
        console.warn('Wallet hash not available')
        this.favoriteTokensFromAPI = []
        return []
      }

      const isChipnet = this.$store.getters['global/isChipnet']
      const baseUrl = getWatchtowerApiUrl(isChipnet)

      const filterParams = {
        has_balance: true,
        token_type: 1,
        wallet_hash: walletHash,
        favorites_only: 'true', // Only fetch favorite tokens - no need for exclude_token_ids or favorites API
        limit: 100
      }

      try {
        const url = `${baseUrl}/cashtokens/fungible/`
        let allTokens = []
        let nextUrl = url
        let params = filterParams

        // Fetch all pages if there are more results
        while (nextUrl) {
          const { data } = await axios.get(nextUrl, { params })

          if (!Array.isArray(data.results)) {
            break
          }

          // Map API response to asset format expected by the component
          const tokens = data.results.map(result => {
            const logo = result.image_url ? convertIpfsUrl(result.image_url) : null

            return {
              id: result.id,
              name: result.name || 'Unknown Token',
              symbol: result.symbol || '',
              decimals: result.decimals || 0,
              logo: logo,
              balance: result.balance !== undefined ? result.balance : 0,
              favorite: result.favorite === true ? 1 : 0,
              favorite_order: result.favorite_order !== null && result.favorite_order !== undefined ? result.favorite_order : null
            }
          })

          allTokens = [...allTokens, ...tokens]

          // Check if there's a next page
          if (data.next) {
            nextUrl = data.next
            params = {} // Don't send params again, URL already has them
          } else {
            nextUrl = null
          }
        }

        // Update favoriteTokenIds for backward compatibility
        this.favoriteTokenIds = allTokens.map(token => token.id).filter(id => id !== 'bch')

        // Store the full token data with balances
        this.favoriteTokensFromAPI = allTokens

        // Update store assets with balances and metadata (including icons) from API
        allTokens.forEach(token => {
          // Update balance
          this.$store.commit('assets/updateAssetBalance', {
            id: token.id,
            balance: token.balance
          })
          
          // Update metadata including icon - API provides the latest icon
          // Use both updateAssetMetadata and updateAssetImageUrl to ensure icon is updated
          if (token.logo) {
            // Update full metadata
            this.$store.commit('assets/updateAssetMetadata', {
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logo: token.logo // Use icon from API (always up-to-date)
            })
            // Also update icon URL directly (works even if asset doesn't exist in store yet)
            this.$store.commit('assets/updateAssetImageUrl', {
              assetId: token.id,
              imageUrl: token.logo
            })
          }
        })

        return allTokens
      } catch (error) {
        console.error('Error fetching favorite tokens from API:', error)
        this.favoriteTokensFromAPI = []
        return []
      }
    },
    async fetchAllTokensFromAPI () {
      // Fetch all tokens directly from API with balances included (not just favorites)
      // This is used to determine if wallet has tokens for the favorites note display logic
      if (this.selectedNetwork === 'sBCH' || !this.isCashToken) {
        // For sBCH or SLP, API doesn't support fetching all tokens yet
        return []
      }

      if (!this.wallet) {
        console.warn('Wallet not loaded, cannot fetch all tokens')
        return []
      }

      const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
      if (!walletHash) {
        console.warn('Wallet hash not available')
        return []
      }

      const isChipnet = this.$store.getters['global/isChipnet']
      const baseUrl = getWatchtowerApiUrl(isChipnet)

      const filterParams = {
        has_balance: true,
        token_type: 1,
        wallet_hash: walletHash,
        limit: 100 // Fetch more tokens per page
      }

      try {
        const url = `${baseUrl}/cashtokens/fungible/`
        let allTokens = []
        let nextUrl = url
        let params = filterParams

        // Fetch all pages if there are more results
        while (nextUrl) {
          const response = await axios.get(nextUrl, { params })
          const data = response?.data

          // Check if response data exists and has results array
          if (!data) {
            console.warn('API response has no data:', response)
            break
          }

          if (!Array.isArray(data.results)) {
            console.warn('API response results is not an array:', data)
            break
          }

          // Map API response to asset format expected by the component
          const tokens = data.results.map(result => {
            if (!result || !result.id) {
              console.warn('Invalid token result:', result)
              return null
            }

            const logo = result.image_url ? convertIpfsUrl(result.image_url) : null

            return {
              id: result.id,
              name: result.name || 'Unknown Token',
              symbol: result.symbol || '',
              decimals: result.decimals || 0,
              logo: logo,
              balance: result.balance !== undefined ? result.balance : 0,
              favorite: result.favorite === true ? 1 : 0,
              favorite_order: result.favorite_order !== null && result.favorite_order !== undefined ? result.favorite_order : null
            }
          }).filter(Boolean) // Remove any null entries from invalid results

          allTokens = [...allTokens, ...tokens]

          // Check if there's a next page
          if (data.next) {
            nextUrl = data.next
            params = {} // Don't send params again, URL already has them
          } else {
            nextUrl = null
          }
        }

        // Store the result in the component data for computed property access
        this.allTokensFromAPI = allTokens

        // Update store assets with metadata (including icons) from API
        allTokens.forEach(token => {
          // Update metadata including icon - API provides the latest icon
          // Use both updateAssetMetadata and updateAssetImageUrl to ensure icon is updated
          if (token.logo) {
            // Update full metadata
            this.$store.commit('assets/updateAssetMetadata', {
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logo: token.logo // Use icon from API (always up-to-date)
            })
            // Also update icon URL directly (works even if asset doesn't exist in store yet)
            this.$store.commit('assets/updateAssetImageUrl', {
              assetId: token.id,
              imageUrl: token.logo
            })
          }
        })

        console.log(`Fetched ${allTokens.length} tokens from API for wallet ${walletHash}`)
        return allTokens
      } catch (error) {
        console.error('Error fetching all tokens from API:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          params: error.config?.params
        })
        this.allTokensFromAPI = []
        return []
      }
    },
    async onRefresh (done) {
      try {
        // Refresh wallet balances and token icons
        await this.onConnectivityChange(true)
        
        // Fetch favorite tokens from API (includes balances for CashTokens)
        await this.refreshFavoriteTokenBalances()
        
        // Refresh prices for all favorite tokens + BCH
        await this.refreshFavoriteTokenPrices()
        
        // Refresh transaction list
        if (this.$refs['transaction-list-component']) {
          await this.$refs['transaction-list-component'].getTransactions(1)
        }
        
        // Refresh pending transactions
        this.pendingTransactionsKey++
        
        // Refresh latest transactions
        if (this.$refs['latest-transactions']) {
          await this.$refs['latest-transactions'].refresh()
        }
      } catch (error) {
        console.error('Error refreshing:', error)
      } finally {
        done()
      }
    },
    executeTxSearch (value) {
      const valueStr = String(value || '')
      // Allow empty or 8-digit decimal
      if (valueStr.length === 0 || valueStr.length === 8) {
        // Convert decimal reference to hex before API call
        const hexRef = valueStr && valueStr.length === 8 ? refToHex(valueStr) : valueStr
        const opts = {txSearchReference: hexRef}
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
    selectBch (event) {     
      const vm = this
      
      // Check if click is on the dropdown or its menu
      if (event && event.target) {
        const target = event.target
        const isDropdownClick = target.closest('.balance-mode-selector') || 
                                target.closest('.q-menu') ||
                                target.closest('.q-select__dropdown-icon') ||
                                target.classList.contains('balance-mode-selector')
        
        if (isDropdownClick) {
          return // Don't handle click if it's on the dropdown
        }
      }
      
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
            this.$router.push({ name: 'transaction-list', query: { assetID: 'bch' }}) 
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

      // If BCH and mode is 'bch+favorites', return aggregated fiat value
      if (asset.id === 'bch' && this.bchBalanceMode === 'bch+favorites') {
        return this.aggregatedFiatValue
      }

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
    async getSbchBalance (id, vm) {
      if (!id) {
        id = vm.selectedAsset.id
      }
      const parsedId = String(id)

      const address = await generateSbchAddress({
        walletIndex: vm.$store.getters['global/getWalletIndex']
      })
      if (!address) {
        return Promise.reject(new Error('Failed to generate sBCH address'))
      }
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
      const preferredSecurity = this.$store.getters['global/preferredSecurity']
      if (preferredSecurity === 'pin') {
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
      this.$store.commit('global/setPreferredSecurity', auth)
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
        // Sync settings to darkmode and market modules
        this.$store.dispatch('global/syncSettingsToModules')
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

        // Fetch favorite tokens from API (includes balances for CashTokens)
        const favoriteRefreshPromise = vm.refreshFavoriteTokenBalances()

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
          favoriteRefreshPromise,
          // txFetchPromise,
          tokenIconUpdatePromise,
        ])
      } else {
        vm.balanceLoaded = true
        vm.transactionsLoaded = true
      }
      this.adjustTransactionsDivHeight()
    },
    async refreshFavoriteTokenBalances() {
      const vm = this
      try {
        // Always use API for favorite tokens - never use Vuex store
        // For CashTokens on BCH network, fetch from API (balances already included)
        if (vm.selectedNetwork !== 'sBCH' && vm.isCashToken) {
          // Add tokens to refreshing array to show skeleton loaders
          const currentFavoriteIds = vm.favoriteTokenIds
          const tokensToRefresh = [...new Set([...currentFavoriteIds, 'bch'])]
          
          tokensToRefresh.forEach(tokenId => {
            if (!vm.refreshingTokenIds.includes(tokenId)) {
              vm.refreshingTokenIds.push(tokenId)
            }
          })

          // Fetch favorite tokens from API (includes balances)
          await vm.fetchFavoriteTokensFromAPI()

          // Also fetch all tokens from API for favorites note logic
          await vm.fetchAllTokensFromAPI()
          
          // Remove tokens from refreshing array
          tokensToRefresh.forEach(tokenId => {
            const index = vm.refreshingTokenIds.indexOf(tokenId)
            if (index > -1) {
              vm.refreshingTokenIds.splice(index, 1)
            }
          })

          // Still need to refresh BCH balance separately
          return vm.getBalance('bch')
            .catch(error => {
              console.error('Error refreshing BCH balance:', error)
              return null
            })
        } else {
          // For sBCH or SLP, the API doesn't support favorites_only yet
          // Just refresh BCH balance
          if (!vm.refreshingTokenIds.includes('bch')) {
            vm.refreshingTokenIds.push('bch')
          }
          
          return vm.getBalance('bch')
            .catch(error => {
              console.error('Error refreshing BCH balance:', error)
              return null
            })
            .finally(() => {
              const index = vm.refreshingTokenIds.indexOf('bch')
              if (index > -1) {
                vm.refreshingTokenIds.splice(index, 1)
              }
            })
        }
      } catch (error) {
        console.error('Error refreshing favorite token balances:', error)
        vm.refreshingTokenIds = []
        return Promise.resolve()
      }
    },
    async refreshFavoriteTokenPrices() {
      const vm = this
      try {
        // Always use API data only - never use Vuex store for favorite tokens
        let favoriteTokenIds = []
        
        if (vm.selectedNetwork !== 'sBCH' && vm.isCashToken) {
          // Use token IDs from API data
          favoriteTokenIds = vm.favoriteTokensFromAPI.map(token => token.id).filter(Boolean)
        } else {
          // For sBCH or SLP, API doesn't support favorites_only yet
          // No favorite tokens to refresh prices for
          favoriteTokenIds = []
        }

        // Always include BCH (id: 'bch')
        const tokensToRefresh = [...new Set([...favoriteTokenIds, 'bch'])]

        // Refresh prices for all favorite tokens + BCH using unified API
        const pricePromises = tokensToRefresh.map(assetId => {
          return vm.$store.dispatch('market/updateAssetPrices', {
            assetId: assetId,
            clearExisting: false
          }).catch(error => {
            console.error(`Error refreshing price for ${assetId}:`, error)
            return null
          })
        })

        return Promise.allSettled(pricePromises)
      } catch (error) {
        console.error('Error refreshing favorite token prices:', error)
        return Promise.resolve()
      }
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

      // Navigate to transaction detail page instead of opening dialog
      const finalAssetId = String(asset?.id || assetId || 'bch')
      const query = (() => {
        // BCH: no category
        if (finalAssetId === 'bch' || (finalAssetId.startsWith('bch') && !finalAssetId.includes('/'))) {
          return {}
        }
        // Token: extract category from ct/{category} or slp/{category}
        const parts = finalAssetId.split('/')
        if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
          return { category: parts[1] }
        }
        return {}
      })()

      if (!transaction.asset && asset) {
        transaction.asset = asset
      }

      // Serialize transaction object to avoid DataCloneError
      const serializedTx = this.serializeTransaction(transaction)

      this.$router.push({
        name: 'transaction-detail',
        params: { txid },
        query,
        state: { tx: serializedTx }
      })
    },
    async findTransaction(data = {txid, assetId, logIndex, chain: 'BCH'}) {
      if (!data) return
      const { txid, assetId, chain, logIndex } = data
      const transaction = this.transactions?.find?.(tx => (tx?.txid || tx?.tx_hash) === txid)
      if (transaction) return transaction

      const watchtower = new Watchtower()
      if (chain === 'sBCH') {
        return watchtower.BCH._api(`smartbch/transactions/${txid}/transfers/`)
          .then(async response => {
            const txTransfer = response?.data?.find?.(tx => {
              if (typeof logIndex === 'number') return tx?.log_index === logIndex
              return true
            })
            const address = await generateSbchAddress({
              walletIndex: this.$store.getters['global/getWalletIndex']
            })
            if (!address) {
              throw new Error('Failed to generate sBCH address')
            }
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
      const preferredSecurity = this.$store.getters['global/preferredSecurity']
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
    try {
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
        console.error('Error in cashin operations:', error)
      }

      // refactored to fetch tokens in batch by 3 instead of all at once
      const assets = vm.$store.getters['assets/getAssets'] || []
      for (var i = 0; i < assets.length; i = i + 3) {
        const chunk = assets.slice(i, i + 3).map(a => {
          return vm.$store.dispatch('assets/getAssetMetadata', a.id)
        })
        await Promise.allSettled(chunk)
      }

      // check if newly-received token is already stored in vuex store,
      // if not, then add it to the very first of the list
      try {
        const tokens = vm.selectedNetwork === 'sBCH' ? await vm.getSmartchainTokens() : await vm.getMainchainTokens()
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const removedAssetIdsGetter = vm.$store.getters['assets/getRemovedAssetIds']
        const vaultRemovedAssetIds = removedAssetIdsGetter?.[walletIndex]?.removedAssetIds ?? []

        if (tokens && tokens.length > 0) {
          const assetsId = assets.map(a => a.id)
          const newTokens = tokens.filter(b => !assetsId.includes(b.id) && !vaultRemovedAssetIds.includes(b.id))

          newTokens.forEach(token => {
            vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, token)
            vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
          })
        }
      } catch (error) {
        console.error('Error loading tokens:', error)
      }

      // Fetch favorite tokens from API (includes balances for CashTokens)
      try {
        await vm.fetchFavoriteTokensFromAPI()
      } catch (error) {
        console.error('Error fetching favorite tokens from API:', error)
      }

      // Fetch all tokens from API for favorites note logic
      try {
        await vm.fetchAllTokensFromAPI()
      } catch (error) {
        console.error('Error fetching all tokens from API:', error)
      }

      // Fetch prices for all favorite tokens + BCH using unified API
      // Only show loading if price is not already available
      try {
        const existingBchPrice = vm.$store.getters['market/getAssetPrice']('bch', vm.selectedMarketCurrency)
        if (!existingBchPrice) {
          vm.loadingBchPrice = true
        }
        vm.refreshFavoriteTokenPrices()
          .then(() => {
            vm.loadingBchPrice = false
          })
          .catch(() => {
            vm.loadingBchPrice = false
          })
      } catch (error) {
        console.error('Error refreshing token prices:', error)
        vm.loadingBchPrice = false
      }

      try {
        vm.computeWalletYield()
      } catch (error) {
        console.error('Error computing wallet yield:', error)
      }

      // Set loading to false after initial mount operations complete
      // If assets exist, the watcher will handle it, otherwise set it after a delay
      this.$nextTick(() => {
        if (this.assets.length === 0) {
          // If no assets, still mark as loaded after a brief delay
          setTimeout(() => {
            this.isLoadingAssets = false
          }, 500)
        }
      })
    } catch (error) {
      console.error('Error in mounted hook:', error)
      // Ensure loading state is reset even on error
      this.isLoadingAssets = false
      this.loadingBchPrice = false
    }
  },
}
</script>

<style lang="scss" scoped>
  /* Hide scrollbar completely on all platforms */
  #app-container {
    padding-bottom: 30px; // Increased bottom padding to ensure clickable elements near the bottom are visible and clickable
    
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
    height: 108px;
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

<style lang="scss">
.q-notifications__list--bottom {
  margin-bottom: 70px;
}
.balance-mode-selector {
  .q-field__inner
  .q-field__control .q-field__control-container
  .q-field__native > .ellipsis, .q-field__append .q-icon {
    color: white !important;
  }
}
</style>
