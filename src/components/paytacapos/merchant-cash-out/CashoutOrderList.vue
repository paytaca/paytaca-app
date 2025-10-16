<template>
  <q-dialog :full-height="!showCashoutDetails" full-width class="br-15 lg-font-size" persistent>
    <q-card :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
      <div v-if="showCashoutDetails">
        <CashoutOrderDetails :order="selectedCashoutOrder" @close="showCashoutDetails = false"/>
      </div>
      <div v-else>
        <div class="row q-px-sm">
          <div class="col text-bold q-mt-lg q-pt-xs q-px-md">Cashout Orders</div>
          <div class="col text-right q-pt-lg">
            <q-btn flat icon="close" color="red" v-close-popup/>
          </div>
        </div>

        <q-pull-to-refresh @refresh="refreshData">
          <!-- order type tabs -->
          <div
            class="row q-mt-sm q-mx-lg br-15 text-center pt-card btn-transaction"
            :class="getDarkModeClass(darkMode)"
            :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
            <button
              class="col br-15 btn-custom fiat-tab q-mt-none"
              :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'ALL'}]"
              @click="orderType = 'ALL'">
              {{ $t('All') }}
            </button>
            <button
              class="col br-15 btn-custom fiat-tab q-mt-none"
              :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'PENDING'}]"
              @click="orderType = 'PENDING'">
              {{ $t('Pending') }}
            </button>
            <button
              class="col br-15 btn-custom fiat-tab q-mt-none"
              :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'COMPLETED'}]"
              @click="orderType = 'COMPLETED'">
              {{ $t('Completed') }}
            </button>
          </div>
          <div v-if="isloading" class="row justify-center q-py-lg" style="margin-top: 50px">
            <ProgressLoader />
          </div>
          <!-- Cashout Order List -->
          <div v-else class="q-mx-lg q-pt-sm">
            <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 60}px`" style="overflow:auto;" v-if="cashoutOrders.length > 0">
              <q-item v-for="(cashout, index) in cashoutOrders" :key="index" clickable @click="selectCashoutOrder(cashout)">
                <div class="full-width">
                  <div class="q-pl-sm q-pb-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="sm-font-size text-grey-6">Cash out #{{ cashout.id }}</div>
                    <div class="row" v-if="cashout?.transactions?.inputs?.length > 0">
                      <div class="col ib-text">
                        <div class="md-font-size text-bold">
                          {{ formatCurrency(cashout?.payout_amount, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                        </div>
                        <div v-if="cashout.payout_details" class="sm-font-size">
                          {{ Number(cashout?.payout_details?.total_bch_amount) }} BCH
                        </div>
                      </div>
                      <div class="col ib-text text-right q-pr-sm">
                        <div class="text-grey-6 md-font-size">{{  cashout.status }}</div>
                      </div>
                    </div>
                    <div class="sm-font-size text-grey-6">{{ formatDate(cashout.created_at, true) }}</div>
                  </div>
                </div>
              </q-item>
              <div class="row justify-center">
                <q-spinner-dots v-if="loadingMoreData" color="primary" size="40px" />
                <q-btn v-else-if="!loadingMoreData && hasMoreData" flat dense @click="loadMoreData">view more</q-btn>
              </div>
            </q-list>
            <div v-if="cashoutOrders.length === 0" class="text-center q-mt-lg">
              <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
              <p :class="{ 'text-black': !darkMode }">{{ $t('No Orders To Display') }}</p>
            </div>
          </div>
        </q-pull-to-refresh>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/wallet/pos'
import { formatCurrency, formatDate } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import CashoutOrderDetails from './CashoutOrderDetails.vue'

export default {
  data () {
    return {
      isloading: true,
      loadingMoreData: false,
      pageNumber: 0,
      totalPages: null,
      theme: this.$store.getters['global/theme'],
      orderType: 'ALL',
      cashoutOrders: [],
      currency: this.$store.getters['market/selectedCurrency'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 160 : this.$q.screen.height - 130,
      showCashoutDetails: false,
      selectedCashoutOrder: null,
      status: 'cashout-list', // cashout-details
      merchant: null
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    hasMoreData () {
      return (this.pageNumber < this.totalPages)
    },
  },
  components: {
    ProgressLoader,
    CashoutOrderDetails
  },
  async mounted () {
    this.isloading = true

    this.merchant = this.$store.getters['paytacapos/cashoutMerchant']
    await this.refetchListings()

    this.isloading = false
  },
  watch: {
    async orderType (val) {
      this.isloading = true

      this.resetPagination()
      this.incPage()
      await this.fetchCashoutOrders(true)

      this.isloading = false
    }
  },
  methods: {
    formatDate,
    getDarkModeClass,
    formatCurrency,
    selectCashoutOrder (order){
      this.selectedCashoutOrder = order
      this.showCashoutDetails = true
    },
    async refreshData (done) {
      this.isloading = true

      this.resetPagination()
      await this.refetchListings(true)
      this.isloading = false
      done()
    },
    async refetchListings (overwrite = false) {
      this.incPage()
      await this.fetchCashoutOrders(overwrite)
    },
      loadMoreData () {
      if (!this.hasMoreData) {
        return
      }

      this.loadingMoreData = true

      if (this.pageNumber < this.totalPages) {
        this.refetchListings()
      }

      this.loadingMoreData = false
    },
    incPage () {
      this.pageNumber++
    },
    resetPagination () {
      this.pageNumber = 0
      this.totalPages = null
    },
    async fetchCashoutOrders (overwrite) {
      const vm = this
      const limit = 20
      const url = '/paytacapos/cash-out/'

      const params = {
        limit: limit,
        page: this.pageNumber,
        merchant_ids: this.merchant?.id
      }

      const orderTypes = [this.orderType]
      if (this.orderType === 'PENDING') {
        orderTypes.push('PROCESSING')
      }

      let orderTypeParamStr = ''
      if (this.orderType !== 'ALL' && orderTypes.length > 0) {
        orderTypeParamStr = '?order_types='
        if (orderTypes.length > 1) {
          orderTypeParamStr = `${orderTypeParamStr}${orderTypes.join('&order_types=')}`
        } else {
          orderTypeParamStr = `${orderTypeParamStr}${orderTypes[0]}`
        }
      }

      await backend.get(`${url}${orderTypeParamStr}`, { params: params })
        .then(response => {
          const data = response.data
          if (overwrite) {
            vm.cashoutOrders = data?.orders
          } else {
            vm.cashoutOrders.push(...data?.orders)
          }

          this.totalPages = data.data?.total_pages
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
</style>
