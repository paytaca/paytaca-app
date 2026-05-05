<template>
  <q-dialog v-model="showDialog" full-width>
    <q-card class="cash-in-dialog q-mx-lg q-pa-sm" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'">
      <q-card-section class="text-center q-pt-sm">
        <div class="text-h6 q-my-md" :class="textColor">Cash In</div>
        <div class="row q-mb-md q-px-lg">
          <q-input 
            class="col"
            v-model:model-value="card.cashAddress" 
            readonly 
            outlined 
            dense 
            label="Cash Address"
            :dark="$q.dark.isActive">
            <template v-slot:append>
              <q-btn 
                flat 
                round 
                dense 
                icon="content_copy" 
                size="sm"
                :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
                @click="copyContractAddress"
              />
            </template>
          </q-input>
        </div>

        <div class="row justify-center q-px-lg">
          <q-input
            class="col amount-input q-mb-md"
            v-model="cryptoCashInAmount"            
            label="Amount"
            filled
            hide-bottom-space
            :dark="$q.dark.isActive"
            :rules="amountValidationRules"
            @focus="onFocusCryptoInput"
            @blur="onBlurCryptoInput">
          <template v-slot:append>
            {{ selectedCryptoCurrency }}
            <q-btn-dropdown
              unelevated
              style="padding: 0;">
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
        <div class="row justify-center q-px-lg">
          <q-input
            class="col amount-input q-mb-md"
            v-model="fiatCashInAmount"
            label="Amount"
            filled
            hide-bottom-space
            :dark="$q.dark.isActive"
            :rules="amountValidationRules"
            @focus="onFocusFiatInput"
            @blur="onBlurFiatInput">
            <template v-slot:append>
              {{ selectedFiatCurrency }}
            </template>
          </q-input>
        </div>
        <div class="row q-mt-md"> 
          <drag-slide
            style="width: 100%;"
            disable-absolute-bottom
            text="Cash In"
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