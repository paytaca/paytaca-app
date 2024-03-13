<template>
  <!-- back button -->
  <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="pageName != 'main'" @click="customBack"></div>
  <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
  <div
    :class="getDarkModeClass(darkMode)"
    class="q-mx-md q-mb-lg text-bow"
    :style="`height: ${minHeight}px;`"
    v-if="state === 'SELECT' && !viewProfile">
    <div class="q-mb-sm q-pb-sm">
      <!-- <q-pull-to-refresh @refresh="refreshData"> -->
      <div class="row items-center q-px-sm" v-if="!showSearch">
        <!-- currency dropdown -->
        <div class="col-auto">
          <div v-if="selectedCurrency" class="q-ml-md text-h5" style="font-size: medium;">
            {{ selectedCurrency.symbol }} <q-icon size="sm" name='mdi-menu-down'/>
          </div>
          <q-menu anchor="bottom left" self="top left" >
            <q-list class="pt-card-2 text-bow md-font-size" :class="getDarkModeClass(darkMode)" style="min-width: 150px">
              <q-item
                v-for="(currency, index) in fiatCurrencies"
                :key="index"
                clickable
                v-close-popup
                @click="selectCurrency(index)">
                <q-item-section>
                  {{ currency.name }} ({{ currency.symbol }})
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <q-space />
        <!-- filters -->
        <div class="col-auto q-pr-md">
          <q-btn
            unelevated
            ripple
            dense
            size="md"
            icon="search"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="searchState('focus')"
            >
            <!-- <q-badge v-if="!defaultFiltersOn" floating color="red"/> -->
          </q-btn>
          <q-btn
            unelevated
            ripple
            dense
            size="md"
            icon="filter_list"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="openFilter()">
            <q-badge v-if="!defaultFiltersOn" floating color="red"/>
          </q-btn>
        </div>
      </div>
      <div v-else class="q-px-lg q-mx-xs">
        <q-input ref="inputRef" v-model="query_name" placeholder="Search User..." dense @blur="searchState('blur')">
          <template v-slot:append>
            <q-icon name="close"
              @click="() => {
                query_name = null
                $refs.inputRef.focus()
              }"
              class="cursor-pointer" />
            <q-icon name="search" @click="searchUser()"/>
          </template>
        </q-input>
      </div>
      <!-- transaction type tabs -->
      <div
        class="row br-15 text-center pt-card btn-transaction"
        :class="getDarkModeClass(darkMode)"
        :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
        <button
          class="col br-15 btn-custom fiat-tab q-mt-none"
          :class="[{'dark': darkMode}, {'active-buy-btn': transactionType == 'SELL'}]"
          @click="transactionType='SELL'">
          Buy BCH
        </button>
        <button
          class="col br-15 btn-custom fiat-tab q-mt-none"
          :class="[{'dark': darkMode}, {'active-sell-btn': transactionType == 'BUY'}]"
          @click="transactionType='BUY'">
          Sell BCH
        </button>
      </div>
      <!-- </q-pull-to-refresh> -->
      <div class="q-mt-sm">
        <div v-if="!listings || listings.length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
        </div>
        <div v-else>
          <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
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
                <q-item v-for="(listing, index) in listings" :key="index" clickable @click="selectListing(listing)">
                  <q-item-section>
                    <div class="q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <div>
                            <span
                              :class="{'pt-label dark': darkMode}"
                              class="md-font-size"
                              @click.stop.prevent="viewUserProfile(listing.owner.id, listing.is_owned)">
                              {{ listing.owner.name }}
                            </span>
                            <q-badge class="q-mx-xs" v-if="listing.is_owned" rounded size="xs" color="blue-6" label="You" />
                          </div>
                          <div class="row">
                            <q-rating
                              readonly
                              :model-value="listing.owner.rating ? listing.owner.rating : 0"
                              :v-model="listing.owner.rating"
                              size="1.1em"
                              color="yellow-9"
                              icon="star"
                              icon-half="star_half"
                              />
                            <span class="q-mx-xs sm-font-size">({{ listing.owner.rating ? parseFloat(listing.owner.rating).toFixed(1) : 0 }})</span>
                          </div>
                          <div class="sm-font-size">
                            <span class="q-mr-sm">{{ listing.trade_count }} total trades </span>
                            <span class="q-ml-sm">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                          </div>
                          <span
                            class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                            :class="getDarkModeClass(darkMode)">
                            {{ formattedCurrency(listing.price, selectedCurrency.symbol) }}
                          </span>
                          <span class="sm-font-size">/BCH</span><br>
                          <div class="sm-font-size">
                            <div class="row">
                              <span class="col-3">Quantity</span>
                              <span class="col">{{ formattedCurrency(listing.trade_amount) }} BCH</span>
                            </div>
                            <div class="row">
                              <span class="col-3">Limit</span>
                              <span class="col"> {{ parseFloat(listing.trade_floor) }} {{ listing.crypto_currency.symbol }}  - {{ parseFloat(listing.trade_amount) }} {{ listing.crypto_currency.symbol }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-xs">
                        <q-badge v-for="method in listing.payment_methods" :key="method.id"
                        rounded outline :color="transactionType === 'SELL'? darkMode ? 'blue-13' : 'blue' : darkMode ? 'red-13' : 'red'">
                        {{ method.payment_type }}
                        </q-badge>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </q-infinite-scroll>
            </q-pull-to-refresh>
          </q-list>
        </div>
      </div>
    </div>
    <q-inner-loading :showing="loading">
      <ProgressLoader/>
    </q-inner-loading>
  </div>
  <!-- Buy/Sell Form Here -->
  <div v-if="state !== 'SELECT' && !viewProfile">
    <FiatOrderForm
      ref="orderForm"
      :ad-id="selectedListing.id"
      v-on:back="state = 'SELECT'"
      @order-canceled="onOrderCanceled"
      @update-page-name="updatePageName"
    />
  </div>
  <div v-if="openDialog">
    <FilterDialog
      :type="dialogType"
      :filters="filters"
      @back="openDialog = false"
      @submit="receiveDialog"
    />
  </div>
  <FiatProfileCard
    ref="fiatProfileCard"
    v-if="viewProfile"
    :userInfo="selectedUser"
    v-on:back="viewProfile = false"
    @update-page-name="updatePageName"
    @select-listing="selectListing"
  />
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import FiatOrderForm from './FiatOrderForm.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import FilterDialog from './dialogs/FilterDialog.vue'
import { formatCurrency } from 'src/wallet/ramp'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  emits: ['orderCanceled'],
  components: {
    FiatOrderForm,
    FiatProfileCard,
    FilterDialog,
    ProgressLoader,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      viewProfile: false,
      transactionType: 'SELL',
      loading: false,
      peerProfile: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      state: 'SELECT',
      selectedListing: {},
      selectedUser: null,
      fiatCurrencies: [],
      query_name: null,
      totalPages: null,
      pageNumber: null,
      openDialog: false,
      dialogType: '',
      defaultFilters: {
        sort_type: 'ascending',
        price_type: {
          fixed: true,
          floating: true
        },
        payment_types: [], //
        time_limits: [5, 15, 30, 60, 300, 720, 1440]
      },
      filters: {},
      showSearch: false,
      defaultFiltersOn: true,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      pageName: 'main'
    }
  },
  watch: {
    transactionType (value) {
      const vm = this
      vm.switchFilterDefaults(value)
      vm.updateFilters()
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      vm.resetAndRefetchListings()
    },
    async selectedCurrency () {
      this.resetAndRefetchListings()
    }
  },
  computed: {
    onScrollTop () {
      if (!this.$refs.scrollTargetRef) return true
      const scrollElement = this.$refs.scrollTargetRef.$el
      return scrollElement.scrollTop === 0
    },
    listings () {
      const vm = this
      switch (vm.transactionType) {
        case 'BUY':
          return vm.buyListings
        case 'SELL':
          return vm.sellListings
      }
      return []
    },
    buyListings () {
      const ads = this.$store.getters['ramp/getStoreBuyListings']
      return ads
    },
    sellListings () {
      const ads = this.$store.getters['ramp/getStoreSellListings']
      return ads
    },
    hasMoreData () {
      this.updatePaginationValues()
      return (this.pageNumber < this.totalPages)
    },
    isOwner () {
      return this.selectedUser.name === this.$store.getters['ramp/getUser'].name
    }
  },
  async mounted () {
    const vm = this
    vm.fetchPaymentTypes()
      .then(() => {
        vm.fetchFiatCurrencies()
        vm.updateFilters()
        vm.resetAndRefetchListings()
      })
  },
  methods: {
    getDarkModeClass,
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
        case 'order-form':
          bus.emit('show-menu', 'store')
          vm.state = 'SELECT'
          vm.pageName = 'main'
          break
        case 'view-profile':
          vm.viewProfile = false
          vm.pageName = 'main'
          break
        case 'edit-pm':
          vm.$refs.fiatProfileCard.onBackPM()
          vm.pageName = 'view-profile'
          break
        case 'ad-form-1':
          vm.$refs.orderForm.onBackEditAds()
          vm.pageName = 'order-form'
          break
        case 'ad-form-2':
          vm.$refs.orderForm.customBackEditAds()
          vm.pageName = 'ad-form-1'
          break
        case 'ad-form-3':
          vm.$refs.orderForm.customBackEditAds()
          vm.pageName = 'ad-form-2'
          break
      }
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
    fetchFiatCurrencies () {
      const vm = this
      backend.get('/ramp-p2p/currency/fiat', { authorize: true })
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
        .catch(error => {
          console.error(error)
          vm.fiatCurrencies = vm.availableFiat
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    fetchStoreListings (overwrite = false) {
      const vm = this
      if (this.selectedCurrency) {
        vm.loading = true
        const params = vm.filters
        params.currency = vm.selectedCurrency.symbol
        params.trade_type = vm.transactionType
        params.query_name = vm.query_name

        console.log('params: ', params)
        vm.$store.dispatch('ramp/fetchAds',
          {
            component: 'store',
            params: params,
            overwrite: overwrite
          })
          .then(response => {
            console.lof('res', response)
            vm.updatePaginationValues()
            vm.loading = false
          })
          .catch(error => {
            vm.loading = false
            console.error(error)
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            }
          })
      }
    },
    async receiveDialog (data) {
      const vm = this
      const mutationName = (
        vm.transactionType === 'SELL'
          ? 'ramp/updateStoreSellFilters'
          : 'ramp/updateStoreBuyFilters')
      vm.openDialog = false
      vm.$store.commit(mutationName, data)
      vm.updateFilters()
      vm.resetAndRefetchListings()
    },
    openFilter () {
      this.dialogType = this.transactionType === 'SELL' ? 'filterSellAd' : 'filterBuyAd'
      this.openDialog = true
    },
    switchFilterDefaults (adType) {
      const vm = this
      vm.defaultFilters.sort_type = adType === 'SELL' ? 'ascending' : 'descending'
    },
    isdefaultFiltersOn (filters) {
      filters = { ...filters }
      const defaultFilters = { ...this.defaultFilters }

      if (JSON.stringify([...defaultFilters?.payment_types].sort()) !== JSON.stringify(filters?.payment_types?.sort()) ||
          JSON.stringify([...defaultFilters?.time_limits].sort()) !== JSON.stringify(filters?.time_limits?.sort())) {
        return false
      }

      if (filters.currency) delete filters.currency
      if (filters.trade_type) delete filters.trade_type
      delete filters.payment_types
      delete filters.time_limits
      delete defaultFilters.payment_types
      delete defaultFilters.time_limits

      const match = JSON.stringify(defaultFilters) === JSON.stringify(filters)
      if (!match) return false
      return true
    },
    updateFilters () {
      const vm = this
      const defaultPaymentTypes = vm.$store.getters['ramp/paymentTypes']
      vm.defaultFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)

      const getterName = vm.transactionType === 'SELL' ? 'ramp/storeSellFilters' : 'ramp/storeBuyFilters'
      const filters = JSON.parse(JSON.stringify(vm.$store.getters[getterName]))
      if (filters.paymentTypes?.length === 0) {
        filters.paymentTypes = Array.from(vm.defaultFilters.payment_types)
      }
      vm.filters = filters
      vm.defaultFiltersOn = vm.isdefaultFiltersOn(filters)
    },
    loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        vm.fetchStoreListings()
      }
      done()
    },
    refreshData (done) {
      this.resetAndRefetchListings()
      done()
    },
    resetAndRefetchListings () {
      const vm = this
      vm.$store.commit('ramp/resetStorePagination')
      vm.fetchStoreListings(true)
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getStoreTotalPages'](this.transactionType)
      vm.pageNumber = vm.$store.getters['ramp/getStorePageNumber'](this.transactionType)
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
    formattedCurrency (value, currency) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    onOrderCanceled () {
      this.$emit('orderCanceled')
    },
    selectCurrency (index) {
      this.selectedCurrency = this.fiatCurrencies[index]
    },
    selectListing (listing) {
      const vm = this
      vm.viewProfile = false
      vm.selectedListing = listing
      vm.state = vm.selectedListing.trade_type
      vm.pageName = 'order-form'
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    viewUserProfile (userId, isOwner) {
      this.selectedUser = {
        id: userId,
        self: isOwner
      }
      this.viewProfile = true
      this.pageName = 'view-profile'
    },
    maxAmount (tradeAmount, tradeCeiling) {
      if (parseFloat(tradeAmount) < parseFloat(tradeCeiling)) {
        return parseFloat(tradeAmount)
      } else {
        return parseFloat(tradeCeiling)
      }
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
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 7%;
  margin-right: 7%;
  margin-top: 10px;
}
.ib-text {
  display: inline-block;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.back-btn {
  background-color: transparent;
  height: 50px;
  width: 70px;
  z-index: 1;
  left: 10px;
}
</style>
