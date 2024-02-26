<template>
  <div
    class="q-mx-md q-mx-none q-mb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`"
    v-if="state == 'order-list' && !viewProfile">
    <div v-if="state === 'order-list'">
      <div class="row justify-start items-center q-mx-none q-px-sm">
        <div
          class="col-9 row br-15 text-center pt-card btn-transaction md-font-size"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
          <button
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-transaction-btn': statusType == 'ONGOING'}"
            @click="statusType='ONGOING'">
            Ongoing
          </button>
          <button
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-transaction-btn': statusType == 'COMPLETED'}"
            @click="statusType='COMPLETED'">
            Completed
          </button>
        </div>
        <q-btn
          unelevated
          ripple
          dense
          size="1.2em"
          :icon="'filter_list'"
          class="button button-text-primary col-auto q-mt-sm q-pa-none"
          :class="getDarkModeClass(darkMode)"
          @click="openFilter()">
          <q-badge v-if="!defaultFiltersOn" left floating color="red"/>
        </q-btn>
      </div>
      <div class="q-mt-sm">
        <!-- <q-pull-to-refresh @refresh="refreshData"> -->
          <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">No Orders to Display</p>
          </div>
          <div v-else class="q-mb-none">
            <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 75}px`" style="overflow:auto;">
              <q-pull-to-refresh @refresh="refreshData" :scroll-target="scrollTargetRef">
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
                                class="q-mb-none pt-label sm-font-size"
                                :class="getDarkModeClass(darkMode)"
                              >
                                ORDER #{{ listing.id }}
                              </div>
                              <span
                                class=" pt-label md-font-size text-weight-bold"
                                :class="getDarkModeClass(darkMode)"
                                @click.stop.prevent="viewUserProfile(listing)">
                                {{ listing.owner.name }} <q-badge v-if="listing.owner.id === userInfo.id" rounded size="sm" color="blue-6" label="You" />
                              </span>
                              <div
                                class="col-transaction text-uppercase pt-label lg-font-size"
                                :class="[getDarkModeClass(darkMode), amountColor(listing.trade_type)]"
                              >
                              <!-- :style="amountColor(listing.trade_type)" -->
                                {{ formattedCurrency(orderFiatAmount(listing.locked_price, listing.crypto_amount), listing.ad?.fiat_currency?.symbol) }}
                              </div>
                              <div class="sm-font-size">
                                {{ formattedCurrency(listing.crypto_amount, false) }} BCH</div>
                              <div v-if="listing.created_at" class="sm-font-size subtext">{{ formattedDate(listing.created_at) }}</div>
                            </div>
                            <div class="text-right">
                              <!-- <span class="row subtext" v-if="!isCompleted(listing.status?.label) && listing.expires_at != null">
                                <span v-if="!isExpired(listing.expires_at)" class="q-mr-xs">Expires in {{ formatExpiration(listing.expires_at) }}</span>
                              </span> -->
                              <div
                                v-if="isAppealable(listing.appealable_at, listing.status?.value) && statusType === 'ONGOING'"
                                class="text-weight-bold subtext sm-font-size text-blue">
                                Appealable
                              </div>
                              <div class="text-weight-bold subtext sm-font-size text-red" v-if="listing.status?.value === 'APL'">
                                {{ listing.status?.label }}
                              </div>
                              <div class="text-weight-bold subtext sm-font-size" v-else>
                                {{ listing.status?.label }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </q-item-section>
                    </q-item>
                  </div>
                </q-infinite-scroll>
              </q-pull-to-refresh>
            </q-list>
          </div>
        <!-- </q-pull-to-refresh> -->
      </div>
    </div>
    <q-inner-loading :showing="loading">
      <ProgressLoader/>
    </q-inner-loading>
  </div>
  <FiatProcessOrder
    v-if="state === 'view-order'"
    :key="fiatProcessOrderKey"
    :order-data="selectedOrder"
    @back="returnOrderList()"
    @refresh="refreshOrder"
  />
  <FiatProfileCard
    v-if="viewProfile"
    :userInfo="selectedUser"
    v-on:back="viewProfile = false"
  />
  <div v-if="openDialog">
    <FilterDialog
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
import FilterDialog from './dialogs/FilterDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { formatCurrency, formatDate } from 'src/wallet/ramp'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
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
    ProgressLoader,
    FilterDialog
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
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      selectedOrder: null,
      selectedUser: null,
      statusType: 'ONGOING',
      state: 'order-list',
      transactionType: '',
      loading: false,
      totalPages: null,
      pageNumber: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      viewProfile: false,
      fiatProcessOrderKey: 0,
      defaultFiltersOn: true,
      defaultFilters: {
        sort_type: 'ascending',
        sort_by: 'created_at',
        status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
        appealable: true,
        not_appealable: true,
        payment_types: [],
        time_limits: [5, 15, 30, 60, 300, 720, 1440],
        ownership: {
          owned: true,
          notOwned: true
        },
        trade_type: {
          buy: true,
          sell: true
        }
      },
      defaultStatuses: {
        ongoing: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
        completed: ['CNCL', 'RLS', 'RFN']
      },
      defaultSortType: {
        ongoing: 'ascending',
        completed: 'descending'
      },
      defaultSortBy: {
        ongoing: 'created_at',
        completed: 'last_modified_at'
      },
      filters: {},
      openDialog: false,
      dialogType: ''
    }
  },
  watch: {
    statusType (value) {
      const vm = this
      vm.switchFilterDefaults(value)
      vm.updateFilters()
      vm.resetAndScrollToTop()
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
    this.updateFilters()
    this.resetAndRefetchListings()
  },
  methods: {
    getDarkModeClass,
    async fetchOrders (overwrite = false) {
      const vm = this
      const params = vm.filters
      vm.loading = true
      vm.$store.dispatch('ramp/fetchOrders',
        {
          statusType: vm.statusType,
          params: params,
          overwrite: overwrite
        })
        .then(() => {
          vm.updatePaginationValues()
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    receiveDialog (data) {
      const vm = this
      const mutationName = (
        vm.statusType === 'ONGOING'
          ? 'ramp/updateOngoingOrderFilters'
          : 'ramp/updateCompletedOrderFilters')
      vm.openDialog = false
      vm.$store.commit(mutationName, data)
      vm.updateFilters()
      vm.resetAndRefetchListings()
    },
    openFilter () {
      this.openDialog = true
      this.dialogType = this.statusType === 'ONGOING' ? 'filterOngoingOrder' : 'filterCompletedOrder'
    },
    switchFilterDefaults (statusType) {
      const vm = this
      if (statusType === 'ONGOING') {
        vm.defaultFilters.status = vm.defaultStatuses.ongoing
        vm.defaultFilters.sort_type = vm.defaultSortType.ongoing
        vm.defaultFilters.sort_by = vm.defaultSortBy.ongoing
      }
      if (statusType === 'COMPLETED') {
        vm.defaultFilters.status = vm.defaultStatuses.completed
        vm.defaultFilters.sort_type = vm.defaultSortType.completed
        vm.defaultFilters.sort_by = vm.defaultSortBy.completed
      }
    },
    isdefaultFiltersOn (filters) {
      filters = { ...filters }
      const defaultFilters = { ...this.defaultFilters }
      if (JSON.stringify([...defaultFilters?.payment_types].sort()) !== JSON.stringify(filters?.payment_types?.sort()) ||
          JSON.stringify([...defaultFilters?.time_limits].sort()) !== JSON.stringify(filters?.time_limits?.sort())) {
        return false
      }

      const defStatusLen = defaultFilters.status.length
      const statusLen = filters.status.length
      if (defStatusLen !== statusLen) {
        return false
      } else {
        const statusMatch = JSON.stringify([...defaultFilters?.status].sort()) === JSON.stringify(filters?.status?.sort())
        if (!statusMatch) return false
      }

      delete filters.payment_types
      delete filters.time_limits
      delete filters.status
      delete defaultFilters.payment_types
      delete defaultFilters.time_limits
      delete defaultFilters.status

      const match = JSON.stringify(defaultFilters) === JSON.stringify(filters)
      if (!match) return false
      return true
    },
    updateFilters () {
      const vm = this
      const defaultPaymentTypes = vm.$store.getters['ramp/paymentTypes']
      vm.defaultFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)

      const getterName = vm.statusType === 'ONGOING' ? 'ramp/ongoingOrderFilters' : 'ramp/completedOrderFilters'
      const filters = JSON.parse(JSON.stringify(vm.$store.getters[getterName]))
      if (filters.paymentTypes?.length === 0) {
        filters.paymentTypes = Array.from(vm.defaultFilters.payment_types)
      }
      vm.filters = filters
      vm.defaultFiltersOn = vm.isdefaultFiltersOn(filters)
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
    getElapsedTime (targetTime) {
      const currentTime = new Date().getTime() // Replace with your start timestamp
      targetTime = new Date(targetTime)
      const distance = targetTime - currentTime

      const days = Math.floor(distance / (24 * 3600 * 1000))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))

      return [days, hours, minutes]
    },
    amountColor (tradeType) {
      if (tradeType === 'BUY') {
        return 'text-blue'
      } else {
        return 'text-red'
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
    isAppealable (appealableAt, status) {
      if (!appealableAt) return false
      const [days, hours, minutes] = this.getElapsedTime(appealableAt)
      let appealable = false
      if (days < 0 || hours < 0 || minutes < 0) appealable = true
      if (['APL'].includes(status)) appealable = false
      return appealable
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
        id: data.owner.id,
        self: !data.is_ad_owner
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
.btn-custom.dark {
  background-color: #1c2833;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.subtext {
  font-size: 13px;
  opacity: .5;
}
</style>
