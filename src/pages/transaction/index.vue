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
              <div data-tour="wallet-opener" class="col">
                <MultiWalletDropdown ref="multi-wallet-component"/>
              </div>
              <div class="row items-center justify-end q-gutter-md">
                <q-btn
                  flat
                  round
                  icon="lightbulb"
                  class="text-bow"
                  :class="getDarkModeClass(darkMode)"
                  data-tour="home-tour-trigger"
                  @click="startHomeTour(false)"
                />
                <NotificationButton
                  @hide-multi-wallet-dialog="hideMultiWalletDialog"
                  @find-and-open-transaction="findAndOpenTransaction"
                />
              </div>
            </div>

            <div class="row q-pt-sm">
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
                    class="network-selection-tab denominations-tab main-tab"
                    :class="[getDarkModeClass(darkMode)]"
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
                    class="network-selection-tab denominations-tab main-tab"
                    :class="[getDarkModeClass(darkMode)]"
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
                <q-card id="bch-card" data-tour="bch-card">
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
                      <img
                        :src="denominationTabSelected === $t('DEEM') ? 'assets/img/theme/payhero/deem-logo.png' : 'bch-logo.png'"
                        alt=""
                        class="asset-icon"
                        style="height: 75px;"
                        @contextmenu.prevent
                        @selectstart.prevent
                      />
                    </q-card-section>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <asset-options 
            data-tour="quick-actions"
            :loaded="balanceLoaded"
            :selectedDenomination="selectedDenomination"
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
                v-if="hasAssetFilter" 
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
              data-tour="token-cards"
              :assets="tokenCardsAssets"
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
              data-tour="token-cards"
              :assets="tokenCardsAssets"
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
            data-tour="transactions"
            :tutorialMode="homeTour.active"
            :tutorialStepId="homeTour.steps?.[homeTour.stepIndex]?.id"
          />
        </div>

      <!-- Backup Reminder Dialog -->
      <q-dialog
        v-model="showBackupAlert"
        persistent
        no-backdrop-dismiss
        :class="getDarkModeClass(darkMode)"
      >
        <q-card class="backup-reminder-dialog pt-card br-15 text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 320px; max-width: 400px;">
          <q-card-section class="q-pb-sm">
            <div class="row items-center q-gutter-sm">
              <q-icon name="shield" size="32px" class="backup-dialog-icon" color="primary" />
              <div class="col">
                <div class="text-h6 text-weight-medium">{{ $t('BackupYourWallet', {}, 'Backup Your Wallet') }}</div>
              </div>
            </div>
          </q-card-section>
          
          <q-card-section class="q-pt-sm">
            <div class="text-body2">
              {{ $t('BackupYourRecoveryPhraseToProtectFunds', {}, 'Backup your recovery phrase to protect your funds') }}
            </div>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md q-gutter-sm">
            <q-btn
              flat
              no-caps
              :label="$t('NotNow')"
              class="backup-dialog-button"
              @click="dismissAlertForSession"
              padding="sm md"
            />
            <q-btn
              unelevated
              no-caps
              :label="$t('ShowMeHow')"
              class="backup-dialog-button backup-dialog-button-primary"
              @click="goToBackupPage"
              padding="sm md"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
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
      <footer-menu ref="footerMenu" data-tour="main-menus" />
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

    <teleport to="body">
      <div v-if="homeTour.active" class="home-tour-overlay" @click.self="endHomeTour">
        <div
          v-if="homeTour.scrims && homeTour.targetRect"
          v-for="(rect, key) in homeTour.scrims"
          :key="key"
          class="home-tour-scrim"
          :style="{
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
          }"
        />

        <div
          v-if="homeTour.targetRect"
          class="home-tour-highlight"
          :style="{
            top: homeTour.targetRect.top + 'px',
            left: homeTour.targetRect.left + 'px',
            width: homeTour.targetRect.width + 'px',
            height: homeTour.targetRect.height + 'px',
          }"
        />

        <div
          class="home-tour-tooltip pt-card text-bow"
          :class="getDarkModeClass(darkMode)"
          :style="{
            top: homeTour.tooltipPos.top + 'px',
            left: homeTour.tooltipPos.left + 'px',
          }"
        >
          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            {{ homeTour.steps[homeTour.stepIndex]?.title }}
          </div>
          <div class="text-body2">
            {{ homeTour.steps[homeTour.stepIndex]?.body }}
          </div>

          <div class="row items-center justify-between q-mt-md">
            <q-btn
              flat
              no-caps
              :label="$t('Skip', {}, 'Skip')"
              @click="endHomeTour"
            />
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat
                no-caps
                :disable="homeTour.stepIndex === 0"
                :label="$t('Back', {}, 'Back')"
                @click="prevHomeTourStep"
              />
              <q-btn
                unelevated
                color="primary"
                no-caps
                :label="homeTour.stepIndex === homeTour.steps.length - 1 ? $t('Done', {}, 'Done') : $t('Next', {}, 'Next')"
                @click="nextHomeTourStep"
              />
            </div>
          </div>
        </div>
      </div>
    </teleport>
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
import { buildHomeTourSteps, HOME_TOUR_SEEN_KEY } from 'src/utils/home-tour'

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

