<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Select Payment Method
    </div>
    <div class="q-px-lg q-pt-lg" @click="showCurrencySelect">
      {{ selectedCurrency.symbol }} <q-icon name="mdi-menu-down"/>
    </div>

    <q-card flat bordered class="br-15 q-mt-lg q-mx-lg">
      <q-virtual-scroll
        class="q-px-md q-py-sm q-my-sm"
        :items="options"
        style="max-height: 30vh;"
        separator
        >
        <template v-slot="{item: method}">
          <q-item clickable @click="selectPaymentType(method)">
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
  emits: ['select'],
  props: {
    options: Array
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
    selectPaymentType (value) {
      this.$emit('select', value)
      // this.$router?.push({ name: 'cashin-amount-select', query: this.paymentMethods[index]})
    }
  }
}
</script>
