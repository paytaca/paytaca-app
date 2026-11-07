<template>
  <div class="row items-center no-wrap q-mb-md">
    <div class="recipient-field q-mt-sm" :class="{ 'recipient-field--empty': emptyRecipient && (!recipientAddress || recipientEditing) }">
      <q-input
        v-if="!recipientAddress || recipientEditing"
        ref="recipientInput"
        filled
        label-slot
        type="textarea"
        autogrow
        :rows="1"
        input-style="white-space: pre-wrap; word-break: break-all;"
        no-error-icon
        :disabled="inputExtras.isBip21"
        :readonly="inputExtras.isBip21"
        v-model="recipientAddress"
        @focus="onRecipientFocus"
        @blur="onRecipientBlur"
        @keydown.enter.prevent
        class="recipient-input"
        :error="emptyRecipient || inputExtras.incorrectAddress"
        :error-message="
          emptyRecipient
            ? $t('EmptyRecipient')
            : inputExtras.incorrectAddress
              ? inputExtras.recipientError || $t(
                  'InvalidRecipient',
                  { walletType: walletType.toUpperCase() },
                  `Recipient should be a valid ${walletType.toUpperCase()} address`
                )
              : ''
        "
        :dark="darkMode"
        :key="[
          recipient.fixedRecipientAddress,
          inputExtras.scannedRecipientAddress
        ]"
      >
        <template v-slot:label>
          {{ $t('Recipient') }}
        </template>
      </q-input>
      <div
        v-else
        class="recipient-address-display"
        :class="getDarkModeClass(darkMode)"
        @click="startEditingRecipient"
      >
        <div class="recipient-address-label">{{ $t('Recipient') }}</div>
        <div class="recipient-address-value">{{ recipientAddress }}</div>
      </div>
      <div class="recipient-actions">
        <q-btn
          id="send-form-actions"
          round
          flat
          dense
          icon="more_vert"
          class="recipient-menu-btn"
          :class="getDarkModeClass(darkMode)"
        >
          <q-menu
            anchor="bottom right"
            self="top right"
            class="recipient-actions-menu"
            :class="getDarkModeClass(darkMode)"
          >
            <q-list dense style="min-width: 180px">
              <q-item
                clickable
                v-close-popup
                @click="onQRScannerClick(true), onInputFocus(index, '')"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-qrcode" />
                </q-item-section>
                <q-item-section>{{ $t('ScanQRCode') }}</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="onQRUploaderClick(), onInputFocus(index, '')"
              >
                <q-item-section avatar>
                  <q-icon name="upload" />
                </q-item-section>
                <q-item-section>{{ $t('UploadQR') }}</q-item-section>
              </q-item>
              <q-item
                v-if="recipientAddress"
                clickable
                v-close-popup
                @click="clearRecipient"
              >
                <q-item-section avatar>
                  <q-icon name="close" />
                </q-item-section>
                <q-item-section>{{ $t('Clear') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
  </div>
  <div
    v-if="inputExtras.merchantData"
    class="merchant-banner text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <q-avatar class="merchant-banner__logo" size="44px" rounded>
      <q-img
        v-if="inputExtras.merchantData.logoData || inputExtras.merchantData.logo"
        :src="inputExtras.merchantData.logoData || inputExtras.merchantData.logo"
      />
      <q-icon v-else name="storefront" size="22px" />
    </q-avatar>
    <div class="merchant-banner__body">
      <div class="merchant-banner__caption text-bow-muted">{{ $t('YouArePayingTo', {}, 'You are paying to') }}</div>
      <div class="merchant-banner__name">
        <span class="ellipsis">{{ inputExtras.merchantData.name }}</span>
        <q-btn
          flat
          round
          dense
          size="sm"
          class="merchant-banner__badge"
          :color="inputExtras.merchantData.verified ? 'positive' : 'grey-6'"
          :icon="inputExtras.merchantData.verified ? 'mdi-shield-check' : 'mdi-shield-off'"
        >
          <q-tooltip class="text-body2" max-width="240px">
            {{ inputExtras.merchantData.verified
              ? $t('VerifiedMerchantTooltip', {}, 'Verified merchants have their identity and details confirmed by Paytaca.')
              : $t('UnverifiedMerchantTooltip', {}, "This merchant hasn't been verified by Paytaca. Double-check the details before paying.") }}
          </q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
  <div
    v-if="inputExtras.isLegacyAddress"
    style="border: 2px solid orange;"
    class="q-mx-md q-mb-md q-pa-sm text-center text-body2 text-bow"
    :class="getDarkModeClass(darkMode)"
    v-html="$t('LegacyAddressWarning')"
  />
  <div
    v-if="inputExtras.isWalletAddress"
    style="border: 2px solid orange;"
    class="q-mx-md q-mb-md q-pa-sm text-center text-body2 text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    {{ $t('SameWalletAddressWarning') }}
  </div>
  <div class="col-12">
    <q-input
      v-if="assetIsFT && hasFTChange && hasFTChangeAddressOption && selectedChangeAddress"
      label-slot
      bottom-slots
      :model-value="convertCashAddress(selectedChangeAddress, isChipnet, true)"
      readonly
      filled
      dense
    >
      <template v-slot:label>
        {{ $t('SendTokenChangeTo') }}
      </template>
      <template v-slot:prepend>
        <q-btn dense flat icon="help" no-caps @click.stop="showWillSendChangeToHelp "/>
      </template>
      <template v-slot:append>
        <q-btn class="text-grad" flat @click.stop=openSelectChangeAddressDialog>
          <q-icon name="edit" class="text-grad"></q-icon>
        </q-btn>
      </template>
    </q-input>
  </div>
  <div class="row q-mt-md" v-if="!isNFT && asset?.id === 'bch'">
    <div class="col q-mt-xs" style="position: relative;">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="fiatFormatted"
        ref="fiatInput"
        class="fiat-input-field"
        :class="{ 'amount-has-value': fiatHasValue, 'pt-amount-focused': focusedField === 'fiat' }"
        @focus="onInputFocus(index, 'fiat')"
        @blur="onInputBlur(index, 'fiat')"
        @keydown="onKeyboardInput"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded && !cauldronEnabled"
        :error-message="balanceExceeded && !cauldronEnabled ? $t('BalanceExceeded') : ''"
        :label="amountInputLabel"
        :dark="darkMode"
      >
        <template v-slot:append>
          {{ String(currentSendPageCurrency() || '').toUpperCase() }}
        </template>
      </q-input>
      <KeyboardTooltip v-if="activeKeyboardTip === 'fiat'" :dark-mode="darkMode" :key="'fiat-' + keyboardTipCounter" />
    </div>
  </div>

  <div class="row" v-if="!isNFT">
    <div class="col q-mt-xs" style="position: relative;">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="amountFormatted"
        ref="amountInput"
        class="bch-input-field"
        :class="{ 'amount-has-value': bchHasValue, 'pt-amount-focused': focusedField === 'bch' }"
        @focus="onInputFocus(index, 'bch')"
        @blur="onInputBlur(index, 'bch')"
        @keydown="onKeyboardInput"
        :label="amountInputLabel"
        :dark="darkMode"
        :loading="computingMax"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded && !cauldronEnabled"
        :error-message="balanceExceeded && !cauldronEnabled ? $t('BalanceExceeded') : ''"
      >
        <template v-slot:append>
          {{ asset?.id === 'bch' ? selectedDenomination : (asset?.symbol || '') }}
          <DenominatorTextDropdown
            v-if="!recipient.fixedAmount"
            @on-selected-denomination="onSelectedDenomination"
            :selectedNetwork="asset?.symbol"
            :darkMode="darkMode"
            :theme="theme"
            :currentCountry="currentCountry"
          />
        </template>
      </q-input>
      <KeyboardTooltip v-if="activeKeyboardTip === 'bch'" :dark-mode="darkMode" :key="'bch-' + keyboardTipCounter" />
    </div>
  </div>
  <div
    class="row items-center balance-row"
    :class="{ 'balance-row--inline': $slots['balance-leading'] }"
    v-if="!isNFT && !sending"
    style="padding-bottom: 15px"
  >
    <div v-if="$slots['balance-leading']" class="balance-lead"><slot name="balance-leading" /></div>
    <div v-if="!recipient.fixedAmount" class="col q-mt-xs balance-max-container" :class="getDarkModeClass(darkMode)">
      <div
        ref="balanceMarqueeViewport"
        class="balance-marquee"
        :class="{ 'balance-marquee--animate': balanceMarqueeShift > 0 }"
        :style="{
          '--balance-marquee-shift': balanceMarqueeShift + 'px',
          '--balance-marquee-duration': balanceMarqueeDuration
        }"
      >
        <div ref="balanceMarqueeTrack" class="balance-marquee__track">
          <template v-if="currentWalletBalanceAsAsset?.id === 'bch' && asset?.id === 'bch'">
            <span v-bch-amount="{ denomination: selectedDenomination }">
              {{ parseAssetDenomination(selectedDenomination, currentWalletBalanceAsAsset) }}
            </span>
            {{ ` = ${parseFiatCurrency(
              convertToFiatAmount(currentWalletBalance, selectedAssetMarketPrice), currentSendPageCurrency())
            }` }}
          </template>
          <span v-else v-bch-amount="{ denomination: selectedDenomination }">
            {{ parseAssetDenomination(selectedDenomination, currentWalletBalanceAsAsset) }}
          </span>
        </div>
      </div>
      <q-btn
        flat
        dense
        no-caps
        v-if="!computingMax || !recipient.sending"
        class="max-button"
        color="pt-primary1"
        :class="getDarkModeClass(darkMode)"
        :label="$t('MAX')"
        @click="onInputFocus(index, ''), handleMaxClick()"
      />
    </div>
    <div v-if="showPayWith" class="q-mt-xs q-ml-sm pay-with-field">
      <q-select
        :model-value="payWith"
        :options="payWithOptions"
        :label="$t('PayWith', {}, 'Pay with')"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        filled
        options-dense
        :dark="darkMode"
        :disable="cauldronDisabled"
        class="pay-with-select"
        @update:model-value="onPayWithChange"
      >
        <template v-slot:selected>
          <div class="row items-center no-wrap">
            <img
              v-if="selectedPayWithOption"
              :src="payWithImageUrl(selectedPayWithOption)"
              class="pay-with-option-logo"
              alt=""
            />
            <span class="q-ml-xs ellipsis">{{ selectedPayWithOption?.label }}</span>
          </div>
        </template>
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <img :src="payWithImageUrl(scope.opt)" class="pay-with-option-logo" alt="" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>
  </div>
  <div
    v-if="!isNFT && cauldronEnabled && !hideCauldron"
    class="cauldron-spend text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <div class="cauldron-spend__main">
      <img
        v-if="selectedPayWithOption"
        :src="payWithImageUrl(selectedPayWithOption)"
        class="cauldron-spend__logo"
        alt=""
      />
      <span class="cauldron-spend__label text-bow-muted">{{ $t('YouSpend', {}, 'You spend') }}</span>
      <span class="cauldron-spend__amount" :class="{ 'text-negative': Boolean(effectiveCauldronErrorMessage) }">
        <q-spinner-dots v-if="calculatingCauldronTrade" size="16px" />
        <template v-else>&#8776; {{ cauldronAmountFormatted || '0' }} {{ cauldronSpendSymbol }}</template>
      </span>
    </div>
    <div class="cauldron-spend__actions">
      <CauldronSendSummary
        v-if="tradeResults.some(Boolean)"
        :input-extras="[inputExtras]"
        :trade-results="tradeResults"
      />
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="close"
        class="cauldron-spend__close"
        @click="resetPayWith"
      />
    </div>
  </div>
  <p
    v-if="!hideCauldron && effectiveCauldronErrorMessage"
    class="cauldron-spend__note text-bow text-negative"
    :class="getDarkModeClass(darkMode)"
  >{{ effectiveCauldronErrorMessage }}</p>
  <p
    v-else-if="!hideCauldron && cauldronStatusMessage"
    class="cauldron-spend__note text-bow text-bow-muted"
    :class="getDarkModeClass(darkMode)"
  >{{ cauldronStatusMessage }}</p>
  <q-card
    class="row text-center justify-center q-pa-sm q-my-sm text-subtitle2 pt-card"
    :class="getDarkModeClass(darkMode)"
    v-if="inputExtras.cashbackData && inputExtras.cashbackData.cashback_amount > -1"
  >
    <span v-html="cashbackAmountText()"></span>
  </q-card>
</template>

<script>

import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import ConfirmSetMax from 'src/pages/transaction/dialog/ConfirmSetMax.vue'
import { convertTokenAmount, convertCashAddress } from 'src/wallet/chipnet'
import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency,
  customNumberFormatting
} from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseCashbackMessage } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertToFiatAmount } from 'src/utils/send-page-utils'

