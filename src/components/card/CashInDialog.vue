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

        <!-- Balance Strip -->
        <div class="balance-strip bg-grad q-mb-md">
          <div class="row items-center justify-between">
            <div class="col">
              <div class="text-caption text-weight-medium text-white" style="letter-spacing: 0.5px;">CURRENT BALANCE</div>
              <div class="row items-baseline q-mt-xs">
                <span class="text-h5 text-weight-bold text-white" style="line-height: 1.1;">{{ card?.balance || '0.00' }}</span>
                <span class="text-subtitle2 q-ml-xs text-white" style="font-weight: 500;">BCH</span>
              </div>
            </div>
            <q-img src="~assets/paytaca_logo.png" style="width: 24px;" fit="contain" />
          </div>
        </div>

        <!-- QR + Address Combined -->
        <div class="deposit-card q-mb-lg pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'">
          <div class="flex flex-center q-py-md">
            <qr-code
              :text="card?.cashAddress || ''"
              :size="160"
              :padding="16"
              border-width="0px"
            />
          </div>
          <div class="flex flex-center q-px-md q-pb-md">
            <div class="address-badge" :class="$q.dark.isActive ? 'address-badge-dark' : 'address-badge-light'">
              <span class="address-text" :class="textColor">{{ formatContractAddress(card?.cashAddress) }}</span>
              <q-icon name="content_copy" size="14px" class="cursor-pointer" color="primary" @click="copyContractAddress" />
            </div>
          </div>
        </div>

        <!-- Amount Section -->
        <div class="amount-section">
          <div class="text-caption text-weight-medium q-mb-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-6'">
            Enter Amount
          </div>

          <!-- Crypto Amount -->
          <div class="q-mb-sm pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
            <q-input
              class="amount-input"
              v-model="cryptoCashInAmount"
              filled
              hide-bottom-space
              input-class="text-h6 text-weight-bold"
              :dark="$q.dark.isActive"
              :rules="amountValidationRules"
              @focus="onFocusCryptoInput"
              @blur="onBlurCryptoInput">
              <template v-slot:prepend>
                <q-btn-dropdown
                  flat
                  dense
                  dropdown-icon="expand_more"
                  class="currency-selector crypto-selector">
                  <template v-slot:label>
                    <div class="currency-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                      <q-icon name="currency_bitcoin" size="18px" class="q-mr-xs" />
                      <span class="text-weight-bold">{{ selectedCryptoCurrency }}</span>
                    </div>
                  </template>
                  <q-list>
                    <q-item v-for="option in cryptoCurrencyOptions" :key="option" clickable v-close-popup @click="selectedCryptoCurrency = option">
                      <q-item-section>
                        <q-item-label>{{ option }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </template>
            </q-input>
          </div>

          <!-- Fiat Amount -->
          <div class="q-mb-sm pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
            <q-input
              class="amount-input"
              v-model="fiatCashInAmount"
              filled
              hide-bottom-space
              input-class="text-h6 text-weight-bold"
              :dark="$q.dark.isActive"
              :rules="amountValidationRules"
              @focus="onFocusFiatInput"
              @blur="onBlurFiatInput">
              <template v-slot:prepend>
                <q-btn-dropdown
                  flat
                  dense
                  dropdown-icon="expand_more"
                  class="currency-selector">
                  <template v-slot:label>
                    <div class="currency-badge fiat-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                      <q-icon name="attach_money" size="18px" class="q-mr-xs" />
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
              </template>
            </q-input>
          </div>

          <!-- Exchange Rate -->
          <div class="exchange-rate q-mb-md">
            <div class="row items-center no-wrap text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'" style="gap: 6px;">
              <span>Exchange Rate</span>
              <span class="text-weight-medium">1 BCH ≈ {{ bchPriceInSelectedCurrency ? bchPriceInSelectedCurrency.toFixed(2) : '--' }} {{ selectedFiatCurrency }}</span>
            </div>
          </div>
        </div>

        <!-- Slide to Cash In -->
        <drag-slide
          style="width: 100%;"
          disable-absolute-bottom
          text="Slide to Cash In"
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

export default {
  name: "CashInDialog",
  mixins: [CardMixin],
  components: {
    DragSlide
  },
  props: {
    card: {
      type: Object,
      required: true
    },
  },
  emits: ['close'],
  data() {
    return {
      showDialog: true,
      cryptoInputFocused: false,
      fiatInputFocused: false,
      cryptoCashInAmount: 0,
      fiatCashInAmount: 0,
      selectedFiatCurrency: 'USD',
      selectedCryptoCurrency: 'BCH',
    };
  },
  computed: {
    // Dark mode computed properties for UI classes
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
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
  },
  watch: {
    cryptoCashInAmount() {
      if (!this.cryptoInputFocused) return
      this.syncFiatFromCrypto()
    },
    fiatCashInAmount() {
      if (!this.fiatInputFocused) return
      this.syncCryptoFromFiat()
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
  },
  methods: {
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
    },
    onFocusFiatInput() {
      this.fiatInputFocused = true
    },
    onBlurFiatInput() {
      this.fiatInputFocused = false
    },
    isAmountValid() {
      const validFiatAmount = (this.fiatCashInAmount && parseFloat(this.fiatCashInAmount) > 0) && !isNaN(this.fiatCashInAmount)
      const validCryptoAmount = (this.cryptoCashInAmount && parseFloat(this.cryptoCashInAmount) > 0) && !isNaN(this.cryptoCashInAmount)
      return validFiatAmount && validCryptoAmount
    },

    async handleCashIn () {
      this.$q.loading.show({
        message: 'Processing cash in...'
      })
      const sendAmount = this.cryptoCashInAmount
      const user = await loadCardUser()
      const wallet = await user.wallet.getRawWallet()
      const result = await wallet.sendBch(sendAmount, this.card?.cashAddress)
      this.$q.loading.hide()

      if (result.success) {
        this.notifySuccess(
          `Successfully added ${this.fiatCashInAmount} ${this.selectedFiatCurrency} (${sendAmount} BCH) to your card!`,
          { timeout: 3000 }
        )
      } else {
        this.$q.notify({
          message: 'Cash in failed. Please try again.',
          color: 'negative',
          position: 'top',
          timeout: 5000
        })
      }
      
      this.onHideCashInDialog()
    },

    onHideCashInDialog () {
      this.$emit('close')
    },

    copyContractAddress () {
      const address = this.getContractAddress(this.card)
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