<template>
  <div id="app-container" class="scroll-y" :class="getDarkModeClass(darkMode)">
    <div>
      <q-pull-to-refresh @refresh="refresh">
        <div ref="fixedSection" class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
          <q-resize-observer @resize="onFixedSectionResize" />
          <div :class="{'pt-header home-header' : isNotDefaultTheme(theme)}">
            <connected-dialog v-if="$q.platform.is.bex" @click="() => $refs['connected-dialog'].show()" ref="connected-dialog"></connected-dialog>

            <div
              class="row q-px-sm q-pt-sm"
              :style="{'margin-top': $q.platform.is.ios ? '55px' : '0px'}"
            >
              <MultiWalletDropdown ref="multi-wallet-component" />
              <NotificationButton
                @hide-multi-wallet-dialog="hideMultiWalletDialog"
                @find-and-open-transaction="findAndOpenTransaction"
              />
            </div>

            <div class="row" :class="enableSmartBCH || enableStablhedge ? 'q-pt-lg': 'q-pt-sm'">
              <template v-if="enableStablhedge">
                <q-tabs
                  class="col-12 q-px-sm q-pb-md"
                  v-model="stablehedgeTab"
                  style="margin-top: -25px;"
                  :indicator-color="(isNotDefaultTheme(theme) && denomination !== $t('DEEM')) ? 'transparent' : ''"
                >
                  <q-tab
                    name="bch"
                    class="network-selection-tab"
                    :class="[getDarkModeClass(darkMode), {'transactions-page': denomination === $t('DEEM')}]"
                    label="BCH"
                  />
                  <q-tab
                    name="stablehedge"
                    class="network-selection-tab"
                    :class="[getDarkModeClass(darkMode), {'transactions-page': denomination === $t('DEEM')}]"
                    :label="$t('Stablehedge')"
                  />
                </q-tabs>
              </template>
              <template v-if="enableSmartBCH">
                <q-tabs
                  class="col-12 q-px-sm q-pb-md"
                  :modelValue="selectedNetwork"
                  @update:modelValue="changeNetwork"
                  style="margin-top: -25px;"
                  :indicator-color="(isNotDefaultTheme(theme) && denomination !== $t('DEEM')) ? 'transparent' : ''"
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
                  :indicator-color="isNotDefaultTheme(theme) ? 'transparent' : ''"
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
                          <!-- <q-icon v-if="stablehedgeView" name="ac_unit" class="text-h5" style="margin-top:-0.40em;"/> -->
                          <span ellipsis class="text-h5" :class="{'text-grad' : isNotDefaultTheme(theme)}">
                            {{ bchBalanceText }}
                          </span>
                        </p>
                        <div v-if="stablehedgeView && stablehedgeWalletData?.balancesWithoutSats?.length">
                          + 
                          <template v-if="stablehedgeWalletData?.balancesWithoutSats?.length === 1">
                            <template v-for="tokenBalance in stablehedgeWalletData?.balancesWithoutSats">
                              {{ tokenBalance?.standardizedAmount }}
                              {{ tokenBalance?.currency || 'UNITS' }}
                            </template>
                          </template>
                          <template v-else>
                            {{ stablehedgeWalletData?.balancesWithoutSats?.length }}
                            {{ $t('Tokens') }}
                          </template>
                        </div>
                        <div v-else>{{ getAssetMarketBalance(bchAsset) }}</div>
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
                        <StablehedgeButtons
                          v-if="stablehedgeView"
                          class="q-mt-xs"
                          :selectedDenomination="selectedDenomination"
                          @deposit="onStablehedgeTransaction"
                          @redeem="onStablehedgeTransaction"
                        />
                        <div v-else-if="hasCashin">
                          <q-btn class="cash-in q-mt-xs" padding="0" no-caps rounded dense @click.stop="openCashIn">
                            <q-icon size="1.25em" name="add" style="padding-left: 5px;"/>
                            <div style="padding-right: 10px;">Cash In</div>
                            <q-badge v-if="hasCashinAlert" align-left floating rounded color="red"/>
                          </q-btn>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section class="col-4 flex items-center justify-end" style="padding: 10px 16px">
                      <div v-if="selectedNetwork === 'sBCH'">
                        <img src="sep20-logo.png" alt="" style="height: 75px;"/>
                      </div>
                      <div v-else>
                        <img
                          :src="denominationTabSelected === $t('DEEM')
                            ? 'assets/img/theme/payhero/deem-logo.png'
                            : stablehedgeView ? 'assets/img/stablehedge/stablehedge-bch.svg' : 'bch-logo.png'
                          "
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
                <template v-if="stablehedgeView"> {{ $t('Stablehedge') }}</template>
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
                  v-if="!stablehedgeView"
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

            <div
              v-show="selectedNetwork === networks.BCH.name"
              class="col-3 q-mt-sm"
              style="margin-top: -5px !important;"
            >
              <AssetFilter v-if="!stablehedgeView" @filterTokens="isCT => isCashToken = isCT" />
              <KeepAlive>
                <div v-if="stablehedgeView" class="row items-center q-px-lg">
                  <q-space/>
                  <q-btn
                    flat
                    no-caps
                    icon="query_stats"
                    padding="sm"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    @click="() => openStablehedgeMarketsDialog = true"
                  />
                  <StablehedgeMarketsDialog v-model="openStablehedgeMarketsDialog"/>
                </div>
              </KeepAlive>
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
              @removed-asset="selectBch()"
              @click="() => {txSearchActive = false; txSearchReference = ''}"
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
              @removed-asset="selectBch()"
              @click="() => {txSearchActive = false; txSearchReference = ''}"
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
              <template v-if="selectedAsset.symbol.toLowerCase() === 'bch' && !txSearchActive">
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
              </template>
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
          <KeepAlive>
            <StablehedgeHistory
              v-if="stablehedgeView && selectedNetwork === 'BCH'"
              ref="transaction-list-component"
              :selectedAssetId="selectedAsset?.id"
              :transactionsFilter="transactionsFilter"
              :selectedDenomination="selectedDenomination"
              @resolved-transaction="onStablehedgeTransaction"
            />
            <TransactionList
              v-else
              ref="transaction-list-component"
              :selectedAssetProps="selectedAsset"
              :denominationTabSelected="denominationTabSelected"
              :wallet="wallet"
              :selectedNetworkProps="selectedNetwork"
              @on-show-transaction-details="showTransactionDetails"
            />
          </KeepAlive>
        </div>
      </div>
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
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Watchtower from 'watchtower-cash-js'
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
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
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { debounce } from 'quasar'