import SelectChangeAddress from 'src/components/SelectChangeAddress.vue'
import KeyboardTooltip from 'src/components/KeyboardTooltip.vue'
import CauldronSendSummary from 'src/components/send-page/CauldronSendSummary.vue'

export default {
  components: {
    KeyboardTooltip,
    DenominatorTextDropdown,
    CauldronSendSummary
  },

  props: {
    recipient: {
      type: Object,
      required: true
    },
    inputExtras: {
      type: Object,
      required: true
    },
    asset: {
      type: Object,
      required: true
    },
    index: { type: Number },
    showQrScanner: { type: Boolean },
    computingMax: { type: Boolean },
    calculatingCauldronTrade: Boolean,
    selectedAssetMarketPrice: { type: Number },
    isNFT: { type: Boolean },

    // Wallet balance is normalized (not in it's base units)
    currentWalletBalance: { type: Number },
    currentWalletBalanceAssetId: String,

    cauldronErrorMessage: String,
    cauldronStatusMessage: String,

    currentSendPageCurrency: { type: Function },
    setMaximumSendAmount: { type: Function },
    defaultSelectedFtChangeAddress: { type: String },
    walletType: { type: String },
    cauldronTokens: { type: Array, default: () => [] },
    cauldronDisabled: { type: Boolean, default: false },
    tradeResults: { type: Array, default: () => [] },
    focusedField: { type: String, default: '' },
    sending: { type: Boolean, default: false },
    hideCauldron: { type: Boolean, default: false },
  },

  emits: [
    'on-qr-scanner-click',
    'on-input-focus',
    'on-input-blur',
    'on-recipient-input',
    'on-empty-recipient',
    'on-address-set',
    'on-selected-denomination-change',
    'on-qr-uploader-click',
    'on-selected-change-address',
    'on-cauldron-toggle'
  ],

  data () {
    return {
      amount: '',
      fiatAmount: '',
      amountFormatted: '',
      fiatFormatted: '',
      balanceExceeded: false,
      emptyRecipient: false,
      selectedDenomination: 'BCH',
      changeAddresses: [],
      selectedChangeAddress: '',
      cauldronToken: null,
      cauldronEnabled: false,
      payWith: '',
      cauldronAmount: '',
      cauldronAmountFormatted: '',
      activeKeyboardTip: null,
      keyboardTipTimer: null,
      keyboardTipCounter: 0,
      currentFocusedField: null,
      recipientEditing: false,
      balanceMarqueeShift: 0,
    }
  },

  mounted () {
    this.updateBalanceMarquee()
  },

  beforeUnmount () {
    clearTimeout(this.keyboardTipTimer)
    this._balanceMarqueeResizeObserver?.disconnect()
    this._balanceMarqueeResizeObserver = null
    this._balanceMarqueeObservedEl = null
  },

  beforeMount () {
    this.syncPropsData();
  },

  computed: {
    recipientAddress: {
      get () {
        return this.recipient.recipientAddress
      },
      set (value) {
        // We'll hope the event handler for this updates the this.recipient.recipientAddress
        this.$emit('on-recipient-input', { index: this.index, value })
      }
    },
    defaultChangeAddress () {
      return this.$store.getters['global/getChangeAddress']('bch')
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    sendAmountMarketValue () {
      const parsedAmount = Number(this.amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    currentWalletBalanceAsAsset() {
      let asset = { ...this.asset };
      const storeAsset = this.currentWalletBalanceAssetId
        ? this.$store.getters['assets/getAsset'](this.currentWalletBalanceAssetId)?.[0]
        : null;
      if (storeAsset && storeAsset.id !== this.asset?.id) {
        asset = { ...storeAsset };
      }

      if (asset.id === 'bch') {
        asset.balance = this.currentWalletBalance;
      } else {
        // Although currentWalletBalance is assumed to always be in normalized version
        // In the codebase, asset balances are normalized for BCH and base units in non BCH assets
        // So we have to convert to base units here
        const decimals = parseInt(asset?.decimals) || 0;
        const balanceUnits = Number((this.currentWalletBalance * 10 ** decimals).toFixed(decimals));
        asset.balance = balanceUnits;
      }

      return asset;
    },
    assetIsBch () {
      return this.$props.asset?.id === 'bch';
    },
    assetIsFT () {
      return this.$props.asset?.id?.startsWith('ct/') && this.$props.asset?.balance > 0
    },
    amountInputLabel () {
      return this.cauldronEnabled ? this.$t('ReceiveAmount') : this.$t('Amount')
    },
    fiatHasValue () {
      const n = parseFloat(String(this.fiatFormatted ?? '').replace(/,/g, ''))
      return !isNaN(n) && n > 0
    },
    bchHasValue () {
      const n = parseFloat(String(this.amountFormatted ?? '').replace(/,/g, ''))
      return !isNaN(n) && n > 0
    },
    showPayWith () {
      if (this.hideCauldron) return false
      if (this.isNFT) return false
      if (this.assetIsBch) return this.cauldronTokens.length > 0
      return Boolean(this.asset?.id?.startsWith?.('ct/'))
    },
    payWithDefault () {
      return this.assetIsBch ? 'bch' : (this.asset?.id || '')
    },
    payWithOptions () {
      const options = []
      if (this.assetIsBch) {
        options.push({ label: 'BCH', value: 'bch', logo: 'bch-logo.png' })
        this.cauldronTokens.forEach(token => {
          if (!token?.id) return
          options.push({
            label: token.symbol || token.name || this.shortenTokenId(token.id),
            value: token.id,
            logo: token.logo,
            token
          })
        })
      } else {
        options.push({
          label: this.asset?.symbol || this.asset?.name || this.shortenTokenId(this.asset?.id),
          value: this.asset?.id,
          logo: this.asset?.logo
        })
        options.push({ label: 'BCH', value: 'bch', logo: 'bch-logo.png' })
      }
      return options
    },
    selectedPayWithOption () {
      return this.payWithOptions.find(option => option.value === this.payWith) || this.payWithOptions[0] || null
    },
    cauldronSpendSymbol () {
      if (this.assetIsBch) {
        return this.cauldronToken?.bcmr?.token?.symbol || this.shortenTokenId(this.cauldronToken?.token_id) || ''
      }
      return 'BCH'
    },
    walletAddresses () {
      return this.$store.getters['global/walletAddresses'] || []
    },
    connectedApps () {
      const distinct = (value, index, list) => {
        return list.findIndex((item) => item.address === value.address && item.app_url === value.app_url) === index
      }
      return this.$store.getters['global/walletConnectedApps']?.filter(distinct)
    },
    hasFTChangeAddressOption () {
      return this.connectedApps?.length > 0
    },
    hasFTChange () {
      const decimals = this.asset?.decimals || 0
      if (isNaN(this.amountFormatted)) return false
      if (Number(this.amountFormatted) <= 0) return false
      const scaledFtSendAmount = BigInt(Math.round(this.amountFormatted * Math.pow(10, decimals)))
      const scaledFtCurrentBalance = BigInt(Math.round(this.currentWalletBalance * Math.pow(10, decimals)))
      const ftChangeAmount = scaledFtCurrentBalance - scaledFtSendAmount
      return ftChangeAmount > 0
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    balanceTextKey () {
      return [
        this.selectedDenomination,
        this.currentWalletBalance,
        this.currentWalletBalanceAssetId,
        this.asset?.id,
        this.selectedAssetMarketPrice,
        this.currentSendPageCurrency?.()
      ].join('|')
    },
    balanceMarqueeDuration () {
      if (this.balanceMarqueeShift <= 0) return '0s'
      return Math.min(20, Math.max(4, this.balanceMarqueeShift / 30)) + 's'
    },
    balanceMarqueeVisibleKey () {
      return [this.isNFT, this.sending, !!this.recipient.fixedAmount].join('|')
    },
    effectiveCauldronErrorMessage() {
        // :error="balanceExceeded && cauldronEnabled"
        // :error-message="balanceExceeded && cauldronEnabled ? $t('BalanceExceeded') : ''"
      if (this.balanceExceeded && this.cauldronEnabled) {
        return this.$t('BalanceExceeded')
      }

      return this.cauldronErrorMessage;
    }
  },

  methods: {
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    customNumberFormatting,
    shortenAddressForDisplay,
    convertCashAddress,
    convertTokenAmount,
    convertToFiatAmount,

    updateBalanceMarquee () {
      const viewport = this.$refs.balanceMarqueeViewport
      const track = this.$refs.balanceMarqueeTrack
      if (!viewport || !track) {
        this.balanceMarqueeShift = 0
        return
      }
      if (!this._balanceMarqueeResizeObserver) {
        this._balanceMarqueeResizeObserver = new ResizeObserver(() => this.updateBalanceMarquee())
      }
      if (this._balanceMarqueeObservedEl !== viewport) {
        this._balanceMarqueeResizeObserver.disconnect()
        this._balanceMarqueeResizeObserver.observe(viewport)
        this._balanceMarqueeResizeObserver.observe(track)
        this._balanceMarqueeObservedEl = viewport
      }
      this.balanceMarqueeShift = Math.max(0, Math.ceil(track.scrollWidth - viewport.clientWidth))
    },

    onQRScannerClick (value) {
      this.$emit('on-qr-scanner-click', value)
    },
    handleMaxClick () {
      this.$q.dialog({ component: ConfirmSetMax })
        .onOk(() => {
          this.setMaximumSendAmount()
        })
    },
    onKeyboardInput (e) {
      e.preventDefault()
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = this.currentFocusedField
      this.keyboardTipCounter++
      this.keyboardTipTimer = setTimeout(() => { this.activeKeyboardTip = null }, 10000)
    },
    onInputFocus (index, field) {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
      this.currentFocusedField = field
      this.$emit('on-input-focus', { index, field })
    },
    onInputBlur (index, field) {
      if (this.currentFocusedField === field) this.currentFocusedField = null
      this.$emit('on-input-blur', { index, field })
    },
    onRecipientFocus () {
      this.recipientEditing = true
      this.onInputFocus(this.index, '')
    },
    onRecipientBlur (event) {
      this.recipientEditing = false
      this.onEmptyRecipient()
      // Don't auto-advance when focus moves to another recipient input.
      if (event?.relatedTarget?.closest?.('.recipient-input')) return
      if (this.recipientAddress) {
        this.$emit('on-address-set', { index: this.index, address: this.recipientAddress })
      }
    },
    startEditingRecipient () {
      if (this.inputExtras.isBip21) return
      this.recipientEditing = true
      this.$nextTick(() => {
        const input = this.$refs.recipientInput
        if (input && input.focus) input.focus()
      })
    },
    clearRecipient () {
      this.recipientAddress = ''
      this.recipientEditing = true
      this.$nextTick(() => {
        const input = this.$refs.recipientInput
        if (input && input.focus) input.focus()
      })
    },
    onSelectedDenomination (value) {
      this.selectedDenomination = value
      this.amountFormatted = this.customNumberFormatting(getAssetDenomination(value, this.amount || 0, true))

      this.$emit('on-selected-denomination-change', {
        denomination: this.selectedDenomination,
        amountFormatted: this.amountFormatted
      })
    },
    onEmptyRecipient () {
      this.emptyRecipient = this.recipientAddress === ''
      this.$emit('on-empty-recipient', { index: this.index, value: this.emptyRecipient })
    },
    onQRUploaderClick () {
      this.$emit('on-qr-uploader-click')
    },
    cashbackAmountText () {
      const message = this.inputExtras.cashbackData.message
      const amountBch = this.inputExtras.cashbackData.cashback_amount
      const amountFiat = parseFiatCurrency(
        convertToFiatAmount(amountBch, this.selectedAssetMarketPrice),
        this.currentSendPageCurrency()
      )
      const merchantName = this.inputExtras.cashbackData.merchant_name

      return parseCashbackMessage(message, amountBch, amountFiat, merchantName)
    },
    openSelectChangeAddressDialog () {
      const vm = this
      this.$q.dialog({
        component: SelectChangeAddress,
        componentProps: {
          walletAddresses: vm.walletAddresses,
          connectedApps: vm.connectedApps,
          defaultChangeAddress: vm.defaultChangeAddress,
          defaultSelectedAddress: vm.selectedChangeAddress,
          darkMode: vm.darkMode
        },
        class: `pt-card text-bow ${vm.getDarkModeClass(vm.darkMode)}`
      }).onOk(selectedChangeAddress => {
        vm.selectedChangeAddress = selectedChangeAddress
        vm.$emit('on-selected-change-address', selectedChangeAddress)
      }).onCancel(() => {})
    },
    formatFtChangeAddressForDisplay (address) {
      return shortenAddressForDisplay(convertCashAddress(address, this.isChipnet))
    },
    showWillSendChangeToHelp () {
      this.$q.dialog({
        message: this.$t('SelectChangeAddressHelp'),
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        ok: {
          noCaps: true,
          label: this.$t('Ok'),
          color: 'brandblue',
          class: `button q-mr-md ${this.getDarkModeClass(this.darkMode)}`
        }
      })
    },
    shortenTokenId (id) {
      if (!id) return ''
      return String(id).replace('ct/', '').slice(0, 6).toUpperCase()
    },
    payWithImageUrl (option) {
      if (!option) return ''
      if (option.value === 'bch') return 'bch-logo.png'
      if (option.logo) {
        if (option.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return option.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        }
        return option.logo
      }
      return this.$store.getters['global/getDefaultAssetLogo']?.(String(option.value)) || ''
    },
    buildCauldronToken (token) {
      return {
        token_id: String(token.id).replace('ct/', ''),
        bcmr: {
          name: token.name,
          token: {
            symbol: token.symbol,
            decimals: token.decimals ?? 8
          }
        }
      }
    },
    onPayWithChange (value) {
      this.payWith = value
      if (value === this.payWithDefault) {
        this.cauldronEnabled = false
        this.cauldronToken = null
        this.cauldronAmountFormatted = ''
      } else if (value === 'bch') {
        this.cauldronEnabled = true
        this.cauldronToken = null
      } else {
        const option = this.payWithOptions.find(opt => opt.value === value)
        this.cauldronEnabled = true
        this.cauldronToken = option?.token ? this.buildCauldronToken(option.token) : null
      }

      this.emitCauldronToggle()
    },
    resetPayWith () {
      this.onPayWithChange(this.payWithDefault)
    },
    syncPayWithFromCauldron () {
      if (!this.cauldronEnabled) {
        this.payWith = this.payWithDefault
      } else if (this.assetIsBch) {
        this.payWith = this.cauldronToken?.token_id ? `ct/${this.cauldronToken.token_id}` : this.payWithDefault
      } else {
        this.payWith = 'bch'
      }
    },
    emitCauldronToggle() {
      this.$emit('on-cauldron-toggle', {
        index: this.index,
        enable: this.cauldronEnabled,
        token: this.cauldronToken,
        amountFormatted: this.cauldronAmountFormatted,
      })
    },
    syncPropsData() {

      // Syncing this.recipient.recipientAddress is handled somewhere else
      this.amount = this.recipient.amount
      this.amountFormatted = this.inputExtras.amountFormatted
      this.cauldronAmount = this.recipient.cauldronAmount;
      this.fiatFormatted = this.inputExtras.fiatFormatted

      this.balanceExceeded = this.inputExtras.balanceExceeded;
      this.emptyRecipient = this.inputExtras.emptyRecipient;

      if (this.inputExtras.isBip21) {
        this.selectedDenomination = 'BCH'
      } else {
        this.selectedDenomination = this.inputExtras.selectedDenomination
      }

      if (this.inputExtras.cauldron) {
        this.cauldronEnabled = this.inputExtras.cauldron.enable;
        this.cauldronAmountFormatted = this.inputExtras.cauldron.amountFormatted || ''

        if (this.inputExtras.cauldron.token) {
          this.cauldronToken = this.inputExtras.cauldron.token;
        }
        this.syncPayWithFromCauldron();
      }
    }
  },

  watch: {
    recipient: {
      deep: true,
      handler() {
        this.syncPropsData();
      },
    },
    inputExtras: {
      deep: true,
      handler() {
        this.syncPropsData();
      },
    },
    amountFormatted () {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
    },
    fiatFormatted () {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
    },
    balanceTextKey () {
      this.$nextTick(() => this.updateBalanceMarquee())
    },
    balanceMarqueeVisibleKey () {
      this.$nextTick(() => this.updateBalanceMarquee())
    },
  }
}
</script>

<style lang="scss" scoped>
  .recipient-field {
    position: relative;
    flex: 1 1 0%;
    min-width: 0;

    .recipient-input {
      width: 100%;

      :deep(.q-field__native) {
        padding-right: 40px;
      }
    }

    &.recipient-field--empty .recipient-menu-btn {
      animation: recipient-menu-pulse 1.6s ease-in-out infinite;

      :deep(.q-focus-helper) {
        opacity: 0.15;
      }
    }
  }

  @keyframes recipient-menu-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .recipient-field--empty .recipient-menu-btn {
      animation: none;
    }
  }

  .recipient-address-display {
    width: 100%;
    cursor: text;
    min-height: 56px;
    padding: 8px 12px 10px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);

    &.dark {
      background: rgba(255, 255, 255, 0.06);
    }

    .recipient-address-label {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 2px;
    }

    .recipient-address-value {
      font-family: monospace;
      font-size: 13px;
      line-height: 1.4;
      word-break: break-all;
      user-select: all;
      padding-right: 40px;
      color: #111c2c;
    }

    &.dark .recipient-address-value {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .recipient-actions {
    position: absolute;
    top: 28px;
    right: 4px;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: 3;
  }

  .recipient-menu-btn {
    color: #6b7280;

    &.dark {
      color: rgba(255, 255, 255, 0.7);
    }
  }
  .balance-max-container {
    font-size: 18px;
    color: gray;

    &.light {
      color: #111c2c;
    }

    .balance-marquee {
      min-width: 0;
      width: 100%;
      overflow: hidden;
      white-space: nowrap;
    }

    .balance-marquee__track {
      display: inline-block;
      white-space: nowrap;
      will-change: transform;
    }

    .balance-marquee--animate .balance-marquee__track {
      animation: balance-marquee-scroll var(--balance-marquee-duration, 6s) linear infinite;
    }

    .max-button {
      display: flex;
      width: fit-content;
      margin-top: 6px;
      min-height: unset;
      padding: 2px 8px;
      border: 1px solid;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
  }

  .balance-row--inline {
    flex-wrap: nowrap;
    justify-content: space-between;
  }

  .balance-row--inline .balance-lead {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .balance-row--inline .balance-max-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1 1 auto;
    min-width: 0;
  }

  .balance-row--inline .balance-marquee {
    width: auto;
    flex: 0 1 auto;
    min-width: 0;
  }

  .balance-row--inline .max-button {
    margin-top: 0;
    margin-left: 8px;
    flex: 0 0 auto;
  }

  @keyframes balance-marquee-scroll {
    0% {
      transform: translateX(0);
    }
    5% {
      transform: translateX(0);
    }
    45% {
      transform: translateX(calc(-1 * var(--balance-marquee-shift, 0px)));
    }
    55% {
      transform: translateX(calc(-1 * var(--balance-marquee-shift, 0px)));
    }
    95% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .balance-max-container .balance-marquee--animate {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .balance-max-container .balance-marquee--animate .balance-marquee__track {
      animation: none;
    }
  }

  .pay-with-field {
    flex: 0 0 auto;
    min-width: 110px;
    max-width: 150px;
  }

  .pay-with-select {
    width: 100%;

    .q-field__control {
      height: 56px;
    }
  }

  .pay-with-option-logo {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .cauldron-spend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 12px;

    &.light {
      background: rgba(15, 23, 42, 0.05);
    }

    &.dark {
      background: rgba(255, 255, 255, 0.06);
    }
  }

  .cauldron-spend__main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .cauldron-spend__logo {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .cauldron-spend__label {
    font-size: 12px;
    flex: 0 0 auto;
  }

  .cauldron-spend__amount {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cauldron-spend__actions {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .cauldron-spend__close {
    color: inherit;
    opacity: 0.6;
  }

  .cauldron-spend__note {
    margin: 6px 2px 0;
    font-size: 12px;
    line-height: 1.3;
  }

  .merchant-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 14px;

    &.light {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.18);
    }

    &.dark {
      background: rgba(59, 130, 246, 0.14);
      border: 1px solid rgba(59, 130, 246, 0.28);
    }
  }

  .merchant-banner__logo {
    flex: 0 0 auto;
  }

  .merchant-banner__body {
    min-width: 0;
  }

  .merchant-banner__caption {
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.2;
  }

  .merchant-banner__name {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
  }

  .merchant-banner__badge {
    flex: 0 0 auto;
  }

</style>

<style lang="scss">
  .q-field--dark.q-field--error {
    .text-negative,
    .q-field__messages,
    .q-field__label,
    .q-field__control.text-negative {
      color: #e57373 !important
    }
  }
  .cashback-text {
    color: #ed5f59;
    font-weight: bold;

    &.amount {
      font-size: 18px;
      color: $green-7;
    }
  }

  .change-address-banner {
    background: inherit;
    position:relative;
    border-radius: 15px;
    font-family: monospace
  }

  .change-address-banner:after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgb(253,253,253, .023);
    border: 1px solid #80808038;
    border-radius: 15px;
  }

  .bch-input-field.pt-amount-focused .q-field__control,
  .fiat-input-field.pt-amount-focused .q-field__control {
    box-shadow: inset 0 0 0 2px var(--q-primary);
    border-radius: 4px;
    transition: box-shadow 0.2s ease;
  }

  .bch-input-field.amount-has-value .q-field__label,
  .fiat-input-field.amount-has-value .q-field__label {
    display: none;
  }

  .bch-input-field.amount-has-value .q-field__control-container,
  .fiat-input-field.amount-has-value .q-field__control-container {
    display: flex;
    align-items: center;
  }

  .bch-input-field.amount-has-value .q-field__native,
  .fiat-input-field.amount-has-value .q-field__native {
    font-size: 28px;
    font-weight: 400;
    line-height: 1;
    padding-top: 0;
    padding-bottom: 0;
  }
</style>
