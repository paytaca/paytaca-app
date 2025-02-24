<template>
  <div class="text-right q-pa-none q-mx-lg q-pb-sm">
    <q-btn icon="sym_o_receipt_long" label="order" dense rounded color="primary" size="md" class="q-px-sm" @click="openCashoutOrderList()"/>
  </div>
  <!-- List -->
  <div>
    <div v-if="isloading" class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <q-pull-to-refresh @refresh="refreshData" v-else>
      <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 60}px`" style="overflow:auto;">
        <UnspentTransactionList :transactions="unspentTxns" :currency="currency.symbol" @select="selectTransaction"/>
      </q-list>
      <div v-if="cashoutOrders.length === 0 && unspentTxns.length === 0" class="text-center q-mt-lg">
        <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
        <p :class="{ 'text-black': !darkMode }">{{ $t('NoAdsToDisplay') }}</p>
      </div>
    </q-pull-to-refresh>
  </div>
  <div class="text-center q-pt-sm" v-if="selectedTransactions.length > 0">
    <q-btn class="q-px-lg" @click="openOrderForm()" rounded :label="`Cash Out (${selectedTransactions.length})`" color="primary"/>
  </div>
</template>
<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/exchange'
import { backend } from 'src/wallet/pos'
import UnspentTransactionList from './UnspentTransactionList.vue'
import ProgressLoader from '../ProgressLoader.vue'
import CashoutOrderDialog from './CashoutOrderDialog.vue'

export default {
  components: {
    UnspentTransactionList,
    ProgressLoader
  },
  data () {
    return {
      theme: this.$store.getters['global/theme'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 160 : this.$q.screen.height - 130,
      currency: this.$store.getters['market/selectedCurrency'],
      orderType: 'ALL',
      hideCashout: false,
      cashoutOrders: [],
      selectedTransactions: [],
      unspentTxns: [],
      isloading: true
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    orderType (val) {
      this.refetchListings()
    }
  },
  emits: ['cashout-form'],
  async mounted () {
    this.isloading = true
    await this.refetchListings()

    this.isloading = false
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    formatCurrency,
    async refreshData (done) {
      this.refetchListings()
      done()
    },
    async refetchListings () {
      await this.fetchCashoutOrders()
      await this.fetchUnspentTxns()
    },
    openOrderForm () {
      this.$router.push({ name: 'app-pos-cashout-form', state: { selectedTransactions: JSON.stringify(this.selectedTransactions) } })
    },
    openCashoutOrderList () {
      this.$q.dialog({
        component: CashoutOrderDialog,
        // componentProps: {
        //   currency: this.currency.symbol,
        //   selectedPM: this.paymentMethod
        // }
      })
    },
    selectTransaction (transaction, index) {
      const isTxnSelected = this.isTxnSelected(transaction)
      if (!isTxnSelected) {
        this.selectedTransactions.push(transaction)
        this.unspentTxns[index].selected = true
      } else {
        this.selectedTransactions = this.selectedTransactions.filter(tx => tx.txid !== transaction.txid)
        this.unspentTxns[index].selected = false
      }
    },
    async fetchUnspentTxns () {
      const vm = this
      const url = '/paytacapos/cash-out/list_unspent_txns/'

      await backend.get(url, { params: { currency: this.currency?.symbol } })
        .then(response => {
          vm.unspentTxns = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchCashoutOrders () {
      const vm = this
      const url = '/paytacapos/cash-out/'

      await backend.get(url)
        .then(response => {
          vm.cashoutOrders = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    preventPull (e) {
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
      }
    },
    isTxnSelected (transaction) {
      return this.selectedTransactions.some(txn => txn.txid === transaction.txid)
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
</style>
