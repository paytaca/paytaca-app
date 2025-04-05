<template>
  <div id="p2p-exchange" :class="getDarkModeClass(darkMode)" class="q-mx-md q-mb-lg text-bow" :style="`height: ${minHeight}px;`">
    <div class="q-mb-sm q-pb-sm">
      <q-pull-to-refresh @refresh="refreshData">
        <div class="items-center q-px-sm" v-if="!showSearch">
          <div class="row">
            <!-- currency dialog -->
            <div class="col-auto">
              <div v-if="selectedCurrency" class="q-ml-md text-h5" style="font-size: medium;" @click="showCurrencySelect">
                <span v-if="isAllCurrencies">{{ $t('All') }}</span><span v-else>{{ selectedCurrency.symbol }}</span> <q-icon size="sm" name='mdi-menu-down'/>
              </div>
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
                @click="searchState('focus')">
              </q-btn>
              <FilterComponent :key="filterComponentKey" type="store" :currency="selectedCurrency?.symbol" :transactionType="transactionType" @filter="onFilterListings"/>
            </div>
          </div>
          <div class="q-ml-md">
            <span>
              <q-badge :outline="!filters.order_amount" color="blue" rounded @click="openFilterSelection('amount')">
                Amount{{ filters.order_amount ? `: ${filters.order_amount} ${amountFilterCurrency}` : ''}}
                <q-icon size="xs" name='mdi-menu-down'/>
              </q-badge>
            </span>
            <span class="q-pl-xs">
              <q-badge :outline="defaultPaymentTypes" color="blue" rounded @click="openFilterSelection('paymentTypes')">
                Payment Types <q-icon size="xs" name='mdi-menu-down'/>
              </q-badge>
            </span>
          </div>
        </div>
        <div v-else class="q-px-lg q-mx-xs">
          <q-input ref="inputRef" v-model="query_name" :placeholder="$t('SearchUser')" dense @blur="searchState('blur')">
            <template v-slot:append>
              <q-icon name="close"
                @click="() => {
                  if (query_name) {
                    query_name = null
                    receiveDialog()
                    $refs.inputRef.focus()
                  } else {
                    searchState('blur')
                  }
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
            {{ $t('BuyBCH') }}
          </button>
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="[{'dark': darkMode}, {'active-sell-btn': transactionType == 'BUY'}]"
            @click="transactionType='BUY'">
            {{ $t('SellBCH') }}
          </button>
        </div>
      </q-pull-to-refresh>
      <div class="q-mt-sm">
        <div v-if="!listings || listings.length == 0" class="relative text-center" style="margin-top: 50px;">
          <div v-if="displayEmptyList">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">{{ $t('NoAdsToDisplay') }}</p>
          </div>
          <div v-else>
            <div class="row justify-center" v-if="loading">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </div>
        </div>
        <div v-else>
          <div class="row justify-center" v-if="loading">
            <q-spinner-dots color="primary" size="40px" />
          </div>
          <q-pull-to-refresh @refresh="refreshData">
            <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
              <q-item v-for="(listing, index) in listings" :key="index" clickable @click="selectListing(listing)">
                <q-item-section>
                  <div class="q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="row">
                      <div class="col ib-text">
                        <div>
                          <span
                            :class="{'pt-label dark': darkMode}"
                            class="md-font-size">
                            <!-- @click.stop.prevent="viewUserProfile(listing.owner.id, listing.is_owned)"> -->
                            {{ userNameView(listing.owner?.name) }}
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
                          <span class="q-mr-sm">
                            {{
                              $t(
                                'TradeCount',
                                { count: listing.owner?.trade_count },
                                `${ listing.owner?.trade_count || 0 } trades`
                              )
                            }}
                          </span>
                          <span class="q-ml-sm">
                            {{
                              $t(
                                'CompletionPercentage',
                                { percentage: formatCompletionRate(listing.owner?.completion_rate) },
                                `${ formatCompletionRate(listing.owner?.completion_rate) }% completion`
                              )
                            }}
                          </span><br>
                        </div>
                        <span
                          class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                          :class="getDarkModeClass(darkMode)">
                          {{ listing.fiat_currency.symbol }} {{ formatCurrency(listing.price, listing.fiat_currency.symbol).replace(/[^\d.,-]/g, '') }}
                        </span>
                        <span class="sm-font-size">/BCH</span><br>
                        <div class="sm-font-size">
                          <div class="row">
                            <span class="col-3">{{ $t('Quantity') }}</span>
                            <span class="col">{{ formatCurrency(listing.trade_amount, listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : null) }} {{ listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : listing.crypto_currency.symbol }}</span>
                          </div>
                          <div class="row">
                            <span class="col-3">Limit</span>
                            <span class="col"> {{ formatCurrency(listing.trade_floor, listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : null)  }} - {{ formatCurrency(listing.trade_ceiling, listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : null) }} {{  listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : listing.crypto_currency.symbol }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="q-gutter-sm q-pt-xs">
                      <q-badge v-for="method in listing.payment_methods" :key="method.id"
                      rounded outline :color="transactionType === 'SELL'? darkMode ? 'blue-13' : 'blue' : darkMode ? 'red-13' : 'red'">
                      {{ method }}
                      </q-badge>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
              <div class="row justify-center">
                <q-spinner-dots v-if="loadingMoreData" color="primary" size="40px" />
                <q-btn v-else-if="!loading && hasMoreData" flat dense @click="loadMoreData">view more</q-btn>
              </div>
            </q-list>
          </q-pull-to-refresh>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import FilterComponent from 'src/components/ramp/fiat/FilterComponent.vue'
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
import FilterSelectionDialog from './dialogs/FilterSelectionDialog.vue'
import { formatCurrency } from 'src/exchange'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  components: {
    FilterComponent
  },
  emits: ['orderCanceled'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      transactionType: this.$store.getters['ramp/storeListingTab'],
      loading: false,
      peerProfile: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      isAllCurrencies: false,
      state: 'SELECT',
      selectedUser: null,
      fiatCurrencies: [],
      query_name: null,
      totalPages: null,
      pageNumber: null,
      filters: {},
      showSearch: false,
      pageName: 'main',
      componentKey: 0,
      filterComponentKey: 0,
      loadingMoreData: false,
      displayEmptyList: false,
      onFirstLoad: {
        sell: true,
        buy: true
      }
    }
  },
  watch: {
    async transactionType (value) {
      const vm = this
      vm.displayEmptyList = false
      vm.filterComponentKey++
      vm.scrollToTop()
      vm.updatePaginationValues()
      vm.updateFilters()
      vm.resetAndRefetchListings()
      vm.$store.commit('ramp/updateStoreListingTab', value)
    },
    async selectedCurrency () {
      this.updateFilters()
      this.resetAndRefetchListings()
      this.filterComponentKey++
    },
    async isAllCurrencies (val) {
      if (val) {
        this.updateFilters()
        this.resetAndRefetchListings()
      }
    }
  },
  computed: {
    amountFilterCurrency () {
      if (this.filters?.order_amount_currency === 'BCH') return 'BCH'
      if (this.selectedCurrency?.symbol !== 'All') {
        return this.selectedCurrency?.symbol
      }
      return ''
    },
    minHeight () {
      return this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
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
      return this.$store.getters['ramp/getStoreBuyListings']
    },
    sellListings () {
      return this.$store.getters['ramp/getStoreSellListings']
    },
    hasMoreData () {
      this.updatePaginationValues()
      return (this.pageNumber < this.totalPages)
    },
    defaultPaymentTypes () {
      if (!this.filters?.payment_types) return true
      const paymentTypesLen = this.$store.getters['ramp/paymentTypes'](this.selectedCurrency?.symbol)?.length
      return paymentTypesLen === this.filters?.payment_types.length
    }
  },
  async mounted () {
    const vm = this
    await vm.fetchPaymentTypes()
    vm.fetchFiatCurrencies()
    vm.updateFilters()
    vm.resetAndRefetchListings()
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    openFilterSelection (type) {
      this.$q.dialog({
        component: FilterSelectionDialog,
        componentProps: {
          type: type,
          filterData: this.filters,
          currency: this.selectedCurrency
        }
      })
        .onOk(filter => {
          this.onFilterListings(filter)
        })
    },
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name
      return limitedView
    },
    onFilterListings (filters) {
      this.filters = filters
      this.resetAndRefetchListings(true)
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
    searchUser () {
      this.resetAndRefetchListings(true)
    },
    async fetchPaymentTypes () {
      const vm = this
      await vm.$store.dispatch('ramp/fetchPaymentTypes', { currency: this.isAllCurrencies ? null : this.selectedCurrency?.symbol })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchFiatCurrencies () {
      const vm = this
      await backend.get('/ramp-p2p/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
          vm.fiatCurrencies.unshift('All')
        })
        .catch(error => {
          vm.fiatCurrencies = vm.availableFiat
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
          this.handleRequestError(error)
        })
    },
    async fetchStoreListings (overwrite = false) {
      const vm = this
      if (this.selectedCurrency) {
        const params = { ...vm.filters }
        params.currency = vm.selectedCurrency?.symbol !== 'All' ? vm.selectedCurrency?.symbol : null
        params.trade_type = vm.transactionType
        params.query_name = vm.query_name
        await vm.$store.dispatch('ramp/fetchAds',
          {
            component: 'store',
            params: params,
            overwrite: overwrite
          })
          .then(() => {
            vm.updatePaginationValues()
          })
          .catch(error => {
            this.handleRequestError(error)
          })
      }
    },
    async receiveDialog (data) {
      this.resetAndRefetchListings(true)
    },
    async updateFilters () {
      const vm = this
      const getterName = vm.transactionType === 'SELL' ? 'ramp/storeSellFilters' : 'ramp/storeBuyFilters'
      const currency = this.selectedCurrency?.symbol
      const filters = vm.$store.getters[getterName](currency)
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
        await vm.fetchStoreListings()
      }
      vm.loadingMoreData = false
    },
    async refreshData (done) {
      done()
      await this.resetAndRefetchListings(true)
    },
    async resetAndRefetchListings (refresh = false) {
      const tab = this.transactionType
      if (!refresh && ((tab === 'SELL' && !this.onFirstLoad.sell) ||
          (tab === 'BUY' && !this.onFirstLoad.buy))) {
        return
      }

      if (tab === 'SELL') this.onFirstLoad.sell = false
      if (tab === 'BUY') this.onFirstLoad.buy = false

      this.$store.commit('ramp/resetStorePagination')
      this.loading = true
      await this.fetchStoreListings(true)

      setTimeout(() => {
        this.displayEmptyList = true
      }, 150)

      this.loading = false
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getStoreTotalPages'](this.transactionType)
      vm.pageNumber = vm.$store.getters['ramp/getStorePageNumber'](this.transactionType)
    },
    scrollToTop () {
      if (this.$refs.scrollTarget) {
        const scrollElement = this.$refs.scrollTarget.$el
        scrollElement.scrollTop = 0
      }
    },
    async selectCurrency (index) {
      if (index === 0) {
        this.isAllCurrencies = true
        this.selectedCurrency = { symbol: 'All' }
      } else {
        this.selectedCurrency = this.fiatCurrencies[index]
        this.isAllCurrencies = false
      }
      await this.resetAndRefetchListings(true)
    },
    async selectListing (listing) {
      await this.$router.push({ name: 'p2p-store-form', params: { ad: listing.id } })
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
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
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
