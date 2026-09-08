<template>
  <q-dialog v-model="showDialog" full-width>
    <q-card class="cash-in-dialog q-mx-lg pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 24px;">
      <q-card-section class="q-pa-lg cash-in-section">
        <!-- Header -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="column">
            <div class="text-h6 text-weight-bold" :class="textColor">Fund</div>
            <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">Deposit funds to your card</div>
          </div>
          <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="onHideCashInDialog" />
        </div>

        <!-- Fund Type Toggle -->
        <q-btn-toggle
          v-model="fundType"
          spread
          no-caps
          rounded
          unelevated
          toggle-color="primary"
          :color="$q.dark.isActive ? 'grey-8' : 'grey-3'"
          :text-color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
          :options="[
            { label: 'BCH', value: 'BCH' },
            { label: 'CashToken', value: 'TOKEN' }
          ]"
          class="q-mb-md"
        />

        <!-- Balance Strip -->
        <div class="balance-strip bg-grad q-mb-md">
          <div class="row items-center justify-between">
            <div v-if="isBchMode" class="col">
              <div class="text-caption text-weight-medium text-white" style="letter-spacing: 0.5px;">CURRENT BALANCE</div>
              <div class="row items-baseline q-mt-xs">
                <span class="text-h5 text-weight-bold text-white" style="line-height: 1.1;">{{ formattedCardBalance }}</span>
                <span class="text-subtitle2 q-ml-xs text-white" style="font-weight: 500;">BCH</span>
              </div>
              <div class="row items-center justify-between wallet-balance">
                <span class="text-caption text-weight-medium text-white" style="letter-spacing: 0.5px; opacity: 0.9;">WALLET BALANCE</span>
                <span class="text-subtitle2 text-white" style="font-weight: 500;">{{ formattedWalletBalance }} BCH<template v-if="walletBalanceDisplayFiat"> · {{ walletBalanceDisplayFiat }}</template></span>
              </div>
            </div>
            <div v-else class="col">
              <div class="text-caption text-weight-medium text-white" style="letter-spacing: 0.5px;">{{ selectedToken ? 'SELECTED TOKEN' : (fungibleTokens.length ? 'FUND FROM WALLET' : 'TOKENS ON CARD') }}</div>
              <div class="row items-baseline q-mt-xs">
                <span class="text-h5 text-weight-bold text-white" style="line-height: 1.1;">{{ selectedToken?.symbol || (fungibleTokens.length ? `${fungibleTokens.length} token${fungibleTokens.length > 1 ? 's' : ''}` : cardTokenHoldings.length) }}</span>
                <span class="text-subtitle2 q-ml-xs text-white" style="font-weight: 500;">{{ selectedToken?.name || (fungibleTokens.length ? 'available' : 'token types') }}</span>
              </div>
              <div class="row items-center justify-between wallet-balance">
                <span class="text-caption text-weight-medium text-white" style="letter-spacing: 0.5px; opacity: 0.9;">WALLET BALANCE</span>
                <span v-if="selectedToken" class="text-subtitle2 text-white" style="font-weight: 500;">{{ formattedSelectedTokenBalance }} {{ selectedToken.symbol }}</span>
                <span v-else class="text-subtitle2 text-white" style="font-weight: 500;">Choose a token below</span>
              </div>
            </div>
            <q-img src="~assets/paytaca_logo.png" style="width: 24px;" fit="contain" />
          </div>
        </div>

        <!-- QR + Address Combined -->
        <div v-if="showDepositQr" class="deposit-card q-mb-lg pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'">
          <div class="row items-center q-pt-sm q-px-sm">
            <q-btn v-if="showDepositBack" icon="arrow_back" flat dense round :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="backToWallet">
              <q-tooltip>Back to my wallet</q-tooltip>
            </q-btn>
          </div>
          <div class="flex flex-center q-py-md">
            <qr-code
              :text="depositAddress || ''"
              :size="220"
              :padding="16"
              border-width="0px"
            />
          </div>
          <div class="flex flex-center q-px-md q-pb-md">
            <div class="address-badge" :class="$q.dark.isActive ? 'address-badge-dark' : 'address-badge-light'">
              <span class="address-text" :class="textColor">{{ formatContractAddress(depositAddress) }}</span>
              <q-icon name="content_copy" size="14px" class="cursor-pointer" color="primary" @click="copyContractAddress" />
            </div>
            <q-btn class="q-ml-xs" icon="help" flat dense color="primary">
              <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 8]">
                {{ isExternalTokenPath
                  ? 'Send only fungible CashTokens to this address. BCH or NFTs sent here may be lost.'
                  : 'Send BCH to this address to fund your card.' }}
              </q-tooltip>
            </q-btn>
          </div>
          <div v-if="isExternalTokenPath">
            <!-- <div class="text-caption text-weight-medium q-mb-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'">
              Send fungible CashTokens to this address from another wallet.
            </div> -->
            <div class="row justify-center text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              Scan the QR code or copy the address above with the sending wallet.<br/>
            </div>
          </div>
          <div v-if="isExternalBchPath">
            <div class="row justify-center text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              Scan the QR code or copy the address above with the sending wallet.<br/>
            </div>
          </div>
        </div>

        <!-- Amount Section -->
        <div class="amount-section">
          <div v-if="showFundSlide" class="text-caption text-weight-medium q-mb-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'">
            Enter Amount
          </div>

          <template v-if="isBchMode">
          <template v-if="bchPath === 'wallet'">
          <!-- Crypto Amount -->
          <div class="q-mb-sm pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
            <div class="row items-center no-wrap" >
              <div class="currency-selector crypto-selector q-px-sm">
                <div class="currency-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                  <q-icon name="currency_bitcoin" size="18px" class="q-mr-xs" />
                  <span class="text-weight-bold">{{ selectedCryptoCurrency }}</span>
                </div>
              </div>
              <q-input
                class="amount-input col"
                v-model="cryptoCashInAmount"
                filled
                hide-bottom-space
                input-class="text-h6 text-weight-bold"
                :dark="$q.dark.isActive"
                @focus="onFocusCryptoInput"
                @blur="onBlurCryptoInput">
              </q-input>
            </div>
          </div>

          <!-- Fiat Amount -->
          <div class="q-mb-sm pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
            <div class="row items-center no-wrap">
              <q-btn-dropdown
                flat
                dense
                padding="none"
                dropdown-icon="expand_more"
                class="currency-selector"
                style="flex: 0 0 auto; min-width: 0;">
                <template v-slot:label>
                  <div class="currency-badge fiat-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                    <q-icon v-if="fiatCurrencyIcon && fiatCurrencyIcon.startsWith('icon:')" :name="fiatCurrencyIcon.replace('icon:', '')" size="18px" class="q-mr-xs" />
                    <span v-else-if="fiatCurrencyIcon" class="q-mr-xs" style="font-size: 16px; line-height: 1;">{{ fiatCurrencyIcon }}</span>
                    <span class="text-weight-bold">{{ selectedFiatCurrency }}</span>
                  </div>
                </template>
                <q-list v-for="option in marketCurrencyOptions" :key="option.symbol" :style="{color: $q.dark.isActive ? 'white' : 'black'}">
                  <q-item clickable v-close-popup @click="selectedFiatCurrency = option.symbol">
                    <q-item-section>
                      <q-item-label>{{ option.name }} ({{ option.symbol }})</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
              <q-input
                class="amount-input col"
                v-model="fiatCashInAmount"
                filled
                hide-bottom-space
                input-class="text-h6 text-weight-bold"
                :dark="$q.dark.isActive"
                @focus="onFocusFiatInput"
                @blur="onBlurFiatInput">
              </q-input>
            </div>
          </div>
          <div class="row justify-end q-mb-sm">
            <q-btn flat dense no-caps color="primary" label="Receive from another wallet" @click="bchPath = 'external'" />
          </div>
          </template>
          </template>

          <template v-else>
            <template v-if="tokenPath === 'wallet'">
            <!-- <div class="text-caption text-weight-medium q-mb-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'">
              Choose Token
            </div> -->
            <!-- Token Selector + Amount -->
            <div class="q-mb-sm pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: auto;">
              <div class="row no-wrap">
                <q-btn-dropdown
                  flat
                  dense
                  dropdown-icon="expand_more"
                  class="currency-selector"
                  menu-anchor="bottom left"
                  menu-self="top left"
                  :disable="!fungibleTokens.length">
                  <template v-slot:label>
                    <div class="currency-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                      <q-avatar v-if="selectedToken?.logo" size="18px" class="q-mr-xs">
                        <q-img :src="selectedToken.logo" />
                      </q-avatar>
                      <span class="text-weight-bold">{{ selectedToken?.symbol || 'Choose' }}</span>
                    </div>
                  </template>
                  <q-list :style="{color: $q.dark.isActive ? 'white' : 'black'}">
                    <q-item v-for="token in fungibleTokens" :key="token.id" clickable v-close-popup @click="selectedTokenId = token.id">
                      <q-item-section avatar v-if="token.logo">
                        <q-avatar size="24px"><q-img :src="token.logo" /></q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ token.symbol }} - {{ token.name }}</q-item-label>
                        <q-item-label caption>{{ formatTokenBalance(token) }} available</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
                <q-input
                  class="amount-input col"
                  v-model="tokenCashInAmount"
                  filled
                  hide-bottom-space
                  input-class="text-h6 text-weight-bold"
                  :dark="$q.dark.isActive"
                  :placeholder="selectedToken ? '0.0' : 'Select a token first'"
                  :disable="!selectedToken"
                  @update:model-value="checkInputValidation">
                </q-input>
                <q-btn v-if="selectedToken" flat dense no-caps color="primary" label="MAX" class="q-mr-sm" @click="setMaxTokenAmount" />
              </div>
            </div>
            <div class="row justify-end q-mb-sm">
              <q-btn flat dense no-caps color="primary" label="Receive from another wallet" @click="tokenPath = 'external'" />
            </div>
            <div v-if="!fungibleTokens.length" class="text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              No fungible CashTokens in this wallet. Receive from another wallet instead.
            </div>
            <div v-else-if="cardTokenHoldings.length" class="text-caption q-mb-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              This card already holds {{ cardTokenHoldings.length }} token{{ cardTokenHoldings.length > 1 ? 's' : '' }}.
            </div>
            <div v-if="inputErrorMessage" class="q-mb-md">
              <div class="row items-center no-wrap" style="gap: 6px; color: red;">
                <span>{{ inputErrorMessage }}</span>
              </div>
            </div>
            </template>
          </template>

          <!-- Exchange Rate -->
          <div v-if="isBchMode && bchPath === 'wallet'" class="row justify-between items-center">
            <div class="exchange-rate q-mb-md">
              <div class="row items-center no-wrap text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'" style="gap: 6px;">
                <span>Exchange Rate</span>
                <span class="text-weight-medium">1 BCH ≈ {{ bchPriceInSelectedCurrency ? bchPriceInSelectedCurrency.toFixed(2) : '--' }} {{ selectedFiatCurrency }}</span>
              </div>
            </div>
            <div v-if="inputErrorMessage" class="q-mb-md" >
              <div class="row items-center no-wrap" style="gap: 6px; color: red;">
                <span>{{ inputErrorMessage }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide to Cash In -->
        <drag-slide
          v-if="showFundSlide"
          style="width: 100%;"
          disable-absolute-bottom
          :text="slideText"
          :disable="!isAmountValid()"
          @swiped="handleCashIn"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import CardMixin from 'src/mixins/card/card-mixin.js'
import DragSlide from '../drag-slide.vue';
import { loadCardUser } from 'src/services/card/user';
import { getFiatCurrencyIcon } from 'src/services/card/utils';
import { loadWallet } from 'src/services/wallet';
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils';
import { parseFiatCurrency } from 'src/utils/denomination-utils';
import { convertToFiatAmount, getChangeAddress } from 'src/utils/send-page-utils';

export default {
  name: "CashInDialog",
  mixins: [CardMixin],
  components: {
    DragSlide
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    card: {
      type: Object,
      required: true
    },
    defaultFundType: {
      type: String,
      default: 'BCH'
    },
  },
  emits: ['update:modelValue', 'close'],
  data() {
    return {
      showDialog: false,
      cryptoInputFocused: false,
      fiatInputFocused: false,
      cryptoCashInAmount: 0,
      fiatCashInAmount: 0,
      selectedFiatCurrency: 'USD',
      selectedCryptoCurrency: 'BCH',
      inputErrorMessage: null,
      fundType: 'BCH',
      bchPath: 'wallet',
      tokenPath: 'wallet',
      selectedTokenId: null,
      tokenCashInAmount: null,
      fetchedCardHoldings: null
    };
  },
  async mounted() {
    try {
      const wallet = await loadWallet()
      await updateAssetBalanceOnLoad('bch', wallet, this.$store)
    } catch (error) {
      console.error('Failed to load wallet balance:', error)
    }
  },
  computed: {
    // Dark mode computed properties for UI classes
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
    },
    walletBalance() {
      let wallet = this.$store.getters['assets/getAsset']('bch')[0]
      if (!wallet) wallet = this.$store.getters['global/getWallet']('bch')
      const spendable = Number(wallet?.spendable)
      if (Number.isFinite(spendable) && spendable >= 0) return spendable
      return Number(wallet?.balance) || 0
    },
    walletBalanceInFiat() {
      return convertToFiatAmount(this.walletBalance, this.bchPriceInSelectedCurrency)
    },
    formattedWalletBalance() {
      const balance = Number(this.walletBalance)
      if (!balance) return '0'
      return String(parseFloat(balance.toFixed(8)))
    },
    walletBalanceDisplayFiat() {
      if (!this.walletBalanceInFiat) return ''
      return parseFiatCurrency(this.walletBalanceInFiat, this.selectedFiatCurrency)
    },
    fiatCurrencyIcon() {
      return getFiatCurrencyIcon(this.selectedFiatCurrency)
    },
    amountValidationRules() {
      return [
        val => !isNaN(val) || 'Amount must be a number',
        val => (val && parseFloat(val) > 0) || 'Amount must be greater than 0'
      ]
    },
    preferredCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency || { symbol: 'USD' }
    },
    marketCurrencyOptions () {
      return this.$store.getters['market/currencyOptions'] || []
    },
    bchPriceInSelectedCurrency () {
      const currencySymbol = this.selectedFiatCurrency || 'USD'
      const price = this.$store.getters['market/getAssetPrice']('bch', currencySymbol)
      return price || null
    },
    cryptoCurrencyOptions () {
      return ['BCH', 'sats']
    },
    isBchMode () {
      return this.fundType === 'BCH'
    },
    isExternalTokenPath () {
      return !this.isBchMode && this.tokenPath === 'external'
    },
    isExternalBchPath () {
      return this.isBchMode && this.bchPath === 'external'
    },
    showDepositQr () {
      return this.isExternalBchPath || this.isExternalTokenPath
    },
    showDepositBack () {
      return this.isExternalBchPath || this.isExternalTokenPath
    },
    showFundSlide () {
      return (this.isBchMode && this.bchPath === 'wallet') || (!this.isBchMode && this.tokenPath === 'wallet')
    },
    cardBalanceBch () {
      const storeCard = this.card?.id ? this.$store.getters['card/getCardById']?.(this.card.id) : null
      if (storeCard?.balance !== undefined && storeCard?.balance !== null) return Number(storeCard.balance) || 0
      if (this.card?.balance !== undefined && this.card?.balance !== null) return Number(this.card.balance) || 0
      const sats = Number(this.card?.bchBalance ?? this.card?.raw?.bch_balance ?? 0)
      return sats / 100000000
    },
    formattedCardBalance () {
      return String(parseFloat(this.cardBalanceBch.toFixed(8)))
    },
    slideText () {
      return this.isBchMode ? 'Slide to Cash In' : 'Slide to Fund Token'
    },
    depositAddress () {
      if (!this.isBchMode) return this.card?.tokenAddress || this.card?.cashAddress
      return this.card?.cashAddress
    },
    fungibleTokens () {
      const assets = this.$store.getters['assets/getAssets'] || []
      return assets.filter(asset => {
        if (!asset?.id?.startsWith?.('ct/')) return false
        if (asset.is_nft) return false
        return Number(asset.balance) > 0
      })
    },
    selectedToken () {
      return this.fungibleTokens.find(token => token.id === this.selectedTokenId) || null
    },
    selectedTokenDecimals () {
      return parseInt(this.selectedToken?.decimals) || 0
    },
    selectedTokenWalletBalance () {
      if (!this.selectedToken) return 0
      return Number(this.selectedToken.balance || 0) / (10 ** this.selectedTokenDecimals)
    },
    formattedSelectedTokenBalance () {
      if (!this.selectedToken) return '0'
      return String(parseFloat(this.selectedTokenWalletBalance.toFixed(this.selectedTokenDecimals)))
    },
    cardTokenHoldings () {
      if (this.fetchedCardHoldings) return this.fetchedCardHoldings
      const holdings = this.card?.raw?.ct_balance ?? this.card?.ct_balance ?? []
      return Array.isArray(holdings) ? holdings : []
    },
  },
  watch: {
    modelValue (val) {
      this.showDialog = val
      if (val) {
        if (this.defaultFundType === 'BCH' || this.defaultFundType === 'TOKEN') {
          this.fundType = this.defaultFundType
        }
        this.refreshCardBalance()
        this.loadCardTokenHoldings()
      }
    },
    cryptoCashInAmount() {
      if (!this.cryptoInputFocused) return
      this.syncFiatFromCrypto()
      this.checkInputValidation()
    },
    fiatCashInAmount() {
      if (!this.fiatInputFocused) return
      this.syncCryptoFromFiat()
      this.checkInputValidation()
    },
    preferredCurrency: {
      handler(currency) {
        this.selectedFiatCurrency = currency?.symbol || 'USD'
      },
      immediate: true
    },
    selectedFiatCurrency() {
      if (this.fiatCashInAmount) {
        this.syncFiatFromCrypto()
      }
    },
    selectedCryptoCurrency() {
      if (this.fiatCashInAmount) {
        this.syncCryptoFromFiat()
      }
    },
    fundType() {
      this.updateInputErrorMessage(null)
      this.checkInputValidation()
    },
    tokenPath() {
      this.updateInputErrorMessage(null)
      this.checkInputValidation()
    },
    bchPath() {
      this.updateInputErrorMessage(null)
      this.checkInputValidation()
    },
    selectedTokenId() {
      this.updateInputErrorMessage(null)
      this.checkInputValidation()
    },
  },
  methods: {
    refreshCardBalance() {
      if (!this.card?.id) return
      this.$store.dispatch('card/fetchCardBalance', this.card.id).catch(() => {})
    },
    backToWallet() {
      if (this.isBchMode) {
        this.bchPath = 'wallet'
      } else {
        this.tokenPath = 'wallet'
      }
    },
    async loadCardTokenHoldings() {
      this.fetchedCardHoldings = null
      try {
        const holdings = await this.card?.getFungibleTokenBalances?.()
        if (Array.isArray(holdings)) this.fetchedCardHoldings = holdings
      } catch (error) {
        this.fetchedCardHoldings = null
      }
    },
    updateInputErrorMessage(message) {
      this.inputErrorMessage = message  
    },
    syncFiatFromCrypto() {
      if (!this.cryptoCashInAmount || !this.bchPriceInSelectedCurrency) return
      if (this.selectedCryptoCurrency === 'BCH') {
        this.fiatCashInAmount = (parseFloat(this.cryptoCashInAmount) * this.bchPriceInSelectedCurrency).toFixed(2)
      } else {
        const bchAmount = parseFloat(this.cryptoCashInAmount) / 100000000
        this.fiatCashInAmount = (bchAmount * this.bchPriceInSelectedCurrency).toFixed(2)
      }
    },
    syncCryptoFromFiat() {
      if (!this.fiatCashInAmount || !this.bchPriceInSelectedCurrency) return
      const bchAmount = parseFloat(this.fiatCashInAmount) / this.bchPriceInSelectedCurrency
      if (this.selectedCryptoCurrency === 'BCH') {
        this.cryptoCashInAmount = bchAmount.toFixed(8)
      } else {
        this.cryptoCashInAmount = (bchAmount * 100000000).toFixed(0)
      }
    },
    onFocusCryptoInput() {
      this.cryptoInputFocused = true
    },
    onBlurCryptoInput() {
      this.cryptoInputFocused = false
      this.checkInputValidation()
    },
    onFocusFiatInput() {
      this.fiatInputFocused = true
      this.checkInputValidation()
    },
    onBlurFiatInput() {
      this.fiatInputFocused = false
      this.checkInputValidation()
    },
    checkInputValidation() {
      if (!this.isAmountValid()) {
        if (this.isBchMode && this.exceedsWalletBalance()) {
          this.updateInputErrorMessage('Insufficient wallet balance')
        } else if (!this.isBchMode && !this.selectedToken) {
          this.updateInputErrorMessage('Please choose a token')
        } else if (!this.isBchMode && this.tokenExceedsBalance()) {
          this.updateInputErrorMessage('Insufficient token balance')
        } else {
          this.updateInputErrorMessage('Please enter a valid amount')
        }
      } else {
        this.updateInputErrorMessage(null)
      }
    },
    formatTokenBalance(token) {
      const decimals = parseInt(token?.decimals) || 0
      const balance = Number(token?.balance || 0) / (10 ** decimals)
      return String(parseFloat(balance.toFixed(decimals)))
    },
    setMaxTokenAmount() {
      if (!this.selectedToken) return
      this.tokenCashInAmount = String(parseFloat(this.selectedTokenWalletBalance.toFixed(this.selectedTokenDecimals)))
      this.checkInputValidation()
    },
    getTokenBaseUnits() {
      const amount = parseFloat(this.tokenCashInAmount)
      if (isNaN(amount) || amount <= 0) return null
      return Math.round(amount * (10 ** this.selectedTokenDecimals))
    },
    tokenExceedsBalance() {
      const baseUnits = this.getTokenBaseUnits()
      if (baseUnits === null || !this.selectedToken) return false
      return baseUnits > Number(this.selectedToken.balance || 0)
    },
    getEnteredAmountInBch() {
      const amount = parseFloat(this.cryptoCashInAmount)
      if (isNaN(amount) || amount <= 0) return null
      return this.selectedCryptoCurrency === 'BCH' ? amount : amount / 100000000
    },
    exceedsWalletBalance() {
      const amountInBch = this.getEnteredAmountInBch()
      if (amountInBch === null) return false
      return amountInBch > (Number(this.walletBalance) || 0)
    },
    isAmountValid() {
      if (!this.isBchMode) {
        if (!this.selectedToken) return false
        const amount = parseFloat(this.tokenCashInAmount)
        if (isNaN(amount) || amount <= 0) return false
        return !this.tokenExceedsBalance()
      }
      const validFiatAmount = (this.fiatCashInAmount && parseFloat(this.fiatCashInAmount) > 0) && !isNaN(this.fiatCashInAmount)
      const validCryptoAmount = (this.cryptoCashInAmount && parseFloat(this.cryptoCashInAmount) > 0) && !isNaN(this.cryptoCashInAmount)
      if (!validFiatAmount || !validCryptoAmount) return false
      return !this.exceedsWalletBalance()
    },

    async handleCashIn () {
      this.$q.loading.show({
        message: this.$t('ProcessingCashIn', {}, 'Processing cash in...')
      })
      let result = null
      let successMessage = ''
      try {
        const user = await loadCardUser()
        const wallet = await user.wallet.getRawWallet()
        if (this.isBchMode) {
          const sendAmount = this.cryptoCashInAmount
          result = await wallet.sendBch(sendAmount, this.card?.cashAddress)
          successMessage = `Successfully added ${this.fiatCashInAmount} ${this.selectedFiatCurrency} (${sendAmount} BCH) to your card!`
        } else {
          const tokenId = this.selectedTokenId?.split('ct/')[1] || this.selectedToken?.id?.split('ct/')[1]
          const tokenAmount = this.getTokenBaseUnits()
          if (!tokenId || tokenAmount === null) throw new Error('Please choose a token and enter an amount')
          const changeAddress = await getChangeAddress('bch')
          result = await wallet.sendBch(
            0, '', changeAddress, { tokenId }, undefined,
            [{ address: this.depositAddress, amount: 0, tokenAmount }]
          )
          successMessage = `Successfully added ${this.tokenCashInAmount} ${this.selectedToken?.symbol} to your card!`
        }
      } catch (error) {
        result = { success: false, error: error?.message }
      }
      this.$q.loading.hide()

      if (result?.success) {
        this.notifySuccess(successMessage, { timeout: 3000 })
        this.refreshCardHistory()
        this.pollForFundingAndRefresh()
      } else {
        this.$q.notify({
          message: `Cash in failed: ${result?.error || 'Please try again.'}`,
          color: 'negative',
          position: 'bottom',
          timeout: 5000
        })
      }

      this.onHideCashInDialog()
    },

    refreshCardHistory () {
      if (!this.card?.id) return
      this.$store.dispatch('card/fetchCardTransactions', { cardId: this.card.id }).catch(() => {})
    },
    async pollForFundingAndRefresh (interval = 2000, maxAttempts = 10) {
      let baseline = 0
      try {
        const utxos = await this.card?.getBchUtxos?.()
        baseline = Array.isArray(utxos) ? utxos.length : 0
      } catch {}
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, interval))
        try {
          const utxos = await this.card?.getBchUtxos?.()
          if (Array.isArray(utxos) && utxos.length > baseline) {
            this.refreshCardHistory()
            return
          }
        } catch {}
      }
      this.refreshCardHistory()
    },
    onHideCashInDialog () {
      this.showDialog = false
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },

    copyContractAddress () {
      const address = this.depositAddress || this.getContractAddress(this.card)
      if (address) {
        navigator.clipboard.writeText(address)
        this.notifySuccess('Contract address copied!')
      }
    },

    getContractAddress (card) {
      return card?.cashAddress
    },
  }
};
</script>

