<template>
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :style="`min-height: ${ minHeight }px;`"
    >
      <div v-if="state === 'order-list'">
        <div>
          <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
            <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'ONGOING' }" @click="statusType='ONGOING'">Ongoing</button>
            <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'COMPLETED'}" @click="statusType='COMPLETED'">Completed</button>
          </div>
        </div>
        <div v-if="loading">
          <div class="row justify-center q-py-lg" style="margin-top: 50px">
            <ProgressLoader/>
          </div>
        </div>
        <div v-else class="q-mt-md">
          <q-pull-to-refresh
            @refresh="refreshData">
            <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
              <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
              <p :class="{ 'text-black': !darkMode }">No Orders to Display</p>
            </div>
            <div v-else class="q-mb-lg q-pb-lg">
              <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - (minHeight*.2)}px`" style="overflow:auto;">
                <q-infinite-scroll
                ref="infiniteScroll"
                :items="listings"
                @load="loadMoreData"
                :offset="0"
                :scroll-target="scrollTargetRef">
                  <template v-slot:loading>
                    <div class="row justify-center q-my-md" v-if="hasMoreData">
                      <q-spinner-dots color="primary" size="40px" />
                    </div>
                  </template>
                  <div v-for="(listing, index) in listings" :key="index">
                    <q-item clickable @click="selectOrder(listing)">
                      <q-item-section>
                        <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                          <div class="row q-mx-md">
                            <div class="col ib-text">
                              <span
                                :class="{'pt-dark-label': darkMode}"
                                class="q-mb-none md-font-size">
                                {{ listing.ad.owner.nickname }} &nbsp; <q-badge v-if="listing.ad.owner.id === userInfo.id" rounded outline size="sm" color="blue-6" label="You" />
                              </span>
                              <div
                                :class="{'pt-dark-label': darkMode}"
                                class="col-transaction text-uppercase lg-font-size"
                                style="font-size: 20px;"
                                :style="amountColor(listing.trade_type)">
                                {{ formattedCurrency(orderFiatAmount(listing.locked_price, listing.crypto_amount), listing.fiat_currency.symbol) }}
                              </div>
                              <div class="sm-font-size">
                                <!-- &asymp; -->
                                <!-- {{ listing.crypto_amount }} {{ listing.crypto_currency.abbrev }}</div> -->
                                {{ formattedCurrency(listing.crypto_amount, false) }} BCH</div>
                              <div class="xs-font-size">
                                <span class="q-pr-sm">Price</span> {{ formattedCurrency(listing.locked_price, listing.fiat_currency.symbol) }}
                              </div>
                              <div v-if="listing.last_modified_at" class="row xs-font-size" style="color: grey">Last updated {{ formattedDate(listing.last_modified_at) }}</div>
                            </div>
                            <div class="text-right">
                              <span class="row subtext" v-if="listing.status && isCompleted(listing.status.label) == false && listing.expiration_date != null">
                                <span v-if="isExpired(listing.expiration_date) == false" class="q-mr-xs">Expires in </span>
                                <span v-else class="q-mr-xs">Expired for</span>
                                <span>{{ formatExpiration(listing.expiration_date) }}</span>
                              </span>
                              <span v-if="listing.expiration_date && isExpired(listing.expiration_date) && statusType === 'ONGOING'" class="bold-text subtext md-font-size" style=";">Expired</span>
                              <span v-else class="bold-text subtext md-font-size" style=";">{{ listing.status ? listing.status.label : '' }}</span>
                              <!-- <span class="subtext">{{ listing.status }}</span> -->
                              <!-- <span class="status-text" v-if="listing.status === 'released'">RELEASED</span> -->
                              <!-- <span class="status-text" v-else-if="listing.status.includes('confirmation')">PENDING CONFIRMATION</span> -->
                              <!-- <span class="status-text" v-else-if="listing.status.startsWith('pending-')">{{ listing.status.replace('-', ' ').toUpperCase() }}</span> -->
                            </div>
                          </div>
                          <div class="q-gutter-sm q-pt-sm">
                            <!-- <q-badge v-for="method in listing.paymentMethods" rounded outline :color="transactionType === 'BUY'? 'blue': 'red'" :label="method" /> -->
                          </div>
                        </div>
                      </q-item-section>
                    </q-item>
                  </div>
                </q-infinite-scroll>
              </q-list>
            </div>
          </q-pull-to-refresh>
        </div>
      </div>
      <div v-if="state === 'view-order'">
        <FiatProcessOrder
          :init-wallet="wallet"
          :order-data="selectedOrder"
          @back="returnOrderList()"
        />
        <!-- check which step the order are in -->
      </div>
    </q-card>
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import FiatProcessOrder from './FiatProcessOrder.vue'
import { loadP2PWalletInfo, formatCurrency, formatDate } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { ref } from 'vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    const infiniteScroll = ref(null)
    // const pullToRefresh = ref(null)
    return {
      scrollTargetRef,
      infiniteScroll,
      // pullToRefresh
    }
  },
  components: {
    ProgressLoader,
    FiatProcessOrder
  },
  props: {
    initStatusType: {
      type: String,
      default: 'ONGOING'
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      wallet: null,
      selectedOrder: null,
      statusType: this.initStatusType,
      state: 'order-list',
      transactionType: '',
      loading: false,
      totalPages: null,
      pageNumber: null,
      minHeight: this.$q.screen.height - 210
    }
  },
  watch: {
    statusType () {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      if (vm.pageNumber === null || vm.totalPages === null) {
        if (!vm.listings || vm.listings.length === 0) {
          vm.loading = true
          vm.fetchOrders()
        }
      }
    }
  },
  computed: {
    listings () {
      const vm = this
      switch (vm.statusType) {
        case 'ONGOING':
          return vm.ongoingOrders
        case 'COMPLETED':
          return vm.completedOrders
      }
      return []
    },
    ongoingOrders () {
      return this.$store.getters['ramp/getOngoingOrders']
    },
    completedOrders () {
      return this.$store.getters['ramp/getCompletedOrders']
    },
    hasMoreData () {
      const vm = this
      vm.updatePaginationValues()
      return (vm.pageNumber < vm.totalPages || (!vm.pageNumber && !vm.totalPages))
    },
    userInfo () {
      return this.$store.getters['ramp/getUser']
    }
  },
  async mounted () {
    const vm = this
    if (!vm.listings || vm.listings.length === 0) {
      vm.loading = true
    }
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)
    await vm.resetAndRefetchListings()
    vm.loading = false
  },
  methods: {
    async fetchOrders (overwrite = false) {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'ORDER_LIST', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const params = { state: vm.statusType }
      try {
        await vm.$store.dispatch('ramp/fetchOrders', { orderState: vm.statusType, params: params, headers: headers, overwrite: overwrite })
      } catch (error) {
        console.error(error)
      }
      vm.loading = false
    },
    async loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchOrders()
      }
      done()
    },
    async fetchUserOrders () {
      const vm = this

      // const walletInfo = this.$store.getters['global/getWallet']('bch')
      // const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_LIST', timestamp)

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      vm.loading = true

      vm.$axios.get(vm.apiURL + '/order', { headers: headers })
        .then(response => {
          vm.listings = response.data
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          vm.loading = false
        })
    },
    async refreshData (done) {
      console.log('refreshing orders')
      await this.resetAndRefetchListings()
      if (done) done()
    },
    async resetAndRefetchListings () {
      const vm = this
      await vm.$store.dispatch('ramp/resetOrdersPagination')
      await vm.fetchOrders(true)
      vm.updatePaginationValues()
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getOrdersTotalPages'](vm.statusType)
      vm.pageNumber = vm.$store.getters['ramp/getOrdersPageNumber'](vm.statusType)
    },
    resetAndScrollToTop () {
      if (this.$refs.infiniteScroll) {
        this.$refs.infiniteScroll.reset()
      }
      this.scrollToTop()
    },
    scrollToTop () {
      if (this.$refs.scrollTargetRef) {
        const scrollElement = this.$refs.scrollTargetRef.$el
        scrollElement.scrollTop = 0
      }
    },
    onUpdated () {
      const vm = this
      vm.state = 'order-list'
      vm.loading = true
      vm.resetAndRefetchListings()
      vm.loading = false
    },
    onCanceled () {
      const vm = this
      vm.state = 'order-list'
      vm.statusType = 'COMPLETED'
      vm.loading = true
      vm.resetAndRefetchListings()
      vm.loading = false
    },
    selectOrder (data) {
      console.log('selectedOrder:', data)
      this.selectedOrder = data
      this.state = 'view-order'
    },
    getElapsedTime (expirationDate) {
      const currentTime = new Date().getTime() // Replace with your start timestamp
      expirationDate = new Date(expirationDate)
      const distance = expirationDate - currentTime

      const days = Math.floor(distance / (24 * 3600 * 1000))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))

      return [days, hours, minutes]
    },
    amountColor (tradeType) {
      if (tradeType === 'BUY') {
        return 'color: blue;'
      } else {
        return 'color: red;'
      }
    },
    formatExpiration (expirationDate) {
      let [days, hours, minutes] = this.getElapsedTime(expirationDate)

      if (days < 0) days = days * -1
      if (hours < 0) hours = hours * -1
      if (minutes < 0) minutes = minutes * -1
      let formattedElapsedTime = ''

      if (days > 0) {
        formattedElapsedTime = `${days} days`
      } else {
        formattedElapsedTime = `${hours} hours ${minutes} minutes`
      }
      return formattedElapsedTime
    },
    isExpired (expirationDate, status) {
      const [days, hours, minutes] = this.getElapsedTime(expirationDate)
      if (days < 0 || hours < 0 || minutes < 0) return true
      return false
    },
    isCompleted (status) {
      if (status === 'Released' || status === 'Refunded' || status === 'Canceled') return true
      return false
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    orderFiatAmount (lockedPrice, cryptoAmount) {
      // console.log('lockedPrice:', lockedPrice, 'cryptoAMount:', cryptoAmount)
      return lockedPrice * cryptoAmount
    },
    returnOrderList () {
      const vm = this
      vm.state = 'order-list'
      // vm.refreshData()
      // vm.loading = true
      // await vm.resetAndRefetchListings()
      // vm.loading = false
    }
  }
}
</script>
<style lang="scss" scoped>
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
.btn-custom {
  height: 40px;
  width: 47%;
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
.btn-custom.active-transaction-btn {
  background-color: rgb(13,71,161) !important;
  color: #fff;
}
.btn-custom.active-sell-btn {
  background-color: #ed5f59 !important;
  color: #fff;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.subtext {
  font-size: 13px;
  opacity: .5;
}
.status-text {
  font-weight: 500;
  font-size: 13px;
  opacity: .5;
}
</style>
