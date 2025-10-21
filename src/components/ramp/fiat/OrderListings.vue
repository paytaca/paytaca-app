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
                  if (ongoingSearch) {
                    receiveDialog(filters, 'search')
                    scrollToTop()
                  }
                  $refs.inputRef.focus()
                } else {
                  searchState('blur')
                }
                ongoingSearch = false
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
          :class="ongoingButtonClass"
          :style="statusType === 'ONGOING' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="statusType='ONGOING'">
          {{ $t('Ongoing') }}
        </button>
        <button
          class="col-grow br-15 btn-custom fiat-tab q-mt-none"
          :class="completedButtonClass"
          :style="statusType === 'COMPLETED' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="statusType='COMPLETED'">
          {{ $t('Completed') }}
        </button>
      </div>
    </q-pull-to-refresh>
    <div class="q-mt-sm">
      <div v-if="localListings.length == 0 && localCashinOrders.length == 0" class="relative text-center" style="margin-top: 50px;">
        <div v-if="displayEmptyList">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoOrderstoDisplay') }}</p>
        </div>
        <div v-else>
          <!-- Skeleton loader for empty list -->
          <div v-if="loading" class="q-px-md">
            <div v-for="n in 3" :key="n" class="skeleton-order-card q-mb-md" :class="getDarkModeClass(darkMode)">
              <div class="row q-pa-md">
                <div class="col">
                  <q-skeleton type="text" width="40%" height="16px" class="q-mb-sm" />
                  <q-skeleton type="text" width="30%" height="12px" class="q-mb-xs" />
                  <q-skeleton type="text" width="50%" height="18px" class="q-mb-xs" />
                  <q-skeleton type="text" width="35%" height="20px" class="q-mb-xs" />
                  <q-skeleton type="text" width="25%" height="14px" class="q-mb-xs" />
                  <q-skeleton type="text" width="30%" height="12px" />
                </div>
                <div class="col-auto text-right">
                  <q-skeleton type="text" width="60px" height="14px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="q-mb-none">
        <q-pull-to-refresh @refresh="refreshData">
          <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
            <q-card bordered flat v-if="showCashInList" class="q-mx-xs q-my-xs text-bow" :class="getDarkModeClass(darkMode)">
              <div v-for="(listing, index) in localCashinOrders" :key="index">
                <q-item clickable @click="selectOrder(listing)">
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="index < localCashinOrders.length-1 ? darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7' : ''">
                      <div class="row q-mx-md">
                        <div class="col ib-text">
                          <div
                            class="q-mb-none pt-label sm-font-size"
                            :class="getDarkModeClass(darkMode)">
                            {{
                              $t(
                                'OrderIdNo',
                                { ID: listing?.id },
                                `ORDER #${ listing?.id }`
                              )
                            }}
                            <q-badge v-if="listing.is_cash_in" class="q-mr-xs text-weight-bold" outline rounded size="sm" color="warning" label="Cash In" />
                            <q-badge v-if="!listing.read_at" outline rounded size="sm" color="red" label="New"/>
                          </div>
                          <div class="pt-label text-weight-bold" style="font-size: x-small; opacity: .7;">{{ tradeTypeLabel(listing) }}</div>
                          <span
                            class=" pt-label md-font-size text-weight-bold"
                            :class="getDarkModeClass(darkMode)">
                            {{ userNameView(counterparty(listing)) }}
                          </span>
                          <div
                            class="col-transaction text-uppercase pt-label lg-font-size"
                            :class="[getDarkModeClass(darkMode), amountColor(listing)]">
                            {{ listing.ad?.fiat_currency?.symbol }} {{ formatCurrency(orderFiatAmount(listing.price, satoshiToBch(listing.trade_amount)), listing.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                          </div>
                          <div class="sm-font-size">
                            {{ formatCurrency(satoshiToBch(listing.trade_amount)) }} BCH</div>
                          <div v-if="listing.created_at" class="sm-font-size subtext">{{ formatDate(listing.created_at, true) }}</div>
                        </div>
                        <div class="text-right">
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
                          <!-- <q-icon color="blue-5" class="q-mt-xs" v-if="statusType === 'ONGOING' && listing.has_unread_status" size="sm" name="notifications_active"/> -->
                        </div>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </div>
            </q-card>
            <div v-for="(listing, index) in localListings" :key="index">
              <q-item clickable @click="selectOrder(listing)">
                <q-item-section>
                  <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="row q-mx-md">
                      <div class="col">
                        <div
                          class="q-mb-none pt-label sm-font-size"
                          :class="getDarkModeClass(darkMode)">
                          {{
                            $t(
                              'OrderIdNo',
                              { ID: listing?.id },
                              `ORDER #${ listing?.id }`
                            )
                          }}
                          <q-badge v-if="listing.is_cash_in" class="q-mr-xs" outline rounded size="sm" color="warning" label="Cash In" />
                          <q-badge v-if="!listing.read_at" outline rounded size="sm" color="red" label="New"/>
                        </div>
                        <div class="pt-label text-weight-bold" style="font-size: x-small; opacity: .7;">{{ tradeTypeLabel(listing) }}</div>
                        <span
                          class="pt-label md-font-size text-weight-bold"
                          :class="getDarkModeClass(darkMode)">
                          {{ userNameView(counterparty(listing)) }}
                        </span>
                        <div
                          class="col-transaction text-uppercase pt-label lg-font-size"
                          :class="[getDarkModeClass(darkMode), amountColor(listing)]">
                          {{ listing.ad?.fiat_currency?.symbol }} {{ formatCurrency(orderFiatAmount(listing.price, satoshiToBch(listing.trade_amount)), listing.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '') }}
                        </div>
                        <div class="sm-font-size">
                          {{ formatCurrency(satoshiToBch(listing.trade_amount)) }} BCH</div>
                        <div v-if="listing.created_at" class="sm-font-size subtext">{{ formatDate(listing.created_at, true) }}</div>
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
                          {{ listing.status?.value === 'CNF' ? 'Escrow Pending' : listing.status?.label }}
                        </div>
                        <!-- <q-icon color="blue-5" class="q-mt-xs" v-if="statusType === 'ONGOING' && listing.has_unread_status" size="sm" name="notifications_active"/> -->
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
        </q-pull-to-refresh>
      </div>
    </div>
  </div>
</template>
<script>
import FilterComponent from 'src/components/ramp/fiat/FilterComponent.vue'
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import { formatCurrency, formatDate, satoshiToBch } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { wallet } from 'src/exchange/wallet'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  components: {
    FilterComponent
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: { symbol: this.$t('All') },
      statusType: this.$store.getters['ramp/orderListingTab'],
      state: 'order-list',
      loading: false,
      totalPages: null,
      pageNumber: null,
      query_name: null,
      filters: {},
      pageName: 'main',
      showSearch: false,
      filterComponentKey: 0,
      isAllCurrencies: true,
      fiatCurrencies: [],
      notifType: null,
      loadingMoreData: false,
      displayEmptyList: false,
      ongoingSearch: false,
      localListings: [],
      localCashinOrders: []
    }
  },
  watch: {
    statusType (value) {
      const vm = this
      vm.displayEmptyList = false
      vm.filterComponentKey++
      vm.updateFilters()
      vm.scrollToTop()
      vm.resetAndRefetchListings()
      vm.$store.commit('ramp/updateOrderListingTab', value)
    },
    selectedCurrency () {
      this.filterComponentKey++
      this.updateFilters()
      this.scrollToTop()
      this.resetAndRefetchListings()
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    },
    ongoingButtonClass () {
      return {
        'dark': this.darkMode,
        'active-theme-btn': this.statusType === 'ONGOING',
        [`theme-${this.theme}`]: true
      }
    },
    completedButtonClass () {
      return {
        'dark': this.darkMode,
        'active-theme-btn': this.statusType === 'COMPLETED',
        [`theme-${this.theme}`]: true
      }
    },
    minHeight () {
      return this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
    },
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
    cashinOrders () {
      return this.$store.getters['ramp/getCashinOrders']
    },
    hasMoreData () {
      const vm = this
      vm.updatePaginationValues()
      return (vm.pageNumber < vm.totalPages || (!vm.pageNumber && !vm.totalPages))
    },
    userInfo () {
      return this.$store.getters['ramp/getUser']
    },
    showCashInList () {
      return this.statusType === 'ONGOING' && this.localCashinOrders?.length > 0 && !this.ongoingSearch
    }
  },
  async mounted () {
    this.updateFilters()
    this.fetchFiatCurrencies()
    this.resetAndRefetchListings()
  },
  beforeRouteLeave (to, from, next) {
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
    satoshiToBch,
    getDarkModeClass,
    formatDate,
    formatCurrency,
    getThemeColor () {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
    tradeTypeLabel (order) {
      switch (order.trade_type) {
        case 'BUY':
          if (order.owner.name === this.userInfo.name) {
            return 'BUYING FROM'
          } else {
            return 'SELLING TO'
          }
        case 'SELL':
          if (order.owner.name === this.userInfo.name) {
            return 'SELLING TO'
          } else {
            return 'BUYING FROM'
          }
      }
    },
    counterparty (order) {
      if (order?.owner?.name === this.userInfo?.name) {
        return order?.ad?.owner?.name
      }
      return order?.owner?.name
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
    userNameView (name) {
      if (!name) return
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name
      return limitedView
    },
    showCurrencySelect () {
      if (this.fiatCurrencies.length !== 0) {
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
      }
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
    async searchUser () {
      if (this.query_name) {
        this.ongoingSearch = true
        await this.resetAndRefetchListings()
        this.scrollToTop()
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
    async fetchFiatCurrencies () {
      const vm = this
      await backend.get('/ramp-p2p/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          vm.fiatCurrencies.unshift(vm.$t('All'))
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchCashinOrders (overwrite = false) {
      const vm = this
      const params = {
        wallet_hash: wallet.walletHash,
        owned: false
      }
      await vm.$store.dispatch('ramp/fetchCashinOrders', { params: params, overwrite: overwrite })
        .then(response => {
          // vm.updatePaginationValues()
          return Promise.resolve(response)
        })
        .catch(error => {
          this.handleRequestError(error)
          return Promise.reject(error)
        })
    },
    async fetchOrders (overwrite = false) {
      const vm = this
      const params = vm.filters
      params.query_name = vm.query_name
      params.currency = vm.selectedCurrency?.symbol !== vm.$t('All') ? vm.selectedCurrency?.symbol : null
      const response = await vm.$store.dispatch('ramp/fetchOrders',
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
          this.handleRequestError(error)
          return Promise.reject(error)
        })
      bus.emit('update-unread-count', response.unread_count)
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
    async resetAndRefetchListings () {
      this.$store.commit('ramp/resetOrdersPagination')
      this.$store.commit('ramp/resetCashinOrdersPagination')
      
      // Reset displayEmptyList to show skeleton
      this.displayEmptyList = false
      
      // Clear local listings immediately to show skeleton
      this.localListings = []
      this.localCashinOrders = []
      
      this.loading = true
      
      // Ensure minimum loading time for skeleton visibility
      const startTime = Date.now()
      const minLoadingTime = 500 // 500ms minimum
      
      await this.fetchCashinOrders(true)
      await this.fetchOrders(true)
      
      // Update local listings from store
      this.localListings = [...this.listings]
      this.localCashinOrders = [...this.cashinOrders]
      
      // Calculate remaining time to reach minimum loading time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
      
      // Wait for remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }

      setTimeout(() => {
        this.displayEmptyList = true
      }, 150)

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
    amountColor (order) {
      switch (order.trade_type) {
        case 'BUY':
          if (order.owner.name === this.userInfo.name) {
            return 'text-blue'
          } else {
            return 'text-red'
          }
        case 'SELL':
          if (order.owner.name === this.userInfo.name) {
            return 'text-red'
          } else {
            return 'text-blue'
          }
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
      if (['APL', 'RLS_PN'].includes(status)) appealable = false
      return appealable
    },
    isCompleted (status) {
      if (status === 'Released' || status === 'Refunded' || status === 'Canceled') return true
      return false
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
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
  .btn-custom:not(.active-theme-btn):hover {
    background-color: rgb(242, 243, 252);
    color: #4C4F4F;
  }
  .btn-custom.dark:not(.active-theme-btn):hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .btn-custom.dark {
    color: rgba(255, 255, 255, 0.7);
  }

  /* Theme-based active button styles */
  button.btn-custom.fiat-tab.active-theme-btn {
    color: #fff !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-blue {
    background-color: #42a5f5 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-gold {
    background-color: #ffa726 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-green {
    background-color: #4caf50 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-red {
    background-color: #f54270 !important;
  }
  
  /* Dark mode active button */
  button.btn-custom.fiat-tab.active-theme-btn.dark {
    color: #fff !important;
  }
  
  /* Active button hover effects - slightly darken */
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-blue:hover {
    background-color: #1e88e5 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-gold:hover {
    background-color: #fb8c00 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-green:hover {
    background-color: #43a047 !important;
  }
  button.btn-custom.fiat-tab.active-theme-btn.theme-glassmorphic-red:hover {
    background-color: #e91e63 !important;
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
  
  /* Skeleton loader styles */
  .skeleton-order-card {
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }
</style>
