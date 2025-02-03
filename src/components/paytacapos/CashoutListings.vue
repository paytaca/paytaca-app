<template>
  <div class="text-right q-pa-none q-mx-lg">
    <q-toggle size="sm" v-model="hideCashout"/><span class="sm-font-size text-bold text-grey-8">Hide Cashout Order</span>
  </div>
  <!-- order type tabs -->
  <div
    class="row br-15 text-center pt-card btn-transaction"
    :class="getDarkModeClass(darkMode)"
    :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`"
  >
    <button
      class="col br-15 btn-custom fiat-tab q-mt-none"
      :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'ALL'}]"
      @click="orderType = 'ALL'"
    >
      {{ $t('All') }}
    </button>
    <button
      class="col br-15 btn-custom fiat-tab q-mt-none"
      :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'PENDING'}]"
      @click="orderType = 'PENDING'"
    >
      {{ $t('Pending') }}
    </button>
    <button
      class="col br-15 btn-custom fiat-tab q-mt-none"
      :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'COMPLETED'}]"
      @click="orderType = 'COMPLETED'"
    >
      {{ $t('Completed') }}
    </button>
  </div>

  <!-- List -->
  <div>
    <q-pull-to-refresh @refresh="refreshData">
      <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
      <!-- Cashout Order -->
        <q-card flat class="q-mx-lg q-mt-sm" v-if="!hideCashout">
          <q-item v-for="(cashout, index) in cashoutOrders" :key="index" clickable @click="''">
            <q-item-section>
              <div class="q-pl-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <div class="sm-font-size text-grey-6">Cash out</div>
                <div class="row">
                  <div class="col ib-text">
                    <div class="md-font-size text-bold">
                      {{ formatCurrency(cashout.transactions[0].wallet_history.fiat_price.current[currency.symbol], currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                    </div>
                    <div class="sm-font-size">
                      {{ cashout.transactions[0].wallet_history.amount }} BCH
                    </div>
                  </div>
                  <div class="col ib-text text-right q-pr-sm">
                    <div class="text-grey-8 text-bold">{{ cashout.transactions[0].wallet_history.txid.substring(0,8) }}</div>
                    <div class="text-grey-6 sm-font-size">{{  cashout.transactions[0].wallet_history.status }}</div>
                  </div>
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-card>
        <UnspentTransactionList :transactions="unspentTxns" :currency="currency.symbol" @select="selectTransaction"/>
      </q-list>
    </q-pull-to-refresh>
  </div>
  <div class="text-center q-pt-sm" v-if="selectedTransactions.length > 0">
    <q-btn class="q-px-lg" @click="openOrderForm()" rounded :label="`Cash Out (${selectedTransactions.length})`" color="primary"/>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatCurrency } from 'src/exchange'
import { backend } from 'src/exchange/backend'
import UnspentTransactionList from './UnspentTransactionList.vue'

export default {
  components: {
    UnspentTransactionList
  },
  data () {
    return {
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 160 : this.$q.screen.height - 130,
      currency: this.$store.getters['market/selectedCurrency'],
      orderType: 'ALL',
      hideCashout: false,
      cashoutOrders: [],
      selectedTransactions: [],
      unspentTxns: []
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
  mounted () {
    this.refetchListings()
  },
  methods: {
    getDarkModeClass,
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
      this.$router.push({ name: 'app-pos-cashout-form', query: { selectedTransactions: JSON.stringify(this.selectedTransactions) } })
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
      const url = '/paytacapos/cashout/'

      await backend.get(url)
        .then(response => {
          // console.log(response)
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
  .btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    margin-left: 7%;
    margin-right: 7%;
  }
  .btn-custom {
    height: 40px;
    width: 40%;
    border-radius: 20px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
    font-weight: 500;
  }
  .btn-custom:hover {
    background-color: rgb(242, 243, 252);
    color: #4C4F4F;
  }
  .btn-custom.active-buy-btn {
    background-color: rgb(60, 100, 246) !important;
    color: #fff !important;
  }
  .btn-custom.active-sell-btn {
    background-color: #ed5f59 !important;
    color: #fff !important;
  }
  .ib-text {
    display: inline-block;
  }
  .col-transaction {
    padding-top: 2px;
    font-weight: 500;
  }
</style>
