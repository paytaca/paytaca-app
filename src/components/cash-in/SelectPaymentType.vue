<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Select Payment Type
    </div>
    <div class="q-px-lg q-pt-lg" style="font-size: medium;" @click="showCurrencySelect">
      {{ selectedCurrency.symbol }} <q-icon name="mdi-menu-down"/>
    </div>

    <div class="text-center q-pt-md" v-if="options.length === 0">
      <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
      <p style="font-size: medium;">No Payment Type<br>Available... ☹</p>
    </div>
    <q-card flat bordered class="q-mt-sm q-mx-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" v-else>
      <q-virtual-scroll :items="options" style="max-height: 40vh;">
        <template v-slot="{ item: method, index }">
          <q-item clickable @click="selectPaymentType(method)" :key="index">
            <q-item-section>
              <div style="font-size: medium;">{{ method?.short_name }}</div>
              <div style="font-size: small;">
                <div style="opacity: .5;">{{ method?.short_name !== method?.full_name ? method?.full_name : ''}}</div>
                <div v-if="method.online_ads_count > 0" :class="darkMode ? 'text-green-6' : 'text-green-8'">{{ method.online_ads_count }} {{ method.online_ads_count == 1 ? 'seller' : 'sellers'}} recently active</div>
                <div v-if="method.online_ads_count === 0" style="opacity: .5;">{{ method.online_ads_count }} {{ method.online_ads_count == 1 ? 'seller' : 'sellers'}} recently active</div>
              </div>
            </q-item-section>
          </q-item>
          <q-separator class="q-mx-sm" v-if="index !== options.length - 1"/>
        </template>
      </q-virtual-scroll>
    </q-card>
  </div>
</template>
<script>
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'

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
    options: Array,
    fiat: Object
  },
  watch: {
    selectedCurrency (value) {
      console.log('_selectedCurrency:', value)
      this.$emit('select-currency', value)
    }
  },
  mounted () {
    this.fetchFiatCurrencies()
    this.selectedCurrency = this.fiat
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
          this.selectedCurrency = currency
        })
    },
    selectPaymentType (value) {
      this.$emit('select-payment', value)
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
          } else {
            bus.emit('network-error')
          }
        })
    }
  }
}
</script>
