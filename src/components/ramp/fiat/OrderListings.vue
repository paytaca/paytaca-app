<template>
  <div
    v-if="state === 'order-list'"
    class="q-mx-md q-mb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <q-pull-to-refresh @refresh="refreshData">
      <div v-if="!showSearch" class="row items-center q-px-sm">
        <!-- currency dialog -->
        <div class="col-auto">
          <div v-if="selectedCurrency" class="q-ml-md text-h5" style="font-size: medium;" @click="showCurrencySelect">
            <span v-if="isAllCurrencies">All</span><span v-else>{{ selectedCurrency.symbol }}</span> <q-icon size="sm" name='mdi-menu-down'/>
          </div>
        </div>
        <q-space />
        <div class="col-auto q-pr-md">
          <q-btn
            unelevated
            ripple
            dense
            size="md"
            :icon="'search'"
            class="button button-text-primary col-auto q-mt-sm q-pa-none"
            :class="getDarkModeClass(darkMode)"
            @click="searchState('focus')">
          </q-btn>
          <FilterComponent :key="filterComponentKey" type="order" :currency="selectedCurrency?.symbol" :transactionType="statusType" @filter="onFilterListings"/>
        </div>
      </div>
      <div v-else class="q-px-lg q-mx-xs">
        <q-input ref="inputRef" v-model="query_name" :placeholder="$t('SearchUser')" dense @blur="searchState('blur')">
          <template v-slot:append>
            <q-icon name="close"
              @click="() => {
                if (query_name) {
                  query_name = null
                  receiveDialog(filters, 'search')
                  $refs.inputRef.focus()
                } else {
                  searchState('blur')
                }
              }"
              class="cursor-pointer" />
            <q-icon name="search" @click="searchUser()" />
          </template>
        </q-input>
      </div>
      <div
        class="col-8 row br-15 text-center pt-card btn-transaction md-font-size"
        :class="getDarkModeClass(darkMode)"
        :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
        <button
          class="col-grow br-15 btn-custom fiat-tab q-mt-none"
          :class="{'dark': darkMode, 'active-transaction-btn': statusType == 'ONGOING'}"
          @click="statusType='ONGOING'">
          {{ $t('Ongoing') }}
        </button>
        <button
          class="col-grow br-15 btn-custom fiat-tab q-mt-none"
          :class="{'dark': darkMode, 'active-transaction-btn': statusType == 'COMPLETED'}"
          @click="statusType='COMPLETED'">
          {{ $t('Completed') }}
        </button>
      </div>
    </q-pull-to-refresh>
    <div class="q-mt-sm">
      <!-- <q-pull-to-refresh @refresh="refreshData"> -->
        <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoOrderstoDisplay') }}</p>
        </div>
        <div v-else class="q-mb-none">
          <div class="row justify-center" v-if="loading">
            <q-spinner-dots color="primary" size="40px" />
          </div>
          <q-list ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
            <div v-for="(listing, index) in listings" :key="index">
              <q-item clickable @click="selectOrder(listing)">
                <q-item-section>
                  <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="row q-mx-md">
                      <div class="col ib-text">
                        <div
                          class="q-mb-none pt-label sm-font-size"
                          :class="getDarkModeClass(darkMode)">
                          {{
                            $t(
                              'OrderIdNo',
                              { ID: listing.id },
                              `ORDER #${ listing.id }`
                            )
                          }}
                          <q-badge v-if="!listing.read_at" rounded outline size="sm" color="red" label="New" />
                        </div>
                        <span
                          class=" pt-label md-font-size text-weight-bold"
                          :class="getDarkModeClass(darkMode)">
                          {{ userNameView(listing.owner?.name) }}<q-badge class="q-ml-xs" v-if="listing.owner.id === userInfo.id" rounded size="sm" color="grey" label="You" />
                        </span>
                        <div
                          class="col-transaction text-uppercase pt-label lg-font-size"
                          :class="[getDarkModeClass(darkMode), amountColor(listing.trade_type)]">
                          {{ listing.ad?.fiat_currency?.symbol }} {{ formattedCurrency(orderFiatAmount(listing.locked_price, listing.crypto_amount), listing.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
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
                          {{ $t('Appealable') }}
                        </div>
                        <div v-if="['RLS', 'RFN'].includes(listing.status?.value)">
                          <q-rating
                            readonly
                            :model-value = "listing?.feedback?.rating || 0"
                            size="1em"
                            color="yellow-9"
                            icon="star"
                          />
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
            <div class="row justify-center">
              <q-spinner-dots v-if="loadingMoreData" color="primary" size="40px" />
              <q-btn v-else-if="!loading && hasMoreData" flat dense @click="loadMoreData">view more</q-btn>
            </div>
          </q-list>
        </div>
    </div>
  </div>
  <FiatProcessOrder
    v-if="state === 'view-order'"
    :key="fiatProcessOrderKey"
    :order-data="selectedOrder"
    :notif-type="notifType"
    @back="returnOrderList()"
    @refresh="refreshOrder"
  />
  <FiatProfileCard
    ref="fiatProfileCard"
    v-if="state === 'view-profile'"
    :userInfo="selectedUser"
    v-on:back="state = 'order-list'"
    @update-page-name="updatePageName"
  />
  <FilterDialog
    v-if="openDialog"
    :type="dialogType"
    :filters="filters"
    @back="openDialog = false"
    @submit="receiveDialog"
  />
  <FiatOrderForm v-if="state === 'order-form'" :ad-id="selectedUserAdId" @back="state = 'order-list'"/>
</template>
<script>
import FilterComponent from 'src/components/ramp/fiat/FilterComponent.vue'
import FiatProcessOrder from 'src/components/ramp/fiat/FiatProcessOrder.vue'
import FiatProfileCard from 'src/components/ramp/fiat/FiatProfileCard.vue'
import FilterDialog from 'src/components/ramp/fiat/dialogs/FilterDialog.vue'
import FiatOrderForm from 'src/components/ramp/fiat/FiatOrderForm.vue'
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { formatCurrency, formatDate } from 'src/wallet/ramp'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  components: {
    FiatProcessOrder,
    FiatProfileCard,
    FilterDialog,
    FiatOrderForm,
    FilterComponent
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
      selectedCurrency: { symbol: this.$t('All') },
      selectedOrder: null,
      selectedUser: null,
      statusType: 'ONGOING',
      state: 'order-list',
      transactionType: '',
      loading: false,
      totalPages: null,
      pageNumber: null,
      query_name: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      fiatProcessOrderKey: 0,
      filters: {},
      openDialog: false,
      dialogType: '',
      selectedUserAdId: null,
      pageName: 'main',
      showSearch: false,
      filterComponentKey: 0,
      isAllCurrencies: true,
      fiatCurrencies: [],
      notifType: null,
      loadingMoreData: false
    }
  },
  watch: {
    statusType () {
      const vm = this
      vm.filterComponentKey++
      vm.updateFilters()
      vm.scrollToTop()
      vm.resetAndRefetchListings()
    },
    selectedCurrency () {
      this.filterComponentKey++
      this.updateFilters()
      this.scrollToTop()
      this.resetAndRefetchListings()
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
  created () {
    bus.on('view-ad', this.onViewAd)
  },
  async mounted () {
    console.log('order-params: ', this.$route.query)
    if (Object.keys(this.$route.query).length > 0) {
      this.notifType = this.$route.query.type
      this.selectedOrder = { id: this.$route.query.order_id }
      this.state = 'view-order'
    } else {
      this.updateFilters()
      this.fetchFiatCurrencies()
      this.resetAndRefetchListings()
    }
  },
  beforeRouteLeave (to, from, next) {
    console.log('from.name:', from.name)
    console.log('to.name:', to.name)
    switch (from.name) {
      case 'p2p-store':
      case 'p2p-ads':
      case 'p2p-orders':
      case 'p2p-profile':
        switch (to.name) {
          case 'p2p-order':
          case 'exchange':
            next('/apps')
            break
          default:
            next()
        }
        break
      default:
        next()
    }
  },
  methods: {
    getDarkModeClass,
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
    },
    showCurrencySelect () {
      this.$q.dialog({
        component: CurrencyFilterDialog,
        componentProps: {
          fiatList: this.fiatCurrencies
        }
      })
        .onOk(currency => {
          const index = this.fiatCurrencies.indexOf(currency)
          this.selectCurrency(index)
        })
    },
    searchState (state) {
      const vm = this
      if (state === 'focus') {
        vm.showSearch = true

        const x = setTimeout(() => {
          vm.$refs.inputRef.focus()
        }, 200)
      } else {
        vm.showSearch = false
      }
    },
    searchUser () {
      if (this.query_name) {
        this.resetAndRefetchListings()
      }
    },
    updatePageName (name) {
      this.pageName = name
    },
    customBack () {
      const vm = this
      switch (vm.pageName) {
        case 'order-process':
          bus.emit('show-menu', 'orders')
          vm.returnOrderList()
          vm.pageName = 'main'
          break
        case 'order-form':
          vm.pageName = 'order-process'
          vm.state = 'view-order'
          break
        case 'view-profile':
          vm.returnOrderList()
          vm.pageName = 'main'
          break
        case 'edit-pm':
          vm.$refs.fiatProfileCard.onBackPM()
          vm.pageName = 'view-profile'
          break
      }
    },
    onFilterListings (filters) {
      this.filters = filters
      this.resetAndRefetchListings()
    },
    selectCurrency (index) {
      if (index === 0) {
        this.isAllCurrencies = true
        this.selectedCurrency = { symbol: this.$t('All') }
      } else {
        this.selectedCurrency = this.fiatCurrencies[index]
        this.isAllCurrencies = false
      }
    },
    fetchFiatCurrencies () {
      const vm = this
      backend.get('/ramp-p2p/currency/fiat', { authorize: true })
        .then(response => {
          vm.fiatCurrencies = response.data
          vm.fiatCurrencies.unshift(vm.$t('All'))
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    async fetchOrders (overwrite = false) {
      const vm = this
      const params = vm.filters
      params.query_name = vm.query_name
      params.currency = vm.selectedCurrency?.symbol !== vm.$t('All') ? vm.selectedCurrency?.symbol : null
      await vm.$store.dispatch('ramp/fetchOrders',
        {
          statusType: vm.statusType,
          params: params,
          overwrite: overwrite
        })
        .then(response => {
          vm.updatePaginationValues()
          return Promise.resolve(response)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
          return Promise.reject(error)
        })
    },
    receiveDialog (data, type = 'filter') {
      const vm = this

      if (type === 'search') {
        const mutationName = (
          vm.statusType === 'ONGOING'
            ? 'ramp/updateOngoingOrderFilters'
            : 'ramp/updateCompletedOrderFilters')
        vm.$store.commit(mutationName, { filter: data, currency: this.selectedCurrency || 'All' })
      }

      vm.openDialog = false
      vm.updateFilters()
      vm.resetAndRefetchListings()
    },
    async updateFilters () {
      const vm = this
      const getterName = vm.statusType === 'ONGOING' ? 'ramp/ongoingOrderFilters' : 'ramp/completedOrderFilters'
      const currency = this.selectedCurrency?.symbol
      vm.$store.commit('ramp/setOrdersCurrency', currency || vm.$t('All'))
      const filters = vm.$store.getters[getterName](currency || vm.$t('All'))
      if (filters) vm.filters = JSON.parse(JSON.stringify(filters))
    },
    async loadMoreData () {
      const vm = this
      if (!vm.hasMoreData) {
        return
      }
      vm.loadingMoreData = true
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchOrders()
      }
      vm.loadingMoreData = false
    },
    async refreshData (done) {
      if (done) done()
      await this.resetAndRefetchListings()
    },
    refreshOrder (done) {
      this.fiatProcessOrderKey++
      if (done) done()
    },
    async resetAndRefetchListings () {
      this.$store.commit('ramp/resetOrdersPagination')
      this.loading = true
      await this.fetchOrders(true)
      this.loading = false
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getOrdersTotalPages'](vm.statusType)
      vm.pageNumber = vm.$store.getters['ramp/getOrdersPageNumber'](vm.statusType)
    },
    scrollToTop () {
      if (this.$refs.scrollTarget) {
        const scrollElement = this.$refs.scrollTarget.$el
        scrollElement.scrollTop = 0
      }
    },
    selectOrder (data) {
      this.selectedOrder = data
      // this.state = 'view-order'
      // this.pageName = 'order-process'
      console.log('selectOrder:', data)
      this.$router.push({ name: 'p2p-order', params: { order: data?.id } })
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
    async returnOrderList () {
      const vm = this
      bus.emit('show-menu', 'orders')
      vm.state = 'order-list'
      await vm.resetAndRefetchListings()
    },
    onViewAd (adId) {
      bus.emit('hide-menu')
      this.state = 'order-form'
      this.selectedUserAdId = adId
      this.pageName = 'order-form'
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
  .back-btn {
    background-color: transparent;
    height: 50px;
    width: 70px;
    z-index: 1;
    left: 10px;
  }
  </style>
