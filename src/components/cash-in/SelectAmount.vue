<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      {{ $t('EnterAmount') }}
    </div>

    <!-- Amount Input -->
    <div class="text-center q-mt-md q-px-lg">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="amount"
        readonly
        :dark="darkMode"
        style="font-size: large;">
        <template v-slot:append>
          <div class="q-pr-sm">
            {{ byFiat ? currency.symbol: 'BCH'}}
          </div>
        </template>
      </q-input>
      <div class="row justify-between text-right q-pr-sm q-pt-xs" style="font-size: 14px">
        <div v-if="fiatPresets.length > 0" class="col-auto">
          <q-btn
            class="sm-font-size"
            padding="none"
            flat no-caps
            :class="darkMode ? 'text-blue-6' : 'text-blue-8'"
            @click="byFiat = !byFiat">
            {{
              $t(
                'SetAmountInCurrency',
                { currency: byFiat ? 'BCH' :  currency.symbol },
                `Set amount in ${ byFiat ? 'BCH' : currency.symbol }`
              )
            }}
          </q-btn>
        </div>
        <div class="col">{{ byFiat? $t('YouGet') : $t('YouPay')}}{{ byFiat && equivalentAmount > 0 ? ' &asymp;' : ' '}}{{ equivalentAmount ? equivalentAmount?.toLocaleString() : 0 }} {{  !byFiat ? currency?.symbol : 'BCH'}}</div>
      </div>
    </div>

    <!-- Selection -->
    <div class="row q-gutter-x-md q-gutter-y-sm text-center q-mt-xs q-mx-md">
      <div class="col-5" v-for="(option, index) in presetOptions" :key="option">
        <q-btn
          rounded
          :outline="index !== selectedOptionIndex"
          :disable="!adOptions || !denomAvailable(index)"
          :color="getButtonColor(index)"
          class="full-width q-py-sm"
          @click="selectOption(option, index)">
          {{ option.toLocaleString() }}
          </q-btn>
      </div>
    </div>

    <div v-if="unavailableDenoms" class="row justify-center q-pt-md" style="font-size: small; opacity: .5">
      <div class="col-shrink text-center" style="font-style: italic">{{ $t('DenomsNotAvailable') }}</div>
    </div>
    <!-- Proceed -->
    <div class="row justify-center q-mt-md">
      <q-btn :loading="loadProceedButton" class="col q-mx-lg button" :disable="disableProceedBtn" rounded :class="getDarkModeClass(darkMode)" :label="$t('Proceed')" @click="submitOrder"/>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { bchToFiat, bchToSatoshi, fiatToBch } from 'src/exchange'

export default {
  props: {
    paymentType: Object,
    currency: Object,
    adOptions: Object,
    fiatPresets: Array
  },
  emits: ['select-amount', 'submit-order', 'update-presets'],
  data () {
    return {
      amount: 0,
      amountBchOptions: [0.02, 0.04, 0.1, 0.25, 0.5, 1],
      amountFiatOptions: this.fiatPresets,
      amountFiatEqOptions: [],
      selectedOptionIndex: null,
      byFiat: true,
      loadProceedButton: false
    }
  },
  computed: {
    presetOptions () {
      return this.byFiat ? this.amountFiatOptions : this.amountBchOptions
    },
    bchPresetOptions () {
      return this.byFiat ? this.amountFiatEqOptions : this.amountBchOptions
    },
    unavailableDenoms () {
      let hasUnavailable = false
      for (const key in this.adOptions) {
        if (this.adOptions[key].length === 0) {
          hasUnavailable = true
          break
        }
      }
      return hasUnavailable
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    equivalentAmount () {
      let amount = this.amount
      if (amount === '' || isNaN(amount)) return 0
      if (!this.byFiat) {
        amount = bchToFiat(amount, this.selectedAd?.price)
      } else {
        amount = fiatToBch(amount, this.selectedAd?.price)
      }
      return Number(amount)
    },
    disableProceedBtn () {
      return this.amount === 0 || !this.selectedAd || this.loadProceedButton
    },
    selectedPaymentMethod () {
      const paymentMethod = this.selectedAd.payment_methods.filter(e => e.payment_type.id === this.paymentType.id)
      if (paymentMethod?.length === 0) return null
      return paymentMethod[0]
    },
    selectedAd () {
      let ad = null
      if (this.amount) {
        const adList = this.adOptions[this.amount]
        if (adList?.length > 0) {
          ad = adList[0]
        }
      }
      return ad
    }
  },
  watch: {
    byFiat () {
      this.amount = 0
      this.selectedOptionIndex = null
      this.updatePresets()
    }
  },
  mounted () {
    this.byFiat = this.fiatPresets.length > 0 || false
  },
  methods: {
    getDarkModeClass,
    denomAvailable (index) {
      const adCount = this.adOptions[this.presetOptions[index]]?.length || 0
      return adCount > 0
    },
    updatePresets () {
      this.$emit('update-presets', this.byFiat)
    },
    submitOrder () {
      this.loadProceedButton = true
      let amount = this.amount
      if (this.byFiat) {
        amount = Number((amount) / parseFloat(this.selectedAd?.price)).toFixed(8)
      }
      const payload = {
        ad: this.selectedAd?.id,
        trade_amount: bchToSatoshi(amount),
        payment_methods: [this.selectedPaymentMethod?.id],
        is_cash_in: true
      }
      this.$emit('submit-order', payload)
    },
    selectOption (option, index) {
      if (this.amount !== option.toString()) {
        this.amount = option.toString()
        this.selectedOptionIndex = index
      } else {
        this.amount = '0'
        this.selectedOptionIndex = null
      }
    },
    getButtonColor (index) {
      if (index === this.selectedOptionIndex || this.denomAvailable(index)) {
        return 'blue-6'
      } else {
        return this.darkMode ? 'blue-grey-2' : 'blue-grey-8'
      }
    }
  }
}
</script>
<style scoped>
.sm-font-size {
  font-size: small;
}
</style>
