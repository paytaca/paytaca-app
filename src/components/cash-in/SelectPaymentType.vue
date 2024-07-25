<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Select Payment Type
    </div>
    <div class="q-px-lg q-pt-lg" style="font-size: medium;" @click="showCurrencySelect">
      {{ selectedCurrency.symbol }} <q-icon name="mdi-menu-down"/>
    </div>

    <q-card flat bordered class="br-15 q-mt-lg q-mx-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-virtual-scroll :items="options">
        <template v-slot="{ item: method }">
          <q-item clickable @click="selectPaymentType(method)">
            <q-item-section>
              <div style="font-size: medium;">{{ method?.short_name }}</div>
              <div class="text-grey" style="font-size: small;">{{ method?.short_name !== method?.full_name ? method?.full_name : ''}}</div>
            </q-item-section>
          </q-item>
        </template>
      </q-virtual-scroll>
    </q-card>
  </div>
</template>
<script>
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      currencyOpts: [],
      openCurrencyDialog: false
    }
  },
  emits: ['select-payment', 'select-currency'],
  props: {
    options: Array
  },
  watch: {
    selectedCurrency (value) {
      console.log('_selectedCurrency:', value)
      this.$emit('select-currency', value)
    }
  },
  mounted () {
    this.fetchFiatCurrencies()
  },
  methods: {
    getDarkModeClass,
    showCurrencySelect () {
      this.$q.dialog({
        component: CurrencyFilterDialog,
        componentProps: {
          fiatList: this.currencyOpts
        }
      })
        .onOk(currency => {
          console.log('currency: ', currency)
          this.selectedCurrency = currency
        })
    },
    selectPaymentType (value) {
      this.$emit('select-payment', value)
      // this.$router?.push({ name: 'cashin-amount-select', query: this.paymentMethods[index]})
    },
    async fetchFiatCurrencies () {
      const vm = this
      await backend.get('/ramp-p2p/currency/fiat')
        .then(response => {
          vm.currencyOpts = response.data
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              // bus.emit('session-expired')
              console.log('session-expired')
            }
          }
        })
    }
  }
}
</script>
