<template>
    <div :class="getDarkModeClass(darkMode)" class="q-mx-md q-mb-lg text-bow" :style="`height: ${minHeight}px;`"
    v-if="state === 'SELECT' && !viewProfile">
    <div class="q-mb-sm q-pb-sm">
      <q-pull-to-refresh @refresh="refreshData">
        <div class="row items-center q-px-sm" v-if="!showSearch">
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
        <div v-else class="q-px-lg q-mx-xs">
          <q-input ref="inputRef" v-model="query_name" :placeholder="$t('SearchUser')" dense @blur="searchState('blur')">
            <template v-slot:append>
              <q-icon name="close"
                @click="() => {
                  if (query_name) {
                    query_name = null
                    receiveDialog(filters)
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
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoAdsToDisplay') }}</p>
        </div>
        <div v-else>
          <div class="row justify-center" v-if="loading">
            <q-spinner-dots color="primary" size="40px" />
          </div>
          <q-list ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
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
                              { count: listing.trade_count },
                              `${ listing.trade_count || 0 } trades`
                            )
                          }}
                        </span>
                        <span class="q-ml-sm">
                          {{
                            $t(
                              'CompletionPercentage',
                              { percentage: formatCompletionRate(listing.completion_rate) },
                              `${ formatCompletionRate(listing.completion_rate) }% completion`
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
                          <span class="col">{{ formatCurrency(listing.trade_amount, listing.trade_amount_in_fiat ? listing.fiat_currency.symbol : null) }} {{ listing.trade_amount_in_fiat ? listing.fiat_currency.symbol : listing.crypto_currency.symbol }}</span>
                        </div>
                        <div class="row">
                          <span class="col-3">Limit</span>
                          <span class="col"> {{ formatCurrency(listing.trade_floor, listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : null)  }} - {{ formatCurrency(minTradeAmount(listing), listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : null) }} {{  listing.trade_limits_in_fiat ? listing.fiat_currency.symbol : listing.crypto_currency.symbol }}</span>
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
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import ProgressLoader from 'src/components/ProgressLoader.vue'
import FilterComponent from 'src/components/ramp/fiat/FilterComponent.vue'
import CurrencyFilterDialog from 'src/components/ramp/fiat/dialogs/CurrencyFilterDialog.vue'
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
  components: {
    ProgressLoader,
    FilterComponent
  },
  emits: ['orderCanceled'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      viewProfile: false,
      transactionType: 'SELL',
      loading: false,
      peerProfile: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      isAllCurrencies: false,
      state: 'SELECT',
      selectedListing: null,
      selectedUser: null,
      fiatCurrencies: [],
      query_name: null,
      totalPages: null,
      pageNumber: null,
      openDialog: false,
      dialogType: '',
      defaultFilters: {
        currency: this.$store.getters['market/selectedCurrency']?.symbol,
        sort_type: 'ascending',
        price_type: {
          fixed: true,
          floating: true
        },
        payment_types: [], //
        time_limits: [15, 30, 45, 60]
      },
      filters: {},
      showSearch: false,
      defaultFiltersOn: true,
      pageName: 'main',
      componentKey: 0,
      filterComponentKey: 0,
      loadingMoreData: false
    }
  },
  watch: {
    async transactionType (value) {
      const vm = this
      vm.filterComponentKey++
      vm.scrollToTop()
      vm.updatePaginationValues()
      vm.updateFilters()
      vm.resetAndRefetchListings()
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
      return this.selectedUser?.name === this.$store.getters['ramp/getUser']?.name
    }
  },
  created () {
    bus.on('view-ad', this.onViewAd)
  },
  async mounted () {
    const vm = this
    vm.fetchPaymentTypes()
      .then(async () => {
        vm.fetchFiatCurrencies()
        vm.updateFilters()
        vm.resetAndRefetchListings()
      })
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    minTradeAmount (ad) {
      let tradeAmount = parseFloat(ad.trade_amount)
      let tradeCeiling = parseFloat(ad.trade_ceiling)
      if (ad.trade_limits_in_fiat) {
        // if trade_limits in fiat and trade_amount in BCH
        // convert trade_amount to fiat
        if (!ad.trade_amount_in_fiat) {
          tradeAmount = tradeAmount * ad.price
        }
        tradeCeiling = Math.min.apply(null, [tradeCeiling, tradeAmount])
      } else {
        // If trade_limits in BCH and trade_amount in fiat:
        // convert trade amount to BCH
        if (ad.trade_amount_in_fiat) {
          tradeAmount = tradeAmount / ad.price
        }
        tradeCeiling = Math.min.apply(null, [tradeCeiling, tradeAmount])
      }
      const amounts = [tradeAmount, tradeCeiling]
      return Math.min.apply(null, amounts)
    },
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
    },
    onFilterListings (filters) {
      this.filters = filters
      this.resetAndRefetchListings()
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
      this.resetAndRefetchListings()
      // this.searchState('blur')
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
        vm.$store.dispatch('ramp/fetchPaymentTypes', { currency: this.isAllCurrencies ? null : this.selectedCurrency?.symbol })
          .then(() => {
            const paymentTypes = vm.$store.getters['ramp/paymentTypes'](this.selectedCurrency.symbol)
            vm.defaultFilters.payment_types = paymentTypes.map(paymentType => paymentType.id)
            resolve(paymentTypes)
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
            reject(error)
          })
      })
    },
    fetchFiatCurrencies () {
      const vm = this
      backend.get('/ramp-p2p/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
          vm.fiatCurrencies.unshift('All')
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
          } else {
            bus.emit('network-error')
          }
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
      }
    },
    async receiveDialog (data) {
      const vm = this
      vm.openDialog = false
      vm.resetAndRefetchListings()
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
      await this.resetAndRefetchListings()
    },
    async resetAndRefetchListings () {
      this.$store.commit('ramp/resetStorePagination')
      this.loading = true
      await this.fetchStoreListings(true)
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
    onOrderCanceled () {
      this.$emit('orderCanceled')
    },
    selectCurrency (index) {
      if (index === 0) {
        this.isAllCurrencies = true
        this.selectedCurrency = { symbol: 'All' }
      } else {
        this.selectedCurrency = this.fiatCurrencies[index]
        this.isAllCurrencies = false
      }
    },
    async selectListing (listing) {
      const vm = this
      vm.viewProfile = false
      vm.selectedListing = listing.id
      vm.state = listing.trade_type
      vm.pageName = 'order-form'
      await this.$router.push({ name: 'p2p-store-form', params: { ad: listing.id } })
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    maxAmount (tradeAmount, tradeCeiling) {
      if (parseFloat(tradeAmount) < parseFloat(tradeCeiling)) {
        return parseFloat(tradeAmount)
      } else {
        return parseFloat(tradeCeiling)
      }
    },
    onViewAd (adId) {
      bus.emit('hide-menu')
      this.selectedListing = adId
      this.componentKey++
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
