<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshData"
  >
    <HeaderNav
      :title="'Merchant Cash Out'"
      class="header"
    />
    <CashoutListings v-if="state === 'list'" @cashout-form="openCashoutForm"/>
  </q-pull-to-refresh>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/exchange'
// import { backend } from 'src/exchange/backend'
import { backend } from 'src/wallet/pos'
import { ref } from 'vue'
import HeaderNav from 'src/components/header-nav.vue';
import CashoutListings from 'src/components/paytacapos/CashoutListings.vue';

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  data () {
    return {
      currency: { name: 'PHP', symbol: 'PHP' },
      state: 'list',
      selectedTransactions: []
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    HeaderNav,
    CashoutListings
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
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
