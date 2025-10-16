<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav :title="'Merchant Cash Out'" class="header-nav header" />
    <CashoutIndex v-if="state === 'list'" @cashout-form="openCashoutForm"/>
</div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/exchange'
import { backend } from 'src/wallet/pos'
import { ref } from 'vue'
import HeaderNav from 'src/components/header-nav.vue';
import CashoutIndex from 'src/components/paytacapos/merchant-cash-out/CashoutIndex.vue';

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  components: {
    HeaderNav,
    CashoutIndex
  },
  data () {
    return {
      currency: { name: 'PHP', symbol: 'PHP' },
      state: 'list',
      selectedTransactions: [],
      merchant: null
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    this.loadMerchant(history.state.merchantId)
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    async loadMerchant (merchantId) {
      await backend.get(`/paytacapos/merchants/${merchantId}/`)
        .then(response => {
          console.log(response.data)
          this.merchant = response.data
          this.$store.commit('paytacapos/updateCashoutMerchant', this.merchant)
        })
        .catch(error => {
          console.error(error.response || error)
        })
    },
    async refreshData (done) {
      done()
    },
    openCashoutForm (transactions) {
      this.selectedTransactions = transactions
      this.state = 'cashout-form'
    },
    async createCashoutOrder () {
      const vm = this
      const url = '/paytacapos/cash-out/'
      const params = {
        currency: vm.currency,
        txids: vm.selectedTransaction
      }

      await backend.post(url, { params: params, authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
<style lang="scss" scoped>
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
  .header {
    margin-bottom: 0 !important;
  }
</style>
