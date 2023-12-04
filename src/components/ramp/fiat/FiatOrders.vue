<template>
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none q-mb-lg"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :style="`height: ${ minHeight }px;`"
      v-if="!viewProfile"
    >
      <div v-if="state === 'order-list'">
        <div>
          <q-pull-to-refresh @refresh="refreshData">
            <div class="row no-wrap items-center q-pa-sm q-pt-md">
              <div class="col-9 row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
                <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'ONGOING' }" @click="statusType='ONGOING'">Ongoing</button>
                <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'COMPLETED'}" @click="statusType='COMPLETED'">Completed</button>
              </div>
              <div class="col-auto q-mt-sm q-pr-md">
                <q-btn unelevated ripple dense size="md" icon="tune" @click="openFilter()">
                  <q-badge v-if="!defaultFiltersOn" floating color="red"/>
                </q-btn>
              </div>
            </div>
          </q-pull-to-refresh>
        </div>
        <div v-if="loading">
          <FooterLoading/>
        </div>
        <div class="q-mt-md">
          <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">No Orders to Display</p>
          </div>
          <div v-else class="q-mb-lg q-pb-lg">
            <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 130}px`" style="overflow:auto;">
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
                            <div
                              :class="{'pt-dark-label': darkMode}"
                              class="q-mb-none sm-font-size">
                              ORDER #{{ listing.id }}
                            </div>
                            <span
                              :class="{'pt-dark-label': darkMode}"
                              class="md-font-size"
                              @click.stop.prevent="viewUserProfile(listing)">
                              {{ listing.ad.owner.name }} <q-badge v-if="listing.ad.owner.id === userInfo.id" rounded size="sm" color="blue-6" label="You" />
                            </span>
                            <div :class="{'pt-dark-label': darkMode}" class="col-transaction text-uppercase lg-font-size" :style="amountColor(listing.trade_type)">
                              {{ formattedCurrency(orderFiatAmount(listing.locked_price, listing.crypto_amount), listing.fiat_currency.symbol) }}
                            </div>
                            <div class="sm-font-size">
                              {{ formattedCurrency(listing.crypto_amount, false) }} BCH</div>
                            <div class="sm-font-size">
                              <span class="q-pr-sm">Price</span>
                              <span>{{ formattedCurrency(listing.locked_price, listing.fiat_currency.symbol) }}/BCH</span>
                            </div>
                            <div v-if="listing.created_at" class="sm-font-size subtext">{{ formattedDate(listing.created_at) }}</div>
                          </div>
                          <div class="text-right">
                            <span class="row subtext" v-if="listing.status && isCompleted(listing.status.label) == false && listing.expiration_date != null">
                              <span v-if="isExpired(listing.expiration_date) == false" class="q-mr-xs">Expires in {{ formatExpiration(listing.expiration_date) }}</span>
                            </span>
                            <div
                              v-if="listing.expiration_date && isExpired(listing.expiration_date) && statusType === 'ONGOING'"
                              class="bold-text subtext md-font-size" style="color: red">
                              EXPIRED
                            </div>
                            <div class="bold-text subtext md-font-size" style=";">{{ listing.status ? listing.status.label : '' }}</div>
                          </div>
                        </div>
                      </div>
                    </q-item-section>
                  </q-item>
                </div>
              </q-infinite-scroll>
            </q-list>
          </div>
        </div>
      </div>
      <div v-if="state === 'view-order'">
        <FiatProcessOrder
          :key="fiatProcessOrderKey"
          :order-data="selectedOrder"
          @back="returnOrderList()"
          @refresh="refreshOrder"
        />
        <!-- check which step the order are in -->
      </div>
    </q-card>
    <FiatProfileCard
      v-if="viewProfile"
      :userInfo="selectedUser"
      :type="selectedUser.is_owner ? 'self' : 'peer'"
      v-on:back="viewProfile = false"
    />
    <div v-if="openDialog">
      <MiscDialogs
        :type="dialogType"
        :filters="filters"
        @back="openDialog = false"
        @submit="receiveDialog"
      />
    </div>
</template>
<script>
import FiatProcessOrder from './FiatProcessOrder.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import FooterLoading from './FooterLoading.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { formatCurrency, formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    const infiniteScroll = ref(null)
    return {
      scrollTargetRef,
      infiniteScroll
    }
  },
  components: {
    FiatProcessOrder,
    FiatProfileCard,
    MiscDialogs,
    FooterLoading
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
      authHeaders: this.$store.getters['ramp/authHeaders'],
      selectedOrder: null,
      selectedUser: null,
      statusType: this.initStatusType,
      state: 'order-list',
      transactionType: '',
      loading: false,
      totalPages: null,
      pageNumber: null,
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - this.$q.screen.height * 0.17 : this.$q.screen.height - this.$q.screen.height * 0.17,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      viewProfile: false,
      fiatProcessOrderKey: 0,
      defaultFiltersOn: true,
      defaultFilters: {
        sort_type: 'ascending',
        sort_by: 'created_at',
        status: [],
        payment_types: [],
        time_limits: [5, 15, 30, 60, 300, 720, 1440],
        owned: false
      },
      filters: {},
      openDialog: false,
      dialogType: ''
    }
  },
  watch: {
    statusType () {
      const vm = this
      vm.resetAndScrollToTop()
      // vm.updatePaginationValues()
      // vm.fetchOrders()
      vm.resetAndRefetchListings()
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
    this.updateFilters().then(() => { this.resetAndRefetchListings() })
  },
  methods: {
    async fetchOrders (overwrite = false) {
      const vm = this
      const params = { state: vm.statusType }
      vm.loading = true
      vm.$store.dispatch('ramp/fetchOrders',
        {
          orderState: vm.statusType,
          params: params,
          overwrite: overwrite
        })
        .then(() => {
          vm.updatePaginationValues()
          vm.loading = false
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    isdefaultFiltersOn (filters) {
      if (JSON.stringify(this.defaultFilters.payment_types.sort()) !== JSON.stringify(filters.payment_types.sort()) ||
          JSON.stringify(this.defaultFilters.time_limits.sort()) !== JSON.stringify(filters.time_limits.sort())) {
        return false
      }
      return true
    },
    openFilter () {
      this.openDialog = true
      this.dialogType = 'filterOrder'
    },
    receiveDialog (data) {
      const vm = this
      const mutationName = vm.statusType === 'ONGOING' ? 'ramp/updateOngoingOrderFilters' : 'ramp/updateCompletedOrderFilters'
      vm.openDialog = false
      vm.$store.commit(mutationName, data)
      vm.updateFilters().then(() => {
        // vm.filterOrders()
        console.log('proceed to filter orders')
      })
    },
    fetchPaymentTypes () {
      const vm = this
      return new Promise((resolve, reject) => {
        vm.$store.dispatch('ramp/fetchPaymentTypes')
          .then(() => {
            const paymentTypes = vm.$store.getters['ramp/paymentTypes']
            vm.defaultFilters.payment_types = paymentTypes.map(paymentType => paymentType.id)
            resolve(paymentTypes)
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    updateFilters () {
      const vm = this
      return new Promise((resolve, reject) => {
        vm.fetchPaymentTypes()
          .then(() => {
            const vm = this
            const getterName = vm.statusType === 'ONGOING' ? 'ramp/ongoingOrderFilters' : 'ramp/completedOrderFilters'
            const savedFilters = JSON.parse(JSON.stringify(vm.$store.getters[getterName]))
            console.log('savedFilters:', vm.$store.getters[getterName])
            let paymentTypes = savedFilters.payment_types
            if (paymentTypes && paymentTypes.length === 0) {
              paymentTypes = Array.from(vm.defaultFilters.payment_types)
            }
            const filters = {
              owned: false,
              status: savedFilters.status,
              payment_types: paymentTypes,
              time_limits: savedFilters.time_limits,
              sort_type: savedFilters.sort_type,
              sort_by: savedFilters.sort_by
            }
            vm.filters = filters
            vm.defaultFiltersOn = vm.isdefaultFiltersOn(filters)
            resolve(filters)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            }
            reject(error)
          })
      })
    },
    loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData || !vm.wallet) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        vm.fetchOrders().then(done()).catch(done())
      }
    },
    refreshData (done) {
      this.resetAndRefetchListings()
      if (done) done()
    },
    refreshOrder (done) {
      this.fiatProcessOrderKey++
      if (done) done()
    },
    resetAndRefetchListings () {
      const vm = this
      vm.$store.commit('ramp/resetOrdersPagination')
      vm.fetchOrders(true)
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
      // eslint-disable-next-line no-unused-vars
      let [_, hours, minutes] = this.getElapsedTime(expirationDate)

      if (hours < 0) hours = hours * -1
      if (minutes < 0) minutes = minutes * -1
      let formattedElapsedTime = ''

      if (hours > 0) {
        formattedElapsedTime += `${hours}h `
      }

      if (minutes > 0) {
        formattedElapsedTime += `${minutes}m `
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
      return lockedPrice * cryptoAmount
    },
    returnOrderList () {
      const vm = this
      vm.state = 'order-list'
      vm.resetAndRefetchListings()
    },
    viewUserProfile (data) {
      this.selectedUser = {
        id: data.ad.owner.id,
        name: data.ad.owner.name,
        is_owner: data.is_ad_owner
      }
      this.viewProfile = true
    }
  }
}
</script>
<style lang="scss" scoped>

.xs-font-size {
  font-size: x-small;
}

.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}

.bold-text {
  font-weight: bold;
}
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 5%;
  margin-right: 5%;
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