<style scoped>
.cash-in-dialog {
  max-width: 400px;
  max-height: 85vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border-radius: 24px !important;
  overflow: hidden;
}

.cash-in-section {
  overflow-y: auto;
  max-height: 80vh;
}

/* Balance Strip */
.balance-strip {
  border-radius: 16px;
  padding: 16px 20px;
  color: white;
  position: relative;
  isolation: isolate;
}

.balance-strip::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.25);
  z-index: -1;
}

.wallet-balance {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.35);
}

/* Deposit Card (QR + Address) */
.deposit-card {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.address-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid;
  width: fit-content;
}

.address-badge-dark {
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.15);
}

.address-badge-light {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
}

.address-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  letter-spacing: 0.2px;
}

/* Amount Section */
.amount-section {
  text-align: left;
}

.amount-input :deep(.q-field__control) {
  border-radius: 14px;
  padding-left: 4px;
  background: transparent !important;
  box-shadow: none !important;
}

.amount-input :deep(.q-field__control::before),
.amount-input :deep(.q-field__control::after) {
  display: none !important;
}

.amount-input :deep(.q-field__native) {
  padding-left: 8px;
  font-size: 18px;
}

/* Currency Badge */
.currency-badge {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.fiat-badge {
  padding-left: 10px;
}

.badge-dark {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.badge-light {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

:deep(.drag-slide-container) {
  margin: 0 !important;
}

:deep(.drag-slide-container) .q-list {
  padding: 0 !important;
}

:deep(.drag-slide-container) > .q-list > div {
  margin: 0 !important;
}

:deep(.drag-slide-container) h5 {
  color: white !important;
  text-align: center !important;
}

:deep(.drag-slide-container) .q-slide-item {
  border: none !important;
  background: transparent !important;
  border-radius: 16px !important;
}

:deep(.drag-slide-container) .q-item {
  border: none !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  border-radius: 16px !important;
}

:deep(.drag-slide-container) .q-slide-item__track,
:deep(.drag-slide-container) .q-slide-item__top,
:deep(.drag-slide-container) .q-slide-item__bottom {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}



:deep(.drag-slide-container) .q-item.q-item--dark {
  border: none !important;
}

:deep(.drag-slide-container) .q-item__section {
  padding: 0 !important;
}

/* Exchange Rate */
.exchange-rate {
  padding: 10px 0;
  border-top: 1px dashed;
  border-color: rgba(128, 128, 128, 0.25);
}

/* Currency Selector */
.currency-selector :deep(.q-btn__content) {
  padding: 4px 8px;
}

.cash-in-dialog.light {
  background: color-mix(in srgb, var(--q-primary) 12%, rgba(255, 255, 255, 0.75)) !important;
}
</style>