export default {
  name: 'Transaction-page',
  components: {
    TransactionList,
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
      isCashToken: true,
      settingsButtonIcon: 'settings',
      assetsCloseButtonColor: 'color: #3B7BF6;',
      denominationTabSelected: 'BCH',
      parsedBCHBalance: '0',
      walletYield: null,
      websocketManager: null,
      assetClickTimer: null,
      assetClickCounter: 0 ,
      pendingTransactionsKey: 0,
      loadingBchPrice: false,
      bchBalanceMode: localStorage.getItem('bchBalanceMode') || 'bch-only',
      favoriteTokenIds: [], // Store favorite token IDs for synchronous access (deprecated, kept for compatibility)
      allTokensFromAPI: [], // Store all tokens fetched from API with balances (includes favorites)
      showBackupAlert: false,
      alertDismissedForSession: false,
      backupAlertTimeout: null,

      homeTour: {
        active: false,
        auto: false,
        stepIndex: 0,
        steps: [],
        targetRect: null,
        scrims: null,
        tooltipPos: { top: 0, left: 0 },
        lastAutoScrollStepIndex: null,
      },
    }
  },

  watch: {
    online(newValue, oldValue) {
      this.onConnectivityChange(newValue)
    },
    lastBackupTimestamp (newValue, oldValue) {
      // Auto-start the home tour only after backup reminder is no longer needed.
      // This prevents the tour from competing with the backup reminder UI.
      if (!oldValue && newValue) {
        this._maybeAutoStartHomeTourAfterBackup()
      }
    },
    isCashToken() {
      // Refetch API data when token type changes
      if (this.isCashToken) {
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
    }
  },

  computed: {
    ...mapState('global', ['online']),
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    lastBackupTimestamp () {
      return this.$store.getters['global/lastBackupTimestamp']
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
    assets () {
      const vm = this

      // For CashTokens on BCH network, filter favorites from allTokensFromAPI
      // No need for separate API call - allTokensFromAPI already includes favorite field
      if (vm.isCashToken) {
        return (this.allTokensFromAPI || []).filter(token => token.favorite === 1 || token.favorite === true)
      }

      // For SLP tokens, use store data (API doesn't support SLP yet)
      return vm.mainchainAssets.filter(token => {
        const assetId = token.id?.split?.('/')?.[0]
        return (
          vm.isCashToken && assetId === 'ct' ||
          !vm.isCashToken && assetId === 'slp'
        )
      })
    },
    tokenCardsAssets () {
      // Show temporary dummy tokens ONLY while the tutorial is active
      // and ONLY when the token cards would otherwise be empty.
      if (!this.homeTour?.active) return this.assets
      // Only show dummy token cards when the tour is highlighting token cards.
      if (this.homeTour.steps?.[this.homeTour.stepIndex]?.id !== 'token-cards') return this.assets
      if (this.isLoadingAssets) return this.assets
      if (this.hasTokensButNoFavorites) return this.assets

      if (Array.isArray(this.assets) && this.assets.length === 0) {
        // Dummy favorites (uses `favorite` field so `asset-cards` will render them).
        return [
          {
            id: 'ct/tutorial-lift',
            symbol: 'LIFT',
            name: 'LIFT',
            decimals: 8,
            balance: 4200000000, // 42
            logo: null,
            favorite: 1,
          },
          {
            id: 'ct/tutorial-spice',
            symbol: 'SPICE',
            name: 'SPICE',
            decimals: 8,
            balance: 12345000000, // 123.45
            logo: null,
            favorite: 1,
          },
          {
            id: 'ct/tutorial-musd',
            symbol: 'MUSD',
            name: 'MUSD',
            decimals: 6,
            balance: 125750000, // 125.75
            logo: null,
            favorite: 1,
          },
        ]
      }

      return this.assets
    },
    hasTokensButNoFavorites () {
      // Check if there are tokens (excluding BCH) but no favorites
      // Only show this message when:
      // 1. There are tokens available from API (not from Vuex store)
      // 2. No favorites are set (check allTokensFromAPI directly since favoriteTokens might be empty for SLP)
      // 3. Balance is loaded (indicates assets have been processed)

      // For CashTokens, use API data exclusively - never use Vuex store
      let hasTokens = false
      if (this.isCashToken) {
        hasTokens = this.allTokensFromAPI && this.allTokensFromAPI.length > 0
      } else {
        // For SLP, fall back to Vuex store (since API doesn't support these yet)
        hasTokens = this.assets && this.assets.length > 0
      }

      // Check if there are favorites in allTokensFromAPI (uses API data exclusively)
      // For CashTokens, filter favorites from allTokensFromAPI
      let hasFavorites = false
      if (this.isCashToken) {
        const favorites = (this.allTokensFromAPI || []).filter(token => token.favorite === 1 || token.favorite === true)
        hasFavorites = favorites.length > 0
      } else {
        // For SLP, check favoriteTokens computed property
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
      // For CashTokens on BCH network, filter favorites from allTokensFromAPI
      if (this.isCashToken) {
        return (this.allTokensFromAPI || []).filter(token => token.favorite === 1 || token.favorite === true)
      }

      // For SLP, the API doesn't support favorites_only yet
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

    // ---- Home guided tour (no dependency) ----
    async startHomeTour (auto = false) {
      const vm = this

      if (auto && localStorage.getItem(HOME_TOUR_SEEN_KEY) === 'true') return
      if (vm.homeTour.active) return

      vm.homeTour.auto = auto
      vm.homeTour.steps = buildHomeTourSteps((...args) => vm.$t(...args))
      vm.homeTour.stepIndex = 0
      vm.homeTour.active = true

      await vm.$nextTick()
      vm._homeTourBindListeners()
      await vm._homeTourGoTo(0)
    },

    _maybeAutoStartHomeTourAfterBackup () {
      // Only auto-run once backup is confirmed (lastBackupTimestamp exists).
      // If the reminder is currently showing/scheduled, do nothing.
      if (!this.lastBackupTimestamp) return
      if (this.showBackupAlert) return
      if (this.backupAlertTimeout) return

      // Let the UI settle first (assets + layout).
      setTimeout(() => {
        this.startHomeTour(true)
      }, 800)
    },

    endHomeTour () {
      this.homeTour.active = false
      this._homeTourUnbindListeners()
      localStorage.setItem(HOME_TOUR_SEEN_KEY, 'true')
    },

    nextHomeTourStep () {
      this._homeTourGoTo(this.homeTour.stepIndex + 1)
    },

    prevHomeTourStep () {
      this._homeTourGoTo(this.homeTour.stepIndex - 1)
    },

    async _homeTourGoTo (index) {
      const vm = this
      if (!vm.homeTour.active) return
      if (index < 0) return
      if (index >= vm.homeTour.steps.length) {
        vm.endHomeTour()
        return
      }

      vm.homeTour.stepIndex = index

      // Wait briefly for targets to exist (assets, etc.)
      for (let i = 0; i < 10; i++) {
        const el = vm._homeTourGetTargetEl()
        if (el) break
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 150))
      }

      // If the target is off-screen (e.g. footer/main menus), scroll it into view first.
      const step = vm.homeTour.steps[vm.homeTour.stepIndex]
      const targetEl = vm._homeTourGetTargetEl()

      // Ensure footer is visible before measuring/highlighting.
      // The footer can auto-hide while scrolling, which makes the rect (and highlight) drift.
      if (step?.id === 'main-menus') {
        try {
          vm.$refs?.footerMenu?.showFooter?.()
        } catch (_) {}
        await vm.$nextTick()
        // Wait for the footer transition to settle.
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 350))
      }

      if (targetEl && vm.homeTour.lastAutoScrollStepIndex !== index) {
        vm.homeTour.lastAutoScrollStepIndex = index
        vm._homeTourEnsureVisible(targetEl, step?.scroll)
        // Give the scroll a moment to settle before measuring/highlighting.
        await new Promise(r => setTimeout(r, 350))
      }

      vm._homeTourRecalc()
    },

    _homeTourGetTargetEl () {
      const step = this.homeTour.steps[this.homeTour.stepIndex]
      if (!step?.selector) return null
      return document.querySelector(step.selector)
    },

    _homeTourEnsureVisible (el, scrollMode = 'auto') {
      if (!el?.getBoundingClientRect) return

      if (scrollMode === 'top') {
        const scroller = document.scrollingElement || document.documentElement
        try {
          scroller.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (_) {
          scroller.scrollTop = 0
        }
        return
      }

      const rect = el.getBoundingClientRect()
      const margin = 72

      const verticallyVisible = rect.top >= margin && rect.bottom <= (window.innerHeight - margin)
      const horizontallyVisible = rect.left >= 0 && rect.right <= window.innerWidth

      if (verticallyVisible && horizontallyVisible) return

      // Use center so the highlight fits comfortably inside the viewport.
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      } catch (_) {
        // Older browsers
        el.scrollIntoView(true)
      }
    },

    _homeTourRecalc () {
      const step = this.homeTour.steps[this.homeTour.stepIndex]
      const el = this._homeTourGetTargetEl()
      if (!el) {
        this.homeTour.targetRect = null
        this.homeTour.scrims = null
        this.homeTour.tooltipPos = { top: 24, left: 24 }
        return
      }

      // Use bounding rect of the target element.
      // Note: getBoundingClientRect() does NOT include visually protruding children
      // (e.g. absolutely positioned elements with negative offsets).
      // For the footer menu tour step, include the floating QR button in the highlight.
      let rect = el.getBoundingClientRect()
      if (step?.id === 'main-menus') {
        const qrEl = el.querySelector?.('#qr-button') || document.querySelector?.('#qr-button')
        if (qrEl?.getBoundingClientRect) {
          const qrRect = qrEl.getBoundingClientRect()
          const left = Math.min(rect.left, qrRect.left)
          const top = Math.min(rect.top, qrRect.top)
          const right = Math.max(rect.right, qrRect.right)
          const bottom = Math.max(rect.bottom, qrRect.bottom)
          rect = {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top,
          }
        }
      }
      const pad = 8
      const targetRect = {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: Math.min(window.innerWidth, rect.width + pad * 2),
        height: Math.min(window.innerHeight, rect.height + pad * 2),
      }
      this.homeTour.targetRect = targetRect

      // Scrims: 4 rectangles around the highlight. This lets us dim + blur the
      // rest of the page while keeping the target area clear.
      const bottomTop = targetRect.top + targetRect.height
      const rightLeft = targetRect.left + targetRect.width
      this.homeTour.scrims = {
        top: {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, targetRect.top),
        },
        bottom: {
          top: bottomTop,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - bottomTop),
        },
        left: {
          top: targetRect.top,
          left: 0,
          width: Math.max(0, targetRect.left),
          height: targetRect.height,
        },
        right: {
          top: targetRect.top,
          left: rightLeft,
          width: Math.max(0, window.innerWidth - rightLeft),
          height: targetRect.height,
        },
      }

      // Tooltip placement
      const tooltipW = 320
      const tooltipH = 160
      const margin = 12

      const availableBottom = window.innerHeight - (targetRect.top + targetRect.height)
      const availableTop = targetRect.top

      let place = step?.prefer || 'bottom'
      if (place === 'bottom' && availableBottom < tooltipH + margin && availableTop > availableBottom) place = 'top'
      if (place === 'top' && availableTop < tooltipH + margin && availableBottom > availableTop) place = 'bottom'

      let top = place === 'top'
        ? (targetRect.top - tooltipH - margin)
        : (targetRect.top + targetRect.height + margin)
      top = Math.max(margin, Math.min(window.innerHeight - tooltipH - margin, top))

      let left = targetRect.left + (targetRect.width / 2) - (tooltipW / 2)
      left = Math.max(margin, Math.min(window.innerWidth - tooltipW - margin, left))

      this.homeTour.tooltipPos = { top, left }
    },

    _homeTourBindListeners () {
      if (this._homeTourListenersBound) return
      this._homeTourListenersBound = true
      this._homeTourOnResize = () => this._homeTourRecalc()
      this._homeTourOnScroll = () => this._homeTourRecalc()
      window.addEventListener('resize', this._homeTourOnResize)
      window.addEventListener('scroll', this._homeTourOnScroll, true)
    },

    _homeTourUnbindListeners () {
      if (!this._homeTourListenersBound) return
      this._homeTourListenersBound = false
      window.removeEventListener('resize', this._homeTourOnResize)
      window.removeEventListener('scroll', this._homeTourOnScroll, true)
      this._homeTourOnResize = null
      this._homeTourOnScroll = null
    },
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
    async fetchAllTokensFromAPI () {
      // Fetch favorite tokens directly from API for the home page tokens section
      if (!this.isCashToken) {
        // For SLP, API doesn't support favorites_only yet
        return []
      }

      if (!this.wallet) {
        console.warn('Wallet not loaded, cannot fetch tokens')
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
        favorites_only: true,
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

        // Update favoriteTokenIds for backward compatibility (filter favorites from allTokens)
        const favorites = allTokens.filter(token => token.favorite === 1 || token.favorite === true)
        this.favoriteTokenIds = favorites.map(token => token.id).filter(id => id !== 'bch')

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
      return vm.getBchBalance(id, vm)
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

        const tokenIconUpdatePromise = vm.$store.dispatch('assets/updateTokenIcons', { all: false })

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
        if (vm.isCashToken) {
          // Add tokens to refreshing array to show skeleton loaders
          const currentFavoriteIds = vm.favoriteTokenIds
          const tokensToRefresh = [...new Set([...currentFavoriteIds, 'bch'])]
          
          tokensToRefresh.forEach(tokenId => {
            if (!vm.refreshingTokenIds.includes(tokenId)) {
              vm.refreshingTokenIds.push(tokenId)
            }
          })

          // Fetch all tokens from API (includes favorites and balances)
          // No need for separate favorites call - allTokensFromAPI includes favorite field
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
          // For SLP, the API doesn't support favorites_only yet
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
        
        if (vm.isCashToken) {
          // Use token IDs from API data - filter favorites from allTokensFromAPI
          const favorites = (vm.allTokensFromAPI || []).filter(token => token.favorite === 1 || token.favorite === true)
          favoriteTokenIds = favorites.map(token => token.id).filter(Boolean)
        } else {
          // For SLP, API doesn't support favorites_only yet
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
        const tokenPrefix = 'slp'
        assetId = isToken ? `${tokenPrefix}/${tokenId}` : 'bch'
        const assets = this.mainchainAssets
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
        // Fetch token metadata from cashtokens/fungible API instead of BCMR
        // The API already provides all the metadata we need
        try {
          const tokenCategory = tokenId.split('/')[1]
          const isChipnet = this.$store.getters['global/isChipnet']
          const baseUrl = getWatchtowerApiUrl(isChipnet)
          const { data } = await axios.get(`${baseUrl}/cashtokens/fungible/${tokenCategory}/`)
          
          asset = {
            'id': data.id || tokenId,
            'name': data.name || 'Unknown Token',
            'symbol': data.symbol || '',
            'decimals': parseInt(data.decimals) || 0,
            'logo': data.image_url ? convertIpfsUrl(data.image_url) : '',
            'balance': 0,
            'is_nft': false
          }
          
          this.$store.commit(`assets/addNewAsset`, asset)
          this.$store.commit(`assets/moveAssetToBeginning`)
        } catch (error) {
          console.error('Error fetching token from API:', error)
          // Fallback: if API fails, try BCMR as last resort
          asset = await this.wallet.BCH.getTokenDetails(tokenId.split('/')[1])
          if (asset) {
            this.$store.commit(`assets/addNewAsset`, asset)
            this.$store.commit(`assets/moveAssetToBeginning`)
          }
        }
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
      const { txid, assetId } = data
      const transaction = this.transactions?.find?.(tx => (tx?.txid || tx?.tx_hash) === txid)
      if (transaction) return transaction

      const watchtower = new Watchtower()
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
    dismissAlertForSession () {
      // Store dismissal timestamp in sessionStorage
      // This persists during app runtime but gets cleared when app is fully closed and reopened
      sessionStorage.setItem('backupReminderDismissedTimestamp', Date.now().toString())
      this.alertDismissedForSession = true
      this.showBackupAlert = false
    },
    goToBackupPage () {
      this.showBackupAlert = false
      this.$router.push('/apps/wallet-backup')
    },
    checkAndShowBackupAlert () {
      // Don't show if lastBackupTimestamp is already set for this wallet (user has confirmed backup)
      // Each wallet is tracked independently
      if (this.lastBackupTimestamp) {
        return
      }

      // Check if user dismissed for this session (app runtime)
      // The dismissal is cleared in App.vue on mount (fresh app start)
      const dismissedTimestamp = sessionStorage.getItem('backupReminderDismissedTimestamp')
      if (dismissedTimestamp) {
        this.alertDismissedForSession = true
        return
      }

      // Check if this is a newly created wallet
      const isNewWallet = this.$route.query.newWallet === 'true'
      
      if (isNewWallet) {
        // Show after delay for newly created wallets (4 seconds)
        this.backupAlertTimeout = setTimeout(() => {
          this.showBackupAlert = true
          // Clear the query parameter after showing
          this.$router.replace({ query: {} }).catch(() => {})
        }, 4000)
      } else {
        // Show immediately for existing wallets
        this.showBackupAlert = true
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
    if (this.backupAlertTimeout) {
      clearTimeout(this.backupAlertTimeout)
    }
  },
  created () {
    bus.on('handle-push-notification', this.handleOpenedNotification)
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
      // Wait for wallet loading to complete (with timeout to prevent hanging)
      // onConnectivityChange() already calls refreshFavoriteTokenBalances() which calls fetchAllTokensFromAPI()
      // so we don't need to call it again, avoiding duplicate API calls
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


      // Note: No need to fetch metadata from BCMR indexer here because
      // the cashtokens/fungible endpoint already provides all the metadata
      // (name, symbol, decimals, image_url) which is used to update the store

      // Note: fetchAllTokensFromAPI() is already called by refreshFavoriteTokenBalances()
      // in onConnectivityChange() when online, so we don't need to call it again here
      // to avoid duplicate API calls. If offline, loadWallets() handles loading from cache.

      // check if newly-received token is already stored in vuex store,
      // if not, then add it to the very first of the list
      try {
        const assets = vm.$store.getters['assets/getAssets'] || []
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const removedAssetIdsGetter = vm.$store.getters['assets/getRemovedAssetIds']
        const vaultRemovedAssetIds = removedAssetIdsGetter?.[walletIndex]?.removedAssetIds ?? []
        const assetsId = assets.map(a => a.id)

        if (vm.isCashToken) {
          // For CashTokens, use tokens already fetched from fetchAllTokensFromAPI()
          // No need to call getMissingAssets() - the API already provided all the data
          const allTokensFromAPI = vm.allTokensFromAPI || []
          const newTokens = allTokensFromAPI.filter(token => 
            !assetsId.includes(token.id) && 
            !vaultRemovedAssetIds.includes(token.id)
          )

          newTokens.forEach(token => {
            // Convert API token format to asset format expected by addNewAsset
            vm.$store.commit('assets/addNewAsset', {
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logo: token.logo,
              balance: token.balance,
              is_nft: false
            })
            vm.$store.commit('assets/moveAssetToBeginning')
          })
        } else {
          // For SLP tokens, still use getMissingAssets (API doesn't support SLP yet)
          const slpWalletHash = vm.getWallet('slp').walletHash
          const slpTokens = await vm.$store.dispatch('assets/getMissingAssets', {
            isCashToken: false,
            walletHash: slpWalletHash,
            includeIgnoredTokens: false
          })
          
          if (slpTokens && slpTokens.length > 0) {
            const newTokens = slpTokens.filter(b => !assetsId.includes(b.id) && !vaultRemovedAssetIds.includes(b.id))
            newTokens.forEach(token => {
              vm.$store.commit('assets/addNewAsset', token)
              vm.$store.commit('assets/moveAssetToBeginning')
            })
          }
        }
      } catch (error) {
        console.error('Error loading tokens:', error)
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

      // Check and show backup reminder alert
      this.checkAndShowBackupAlert()

      // Auto-run home tour only after backup is confirmed.
      this._maybeAutoStartHomeTourAfterBackup()
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
  :global(.home-tour-overlay) {
    position: fixed;
    inset: 0;
    z-index: 99999;
  }

  :global(.home-tour-scrim) {
    position: fixed;
    background: rgba(0, 0, 0, 0.55);
    /* Blur underlying content to emphasize the highlighted element */
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    pointer-events: none;
  }

  :global(.home-tour-highlight) {
    position: fixed;
    border-radius: 14px;
    border: 2px solid rgba(255, 255, 255, 0.75);
    pointer-events: none;
  }

  /* Pulse/glow to emphasize the current highlighted target */
  :global(.home-tour-highlight)::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 16px;
    pointer-events: none;
    /* Keep border always visible; animate glow intensity only */
    border: 2px solid rgba(59, 123, 246, 0.95);
    box-shadow: 0 0 10px 1px rgba(59, 123, 246, 0.25);
    animation: homeTourGlow 1.6s ease-in-out infinite;
  }

  @keyframes homeTourGlow {
    0% {
      box-shadow:
        0 0 10px 1px rgba(59, 123, 246, 0.22),
        0 0 0 0 rgba(59, 123, 246, 0);
    }
    50% {
      box-shadow:
        0 0 18px 3px rgba(59, 123, 246, 0.38),
        0 0 34px 10px rgba(59, 123, 246, 0.18);
    }
    100% {
      box-shadow:
        0 0 10px 1px rgba(59, 123, 246, 0.22),
        0 0 0 0 rgba(59, 123, 246, 0);
    }
  }

  :global(.home-tour-tooltip) {
    position: fixed;
    width: min(320px, calc(100vw - 24px));
    padding: 12px 14px;
    border-radius: 14px;
    z-index: 100000;
  }

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
