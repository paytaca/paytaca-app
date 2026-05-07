<template>
  <q-dialog v-model="showDialog" full-width>
    <q-card class="cash-in-dialog q-mx-lg" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" style="border-radius: 20px; overflow: hidden;">
      <!-- Header Section -->
      <div class="dialog-header q-px-md q-pt-md q-pb-sm" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
        <div class="row items-center justify-between">
          <div class="text-h6 text-weight-bold" :class="textColor">Cash In</div>
          <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="onHideCashInDialog" />
        </div>
      </div>

      <!-- Card Visualization -->
      <q-card-section class="q-px-lg q-pb-md">
        <div class="cash-in-card-container flex flex-center q-mb-lg">
          <div class="cash-in-mini-card" :class="$q.dark.isActive ? 'mini-card-dark' : 'mini-card-light'">
            <div class="row items-center justify-between q-pa-md full-height">
              <div class="column">
                <div class="text-caption text-weight-medium opacity-70">Card Balance</div>
                <div class="text-h5 text-weight-bold">{{ card?.balance || '0.00' }} <span class="text-subtitle2">BCH</span></div>
              </div>
              <q-icon name="account_balance_wallet" size="40px" color="primary" />
            </div>
          </div>
        </div>

        <!-- Address Section -->
        <div class="address-section q-mb-lg">
          <div class="row items-center q-mb-xs">
            <q-icon name="location_on" size="16px" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" class="q-mr-xs" />
            <span class="text-caption text-weight-medium" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">Deposit Address</span>
          </div>
          <div class="address-input-wrapper" :class="$q.dark.isActive ? 'address-dark' : 'address-light'">
            <div class="row items-center no-wrap">
              <div class="address-text text-body2 ellipsis q-mr-sm" :class="textColor">{{ card?.cashAddress }}</div>
              <q-btn 
                flat 
                round 
                dense 
                icon="content_copy" 
                size="sm"
                color="primary"
                class="copy-btn"
                @click="copyContractAddress"
              />
            </div>
          </div>
        </div>

        <!-- Amount Section -->
        <div class="amount-section q-mb-md">
          <div class="text-caption text-weight-medium q-mb-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Enter Amount
          </div>
          
          <!-- Crypto Amount -->
          <div class="amount-input-wrapper q-mb-md">
            <q-input
              class="amount-input"
              v-model="cryptoCashInAmount"
              label="Crypto Amount"
              filled
              hide-bottom-space
              input-class="text-h6 text-weight-bold"
              :dark="$q.dark.isActive"
              :rules="amountValidationRules"
              @focus="onFocusCryptoInput"
              @blur="onBlurCryptoInput"
              style="border-radius: 12px;">
              <template v-slot:prepend>
                <div class="currency-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                  <q-icon name="currency_bitcoin" size="18px" class="q-mr-xs" />
                  <span class="text-weight-bold">{{ selectedCryptoCurrency }}</span>
                </div>
              </template>
              <template v-slot:append>
                <q-btn-dropdown
                  flat
                  dense
                  dropdown-icon="expand_more"
                  class="currency-selector">
                  <q-list v-for="option in cryptoCurrencyOptions" :key="option.value" :style="{color: $q.dark.isActive ? 'white' : 'black'}">
                    <q-item clickable v-close-popup @click="selectedCryptoCurrency = option.value">
                      <q-item-section>
                        <q-item-label>{{ option.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </template>
            </q-input>
          </div>

          <!-- Exchange Arrow -->
          <div class="exchange-arrow flex flex-center q-mb-md">
            <div class="arrow-container" :class="$q.dark.isActive ? 'arrow-dark' : 'arrow-light'">
              <q-icon name="sync_alt" size="20px" :color="$q.dark.isActive ? 'grey-5' : 'grey-6'" />
            </div>
          </div>

          <!-- Fiat Amount -->
          <div class="amount-input-wrapper">
            <q-input
              class="amount-input"
              v-model="fiatCashInAmount"
              label="Fiat Amount"
              filled
              hide-bottom-space
              input-class="text-h6 text-weight-bold"
              :dark="$q.dark.isActive"
              :rules="amountValidationRules"
              @focus="onFocusFiatInput"
              @blur="onBlurFiatInput"
              style="border-radius: 12px;">
              <template v-slot:prepend>
                <div class="currency-badge fiat-badge" :class="$q.dark.isActive ? 'badge-dark' : 'badge-light'">
                  <q-icon name="attach_money" size="18px" class="q-mr-xs" />
                  <span class="text-weight-bold">{{ selectedFiatCurrency }}</span>
                </div>
              </template>
            </q-input>
          </div>
        </div>

        <!-- Exchange Rate Info -->
        <div class="exchange-info q-mb-lg q-px-sm">
          <div class="row items-center justify-between text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
            <span>Exchange Rate</span>
            <span class="text-weight-medium">1 BCH ≈ {{ bchPriceInSelectedCurrency ? bchPriceInSelectedCurrency.toFixed(2) : '--' }} {{ selectedFiatCurrency }}</span>
          </div>
        </div>

        <!-- Slide to Cash In -->
        <div class="row q-mt-lg">
          <drag-slide
            style="width: 100%;"
            disable-absolute-bottom
            text="Slide to Cash In"
            :disable="!isAmountValid()"
            @swiped="handleCashIn"
          />
        </div>
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
      selectedFiatCurrency: this.preferredCurrency,
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
      console.log(this.$store.getters['market/selectedCurrency'])
      return this.$store.getters['market/selectedCurrency'] || 'USD'
    },
    bchPriceInSelectedCurrency () {
      const currencySymbol = this.selectedFiatCurrency || 'USD'
      console.log('currencySymbol:', currencySymbol)
      const price = this.$store.getters['market/getAssetPrice']('bch', currencySymbol)
      console.log('price:', price)
      return price || null
    },
    cryptoCurrencyOptions () {
      const cryptos = this.$store.getters['assets/getAssets']
      const opts = cryptos.map(c => ({ 
          label: c.symbol, 
          value: c.id
        }))
      return opts
    },
  },
  watch: {
    cryptoCashInAmount(newVal) {
      if (!this.cryptoInputFocused) return
      if (this.selectedCryptoCurrency === 'BCH') {
        this.fiatCashInAmount = newVal && this.bchPriceInSelectedCurrency ? (parseFloat(newVal) * this.bchPriceInSelectedCurrency).toFixed(2) : 0
      } else if (this.selectedCryptoCurrency === 'sats' || this.selectedCryptoCurrency === 'Satoshis') {
        const bchAmount = newVal ? parseFloat(newVal) / 100000000 : 0
        this.fiatCashInAmount = bchAmount && this.bchPriceInSelectedCurrency ? (bchAmount * this.bchPriceInSelectedCurrency).toFixed(2) : 0
      }
    },
    fiatCashInAmount(newVal) {
      if (!this.fiatInputFocused) return
      if (this.selectedCryptoCurrency === 'BCH') {
        this.cryptoCashInAmount = newVal && this.bchPriceInSelectedCurrency ? (parseFloat(newVal) / this.bchPriceInSelectedCurrency).toFixed(8) : 0
      } else if (this.selectedCryptoCurrency === 'sats' || this.selectedCryptoCurrency === 'Satoshis') {
        const bchAmount = newVal && this.bchPriceInSelectedCurrency ? (parseFloat(newVal) / this.bchPriceInSelectedCurrency).toFixed(8) : 0
        this.cryptoCashInAmount = bchAmount ? (parseFloat(bchAmount) * 100000000).toFixed(0) : 0
      }
    },
  },
  mounted() {
    this.cryptoCurrencyOptions
    this.selectedFiatCurrency = this.preferredCurrency.symbol
  },
  methods: {
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
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* Mini Card Styling */
.cash-in-mini-card {
  width: 100%;
  max-width: 320px;
  height: 100px;
  border-radius: 16px;
  background: linear-gradient(135deg, #00a8e8 0%, #0077b6 100%);
  box-shadow: 0 8px 24px rgba(0, 119, 182, 0.3);
  color: white;
}

.mini-card-dark {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.mini-card-light {
  background: linear-gradient(135deg, #00a8e8 0%, #0077b6 100%);
  box-shadow: 0 8px 24px rgba(0, 119, 182, 0.3);
}

/* Address Section */
.address-section {
  text-align: left;
}

.address-input-wrapper {
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid;
  transition: all 0.3s ease;
}

.address-dark {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.address-light {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
}

.address-text {
  font-family: 'Courier New', monospace;
  letter-spacing: 0.3px;
}

.copy-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.copy-btn:hover {
  opacity: 1;
}

/* Amount Section */
.amount-section {
  text-align: left;
}

.amount-input-wrapper :deep(.q-field__control) {
  border-radius: 12px;
  padding-left: 4px;
}

.amount-input :deep(.q-field__label) {
  padding-left: 56px;
}

.amount-input :deep(.q-field__native) {
  padding-left: 8px;
}

/* Currency Badge */
.currency-badge {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s ease;
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

/* Exchange Arrow */
.exchange-arrow {
  position: relative;
}

.arrow-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.arrow-dark {
  background: rgba(255, 255, 255, 0.1);
}

.arrow-light {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Exchange Info */
.exchange-info {
  padding: 12px 0;
  border-top: 1px dashed;
  border-bottom: 1px dashed;
  border-color: rgba(128, 128, 128, 0.3);
}

/* Currency Selector */
.currency-selector :deep(.q-btn__content) {
  padding: 4px 8px;
}
</style>