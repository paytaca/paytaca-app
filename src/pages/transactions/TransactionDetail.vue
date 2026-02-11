<template>
  <div class="transaction-detail-wrapper" :class="getDarkModeClass(darkMode)" :style="wrapperBackgroundStyle">
    <div class="transaction-detail-header-wrapper">
      <header-nav :title="$t('Transaction', {}, 'Transaction')" :backnavpath="backNavPath" class="header-nav apps-header" @click:left="goBack" />
    </div>
    <div class="transaction-detail-content-wrapper" :class="getDarkModeClass(darkMode)">
      <!-- Skeleton Loading State -->
      <div v-if="isLoading" class="q-pa-lg">
        <div class="text-bow text-center content-container-ss" :class="getDarkModeClass(darkMode)">
          <!-- Page title skeleton -->
          <q-skeleton type="text" width="120px" height="28px" class="q-mx-auto q-mb-md" />
          
          <!-- Direction icon skeleton -->
          <div class="row justify-center q-mt-sm q-mb-md">
            <q-skeleton type="circle" size="60px" />
          </div>

          <!-- Amount block skeleton -->
          <div class="amount-block q-mt-md text-center section-block-ss">
            <div class="row justify-center q-gutter-sm amount-row-ss" style="margin-top: 25px;">
              <q-skeleton type="circle" size="40px" />
              <q-skeleton type="text" width="150px" height="32px" />
            </div>
            <q-skeleton type="text" width="100px" height="20px" class="q-mt-sm q-mx-auto" />
          </div>

          <!-- Reference ID skeleton -->
          <div class="reference-id-section section-block-ss q-mt-lg" style="margin-top: 25px;">
            <q-skeleton type="text" width="100px" height="14px" class="q-mb-xs" />
            <q-skeleton type="text" width="80px" height="24px" class="q-mx-auto" />
            <q-separator color="grey" class="q-mt-sm ref-separator-ss"/>
          </div>

          <!-- Transaction ID skeleton -->
          <div class="transaction-id-section section-block-ss q-mt-md" style="margin-top: 25px;">
            <q-skeleton type="text" width="120px" height="14px" class="q-mb-sm" />
            <q-skeleton type="rect" height="40px" class="q-mb-sm" style="border-radius: 8px;" />
            <q-skeleton type="text" width="140px" height="16px" class="q-mx-auto" />
          </div>

          <!-- Date skeleton -->
          <q-skeleton type="text" width="100px" height="14px" class="q-mt-md" />
          <q-skeleton type="text" width="180px" height="20px" class="q-mt-xs q-mb-lg" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="loadError && !isLoading" class="q-pa-md text-center">
        <div class="text-subtitle1 q-mb-sm">{{ loadError }}</div>
        <q-btn outline color="primary" no-caps @click="retryFetch" class="q-mr-sm">{{ $t('Retry', {}, 'Retry') }}</q-btn>
        <q-btn outline color="primary" no-caps @click="goBack">{{ $t('Back', {}, 'Back') }}</q-btn>
      </div>

      <!-- Transaction Content -->
      <div v-else-if="tx && tx.asset && transactionId" class="q-pa-lg">
        <div class="text-bow text-center content-container-ss" :class="getDarkModeClass(darkMode)">
        <!-- Page title and direction icon -->
        <div class="text-center page-title text-uppercase">
          <template v-if="tx.record_type === 'incoming'">{{ $t('Received') }}</template>
          <template v-else>{{ $t('Sent') }}</template>
        </div>
        <div class="row justify-center q-mt-sm q-mb-md" style="margin-top: 12px;">
          <div class="direction-icon-container" :class="getDarkModeClass(darkMode)">
            <q-icon :name="tx.record_type === 'incoming' ? 'arrow_downward' : 'arrow_upward'" class="direction-icon" />
          </div>
        </div>

        <!-- Amount block (mirrors SendSuccessBlock proportions) -->
        <div class="amount-block q-mt-md text-center section-block-ss">
          <div class="row justify-center q-gutter-sm amount-row-ss" style="margin-top: 25px;">
            <q-avatar size="40px" class="amount-avatar-ss">
              <img 
                :src="getImageUrl(tx.asset)" 
                alt="asset-logo" 
                class="asset-icon"
                @contextmenu.prevent
                @selectstart.prevent
              />
            </q-avatar>
            <div class="amount-label-ss">{{ displayAmountText }}</div>
          </div>
          <div v-if="!isNft && displayFiatAmount !== null && displayFiatAmount !== undefined" class="amount-fiat-label-ss row items-center justify-center">
            <span>{{ parseFiatCurrency(displayFiatAmount, selectedMarketCurrency) }}</span>
            <q-icon 
              name="info" 
              size="16px" 
              class="q-ml-xs cursor-pointer info-icon-clickable"
              :class="getDarkModeClass(darkMode)"
              @click="showConversionInfo"
            >
              <q-tooltip v-if="!isMobile" :delay="300" class="text-body2" :class="getDarkModeClass(darkMode)">
                {{ fiatConversionTooltip }}
              </q-tooltip>
            </q-icon>
          </div>
          <div v-if="gainLossAmount !== null && gainLossAmount !== undefined && isBchTransaction && Math.abs(gainLossAmount) > 0.01" class="amount-gain-loss-ss" :class="gainLossClass">
            <q-icon :name="gainLossAmount >= 0 ? 'trending_up' : 'trending_down'" size="16px" class="q-mr-xs" />
            {{ gainLossText }}
          </div>

          <div v-if="txFee !== null && !Number.isNaN(txFee) && txFee > 0" class="amount-fee-ss text-caption q-mt-sm">
            <div class="text-grey">{{ $t('NetworkFee') }}</div>
            {{ txFeeFormatted }}
            <template v-if="txFeeInFiat !== null && !Number.isNaN(txFeeInFiat)">
              ({{ parseFiatCurrency(txFeeInFiat, selectedMarketCurrency) }})
            </template>
          </div>
        </div>

        <!-- NFT Image Display -->
        <div v-if="isNft && tx && tx.asset" class="q-mt-md q-mb-lg text-center">
          <div v-if="fetchingNftMetadata" class="nft-image-skeleton-container">
            <q-skeleton
              type="rect"
              width="300px"
              height="300px"
              class="nft-image-skeleton"
              style="border-radius: 12px; margin: 0 auto;"
            />
          </div>
          <div v-else>
            <q-img
              v-if="nftImageUrl"
              :src="nftImageUrl"
              :alt="nftName || tx.asset.name || 'NFT'"
              style="max-width: 300px; max-height: 300px; margin: 0 auto; border-radius: 12px;"
              class="nft-image"
              @error="nftImageError = true"
            >
              <template v-slot:error>
                <div class="absolute-full flex flex-center bg-grey-3 text-grey-8">
                  <div class="text-center">
                    <q-icon name="image" size="48px" />
                    <div class="text-caption q-mt-sm">{{ $t('ImageNotAvailable', {}, 'Image not available') }}</div>
                  </div>
                </div>
              </template>
            </q-img>
            <q-img
              v-else
              :src="getImageUrl(tx.asset)"
              :alt="tx.asset.name || 'NFT'"
              style="max-width: 300px; max-height: 300px; margin: 0 auto; border-radius: 12px;"
              class="nft-image"
              @error="nftImageError = true"
            >
              <template v-slot:error>
                <div class="absolute-full flex flex-center bg-grey-3 text-grey-8">
                  <div class="text-center">
                    <q-icon name="image" size="48px" />
                    <div class="text-caption q-mt-sm">{{ $t('ImageNotAvailable', {}, 'Image not available') }}</div>
                  </div>
                </div>
              </template>
            </q-img>
            <!-- View in Collectibles Button -->
            <div class="q-mt-md q-mb-sm">
              <q-btn
                no-caps
                rounded
                color="pt-primary1"
                :label="$t('ViewInCollectibles', {}, 'View in Collectibles')"
                icon="collections"
                @click="viewInCollectibles"
                class="view-in-collectibles-btn"
              />
            </div>
          </div>
        </div>

        <!-- Add to Favorites button for tokens not in favorites -->
        <div v-if="showAddToFavoritesButton" class="q-mt-md q-mb-lg text-center">
          <q-btn
            no-caps
            rounded
            color="pt-primary1"
            :label="$t('AddToFavorites', {}, 'Add this token to Favorites')"
            icon="star_border"
            @click="addTokenToFavorites"
            :loading="addingToFavorites"
            class="add-to-favorites-btn"
          />
        </div>

        <!-- Reference ID (big, spaced, with separator) -->
        <div class="reference-id-section section-block-ss q-mt-lg" style="margin-top: 25px;">
          <div class="text-grey text-weight-medium text-caption">&nbsp;{{ $t('ReferenceId')}}</div>
          <div class="reference-id-value-ss">{{ transactionId ? hexToRef(transactionId.substring(0, 6)) : '' }}</div>
          <q-separator color="grey" class="q-mt-sm ref-separator-ss"/>
        </div>

        <!-- Transaction ID block (copyable with explorer link below) -->
        <div class="transaction-id-section section-block-ss q-mt-md" style="margin-top: 25px;">
          <div class="text-grey text-weight-medium text-caption q-mb-sm">&nbsp;{{ $t('TransactionId')}}</div>
          <div class="txid-container-ss" :class="getDarkModeClass(darkMode)" @click="transactionId && copyToClipboard(transactionId)">
            <span class="txid-text-ss">{{ transactionId ? `${transactionId.slice(0, 8)}...${transactionId.slice(-8)}` : '' }}</span>
            <q-icon name="content_copy" size="18px" class="copy-icon-ss" />
          </div>
          <div class="view-explorer-container q-mt-sm">
            <a class="view-explorer-link-ss" :class="getDarkModeClass(darkMode)" :href="explorerLink" target="_blank">
              <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
              {{ $t('ViewInExplorer') }}
            </a>
          </div>
        </div>

        <div class="text-grey text-weight-medium text-caption" style="margin-top: 14px;">&nbsp;{{ $t('DateAndTime', {}, 'Date & Time') }}</div>
        <div class="date-prominent q-mt-xs q-mb-lg date-block-ss" :class="getDarkModeClass(darkMode)" style="margin-top: 10px;">
          {{ formatDate(tx.tx_timestamp || tx.date_created) }}
        </div>

        <!-- Save Receipt Button -->
        <div class="q-mt-md q-mb-lg text-center">
          <q-btn
            flat
            outline
            no-caps
            :label="$t('SaveReceipt', {}, 'Save Receipt')"
            icon="receipt"
            color="grey-7"
            class="save-receipt-btn glassmorphic-receipt-btn"
            :class="[`theme-${theme}`, getDarkModeClass(darkMode), savingReceipt ? 'is-saving' : '']"
            :loading="savingReceipt"
            :disable="savingReceipt"
            @click="saveReceiptImage"
          >
            <template v-slot:loading>
              <q-spinner-dots color="white" size="24px" />
            </template>
          </q-btn>
        </div>

        <!-- Transaction Metadata Section -->
        <template v-if="metadataBadges?.length || attributeDetails?.length">
          <q-separator spaced class="q-mt-lg"/>
          <div class="section-block-ss">
            <div class="row items-center justify-center q-mb-sm">
              <div class="text-grey text-weight-medium text-caption">{{ $t('TransactionMetadata', {}, 'Transaction metadata') }}</div>
              <q-btn flat icon="more_vert" size="sm" padding="xs" round dense>
                <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-item
                    :active="displayRawAttributes"
                    clickable v-close-popup
                    @click="() => displayRawAttributes = true"
                  >
                    <q-item-section>
                      <q-item-label>{{ $t('DisplayRawData', {}, 'Display raw data') }}</q-item-label>    
                    </q-item-section>
                  </q-item>
                  <q-item
                    :active="!displayRawAttributes"
                    clickable v-close-popup
                    @click="() => displayRawAttributes = false"
                  >
                    <q-item-section>
                      <q-item-label>{{ $t('DisplayRefinedData', {}, 'Display refined data') }}</q-item-label>    
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
            </div>
          </div>
          <q-slide-transition>
            <div v-if="!displayRawAttributes" class="q-mt-sm q-mb-md">
              <div v-if="metadataBadges?.length" class="transaction-metadata-badges">
                <q-badge
                  v-for="(badge, index) in metadataBadges" :key="index"
                  class="badge-item"
                  :color="badgeColor"
                  rounded
                  @click.stop
                >
                  <img v-if="badge?.icon && badge?.icon.startsWith('img:')" :src="badge.icon" class="badge-icon-img q-mr-xs"/>
                  <q-icon v-else-if="badge?.icon" :name="badge?.icon" class="q-mr-xs" size="14px"/>
                  <span class="badge-text">
                    {{ badge?.text }}
                  </span>
                  <q-popup-proxy :breakpoint="0">
                    <div class="badge-popup pt-card pt-label" :class="getDarkModeClass(darkMode)">
                      <div v-if="badge?.text?.length >= 14">
                        {{ badge?.text }}
                      </div>
                      <div class="text-caption">{{ badge?.description }}</div>
                    </div>
                  </q-popup-proxy>
                </q-badge>
              </div>
            </div>
          </q-slide-transition>
          <q-slide-transition>
            <div v-if="displayRawAttributes" class="q-mt-sm">
              <q-item v-for="(attribute, index) in tx?.attributes" :key="index">
                <q-item-section side top>
                  <q-item-label caption class="text-grey">
                    #{{ index + 1 }}
                  </q-item-label>
                </q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-grey row items-center justify-left">
                    <div>{{ attribute?.key }}</div>
                    <template v-if="attribute?.description">
                      <q-icon size="1.25em" name="description" class="q-ml-xs"/>
                      <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                        {{ attribute?.description }}
                      </q-menu>
                    </template>
                  </q-item-label>
                  <q-item-label class="text-left" style="word-break:break-all;">
                    {{ attribute?.value }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    flat icon="content_copy"
                    size="sm" padding="xs sm"
                    @click="() => copyToClipboard(JSON.stringify(attribute))"
                  />
                </q-item-section>
              </q-item>
            </div>
          </q-slide-transition>
        </template>

        <!-- Memo Section (mirrors SendSuccessBlock styling, centered) -->
        <div class="memo-section section-block-ss q-mt-lg q-mb-md">
          <div v-if="hasMemo || editingMemo" class="text-grey text-weight-medium text-caption q-mb-sm text-center">{{ $t('Memo') }}</div>
          <div class="row justify-center">
            <div class="col-12 col-md-8 q-px-md">
              <q-slide-transition>
                <div v-if="!editingMemo">
                  <div v-if="hasMemo" class="memo-display-container">
                    <div class="memo-content-container" :class="getDarkModeClass(darkMode)">
                      <div class="memo-text">{{ transactionMemo }}</div>
                      <div class="memo-actions">
                        <q-btn flat icon="edit" size="sm" padding="xs sm" @click="openMemo()"/>
                        <q-separator vertical :dark="darkMode"/>
                        <q-btn flat icon="delete" size="sm" padding="xs sm" color="red-7" @click="confirmDelete()"/>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <q-item-section class="q-pt-sm text-center">
                      <q-btn outline no-caps :label="$t('AddMemo', {}, 'Add memo')" icon="add" color="grey-7" class="br-15" padding="xs md" :disable="networkError || usingWebsocketData" @click="openMemo()"/>
                    </q-item-section>
                  </div>
                </div>
                <q-item v-else style="overflow-wrap: anywhere;">
                  <q-item-section>
                    <q-item-label>
                      <div class="row items-start justify-center">
                        <div class="col q-pr-sm">
                          <input ref="memoInputRef" v-model="memoInput" type="text" class="memo-input" :class="darkMode ? 'memo-input-dark' : 'memo-input-light'" :placeholder="`${$t('EnterMemo', {}, 'Enter memo')}...`" style="width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 12px; font-family: inherit; border-radius: 4px;" @keyup.enter="saveMemo()" @keyup.esc="cancelEditMemo()"/>
                        </div>
                        <div class="row items-center no-wrap">
                          <q-btn flat icon="check" size="sm" padding="xs sm" color="primary" :disable="!memoInput || memoInput === transactionMemo" @click="saveMemo()"/>
                          <q-separator vertical :dark="darkMode"/>
                          <q-btn flat icon="close" size="sm" padding="xs sm" @click="cancelEditMemo()"/>
                        </div>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-slide-transition>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script>
import headerNav from 'src/components/header-nav'
import { cachedLoadWallet } from 'src/wallet'
import axios from 'axios'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import * as memoService from 'src/utils/memo-service'
import { hexToRef as hexToRefUtil } from 'src/utils/reference-id-utils'
import confetti from 'canvas-confetti'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'
import html2canvas from 'html2canvas'
import SaveToGallery from 'src/utils/save-to-gallery'
import paytacaLogoHorizontal from '../../assets/paytaca_logo_horizontal.png'
import QRCode from 'qrcode-svg'
import { parseAttributesToGroups, parseAttributeToBadge } from 'src/utils/tx-attributes'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import { parseHedgePositionData } from 'src/wallet/anyhedge/formatters'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'
import { JSONPaymentProtocol } from 'src/wallet/payment-uri'
import JppDetailDialog from 'src/components/JppDetailDialog.vue'
import * as assetSettings from 'src/utils/asset-settings'
import { getBcmrBackend, convertIpfsUrl } from 'src/wallet/cashtokens'
import { binToHex } from '@bitauth/libauth'
import { showLimitDialogWithDeps } from 'src/composables/useTieredLimitGate'

export default {
  name: 'TransactionDetailPage',
  components: { headerNav },
  props: {
    txid: String
  },
  data () {
    return {
      wallet: null,
      denominationTabSelected: 'BCH',
      loadError: '',
      tx: null,
      isLoading: false,
      retryCount: 0,
      maxRetries: 7,
      audioPreloaded: false,
      successfulAudioPath: null,
      // memo state
      transactionMemo: '',
      memoInput: '',
      editingMemo: false,
      hasMemo: false,
      networkError: false,
      keypair: null,
      usingWebsocketData: false, // Track if we're using websocket data as fallback
      backgroundFetchActive: false, // Track if background fetch is active
      displayRawAttributes: false,
      favorites: [],
      addingToFavorites: false,
      favoritesEvaluated: false, // Track if favorites have been evaluated in background
      nftImageError: false, // Track if NFT image failed to load
      nftImageUrl: null, // NFT image URL from BCMR type_metadata
      nftName: null, // NFT name from BCMR type_metadata
      fetchingNftMetadata: false, // Track if NFT metadata is being fetched
      savingReceipt: false,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    transactionId () {
      // Normalize transaction ID from various possible property names
      if (!this.tx) return ''
      return this.tx.txid || this.tx.tx_hash || this.tx.hash || ''
    },
    explorerLink () {
      return getExplorerLink(this.transactionId || '')
    },
    displayAmountText () {
      if (!this.tx) return ''
      
      // For NFT transactions, show type name instead of amount and symbol
      if (this.isNft) {
        // Use nftName if available (from BCMR metadata), otherwise use asset.name
        return this.nftName || this.tx.asset?.name || 'NFT'
      }
      
      const denom = (this.denominationTabSelected === this.$t('DEEM') || this.denominationTabSelected === 'BCH')
        ? this.denominationTabSelected
        : this.$store.getters['global/denomination']
      return `${parseAssetDenomination(denom, { ...this.tx.asset, balance: Math.abs(Number(this.tx.amount)) })}`
    },
    hasHistoricalPrice () {
      if (!this.tx) return false
      const code = this.selectedMarketCurrency
      if (!code) return false
      
      // Check if we have fiat_amounts (historical data)
      if (code && this.tx?.fiat_amounts && this.tx.fiat_amounts[code] !== undefined) {
        return true
      }
      
      // Check if we have historical prices
      if (this.tx.usd_price && code === 'USD') {
        return true
      }
      
      if (this.tx.market_prices && this.tx.market_prices[code]) {
        return true
      }
      
      return false
    },
    historicalPrice() {
      if (!this.tx) return null
      const code = this.selectedMarketCurrency
      if (!code) return null
      
      if (this.tx?.market_prices?.[code]) return this.tx.market_prices[code];
      if (code === 'USD' && this.tx.usd_price) return this.tx.usd_price;

      return null;
    },
    displayFiatAmount () {
      if (!this.tx) return null
      const code = this.selectedMarketCurrency
      if (!code) return null
      
      // Access assetPrices to ensure reactivity when prices are updated
      const _ = this.$store.getters['market/assetPrices']
      
      // First, try to use provided fiat_amounts
      const provided = code && this.tx?.fiat_amounts ? this.tx.fiat_amounts[code] : undefined
      const numeric = Number(provided)
      if (Number.isFinite(numeric)) return Math.abs(numeric)
      
      // Second, try historical prices (usd_price or market_prices)
      const price = (this.tx.usd_price && code === 'USD')
        ? this.tx.usd_price
        : (this.tx.market_prices && this.tx.market_prices[code])
      
      // Third, fallback to current market price from store if historical price is not available
      const assetId = this.tx?.asset?.id || 'bch'
      const currentPrice = price || this.$store.getters['market/getAssetPrice'](assetId, code)
      if (!currentPrice || currentPrice === 0) return null
      
      let base = Math.abs(Number(this.tx.amount)) * Number(currentPrice)
      // Adjust for token decimals similar to list item computation
      const assetIdStr = String(assetId)
      if (assetIdStr && assetIdStr !== 'bch') {
        const decimals = parseInt(this.tx?.asset?.decimals) || 0
        if (decimals > 0) base = base / (10 ** decimals)
      }
      return base
    },
    currentFiatAmount () {
      if (!this.tx || !this.displayFiatAmount) return null
      const code = this.selectedMarketCurrency
      if (!code) return null
      
      // Access assetPrices to ensure reactivity when prices are updated
      const _ = this.$store.getters['market/assetPrices']
      
      // Get current price
      const assetId = this.tx?.asset?.id || 'bch'
      const currentPrice = this.$store.getters['market/getAssetPrice'](assetId, code)
      if (!currentPrice || currentPrice === 0) return null
      
      // Calculate current fiat value
      let base = Math.abs(Number(this.tx.amount)) * Number(currentPrice)
      // Adjust for token decimals
      const assetIdStr = String(assetId)
      if (assetIdStr && assetIdStr !== 'bch') {
        const decimals = parseInt(this.tx?.asset?.decimals) || 0
        if (decimals > 0) base = base / (10 ** decimals)
      }
      return base
    },
    gainLossAmount () {
      // Only calculate gain/loss if we have historical price data
      // If we're using current price as fallback, don't show gain/loss
      if (!this.hasHistoricalPrice) return null
      if (!this.displayFiatAmount || !this.currentFiatAmount) return null
      return this.currentFiatAmount - this.displayFiatAmount
    },
    gainLossText () {
      if (this.gainLossAmount === null || this.gainLossAmount === undefined) return ''
      const code = this.selectedMarketCurrency
      if (!code) return ''
      
      const absAmount = Math.abs(this.gainLossAmount)
      const formatted = this.parseFiatCurrency(absAmount, code)
      const sign = this.gainLossAmount >= 0 ? '+' : '-'
      const label = this.gainLossAmount >= 0 
        ? this.$t('Gain', {}, 'Gain')
        : this.$t('Loss', {}, 'Loss')
      
      return `${sign}${formatted} (${label})`
    },
    gainLossClass () {
      if (this.gainLossAmount === null || this.gainLossAmount === undefined) return ''
      return this.gainLossAmount >= 0 ? 'text-green' : 'text-red'
    },
    txFee() {
      if (Number.isNaN(this.tx.tx_fee)) return null;
      return (this.tx.tx_fee / 10 ** 8);
    },
    txFeeInFiat() {
      const assetId = this.tx?.asset?.id
      const code = this.selectedMarketCurrency
      if (!assetId || !code) return null;

      if (this.txFee === null || Number.isNaN(this.txFee)) return null;
      let price = null;
      if (this.historicalPrice !== null && assetId === 'bch') {
        price = this.historicalPrice;
      } else {
        price = this.$store.getters['market/getAssetPrice']('bch', code)
      }
      if (!price) return null;

      const fiatValue = this.txFee * price;
      return fiatValue;
    },
    txFeeFormatted() {
      if (this.txFee === null || Number.isNaN(this.txFee)) return '';
      const denom = (this.denominationTabSelected === this.$t('DEEM') || this.denominationTabSelected === 'BCH')
        ? this.denominationTabSelected
        : this.$store.getters['global/denomination']
      return parseAssetDenomination(denom, { id: 'bch', symbol: 'BCH', balance: this.txFee })
    },
    isBchTransaction () {
      if (!this.tx || !this.tx.asset) return false
      const assetId = String(this.tx.asset.id || '')
      return assetId === 'bch' || assetId === ''
    },
    isTokenTransaction () {
      if (!this.tx || !this.tx.asset) return false
      const assetId = String(this.tx.asset.id || '')
      return assetId !== 'bch' && assetId !== ''
    },
    tokenAssetId () {
      if (!this.isTokenTransaction) return null
      return this.tx.asset.id
    },
    fiatConversionTooltip () {
      const currency = this.selectedMarketCurrency || 'USD'
      return this.$t('ConversionInfo', { currency }, `Conversion to ${currency} at the time of the transaction. Gain/loss is shown below when compared to current price.`)
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    isNft () {
      if (!this.tx) return false
      // Check if is_nft is directly on tx or tx.asset
      if (this.tx.is_nft === true || this.tx.is_nft === 'true') return true
      if (this.tx.asset?.is_nft === true || this.tx.asset?.is_nft === 'true') return true
      // Check if is_nft is in attributes array
      if (Array.isArray(this.tx.attributes)) {
        const nftAttribute = this.tx.attributes.find(attr => {
          if (attr.key === 'is_nft') {
            return attr.value === true || attr.value === 'true' || String(attr.value).toLowerCase() === 'true'
          }
          // Also check if key-value pair is stored as a string like "is_nft=true"
          if (typeof attr.key === 'string' && attr.key.includes('is_nft')) {
            return attr.value === true || attr.value === 'true' || String(attr.value).toLowerCase() === 'true'
          }
          return false
        })
        if (nftAttribute) return true
      }
      return false
    },
    nftTokenId () {
      if (!this.isNft || !this.tx) return null
      // Extract category from token field
      // Priority: token.id (category) > token.asset_id (ct/category) > asset.id
      let tokenId = null
      
      // First try token.id (this is the category ID)
      if (this.tx.token?.id) {
        tokenId = this.tx.token.id
      }
      // Then try token.asset_id (format: "ct/category")
      else if (this.tx.token?.asset_id) {
        tokenId = this.tx.token.asset_id
      }
      // Fallback to asset.id
      else if (this.tx.asset?.id) {
        tokenId = this.tx.asset.id
      }
      
      if (!tokenId) return null
      
      // If it's in format "ct/..." or "slp/...", extract just the category part
      if (typeof tokenId === 'string' && tokenId.includes('/')) {
        const parts = tokenId.split('/')
        if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
          return parts[1] // Return just the category ID
        }
      }
      
      // Otherwise return as-is (should be just the category ID)
      return tokenId
    },
    nftCommitment () {
      if (!this.isNft || !this.tx) return null
      // Try to get commitment from token field first
      let commitment = this.tx.token?.commitment
      
      // If not found, try to get from attributes
      if (!commitment && Array.isArray(this.tx.attributes)) {
        const commitmentAttr = this.tx.attributes.find(attr => attr.key === 'commitment')
        if (commitmentAttr && commitmentAttr.value) {
          commitment = commitmentAttr.value
        }
      }
      
      // Convert commitment to hex string if it's a Uint8Array or Buffer
      if (commitment) {
        if (commitment instanceof Uint8Array || (commitment.constructor && commitment.constructor.name === 'Uint8Array')) {
          return binToHex(commitment)
        }
        if (Buffer && Buffer.isBuffer(commitment)) {
          return commitment.toString('hex')
        }
        // If it's already a string, return as is
        if (typeof commitment === 'string') {
          return commitment
        }
      }
      
      return null
    },
    showAddToFavoritesButton () {
      // Hide by default until favorites are evaluated
      if (!this.favoritesEvaluated) return false
      // Don't show button for NFTs
      if (this.isNft) return false
      if (!this.isTokenTransaction || !this.tokenAssetId) return false
      // Check if token is not in favorites
      const favoriteIds = this.favorites
        .filter(fav => fav.favorite === 1)
        .map(fav => fav.id)
      return !favoriteIds.includes(this.tokenAssetId)
    },
    txFeeMarketValue () {
      if (!this.tx) return ''
      const bchMarketValue = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchMarketValue) return ''
      const gas = this.tx.tx_fee / (10 ** 8)
      return (Number(gas) * Number(bchMarketValue))
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    badgeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'amber-7',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
    },
    wrapperBackgroundStyle () {
      const theme = this.theme
      const isDark = this.darkMode
      
      // Map of themes to their background colors [dark, light]
      const themeBackgrounds = {
        'glassmorphic-blue': {
          dark: '#273746',
          light: '#ecf3f3'
        },
        'glassmorphic-gold': {
          dark: '#3d3224',
          light: '#fff8e1'
        },
        'glassmorphic-green': {
          dark: '#263d32',
          light: '#e8f5e9'
        },
        'glassmorphic-red': {
          dark: '#462733',
          light: '#f3ecec'
        }
      }
      
      // Default to blue theme if theme not found
      const bgColors = themeBackgrounds[theme] || themeBackgrounds['glassmorphic-blue']
      const backgroundColor = isDark ? bgColors.dark : bgColors.light
      
      return {
        backgroundColor: backgroundColor
      }
    },
    attributeDetails () {
      if (!Array.isArray(this.tx?.attributes)) return []
      return parseAttributesToGroups({ attributes: this.tx?.attributes })
    },
    metadataBadges () {
      if (!Array.isArray(this.tx?.attributes)) return []
      return this.tx.attributes.map(parseAttributeToBadge)
        .filter(badge => badge?.custom)
    },
    backNavPath () {
      // Return the appropriate back path based on where we came from
      const fromParam = this.$route?.query?.from
      if (fromParam === 'transactions') {
        // Preserve the original assetID from query params if it exists
        // This ensures we return to the same filter (e.g., "all" or specific asset)
        // Check both the route query and the transaction asset to ensure we have the correct assetID
        const routeAssetID = this.$route?.query?.assetID
        const txAssetID = this.tx?.asset?.id
        const assetId = routeAssetID || txAssetID || 'bch'
        
        // Return a route object (not a string) so Vue Router handles query params correctly
        // The header-nav component will use this object directly for navigation
        return {
          path: '/transaction/list',
          query: { assetID: assetId }
        }
      }
      if (fromParam?.includes('apps/multisig')) { 
        return {
          path: this.$route?.query?.from,
          query: { asset: this.$route?.query?.asset }
        }
      }
      return '/'
    }
  },
  async mounted () {

    if (this.$route.query?.walletHash && this.$route.query?.from?.includes('apps/multisig')) {
      this.walletHash = this.$route.query.walletHash
    }

    if (!this.$route.query?.from?.includes('apps/multisig')) {
      await this.initWallet()
    }

    // Ensure HTML and body have the correct background color to match our wrapper
    this.updateBackgroundColors()
    
    // Check if this is a new transaction from receive page
    // Handle both properly formatted query and malformed URLs with double ?
    const query = this.$route?.query || {}
    const isNewTransaction = query.new === 'true' || 
                             (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                             (window.location.search && window.location.search.includes('new=true'))

    // Only preload audio for new transactions.
    // iOS audio preload can interrupt other apps' background audio.
    // Don't block on audio errors - confetti should still work.
    if (isNewTransaction) {
      this.preloadAudio()
        .then(() => {
          this.audioPreloaded = true
        })
        .catch(() => {
          this.audioPreloaded = false
        })
    }
    
    // Extract category parameter from query string
    let categoryParam = query.category || ''
    // Handle malformed URLs where category might include ?new=true
    if (typeof categoryParam === 'string' && categoryParam.includes('?new=true')) {
      categoryParam = categoryParam.split('?')[0]
    }
    
    const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
    if (preloaded) {
      // Check if preloaded is already corrupted (has numeric string keys like "0", "1", etc.)
      const preloadedKeys = Object.keys(preloaded)
      if (preloadedKeys.length > 0 && preloadedKeys.every(k => /^\d+$/.test(k))) {
        // Don't use corrupted data, fetch from API instead
        await this.fetchAndShow()
        return
      }
      
      // Create a mutable copy since router state objects are readonly
      let mutableTx = this.createMutableCopy(preloaded)
      
      // Check if copy is corrupted
      const mutableKeys = Object.keys(mutableTx)
      if (mutableKeys.length > 0 && mutableKeys.every(k => /^\d+$/.test(k))) {
        // Fetch from API instead of using corrupted copy
        await this.fetchAndShow(0)
        return
      }
      
      // Ensure the transaction object itself is not frozen
      if (Object.isFrozen(mutableTx)) {
        mutableTx = { ...mutableTx }
      }
      // Pass category parameter to ensure correct asset is attached
      await this.attachAssetIfMissing(mutableTx, categoryParam)
      this.tx = mutableTx
      this.$nextTick(() => {
        this.loadMemo()
        this.loadFavorites()
        this.fetchTokenPrice()
        // Launch confetti if this is a new transaction
        // Wait for DOM to be fully rendered before triggering
        if (isNewTransaction) {
          this.waitForRenderAndLaunchConfetti()
        }
      })
      return
    }

    await this.fetchAndShow()
    
    // Note: Confetti is launched inside fetchAndShow after transaction loads successfully
    // Don't launch it here to avoid launching before transaction data is available
  },
  beforeUnmount () {
    // Reset background colors
    const htmlEl = document.documentElement
    const bodyEl = document.body
    if (htmlEl) {
      htmlEl.style.backgroundColor = ''
    }
    if (bodyEl) {
      bodyEl.style.backgroundColor = ''
    }
    
    // Stop background fetch
    this.backgroundFetchActive = false
    
    // Unload sound (only if we preloaded/used it)
    if (this.audioPreloaded) {
      NativeAudio.unload({
        assetId: 'send-success'
      })
    }
  },
  watch: {
    theme () {
      this.updateBackgroundColors()
    },
    darkMode () {
      this.updateBackgroundColors()
    },
    'tx.asset.id' () {
      // Fetch token price when asset changes
      this.fetchTokenPrice()
    },
    'tx.encrypted_memo' () {
      // Reload memo when encrypted_memo changes (including when it becomes null/empty)
      // loadMemo() handles null/empty memos correctly by clearing the displayed memo
      this.$nextTick(() => {
        this.loadMemo()
      })
    },
    tx (newTx, oldTx) {
      // Reload memo when transaction object is first set or txid changes
      if (newTx && newTx.txid && (!oldTx || oldTx.txid !== newTx.txid)) {
        this.$nextTick(() => {
          this.loadMemo()
        })
      }
      // Fetch NFT metadata when transaction changes and it's an NFT
      if (newTx) {
        this.$nextTick(() => {
          // Reset NFT image and name when transaction changes
          this.nftImageUrl = null
          this.nftName = null
          this.nftImageError = false
          // Fetch metadata if it's an NFT
          if (this.isNft) {
            this.fetchNftMetadata()
          }
        })
      }
    }
  },
  methods: {
    async ensureAssetSettingsAuth () {
      // `fetchFavorites()` works without auth, but `saveFavorites()` / `saveCustomList()` require it.
      // Asset list page calls `assetSettings.authToken()` before saving; do the same here.
      try {
        const token = await assetSettings.getAuthToken()
        if (token) return true
        await assetSettings.authToken()
        const tokenAfter = await assetSettings.getAuthToken()
        return !!tokenAfter
      } catch (e) {
        console.warn('[TransactionDetail] Failed to initialize asset settings auth token:', e)
        return false
      }
    },
    getDarkModeClass,
    parseFiatCurrency,
    getAssetDenomination,
    parseAssetDenomination,
    createMutableCopy (obj) {
      // Create a deep mutable copy of an object
      // This is needed because objects from router state or API responses may be readonly/frozen
      if (!obj) return obj
      
      // Check if object is already corrupted (has numeric string keys like "0", "1", etc.)
      const keys = Object.keys(obj)
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        // Object appears corrupted, return original to let caller handle it
        return obj
      }
      
      // Use structuredClone if available (better for complex objects)
      if (typeof structuredClone !== 'undefined') {
        try {
          return structuredClone(obj)
        } catch (error) {
          // structuredClone might fail for some objects, fall back to JSON
        }
      }
      
      // Fallback to JSON serialization
      try {
        const jsonString = JSON.stringify(obj)
        if (!jsonString || jsonString === '{}' || jsonString === 'null') {
          return { ...obj }
        }
        const copied = JSON.parse(jsonString)
        // Ensure the object is not frozen
        if (Object.isFrozen(copied)) {
          return { ...copied }
        }
        return copied
      } catch (error) {
        // Final fallback: shallow copy with unfreeze attempt
        const shallow = { ...obj }
        // Try to unfreeze nested objects
        for (const key in shallow) {
          if (shallow[key] && typeof shallow[key] === 'object' && !Array.isArray(shallow[key]) && Object.isFrozen(shallow[key])) {
            shallow[key] = { ...shallow[key] }
          }
        }
        return shallow
      }
    },
    updateBackgroundColors () {
      this.$nextTick(() => {
        const backgroundColor = this.wrapperBackgroundStyle.backgroundColor
        const htmlEl = document.documentElement
        const bodyEl = document.body
        if (htmlEl) {
          htmlEl.style.backgroundColor = backgroundColor
        }
        if (bodyEl) {
          bodyEl.style.backgroundColor = backgroundColor
        }
      })
    },
    hexToRef (hex6) {
      return hexToRefUtil(hex6)
    },
    async fetchAndShow (retryAttempt = 0) {
      this.isLoading = true
      this.loadError = ''
      
      try {
        const effectiveWalletHash = this.walletHash || this.$store.getters['global/getWallet']('bch')?.walletHash
        // Get txid from prop first, then fallback to route params (for redirects from receive page)
        const effectiveTxid = this.txid || this.$route?.params?.txid
        
        if (!effectiveWalletHash || !effectiveTxid) {
          console.error('[TransactionDetail] Missing walletHash or txid:', { effectiveWalletHash, effectiveTxid, propTxid: this.txid, routeParams: this.$route?.params })
          this.isLoading = false
          this.loadError = this.$t('TransactionNotFound', {}, 'Transaction not found')
          return
        }
        
        // Check for websocket data as fallback
        const wsData = (window && window.history && window.history.state && window.history.state.tx) || null
        const isFromWebsocket = window?.history?.state?.fromWebsocket || false
        
        const baseUrl = getWatchtowerApiUrl(this.$store.getters['global/isChipnet'])
        // Prefer explicit query param; fallback to preloaded tx.asset.id (ct/{cat} | slp/{cat})
        let categoryParam = this.$route?.query?.category || ''
        // Handle malformed URLs where category might include ?new=true
        if (typeof categoryParam === 'string' && categoryParam.includes('?new=true')) {
          categoryParam = categoryParam.split('?')[0]
        }
        if (!categoryParam) {
          const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
          const assetId = String(preloaded?.asset?.id || '')
          const parts = assetId.split('/')
          if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
            categoryParam = parts[1]
          }
        }
        const categoryPath = categoryParam ? `/${categoryParam}` : ''
        const url = `${baseUrl}/history/wallet/${encodeURIComponent(effectiveWalletHash)}${categoryPath}/`
        const { data } = await axios.get(url, { params: { txids: effectiveTxid } })
        const tx = Array.isArray(data?.history) ? data.history[0] : (Array.isArray(data) ? data[0] : data)

        if (tx) {
          // Prefer preloaded asset metadata (logo, symbol) if available
          const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
          // Create a mutable copy since objects from API or router state may be readonly
          let mutableTx = this.createMutableCopy(tx)
          // Ensure the transaction object itself is not frozen
          if (Object.isFrozen(mutableTx)) {
            mutableTx = { ...mutableTx }
          }
          if (preloaded?.asset) {
            // Create a mutable copy of the asset as well
            let assetCopy = this.createMutableCopy(preloaded.asset)
            if (Object.isFrozen(assetCopy)) {
              assetCopy = { ...assetCopy }
            }
            mutableTx.asset = assetCopy
          }
          await this.attachAssetIfMissing(mutableTx, categoryParam)
          this.tx = mutableTx
          this.isLoading = false
          this.retryCount = 0
          
          // Check if this is a new transaction and launch confetti/sound
          const query = this.$route?.query || {}
          const isNewTransaction = query.new === 'true' || 
                                   (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                                   (window.location.search && window.location.search.includes('new=true'))
          
          this.$nextTick(() => {
            // Ensure tx is set before loading memo
            if (this.tx && this.tx.txid) {
              this.loadMemo()
            }
            this.loadFavorites()
            this.fetchTokenPrice()
            // Launch confetti if this is a new transaction
            // Wait for DOM to be fully rendered before triggering
            if (isNewTransaction) {
              this.waitForRenderAndLaunchConfetti()
            }
          })
        } else {
          // Transaction not found, retry with exponential backoff
          // After 2 retries, if we have websocket data, use it as fallback
          if (retryAttempt >= 2 && wsData && isFromWebsocket) {
            const mutableTx = this.createMutableCopy(wsData)
            await this.attachAssetIfMissing(mutableTx, categoryParam)
            this.tx = mutableTx
            this.isLoading = false
            this.retryCount = 0
            this.usingWebsocketData = true // Mark that we're using websocket data
            
            // Start background fetch to get real API data
            this.startBackgroundFetch()
            
            // Check if this is a new transaction and launch confetti/sound
            const query = this.$route?.query || {}
            const isNewTransaction = query.new === 'true' || 
                                     (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                                     (window.location.search && window.location.search.includes('new=true'))
            
            this.$nextTick(() => {
              this.loadMemo()
              this.loadFavorites()
              this.fetchTokenPrice()
              if (isNewTransaction) {
                this.waitForRenderAndLaunchConfetti()
              }
            })
            return
          }
          
          if (retryAttempt < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryAttempt), 30000) // Cap at 30 seconds
            this.retryCount = retryAttempt + 1
            setTimeout(() => {
              this.fetchAndShow(retryAttempt + 1)
            }, delay)
          } else {
            // All retries exhausted
            // If we have websocket data, use it as final fallback
            if (wsData && isFromWebsocket) {
              const mutableTx = this.createMutableCopy(wsData)
              await this.attachAssetIfMissing(mutableTx, categoryParam)
              this.tx = mutableTx
              this.isLoading = false
              this.retryCount = 0
              this.usingWebsocketData = true // Mark that we're using websocket data
              
              // Start background fetch to get real API data
              this.startBackgroundFetch()
              
              const query = this.$route?.query || {}
              const isNewTransaction = query.new === 'true' || 
                                       (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                                       (window.location.search && window.location.search.includes('new=true'))
              
              this.$nextTick(() => {
                this.loadMemo()
                if (isNewTransaction) {
                  this.waitForRenderAndLaunchConfetti()
                }
              })
              return
            }
            
            this.isLoading = false
            this.loadError = this.$t('TransactionNotFound', {}, 'Transaction not found')
          }
        }
      } catch (err) {
        // Retry on error with exponential backoff
        // Check for websocket fallback after 2 retries
        const wsData = (window && window.history && window.history.state && window.history.state.tx) || null
        const isFromWebsocket = window?.history?.state?.fromWebsocket || false
        
        if (retryAttempt >= 2 && wsData && isFromWebsocket) {
          const categoryParam = this.$route?.query?.category || ''
          const mutableTx = this.createMutableCopy(wsData)
          await this.attachAssetIfMissing(mutableTx, categoryParam)
          this.tx = mutableTx
          this.isLoading = false
          this.retryCount = 0
          this.usingWebsocketData = true // Mark that we're using websocket data
          
          // Start background fetch to get real API data
          this.startBackgroundFetch()
          
          const query = this.$route?.query || {}
          const isNewTransaction = query.new === 'true' || 
                                   (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                                   (window.location.search && window.location.search.includes('new=true'))
          
          this.$nextTick(() => {
            this.loadMemo()
            this.loadFavorites()
            this.fetchTokenPrice()
            if (isNewTransaction) {
              this.waitForRenderAndLaunchConfetti()
            }
          })
          return
        }
        
        if (retryAttempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 30000) // Cap at 30 seconds
          this.retryCount = retryAttempt + 1
          setTimeout(() => {
            this.fetchAndShow(retryAttempt + 1)
          }, delay)
        } else {
          // All retries exhausted
          // If we have websocket data, use it as final fallback
          const wsData = (window && window.history && window.history.state && window.history.state.tx) || null
          const isFromWebsocket = window?.history?.state?.fromWebsocket || false
          
          if (wsData && isFromWebsocket) {
            const categoryParam = this.$route?.query?.category || ''
            const mutableTx = this.createMutableCopy(wsData)
            await this.attachAssetIfMissing(mutableTx, categoryParam)
            this.tx = mutableTx
            this.isLoading = false
            this.retryCount = 0
            this.usingWebsocketData = true // Mark that we're using websocket data
            
            // Start background fetch to get real API data
            this.startBackgroundFetch()
            
            const query = this.$route?.query || {}
            const isNewTransaction = query.new === 'true' || 
                                     (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                                     (window.location.search && window.location.search.includes('new=true'))
            
            this.$nextTick(() => {
              this.loadMemo()
              if (isNewTransaction) {
                this.waitForRenderAndLaunchConfetti()
              }
            })
            return
          }
          
          this.isLoading = false
          this.loadError = this.$t('FailedToLoadTransaction', {}, 'Failed to load transaction')
        }
      }
    },
    retryFetch () {
      this.retryCount = 0
      this.fetchAndShow(0)
    },
    /**
     * Start background fetch to get real API data when using websocket fallback
     * This continues fetching with exponential backoff until transaction is found
     */
    async startBackgroundFetch (retryAttempt = 0) {
      if (this.backgroundFetchActive) {
        return
      }
      
      this.backgroundFetchActive = true
      const maxBackgroundRetries = 10 // More retries for background fetch
      
      const fetchInBackground = async (attempt = 0) => {
        // Check if component is still mounted and background fetch should continue
        if (!this.backgroundFetchActive) {
          return
        }
        
        try {
          const effectiveWalletHash = this.walletHash || this.$store.getters['global/getWallet']('bch')?.walletHash
          const effectiveTxid = this.txid || this.$route?.params?.txid
          
          if (!effectiveWalletHash || !effectiveTxid) {
            this.backgroundFetchActive = false
            return
          }
          
          const baseUrl = getWatchtowerApiUrl(this.$store.getters['global/isChipnet'])
          let categoryParam = this.$route?.query?.category || ''
          // Handle malformed URLs where category might include ?new=true
          if (typeof categoryParam === 'string' && categoryParam.includes('?new=true')) {
            categoryParam = categoryParam.split('?')[0]
          }
          if (!categoryParam && this.tx?.asset?.id) {
            const assetId = String(this.tx.asset.id)
            const parts = assetId.split('/')
            if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
              categoryParam = parts[1]
            }
          }
          const categoryPath = categoryParam ? `/${categoryParam}` : ''
          const url = `${baseUrl}/history/wallet/${encodeURIComponent(effectiveWalletHash)}${categoryPath}/`
          
          const { data } = await axios.get(url, { params: { txids: effectiveTxid } })
          const tx = Array.isArray(data?.history) ? data.history[0] : (Array.isArray(data) ? data[0] : data)
          
          if (tx) {
            // Transaction found! Update with real API data
            const mutableTx = this.createMutableCopy(tx)
            if (Object.isFrozen(mutableTx)) {
              mutableTx = { ...mutableTx }
            }
            
            // Preserve asset if we have it
            if (this.tx?.asset) {
              mutableTx.asset = this.tx.asset
            }
            
            await this.attachAssetIfMissing(mutableTx, categoryParam)
            this.tx = mutableTx
            this.usingWebsocketData = false // Enable memo button now
            this.backgroundFetchActive = false
            
            // Reload memo with real transaction data
            this.$nextTick(() => {
              this.loadMemo()
              this.loadFavorites()
              this.fetchTokenPrice()
            })
          } else {
            // Not found yet, retry with exponential backoff
            if (attempt < maxBackgroundRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // Cap at 30 seconds
              setTimeout(() => {
                fetchInBackground(attempt + 1)
              }, delay)
            } else {
              this.backgroundFetchActive = false
            }
          }
        } catch (err) {
          console.error('[TransactionDetail] Background fetch error:', err)
          // Retry on error
          if (attempt < maxBackgroundRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
            setTimeout(() => {
              fetchInBackground(attempt + 1)
            }, delay)
          } else {
            this.backgroundFetchActive = false
          }
        }
      }
      
      // Start with a small delay to not interfere with initial render
      setTimeout(() => {
        fetchInBackground(0)
      }, 1000)
    },
    async loadMemo () {
      try {
        const txid = this.transactionId
        if (!txid) return

        // Use memo service to load and decrypt memo
        const result = await memoService.loadMemo(txid, this.tx?.encrypted_memo)

        if (result.success) {
          if (result.memo) {
            // Memo successfully decrypted
            this.transactionMemo = result.memo
            this.memoInput = result.memo
            this.hasMemo = true
            this.editingMemo = false
          } else {
            // No memo found (not an error)
            this.hasMemo = false
            this.editingMemo = false
          }
        } else {
          // Error loading/decrypting memo
          console.error('[TransactionDetail] loadMemo error:', result.error)
          this.networkError = true
          this.hasMemo = false
          this.editingMemo = false
        }
      } catch (error) {
        console.error('[TransactionDetail] loadMemo: Unexpected error:', error)
        this.networkError = true
        this.hasMemo = false
        this.editingMemo = false
      }
    },
    openMemo () {
      this.editingMemo = true
      this.$nextTick(() => {
        if (this.$refs.memoInputRef) this.$refs.memoInputRef.focus()
      })
    },
    cancelEditMemo () {
      this.memoInput = this.transactionMemo
      this.editingMemo = false
    },
    async saveMemo () {
      try {
        const txid = this.transactionId
        if (!txid) return

        const trimmedMemo = String(this.memoInput || '').trim()
        if (!trimmedMemo) return

        // Use memo service to save memo
        const result = await memoService.saveMemo(txid, trimmedMemo, this.hasMemo)

        if (result.success) {
          this.transactionMemo = trimmedMemo
          this.memoInput = trimmedMemo
          this.hasMemo = true
          this.editingMemo = false
          
          this.$q.notify({
            message: this.$t('MemoSaved', {}, 'Memo saved'),
            color: 'positive',
            icon: 'check_circle',
            position: 'top',
            timeout: 2000
          })
        } else {
          this.networkError = true
          this.$q.notify({
            message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        }
      } catch (error) {
        console.error('[TransactionDetail] saveMemo: Unexpected error:', error)
        this.networkError = true
        this.$q.notify({
          message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    },
    async confirmDelete () {
      // Show confirmation dialog before deleting
      this.$q.dialog({
        title: this.$t('DeleteMemo', {}, 'Delete Memo'),
        message: this.$t('ConfirmDeleteMemo', {}, 'Are you sure you want to delete this memo? This action cannot be undone.'),
        ok: {
          push: true,
          color: 'negative',
          label: this.$t('Delete', {}, 'Delete')
        },
        cancel: {
          push: true,
          color: 'grey',
          label: this.$t('Cancel', {}, 'Cancel')
        },
        persistent: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(async () => {
        // User confirmed deletion
        try {
          const txid = this.transactionId
          if (!txid) return

          const result = await memoService.deleteMemo(txid)

          if (result.success) {
            this.hasMemo = false
            this.transactionMemo = ''
            this.memoInput = ''
            this.editingMemo = false
            
            this.$q.notify({
              message: this.$t('MemoDeleted', {}, 'Memo deleted'),
              color: 'positive',
              icon: 'check_circle',
              position: 'top',
              timeout: 2000
            })
          } else {
            this.networkError = true
            this.$q.notify({
              message: this.$t('ErrorDeletingMemo', {}, 'Error deleting memo'),
              color: 'negative',
              icon: 'error',
              position: 'top',
              timeout: 2000
            })
          }
        } catch (error) {
          console.error('[TransactionDetail] confirmDelete: Unexpected error:', error)
          this.networkError = true
          this.$q.notify({
            message: this.$t('ErrorDeletingMemo', {}, 'Error deleting memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        }
      })
    },
    async initWallet () {
      // Load BCH wallet (consistent with transactions page)
      const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
      this.wallet = wallet
    },
    async loadFavorites () {
      try {
        // Best-effort: ensure auth is ready so follow-up actions (save favorites) won't fail.
        // (Fetching favorites itself is unauthenticated.)
        await this.ensureAssetSettingsAuth()
        const favorites = await assetSettings.fetchFavorites()
        if (favorites && Array.isArray(favorites)) {
          this.favorites = favorites
        } else {
          this.favorites = []
        }
        // Mark favorites as evaluated after successful load
        this.favoritesEvaluated = true
      } catch (error) {
        console.error('Error loading favorites:', error)
        this.favorites = []
        // Still mark as evaluated even on error to prevent infinite waiting
        this.favoritesEvaluated = true
      }
    },
    async fetchTokenPrice () {
      // Only fetch price for tokens (not BCH)
      if (!this.tx || !this.tx.asset || !this.tx.asset.id) return
      
      const assetId = String(this.tx.asset.id)
      // Skip if it's BCH or if price already exists in store
      if (assetId === 'bch' || assetId === '') return
      
      // Check if price already exists
      const code = this.selectedMarketCurrency
      if (!code) return
      
      const existingPrice = this.$store.getters['market/getAssetPrice'](assetId, code)
      if (existingPrice && existingPrice !== 0) {
        // Price already exists, no need to fetch
        return
      }
      
      // Fetch price for this token
      try {
        await this.$store.dispatch('market/updateAssetPrices', {
          assetId: assetId,
          clearExisting: false
        })
      } catch (error) {
        // Price might not be available for this token
      }
    },
    async fetchNftMetadata () {
      // Only fetch if it's an NFT and we have token ID
      if (!this.isNft || !this.nftTokenId) {
        this.nftImageUrl = null
        this.nftName = null
        return
      }

      // Don't fetch if already fetching or if we already have the image
      if (this.fetchingNftMetadata || this.nftImageUrl) return

      this.fetchingNftMetadata = true
      this.nftImageError = false

      try {
        const tokenId = this.nftTokenId
        const commitment = this.nftCommitment

        // Build URL: tokens/{tokenId}/ or tokens/{tokenId}/{commitment}/
        let url = `tokens/${tokenId}/`
        if (commitment) {
          url += `${commitment}/`
        }

        const response = await getBcmrBackend().get(url)
        const metadata = response?.data

        if (metadata) {
          // Extract name from type_metadata
          if (metadata.type_metadata?.name) {
            this.nftName = metadata.type_metadata.name
          } else if (metadata.name) {
            // Fallback to top-level name if type_metadata.name doesn't exist
            this.nftName = metadata.name
          } else {
            this.nftName = null
          }

          // Extract image URL from type_metadata
          // Priority: type_metadata.uris.image > type_metadata.uris.icon
          let imageUrl = null
          if (metadata.type_metadata?.uris?.image) {
            imageUrl = metadata.type_metadata.uris.image
          } else if (metadata.type_metadata?.uris?.icon) {
            imageUrl = metadata.type_metadata.uris.icon
          }

          if (imageUrl) {
            // Convert IPFS URL if needed
            this.nftImageUrl = convertIpfsUrl(imageUrl)
            // Add Pinata gateway token if it's a Pinata IPFS URL
            if (this.nftImageUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
              this.nftImageUrl += '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
            }
          } else {
            // No image found in type_metadata
            this.nftImageUrl = null
          }
        } else {
          this.nftImageUrl = null
          this.nftName = null
        }
      } catch (error) {
        console.error('[TransactionDetail] Error fetching NFT metadata:', error)
        this.nftImageUrl = null
        this.nftName = null
      } finally {
        this.fetchingNftMetadata = false
      }
    },
    viewInCollectibles () {
      // Navigate to collectibles page with category parameter if available
      const category = this.nftTokenId
      const query = category ? { category } : {}
      this.$router.push({
        name: 'app-collectibles',
        query
      })
    },
    async addTokenToFavorites () {
      if (!this.tokenAssetId || !this.tx || !this.tx.asset) return
      
      // Fetch current favorites to check count
      let currentFavorites = await assetSettings.fetchFavorites()
      if (!Array.isArray(currentFavorites)) {
        currentFavorites = []
      }
      
      // Count current favorites (where favorite === 1)
      const currentFavoriteCount = currentFavorites.filter(fav => fav.favorite === 1).length
      
      // Check if this token is already a favorite
      const isAlreadyFavorite = currentFavorites.some(fav => fav.id === this.tokenAssetId && fav.favorite === 1)
      
      // If not already a favorite, check limit
      if (!isAlreadyFavorite) {
        const limit = this.$store.getters['subscription/getLimit']('favoriteTokens')
        if (currentFavoriteCount >= limit) {
          await showLimitDialogWithDeps(
            { $q: this.$q, $store: this.$store },
            'favoriteTokens',
            { darkMode: this.darkMode, forceRefresh: true }
          )
          return
        }
      }
      
      this.addingToFavorites = true
      try {
        const hasAuth = await this.ensureAssetSettingsAuth()
        if (!hasAuth) {
          throw new Error('Asset settings auth token missing')
        }
        const selectedNetwork = 'BCH'
        
        // Fetch custom list (same as asset list page)
        let customList = await assetSettings.fetchCustomList()
        
        // Get all assets from store for BCH network
        const allAssets = this.$store.getters['assets/getAssets']
        
        // Filter out BCH from the list
        const assets = allAssets.filter(asset => asset && asset.id !== 'bch')
        
        // Initialize custom list if needed (same as asset list page)
        if (!customList || 'error' in customList || Object.keys(customList).length === 0) {
          const assetIDs = assets.map((asset) => asset.id)
          if (selectedNetwork === 'BCH') {
            await assetSettings.initializeCustomList(assetIDs, [])
          } else {
            await assetSettings.initializeCustomList([], assetIDs)
          }
          customList = await assetSettings.fetchCustomList()
        }
        
        // Get asset IDs from custom list for the current network
        let assetIds = customList[selectedNetwork] || []
        
        // Ensure the token is in the custom list (add to beginning if not present)
        if (!assetIds.includes(this.tokenAssetId)) {
          assetIds.unshift(this.tokenAssetId)
          customList[selectedNetwork] = assetIds
          const savedCustom = await assetSettings.saveCustomList(customList)
          if (savedCustom && typeof savedCustom === 'object' && (savedCustom.detail || savedCustom.error)) {
            throw new Error(savedCustom.detail || savedCustom.error)
          }
        }
        
        // Create a map of existing favorites for quick lookup
        const favoritesMap = new Map()
        currentFavorites.forEach(fav => {
          favoritesMap.set(fav.id, { favorite: fav.favorite, favorite_order: fav.favorite_order || null })
        })
        
        // Update or add the token to favorites (preserving all existing favorites and favorite_order)
        if (favoritesMap.has(this.tokenAssetId)) {
          // Update existing favorite status, preserve favorite_order if it exists
          const index = currentFavorites.findIndex(fav => fav.id === this.tokenAssetId)
          if (index !== -1) {
            const existingOrder = currentFavorites[index].favorite_order
            currentFavorites[index].favorite = 1
            // If favorite_order doesn't exist, assign it position 1 and shift others
            if (existingOrder === null || existingOrder === undefined) {
              // Get all existing favorites with order
              const existingFavorites = currentFavorites.filter(fav => fav.favorite === 1 && fav.id !== this.tokenAssetId && fav.favorite_order !== null && fav.favorite_order !== undefined)
              const maxOrder = existingFavorites.length > 0 
                ? Math.max(...existingFavorites.map(f => f.favorite_order))
                : 0
              currentFavorites[index].favorite_order = maxOrder + 1
            }
          }
        } else {
          // Add new favorite at position 1, increment all existing favorites' favorite_order by 1
          // First, increment all existing favorites' favorite_order
          currentFavorites.forEach(fav => {
            if (fav.favorite === 1 && fav.favorite_order !== null && fav.favorite_order !== undefined) {
              fav.favorite_order = fav.favorite_order + 1
            }
          })
          // Add new favorite with favorite_order: 1
          currentFavorites.unshift({ id: this.tokenAssetId, favorite: 1, favorite_order: 1 })
        }
        
        // Ensure all non-favorites have favorite_order: null
        currentFavorites.forEach(fav => {
          if (fav.favorite === 0 || fav.favorite === null || fav.favorite === undefined) {
            fav.favorite_order = null
          }
        })
        
        // Save the full favorites list (preserving favorites from all networks and favorite_order)
        const saved = await assetSettings.saveFavorites(currentFavorites)
        if (saved && typeof saved === 'object' && (saved.detail || saved.error)) {
          // asset-settings returns error payloads instead of throwing; normalize to exception
          throw new Error(saved.detail || saved.error)
        }
        
        // Update local favorites array immediately so button disappears right away
        this.favorites = currentFavorites
        
        // Reload favorites from server to ensure consistency
        await this.loadFavorites()
        
        this.$q.notify({
          message: this.$t('TokenAddedToFavorites', {}, 'Token added to favorites'),
          color: 'positive',
          icon: 'star',
          position: 'top',
          timeout: 2000
        })
      } catch (error) {
        console.error('Error adding token to favorites:', error)
        this.$q.notify({
          message: this.$t('ErrorAddingToFavorites', {}, 'Error adding token to favorites'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      } finally {
        this.addingToFavorites = false
      }
    },
    async attachAssetIfMissing (tx, categoryParam) {
      if (!tx) return
      
      // If category parameter is provided, check if current asset matches it
      if (categoryParam) {
        const currentAssetId = String(tx.asset?.id || '')
        const expectedAssetId = `ct/${categoryParam}`
        const expectedSlpAssetId = `slp/${categoryParam}`
        
        // If current asset already matches, no need to change
        if (currentAssetId === expectedAssetId || currentAssetId === expectedSlpAssetId) {
          return
        }
        
        // Current asset doesn't match the category, try to find the correct asset
        try {
          const assets = this.$store.getters['assets/getAssets'] || []
          const match = assets.find(a => {
            const assetId = String(a?.id || '')
            return assetId.endsWith(`/${categoryParam}`) && 
                   (assetId.startsWith('ct/') || assetId.startsWith('slp/'))
          })
          if (match) {
            // Create a mutable copy of the asset to avoid readonly issues
            let assetCopy = this.createMutableCopy(match)
            // Ensure the asset object itself is not frozen
            if (Object.isFrozen(assetCopy)) {
              assetCopy = { ...assetCopy }
            }
            tx.asset = assetCopy
            return
          }
        } catch {}
        
        // Asset not found in store, but category is provided - try to fetch metadata
        // Default to ct (CashToken) as it's more common
        const assetId = `ct/${categoryParam}`
        let basicAsset = {
          id: assetId,
          symbol: categoryParam.substring(0, 8).toUpperCase(), // Use first 8 chars as symbol
          name: `Token ${categoryParam.substring(0, 8)}`,
          logo: '',
          decimals: 0,
          balance: 0
        }
        
        // Try to fetch asset metadata from BCMR
        try {
          const metadata = await this.$store.dispatch('assets/getAssetMetadata', assetId)
          if (metadata) {
            basicAsset = {
              id: assetId,
              symbol: metadata.symbol || basicAsset.symbol,
              name: metadata.name || basicAsset.name,
              logo: metadata.logo || '',
              decimals: metadata.decimals || 0,
              balance: 0
            }
          }
        } catch (error) {
          // Asset metadata fetch failed, continue without it
        }
        
        tx.asset = basicAsset
        return
      }
      
      // If no asset exists, try to resolve from category
      if (!tx.asset || !tx.asset.id) {
        // Try to resolve token asset from category
        if (categoryParam) {
          try {
            const assets = this.$store.getters['assets/getAssets'] || []
            const match = assets.find(a => {
              const assetId = String(a?.id || '')
              return assetId.endsWith(`/${categoryParam}`) && 
                     (assetId.startsWith('ct/') || assetId.startsWith('slp/'))
            })
            if (match) {
              // Create a mutable copy of the asset to avoid readonly issues
              let assetCopy = this.createMutableCopy(match)
              // Ensure the asset object itself is not frozen
              if (Object.isFrozen(assetCopy)) {
                assetCopy = { ...assetCopy }
              }
              tx.asset = assetCopy
              return
            }
          } catch {}
          
          // Category provided but asset not found - try to fetch metadata
          const assetId = `ct/${categoryParam}`
          let basicAsset = {
            id: assetId,
            symbol: categoryParam.substring(0, 8).toUpperCase(),
            name: `Token ${categoryParam.substring(0, 8)}`,
            logo: '',
            decimals: 0,
            balance: 0
          }
          
          // Try to fetch asset metadata from BCMR
          try {
            const metadata = await this.$store.dispatch('assets/getAssetMetadata', assetId)
            if (metadata) {
              basicAsset = {
                id: assetId,
                symbol: metadata.symbol || basicAsset.symbol,
                name: metadata.name || basicAsset.name,
                logo: metadata.logo || '',
                decimals: metadata.decimals || 0,
                balance: 0
              }
            }
          } catch (error) {
            // Asset metadata fetch failed, continue without it
          }
          
          tx.asset = basicAsset
          return
        }

        // Fallback to BCH
        let bchAsset = this.$store.getters['assets/getAsset'] && this.$store.getters['assets/getAsset']('bch')
        if (Array.isArray(bchAsset)) bchAsset = bchAsset[0]
        if (!bchAsset) {
          bchAsset = { id: 'bch', symbol: 'BCH', name: 'Bitcoin Cash', logo: 'bch-logo.png', balance: 0 }
        } else {
          // Create a mutable copy of the asset to avoid readonly issues
          bchAsset = this.createMutableCopy(bchAsset)
          // Ensure the asset object itself is not frozen
          if (Object.isFrozen(bchAsset)) {
            bchAsset = { ...bchAsset }
          }
        }
        tx.asset = bchAsset
      }
    },
    goBack () {
      // Check if we came from transactions page
      const fromParam = this.$route?.query?.from
      if (fromParam === 'transactions') {
        // Preserve the original assetID from query params if it exists
        // This ensures we return to the same filter (e.g., "all" or specific asset)
        // Priority: route query assetID (most reliable) > transaction asset ID
        // The route query assetID is the exact filter the user was viewing
        const routeAssetID = this.$route?.query?.assetID
        const txAssetID = this.tx?.asset?.id
        const assetId = routeAssetID || txAssetID || 'bch'
        
        // Navigate back to transactions page with the corresponding asset filter
        this.$router.push({
          path: '/transaction/list',
          query: { assetID: assetId }
        })
      } else {
        // If not from transactions page, navigate to home page
        this.$router.push('/')
      }
    },
    formatDate (date) {
      const dateObj = new Date(date)
      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(dateObj)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({ color: 'blue-9', message: this.$t('CopiedToClipboard'), icon: 'mdi-clipboard-check', timeout: 200 })
    },
    async saveReceiptImage () {
      const vm = this
      if (!vm.tx || !vm.transactionId) return
      if (vm.savingReceipt) return

      vm.savingReceipt = true
      let wrapper = null

      try {
        const isReceived = vm.tx.record_type === 'incoming'
        const amount = vm.displayAmountText
        const fiatAmount = vm.displayFiatAmount !== null && vm.displayFiatAmount !== undefined
          ? vm.parseFiatCurrency(vm.displayFiatAmount, vm.selectedMarketCurrency)
          : null
        const dateTime = vm.formatDate(vm.tx.tx_timestamp || vm.tx.date_created)
        const referenceId = vm.transactionId ? vm.hexToRef(vm.transactionId.substring(0, 6)) : ''
        const explorerLink = vm.explorerLink

        // Create a beautiful wrapper with gradient background (transaction receipt theme)
        wrapper = document.createElement('div')
        wrapper.style.cssText = `
          background: linear-gradient(135deg, #0ac18e 0%, #00d4aa 50%, #0d9488 100%);
          padding: 40px 35px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          width: 600px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        `

        // Add decorative background elements
        const bgDecoration = document.createElement('div')
        bgDecoration.style.cssText = `
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          z-index: 0;
        `
        wrapper.appendChild(bgDecoration)

        const bgDecoration2 = document.createElement('div')
        bgDecoration2.style.cssText = `
          position: absolute;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          z-index: 0;
        `
        wrapper.appendChild(bgDecoration2)

        // Main content container
        const contentContainer = document.createElement('div')
        contentContainer.style.cssText = `
          position: relative;
          z-index: 1;
          background: white;
          border-radius: 24px;
          padding: 35px 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `

        // Header with icon and title
        const header = document.createElement('div')
        header.style.cssText = `
          text-align: center;
          margin-bottom: 40px;
        `

        // Header text (no icon, cleaner design)
        const headerText = document.createElement('div')
        headerText.style.cssText = `
          font-size: 32px;
          font-weight: 700;
          color: #2d3748;
          line-height: 1.4;
          margin-bottom: 30px;
          text-align: center;
        `
        headerText.textContent = 'Transaction Receipt'
        header.appendChild(headerText)

        // Transaction type and amount container with gradient
        const amountContainer = document.createElement('div')
        amountContainer.style.cssText = `
          background: linear-gradient(135deg, #0ac18e 0%, #00d4aa 100%);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 40px;
          box-shadow: 0 8px 24px rgba(10, 193, 142, 0.3);
        `

        const typeLabel = document.createElement('div')
        typeLabel.style.cssText = `
          font-size: 18px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        `
        typeLabel.textContent = isReceived ? 'Received' : 'Sent'
        amountContainer.appendChild(typeLabel)

        const amountValue = document.createElement('div')
        amountValue.style.cssText = `
          font-size: 48px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: ${fiatAmount ? '12px' : '0'};
        `
        amountValue.textContent = amount
        amountContainer.appendChild(amountValue)

        if (fiatAmount) {
          const fiatValue = document.createElement('div')
          fiatValue.style.cssText = `
            font-size: 24px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            letter-spacing: 0.2px;
          `
          fiatValue.textContent = fiatAmount
          amountContainer.appendChild(fiatValue)
        }

        header.appendChild(amountContainer)

        // Transaction details section
        const detailsSection = document.createElement('div')
        detailsSection.style.cssText = `
          margin-bottom: 35px;
        `

        // Reference ID
        if (referenceId) {
          const refContainer = document.createElement('div')
          refContainer.style.cssText = `
            margin-bottom: 20px;
          `
          const refLabel = document.createElement('div')
          refLabel.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          `
          refLabel.textContent = 'Reference ID'
          refContainer.appendChild(refLabel)
          const refValue = document.createElement('div')
          refValue.style.cssText = `
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
            letter-spacing: 0.3px;
          `
          refValue.textContent = referenceId
          refContainer.appendChild(refValue)
          detailsSection.appendChild(refContainer)
        }

        // Transaction ID
        const txIdContainer = document.createElement('div')
        txIdContainer.style.cssText = `
          margin-bottom: 20px;
        `
        const txIdLabel = document.createElement('div')
        txIdLabel.style.cssText = `
          font-size: 12px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        `
        txIdLabel.textContent = 'Transaction ID'
        txIdContainer.appendChild(txIdLabel)
        const txIdValue = document.createElement('div')
        txIdValue.style.cssText = `
          font-size: 18px;
          color: #4a5568;
          font-family: monospace;
          word-break: break-all;
          line-height: 1.4;
        `
        // Truncate transaction ID like in the transaction details page
        const truncatedTxId = vm.transactionId ? `${vm.transactionId.slice(0, 8)}...${vm.transactionId.slice(-8)}` : ''
        txIdValue.textContent = truncatedTxId
        txIdContainer.appendChild(txIdValue)

        // QR Code for explorer link
        if (explorerLink) {
          const qrContainer = document.createElement('div')
          qrContainer.style.cssText = `
            display: flex;
            justify-content: center;
            margin-top: 12px;
            margin-bottom: 8px;
          `

          // Create QR code
          const qrcode = new QRCode({
            content: explorerLink,
            width: 200,
            height: 200,
            padding: 2,
            color: '#000000',
            background: '#ffffff',
            ecl: 'M'
          })

          const parser = new DOMParser()
          const svgDoc = parser.parseFromString(qrcode.svg(), 'image/svg+xml')
          const svgElement = svgDoc.documentElement
          svgElement.setAttribute('width', '200')
          svgElement.setAttribute('height', '200')
          qrContainer.appendChild(svgElement)
          txIdContainer.appendChild(qrContainer)
        }

        detailsSection.appendChild(txIdContainer)

        // Date & Time
        const dateContainer = document.createElement('div')
        const dateLabel = document.createElement('div')
        dateLabel.style.cssText = `
          font-size: 12px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        `
        dateLabel.textContent = 'Date & Time'
        dateContainer.appendChild(dateLabel)
        const dateValue = document.createElement('div')
        dateValue.style.cssText = `
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          letter-spacing: 0.2px;
        `
        dateValue.textContent = dateTime
        dateContainer.appendChild(dateValue)
        detailsSection.appendChild(dateContainer)

        header.appendChild(detailsSection)
        contentContainer.appendChild(header)

        // Footer with logo and website
        const footer = document.createElement('div')
        footer.style.cssText = `
          text-align: center;
          padding-top: 15px;
        `

        // Paytaca logo container
        const paytacaLogoContainer = document.createElement('div')
        paytacaLogoContainer.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        `

        // Load Paytaca logo
        const loadPaytacaLogo = () => {
          return new Promise((resolve) => {
            const logoImg = document.createElement('img')
            logoImg.src = paytacaLogoHorizontal
            logoImg.style.cssText = `
              height: 120px;
              width: auto;
              object-fit: contain;
              display: block;
            `
            logoImg.onload = () => {
              paytacaLogoContainer.appendChild(logoImg)
              resolve()
            }
            logoImg.onerror = () => {
              // If logo fails, just resolve (no logo)
              resolve()
            }
          })
        }

        // Website text
        const websiteText = document.createElement('div')
        websiteText.style.cssText = `
          font-size: 26px;
          font-weight: 500;
          color: #4a5568;
          letter-spacing: 0.2px;
        `
        websiteText.textContent = 'www.paytaca.com'
        footer.appendChild(paytacaLogoContainer)
        footer.appendChild(websiteText)
        contentContainer.appendChild(footer)

        wrapper.appendChild(contentContainer)
        document.body.appendChild(wrapper)

        // Wait for logo to load before capturing
        await loadPaytacaLogo()

        // Small delay to ensure DOM updates are rendered
        await new Promise(resolve => setTimeout(resolve, 100))

        // Capture with html2canvas (maximum scale for best quality)
        const canvas = await html2canvas(wrapper, {
          backgroundColor: null,
          scale: 4,
          logging: false,
          useCORS: true,
          allowTaint: true,
          windowWidth: wrapper.offsetWidth,
          windowHeight: wrapper.offsetHeight,
          onclone: (clonedDoc) => {
            // Ensure all text is rendered at high quality
            const clonedWrapper = clonedDoc.querySelector('div')
            if (clonedWrapper) {
              clonedWrapper.style.transform = 'scale(1)'
              clonedWrapper.style.transformOrigin = 'top left'
            }
          }
        })

        // Remove temporary wrapper
        if (document.body.contains(wrapper)) {
          document.body.removeChild(wrapper)
        }

        // Compress image to keep under 300KB while maximizing quality
        const compressImage = async (canvas) => {
          // Use JPEG directly (much smaller than PNG)
          // Try to keep full resolution with very high quality
          let quality = 0.95
          let blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', quality)
          })

          // If too large, reduce quality gradually but keep it high
          if (blob && blob.size > 300000) { // 300 KB
            quality = 0.92
            blob = await new Promise(resolve => {
              canvas.toBlob(resolve, 'image/jpeg', quality)
            })
          }

          if (blob && blob.size > 300000) {
            quality = 0.90
            blob = await new Promise(resolve => {
              canvas.toBlob(resolve, 'image/jpeg', quality)
            })
          }

          if (blob && blob.size > 300000) {
            quality = 0.88
            blob = await new Promise(resolve => {
              canvas.toBlob(resolve, 'image/jpeg', quality)
            })
          }

          // Only reduce dimensions as last resort, but use maximum quality smoothing
          if (blob && blob.size > 300000) {
            // Try a larger dimension first to maintain quality
            const maxDimension = 1600
            const ratio = Math.min(maxDimension / canvas.width, maxDimension / canvas.height, 1)
            const newWidth = Math.floor(canvas.width * ratio)
            const newHeight = Math.floor(canvas.height * ratio)

            const resizedCanvas = document.createElement('canvas')
            resizedCanvas.width = newWidth
            resizedCanvas.height = newHeight
            const resizedCtx = resizedCanvas.getContext('2d')
            // Use best image smoothing for quality
            resizedCtx.imageSmoothingEnabled = true
            resizedCtx.imageSmoothingQuality = 'high'
            // Use better interpolation
            resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight)

            blob = await new Promise(resolve => {
              resizedCanvas.toBlob(resolve, 'image/jpeg', 0.90)
            })
          }

          // Final fallback - smaller dimension but still high quality
          if (blob && blob.size > 300000) {
            const maxDimension = 1400
            const ratio = Math.min(maxDimension / canvas.width, maxDimension / canvas.height, 1)
            const newWidth = Math.floor(canvas.width * ratio)
            const newHeight = Math.floor(canvas.height * ratio)

            const resizedCanvas = document.createElement('canvas')
            resizedCanvas.width = newWidth
            resizedCanvas.height = newHeight
            const resizedCtx = resizedCanvas.getContext('2d')
            resizedCtx.imageSmoothingEnabled = true
            resizedCtx.imageSmoothingQuality = 'high'
            resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight)

            blob = await new Promise(resolve => {
              resizedCanvas.toBlob(resolve, 'image/jpeg', 0.88)
            })
          }

          return blob
        }

        const blobToBase64Data = async (blob) => {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              try {
                if (typeof reader.result !== 'string') {
                  return reject(new Error('FileReader result is not a string'))
                }

                const base64Data = reader.result.split(',')[1]
                if (!base64Data) {
                  return reject(new Error('Failed to extract base64 data from data URL'))
                }
                resolve(base64Data)
              } catch (e) {
                reject(e)
              }
            }
            reader.onerror = (event) => reject(reader.error || event)
            reader.onabort = () => reject(new Error('FileReader aborted'))
            try {
              reader.readAsDataURL(blob)
            } catch (e) {
              reject(e)
            }
          })
        }

        // Create filename with transaction ID (always JPEG now)
        const shortTxId = vm.transactionId.substring(0, 8)
        const filename = `receipt-${shortTxId}.jpg`

        const blob = await compressImage(canvas)
        if (!blob) {
          throw new Error('Failed to create receipt image blob')
        }

        // Check if running on mobile
        const isMobile = Capacitor.getPlatform() !== 'web'

        if (isMobile) {
          const base64Data = await blobToBase64Data(blob)
          try {
            await SaveToGallery.saveImage({
              base64Data,
              filename
            })

            vm.$q.notify({
              message: vm.$t('ReceiptSavedToPhotos', {}, 'Receipt saved to Photos'),
              color: 'positive',
              icon: 'check_circle',
              position: 'top',
              timeout: 2000
            })
          } catch (error) {
            console.error('[SaveReceipt] Error saving to photos:', error)
            vm.$q.notify({
              message: vm.$t('ErrorSavingReceipt', {}, 'Error saving receipt. Please ensure photo library permissions are granted.'),
              color: 'negative',
              icon: 'error',
              position: 'top',
              timeout: 3000
            })
          }
        } else {
          // Desktop/web - use download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)

          vm.$q.notify({
            message: vm.$t('ReceiptSaved', {}, 'Receipt saved'),
            color: 'positive',
            icon: 'download',
            position: 'top',
            timeout: 2000
          })
        }
      } catch (error) {
        // Remove wrapper if it still exists
        if (wrapper && document.body.contains(wrapper)) {
          document.body.removeChild(wrapper)
        }
        console.error('Error saving receipt:', error)
        vm.$q.notify({
          message: vm.$t('ErrorSavingReceipt', {}, 'Error saving receipt'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      } finally {
        vm.savingReceipt = false
      }
    },
    getImageUrl (asset) {
      if (this.denominationTabSelected === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return asset.logo
          }
        } else {
          return 'bch-logo.png'
        }
      }
    },
    async preloadAudio () {
      // Try different path formats for iOS
      let paths = ['send-success.mp3']
      if (this.$q.platform.is.ios) {
        // Try multiple iOS path formats - iOS Native Audio looks for files in the bundle
        // The file is at public/assets/sounds/send-success.mp3 which becomes www/assets/sounds/send-success.mp3
        paths = [
          'assets/sounds/send-success.mp3',  // Relative to www
          'send-success.mp3',  // Just filename (if in root)
          '/assets/sounds/send-success.mp3',  // Absolute from www root
          Capacitor.convertFileSrc('assets/sounds/send-success.mp3'),  // Capacitor URL conversion
          Capacitor.convertFileSrc('/assets/sounds/send-success.mp3')  // Capacitor URL with leading slash
        ]
      }
      
      for (const path of paths) {
        try {
          await NativeAudio.preload({
            assetId: 'send-success',
            assetPath: path,
            audioChannelNum: 1,
            volume: 1.0,
            isUrl: this.$q.platform.is.ios && (path.startsWith('http') || path.startsWith('capacitor'))
          })
          // Store the successful path for later use
          this.successfulAudioPath = path
          return // Success, exit
        } catch (error) {
          // Try next path
        }
      }
      throw new Error('All audio preload attempts failed')
    },
    async playSound (success) {
      if (!success) return

      // Only allow audio for new-transaction views.
      // Prevents preloading/playing from interrupting background audio on iOS
      // when viewing older transactions.
      const query = this.$route?.query || {}
      const isNewTransaction = query.new === 'true' || 
                               (typeof query.category === 'string' && query.category.includes('?new=true')) ||
                               (window.location.search && window.location.search.includes('new=true'))
      if (!isNewTransaction) return
      
      try {
        // Ensure audio is preloaded before playing
        if (!this.audioPreloaded) {
          await this.preloadAudio()
          this.audioPreloaded = true
        }
        
        await NativeAudio.play({
          assetId: 'send-success'
        })
      } catch (error) {
        // Try to preload and play again (non-blocking)
        this.preloadAudio()
          .then(() => {
            this.audioPreloaded = true
            return NativeAudio.play({ assetId: 'send-success' })
          })
          .catch(() => {
            // Ignore retry errors
          })
      }
    },
    /**
     * Wait for the transaction content to be rendered in the DOM before launching confetti
     * Uses requestAnimationFrame to wait for the next paint cycle
     */
    async waitForRenderAndLaunchConfetti (maxAttempts = 10) {
      let attempts = 0
      
      const checkAndLaunch = () => {
        attempts++
        
        // Check if transaction content is actually rendered in the DOM
        // Look for a key element that should exist when transaction is displayed
        const transactionContent = document.querySelector('.content-container-ss')
        const hasTransactionId = this.transactionId && this.transactionId.length > 0
        
        if (transactionContent && hasTransactionId && this.tx && this.tx.asset) {
          // Content is rendered, wait for next animation frame to ensure paint is complete
          requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
              // Double RAF ensures the browser has painted the content
              await this.launchConfetti()
            })
          })
        } else if (attempts < maxAttempts) {
          // Not ready yet, wait for next frame and check again
          requestAnimationFrame(checkAndLaunch)
        } else {
          // Max attempts reached, launch anyway (fallback)
          this.launchConfetti()
        }
      }
      
      // Start checking after next tick
      this.$nextTick(() => {
        requestAnimationFrame(checkAndLaunch)
      })
    },
    async launchConfetti () {
      // Play sound for new transaction (non-blocking - don't wait for it)
      // Ensure audio is ready by waiting for next frame (allows preload to complete)
      requestAnimationFrame(() => {
        this.playSound(true).catch(() => {
          // Ignore sound errors
        })
      })
      
      // Launch basic cannon confetti from middle lower half of page
      // Origin: center horizontally (0.5), 75% down vertically (0.75)
      // iOS WebView needs special handling for canvas rendering
      try {
        if (this.$q.platform.is.ios) {
          // For iOS, wait a bit longer and ensure canvas is ready
          await new Promise(resolve => setTimeout(resolve, 100))
          // Force canvas initialization on iOS with explicit dimensions
          const canvas = document.createElement('canvas')
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
          canvas.style.position = 'fixed'
          canvas.style.top = '0'
          canvas.style.left = '0'
          canvas.style.width = '100%'
          canvas.style.height = '100%'
          canvas.style.pointerEvents = 'none'
          canvas.style.zIndex = '9999'
          document.body.appendChild(canvas)
          
          // Use the canvas for confetti
          const myConfetti = confetti.create(canvas, { resize: true, useWorker: false })
          myConfetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.5, y: 0.75 },
            startVelocity: 55,
            gravity: 0.8,
            decay: 0.9,
            scalar: 0.8,
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e']
          })
          
          // Clean up canvas after animation
          setTimeout(() => {
            if (canvas.parentNode) {
              canvas.parentNode.removeChild(canvas)
            }
          }, 3000)
        } else {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.5, y: 0.75 },
            startVelocity: 55,
            gravity: 0.8,
            decay: 0.9,
            scalar: 0.8,
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e']
          })
        }
      } catch (error) {
        // Ignore confetti errors
      }
    },
    /**
     * @param {{type: String, args?: any[]}} action
     */
    handleAttributeAction (action) {
      const args = Array.isArray(action?.args) ? action?.args : []
      if (action?.type === 'copy_to_clipboard') {
        return this.copyToClipboard(...args)
      } else if (action?.type === 'open_anyhedge_contract') {
        return this.displayAnyhedgeContract(...args)
      } else if (action?.type === 'open_jpp_invoice') {
        return this.displayJppInvoice(...args)
      }
    },
    displayAnyhedgeContract (contractAddress) {
      const walletHash = this.walletHash || this.$store.getters['global/getWallet']('bch')?.walletHash
      const dialog = this.$q.dialog({
        title: 'AnyHedge Contract',
        message: 'Fetching contract',
        ok: false,
        seamless: true,
        progress: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
      anyhedgeBackend.get(`anyhedge/hedge-positions/${contractAddress}/`)
        .then(async (response) => {
          if (!response?.data?.address) return Promise.reject({ response })
          const parsedContractData = await parseHedgePositionData(response?.data)
          dialog.hide()

          let viewAs
          if (parsedContractData?.shortWalletHash === walletHash) viewAs = 'short'
          if (parsedContractData?.longWalletHash === walletHash) viewAs = 'long'
          this.$q.dialog({
            component: HedgeContractDetailDialog,
            componentProps: {
              contract: parsedContractData,
              wallet: this.wallet,
              viewAs: viewAs,
              viewPositionInTitle: true,
            },
          })
          return Promise.resolve(response)
        })
        .catch(error => {
          console.error(error)
          dialog.update({ message: 'Unable to fetch contract data' })
        })
    },
    displayJppInvoice (uuid) {
      const dialog = this.$q.dialog({
        title: 'Invoice',
        message: 'Fetching data',
        ok: false,
        seamless: true,
        progress: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
      return JSONPaymentProtocol.fetch(`https://watchtower.cash/api/jpp/invoices/${uuid}/`)
        .then(response => {
          dialog.hide()
          this.$q.dialog({
            component: JppDetailDialog,
            componentProps: {
              jpp: response,
            },
          })
          return response
        })
        .catch(error => {
          console.error(error)
          dialog.update({ message: 'Unable to fetch data' })
        })
    },
    showConversionInfo () {
      if (this.isMobile) {
        this.$q.dialog({
          title: this.$t('ConversionInformation', {}, 'Conversion Information'),
          message: this.fiatConversionTooltip,
          ok: true,
          class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
      }
    }
  }
}
</script>

<style scoped>
.minimal-card {
  border-radius: 14px;
  padding: 16px 14px;
}
.page-title { font-size: 28px; letter-spacing: 1px; }
.direction-icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
}
.direction-icon-container.dark {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.direction-icon-container.light {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.direction-icon-container .direction-icon {
  font-size: 32px;
  margin: 0;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.amount-primary { font-size: 20px; }
.amount-label-ss { font-size: 28px; font-weight: 600; margin-top: -4px; margin-bottom: 4px; }
.amount-fiat-label-ss { font-size: 20px; opacity: 0.85; margin-top: 0; }
.info-icon-clickable {
  padding: 4px;
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.amount-gain-loss-ss { 
  font-size: 16px; 
  margin-top: 8px;
}
.amount-fee-ss {
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.9; 
  /* display: flex;  */
  /* align-items: center;  */
  /* justify-content: center; */
  font-weight: 500;
}
.amount-big { font-size: 30px; }
.amount-secondary { font-size: 13px; opacity: 0.9; }
.amount-row-ss { align-items: center !important; }
.amount-avatar-ss { margin-top: -10px; }
.amount-avatar-ss img { display: block; }
.amount-label-ss { line-height: 1; display: inline-block; }
.meta { margin-top: 8px; text-align: center; }
.meta-row { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0; }
.meta-label { opacity: 0.8; font-size: 12px; }
.meta-value { font-size: 13px; }
.monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.meta-link { text-decoration: none; font-size: 13px; }

/* Reference + Txid blocks to mirror SendSuccessBlock */
.reference-id-value-ss {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
}
.txid-container-ss {
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
}
.txid-container-ss:hover {
  background: rgba(128, 128, 128, 0.15);
  border-color: rgba(128, 128, 128, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.txid-text-ss {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.copy-icon-ss { opacity: 0.7; transition: all 0.2s ease; }
.view-explorer-link-ss { display: inline-flex; align-items: center; text-decoration: none; font-size: 15px; font-weight: 500; padding: 8px 16px; border-radius: 8px; color: var(--q-primary); transition: all 0.2s ease; }
.view-explorer-link-ss:hover { background: rgba(0, 128, 0, 0.08); transform: translateX(2px); }
.view-explorer-link-ss.dark { color: #4ade80; }
.date-prominent { text-align: center; font-size: 16px; font-weight: 500; }
.date-prominent.dark { color: rgba(255,255,255,0.85); }
.date-prominent:not(.dark) { color: rgba(0,0,0,0.85); }
.content-container-ss { min-width: 320px; max-width: 700px; margin: 0 auto; padding-top: 8px; }
.section-block-ss { margin-top: 12px; }
.date-block-ss { opacity: 0.9; }

/* New wrapper structure - completely independent of sticky-header-container */
.transaction-detail-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  /* Constrain to viewport and enable scrolling */
  height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  /* Background color is set dynamically via :style binding based on theme */
}


.transaction-detail-header-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  flex-shrink: 0;
  background: inherit; /* Ensure header has background to cover scrolling content */
}

.transaction-detail-content-wrapper {
  flex: 1;
  width: 100%;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex children */
}

.transaction-detail-content-wrapper .content-container-ss {
  padding-bottom: 0;
}

.transaction-detail-content-wrapper .memo-section {
  margin-bottom: 20px;
}

/* Fix header title cut-off on mobile */
@media (max-width: 600px) {
  .transaction-detail-wrapper .apps-header .pt-header {
    padding-left: 2px !important;
    padding-right: 2px !important;
    overflow: visible !important;
    --pt-header-side: 44px;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .pt-header-title {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: none !important;
    padding-left: 2px !important;
    padding-right: 2px !important;
    overflow: visible !important;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .pt-header-title p {
    line-height: 1.3 !important;
    white-space: normal !important;
    overflow: visible !important;
    word-break: break-word !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}

/* Make the Reference ID separator span the full viewport width */
.ref-separator-ss {
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* Memo styles mirroring SendSuccessBlock */
.memo-display-container { display: flex; justify-content: center; margin-bottom: 12px; }
.memo-content-container {
  cursor: default;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
  max-width: 100%;
}
.memo-text { flex: 1; word-break: break-word; white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
.memo-actions { display: flex; align-items: center; flex-shrink: 0; }
.memo-input.memo-input-dark { background-color: rgba(255, 255, 255, 0.1); color: white; }
.memo-input.memo-input-light { background-color: rgba(0, 0, 0, 0.05); color: black; }

/* NFT Image Styles */
.nft-image {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(128, 128, 128, 0.2);
  object-fit: contain;
}

.nft-image-skeleton-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.nft-image-skeleton {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.nft-name {
  margin-top: 12px;
  word-break: break-word;
  padding: 0 16px;
}

.view-in-collectibles-btn {
  margin-top: 8px;
}

/* Transaction Metadata Badges */
.transaction-metadata-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  justify-content: center;
}

.transaction-metadata-badges .badge-item {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.transaction-metadata-badges .badge-item:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.transaction-metadata-badges .badge-text {
  max-width: 8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-metadata-badges .badge-icon-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.transaction-metadata-badges .badge-popup {
  padding: 8px 12px;
  word-break: break-all;
  max-width: 280px;
}

/* Glassmorphic Save Receipt Button */
.glassmorphic-receipt-btn {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  padding: 8px 18px;
  opacity: 0.9;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.10);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  /* Blue theme */
  &.theme-glassmorphic-blue {
    background: linear-gradient(
      to right bottom,
      rgba(59, 123, 246, 0.35),
      rgba(54, 129, 232, 0.35),
      rgba(49, 139, 218, 0.35)
    ) !important;
    color: white !important;
    
    &.dark {
      background: linear-gradient(
        to right bottom,
        rgba(59, 123, 246, 0.30),
        rgba(54, 129, 232, 0.30),
        rgba(49, 139, 218, 0.30)
      ) !important;
    }
  }
  
  /* Green theme */
  &.theme-glassmorphic-green {
    background: linear-gradient(
      to right bottom,
      rgba(67, 160, 71, 0.35),
      rgba(62, 164, 74, 0.35),
      rgba(57, 168, 77, 0.35)
    ) !important;
    color: white !important;
    
    &.dark {
      background: linear-gradient(
        to right bottom,
        rgba(67, 160, 71, 0.30),
        rgba(62, 164, 74, 0.30),
        rgba(57, 168, 77, 0.30)
      ) !important;
    }
  }
  
  /* Gold theme */
  &.theme-glassmorphic-gold {
    background: linear-gradient(
      to right bottom,
      rgba(255, 167, 38, 0.35),
      rgba(255, 176, 56, 0.35),
      rgba(255, 184, 74, 0.35)
    ) !important;
    color: white !important;
    
    &.dark {
      background: linear-gradient(
        to right bottom,
        rgba(255, 167, 38, 0.30),
        rgba(255, 176, 56, 0.30),
        rgba(255, 184, 74, 0.30)
      ) !important;
    }
  }
  
  /* Red theme */
  &.theme-glassmorphic-red {
    background: linear-gradient(
      to right bottom,
      rgba(246, 59, 123, 0.35),
      rgba(232, 54, 96, 0.35),
      rgba(218, 49, 72, 0.35)
    ) !important;
    color: white !important;
    
    &.dark {
      background: linear-gradient(
        to right bottom,
        rgba(246, 59, 123, 0.30),
        rgba(232, 54, 96, 0.30),
        rgba(218, 49, 72, 0.30)
      ) !important;
    }
  }

  &.is-saving {
    cursor: wait;
  }
}

</style>


