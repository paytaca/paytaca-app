<template>
  <div class="q-mt-lg q-mx-md">
    <div class="text-center" style="font-size: 20px;">
      Select Payment Method
    </div>
    <div class="q-px-lg q-pt-lg" @click="showCurrencySelect">
      {{ selectedCurrency.symbol }} <q-icon name="mdi-menu-down"/>
    </div>

    <q-card flat bordered class="br-15 q-mt-lg q-mx-lg">
      <q-virtual-scroll
        class="q-px-md q-py-sm q-my-sm"
        :items="paymentMethods"
        style="max-height: 50vh;"
        separator
        >
        <template v-slot="{item: method, index}">
          <q-item clickable @click="selectPaymentMethod(index)">
            <q-item-section>
              {{ method.name }}
            </q-item-section>
          </q-item>
        </template>
      </q-virtual-scroll>
    </q-card>
  </div>
</template>
<script>
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { bus } from 'src/wallet/event-bus'
import { inject } from 'vue'

export default {
  data () {
    return {
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      fiatCurrencies: [
        { symbol: 'PHP', name: 'Philippine Peso' },
        { symbol: 'USD', name: 'United States Dollars' }
      ],
      openCurrencyDialog: false,
      paymentMethods: [
        { id: 1, name: 'GCash' },
        { id: 2, name: 'BPI' }
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  emits: ['selectMethod'],
  mounted () {
    console.log('selected fiat: ', this.selectedCurrency)
  },
  methods: {
    showCurrencySelect () {
      this.$q.dialog({
        component: CurrencyFilterDialog,
        componentProps: {
          fiatList: this.fiatCurrencies
        }
      })
        .onOk(currency => {
          console.log('currency: ', currency)
          this.selectedCurrency = currency
        })
    },
    selectPaymentMethod (index) {
      this.$router?.push({ name: 'cashin-amount-select', query: this.paymentMethods[index]})
    }
  }
}
</script>