import TokenSuggestionsDialog from '../../components/TokenSuggestionsDialog'
import Transaction from '../../components/transaction'
import AssetCards from '../../components/asset-cards'
import AssetInfo from '../../pages/transaction/dialog/AssetInfo.vue'
import PriceChart from '../../pages/transaction/dialog/PriceChart.vue'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
import connectedDialog from '../connect/connectedDialog.vue'
import AssetFilter from '../../components/AssetFilter'
import TransactionList from 'src/components/transactions/TransactionList'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown'
import CashIn from 'src/components/cash-in/CashinIndex.vue'
import StablehedgeButtons from 'src/components/stablehedge/StablehedgeButtons.vue'
import StablehedgeHistory from 'src/components/stablehedge/StablehedgeHistory.vue'
import StablehedgeMarketsDialog from 'src/components/stablehedge/dashboard/StablehedgeMarketsDialog.vue'
import packageInfo from '../../../package.json'
import versionUpdate from './dialog/versionUpdate.vue'
import NotificationButton from 'src/components/notifications/NotificationButton.vue'
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
    StablehedgeButtons,
    StablehedgeHistory,
    StablehedgeMarketsDialog,
    NotificationButton
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
      stablehedgeView: false,
      txSearchActive: false,
      txSearchReference: '',
      openStablehedgeMarketsDialog: false,
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
      showTokens: this.$store.getters['global/showTokens'],
      isCashToken: true,
      settingsButtonIcon: 'settings',
      assetsCloseButtonColor: 'color: #3B7BF6;',
      denominationTabSelected: 'BCH',
      parsedBCHBalance: '0',
      walletYield: null,
      hasCashin: false,
      hasCashinAlert: false,
      availableCashinFiat: null,
      isPriceChartDialogShown: false,
      websocketManager: null
    }
  },

  watch: {
    online(newValue, oldValue) {
      this.onConnectivityChange(newValue)
    },
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
    stablehedgeTab: {
      get() {
        return this.stablehedgeView ? 'stablehedge' : 'bch'
      },
      set(value) {
        this.stablehedgeView = value === 'stablehedge'
        this.$nextTick(() => {
          this.$refs['transaction-list-component'].resetValues(null, null, this.selectedAsset)
          this.$refs['transaction-list-component'].getTransactions()
        })
      }
    },
    enableStablhedge () {
      return this.$store.getters['global/enableStablhedge']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    isDenominationTabEnabled () {
      return (isNotDefaultTheme(this.theme) &&
        (this.denomination === this.$t('DEEM') || this.denomination === 'BCH') &&
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
      return asset
    },
    bchBalanceText() {
      if (!this.balanceLoaded && this.selectedAsset?.id === this?.bchAsset?.id) return '0'
      const currentDenomination = this.selectedDenomination
      const balance = this.stablehedgeView
        ? this.stablehedgeWalletData.balance
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
    stablehedgeWalletData() {
      const sats = this.$store.getters['stablehedge/totalTokenBalancesInSats']
      const balance = sats / 10 ** 8
      const tokenBalances = this.$store.getters['stablehedge/tokenBalancesWithSats']
      const balancesWithoutSats = tokenBalances.filter(tokenBalance => {
        return !Number.isFinite(tokenBalance?.satoshis)
      }).map(tokenBalance => {
        const token = this.$store.getters['stablehedge/token']?.(tokenBalance?.category)
        const decimals = parseInt(token?.decimals) || 0

        return {
          ...tokenBalance,
          decimals: decimals,
          currency: token?.currency,
          standardizedAmount: tokenBalance?.amount / 10 ** decimals,
        }
      })
      return {
        balance,
        tokenBalances,
        balancesWithoutSats,
      }
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
      
      if (vm.stablehedgeView) {
        return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
      }

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
      if (this.stablehedgeView) {
        return [
          { label: this.$t('All'), value: 'all' },
          { label: this.$t('Freeze'), value: 'freeze' },
          { label: this.$t('Unfreeze'), value: 'unfreeze' },  
        ]
      }
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
    isNotDefaultTheme,
    isHongKong,
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
    toggleStablehedgeView() {
      this.stablehedgeView = !this.stablehedgeView
      this.$nextTick(() => this.setTransactionsFilter(this.transactionsFilter))
    },
    /**
     * @typedef {Object} RedemptionTransactionResult
     * @property {Number} id
     * @property {String} redemptionContractAddress
     * @property {String} txType
     * @property {String} category
     * @property {Number} satoshis
     * @property {Number} bch
     * @property {Number} amount
     * @property {String} status
     * @property {String} txid
     * @property {String} resultMessage
     * 
     * @param {RedemptionTransactionResult[]} data
     */
    onStablehedgeTransaction(data) {
      this.setTransactionsFilter(this.transactionsFilter)
      this.$store.dispatch('stablehedge/updateTokenBalances')

      data.map(txData => txData?.category)
        .map(category => {
          return this.assets.find(asset => asset?.id?.includes(category))?.id
        })
        .filter(Boolean)
        .map(assetId => updateAssetBalanceOnLoad(assetId, this.wallet, this.$store))
    },
    handleRampNotif (notif) {
      // console.log('Handling Ramp Notification')
      this.$router.push({ name: 'ramp-fiat', query: notif })
    },
    openPriceChart () {
      if (!this.isPriceChartDialogShown) {
        this.isPriceChartDialogShown = true
        this.$q.dialog({
          component: PriceChart
        })
          .onDismiss(() => {
            this.isPriceChartDialogShown = false
          })
      }
    },
    async openCashIn () {
      await this.checkCashinAvailable()
      this.$q.dialog({
        component: CashIn,
        componentProps: {
          fiatCurrencies: this.availableCashinFiat
        }
      })
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
        vm.$refs['transaction-list-component'].resetValues(null, newNetwork, setAsset)
        vm.assets.map(function (asset) {
          return vm.getBalance(asset.id)
        })
        vm.$refs['transaction-list-component'].getTransactions()
      }
    },
    selectBch () {
      const vm = this
      vm.selectedAsset = this.bchAsset
      vm.getBalance(this.bchAsset.id)
      vm.txSearchActive = false
      vm.txSearchReference = ''
      
      vm.$nextTick(() => {
        vm.$refs['transaction-list-component'].resetValues(null, null, vm.selectedAsset)
        vm.$refs['transaction-list-component'].getTransactions()
      })
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

      let balance = Number(asset.balance || 0)
      if (asset?.id === 'bch' && this.stablehedgeView) {
        const stablehedgeWalletBalance = this.$store.getters['stablehedge/totalTokenBalancesInSats'] / 10 ** 8
        balance = stablehedgeWalletBalance || 0
      }

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
      this.getBalance(asset.id)
      this.$nextTick(() => {
        this.$refs['transaction-list-component'].resetValues(null, null, asset)
        this.$refs['transaction-list-component'].getTransactions()
      })
      this.$store.dispatch('assets/getAssetMetadata', asset.id)
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
      if (id == 'bch' && vm.stablehedgeView) {
        await vm.$store.dispatch('stablehedge/updateTokenBalances')
          .then(() => vm.$store.dispatch('stablehedge/updateTokenPrices', { minAge: 60 * 1000 }))
          .catch(console.error)
      }
      vm.balanceLoaded = true
    },
    refresh (done) {
      try {
        this.checkCashinAlert()
        this.assets.map((asset) => {
          return this.getBalance(asset.id)
        })
        this.transactions = []
        this.$refs['transaction-list-component'].getTransactions()
      } finally {
        done()
      }
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

      if (storedWalletHash !== derivedWalletHash) {
        console.log('INCONSISTENCY DETECTED!')
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
        const txFetchPromise = vm.$refs['transaction-list-component'].getTransactions()

        let tokenIconUpdatePromise
        if (this.selectedNetwork === 'sBCH') {
          tokenIconUpdatePromise = vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
        } else {
          tokenIconUpdatePromise = vm.$store.dispatch('assets/updateTokenIcons', { all: false })
        }

        return Promise.allSettled([
          balancePromise,
          txFetchPromise,
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
      if (asset?.id) {
        if (this.selectedNetwork != chain) this.changeNetwork(chain, asset)
        const refetchTxList = this.selectedAsset?.id != asset?.id
        this.selectedAsset = asset
        if (refetchTxList) {
          this.transactions = []
          this.transactionsPage = 0
          this.transactionsLoaded = false
          this.$refs['transaction-list-component'].getTransactions()
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
    }
  },

  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.prevPath = from.path
    })
  },

  unmounted () {
    bus.off('handle-push-notification', this.handleOpenedNotification)
    this.closeCashinWebSocket()
    stablehedgePriceTracker.unsubscribe('main-page')
  },
  created () {
    bus.on('cashin-alert', (value) => { this.hasCashinAlert = value })
    bus.on('handle-push-notification', this.handleOpenedNotification)
  },
  beforeMount () {
    const vm = this
    stablehedgePriceTracker.subscribe('main-page')

    if (isNotDefaultTheme(vm.theme) && vm.darkMode) {
      vm.settingsButtonIcon = 'img:assets/img/theme/payhero/settings.png'
      vm.assetsCloseButtonColor = 'color: #ffbf00;'
    } else {
      vm.settingsButtonIcon = 'settings'
      vm.assetsCloseButtonColor = 'color: #3B7BF6;'
    }

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
  .show-tokens-label {
    margin-top: 0px;
    font-size: 13px;
    padding-bottom: 15px;
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
