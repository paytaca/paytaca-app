<template>
  <q-pull-to-refresh @refresh="refreshData">
    <div class="row justify-between q-mx-lg">
      <div>
        <q-btn icon="filter_list" flat outline color="primary" size="md">
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item v-for="(item, index) in filterOpts" :key="index" clickable @click="updateFilter()" v-close-popup>
                <q-item-section>{{ item.fullText }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
      <div>
        <q-btn icon="sym_o_receipt_long" flat outline color="primary" size="md" label="orders" class="q-px-sm q-mr-xs" @click="openCashoutOrderList(item)"/>
      </div>
    </div>
    <!-- List -->
    <div>
      <div v-if="isloading" class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
      <div v-else>
        <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 60}px`" style="overflow:auto;">
          <UnspentTransactionList :transactions="unspentTxns" :currency="currency.symbol" @select="selectTransaction"/>
        </q-list>
        <div v-if="unspentTxns.length === 0" class="text-center q-mt-lg">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('No Transactions To Display') }}</p>
        </div>
      </div>
    </div>
    <div class="text-center q-pt-sm" v-if="selectedTransactions.length > 0">
      <q-btn class="q-px-lg" @click="openOrderForm()" rounded :label="`Cash Out (${selectedTransactions.length})`" color="primary"/>
    </div>
  </q-pull-to-refresh>
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
      // orderType: 'ALL',
      // cashoutOrders: [],
      selectedTransactions: [],
      unspentTxns: [],
      isloading: true,
      filter: {},
      filterOpts: [
        {
          hasLossProtection: true, fullText: 'Within 30 Days'
        },
        {
          hasLossProtection: false, fullText: 'After 30 Days'
        }
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
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
      this.isloading = true
      await this.refetchListings()

      this.isloading = false
      done()
    },
    updateFilter (info) { // update later
      // console.log('updating filter: ', info)
      this.refetchListings()
    },
    async refetchListings () {
      await this.fetchUnspentTxns()
    },
    openOrderForm () {
      const state = {
        selectedTransactions: JSON.stringify(this.selectedTransactions),
        merchantName: this.$parent.merchant?.name
      }
      this.$router.push({ name: 'app-pos-cashout-form', state: state })
    },
    openCashoutOrderList () {
      this.$q.dialog({
        component: CashoutOrderDialog,
        // componentProps: {}
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

      await backend.get(url, {
        params: {
          currency: this.currency?.symbol,
          merchant_ids: history.state.merchantId
        }
      })
        .then(response => {
          console.log('fetchUnspentTxns:', response.data)
          vm.unspentTxns = response.data
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
