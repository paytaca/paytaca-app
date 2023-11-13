<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none q-mb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px;`"
    v-if="state === 'SELECT' && !viewProfile">
    <div class="q-mb-lg q-pb-lg">
      <div class="row no-wrap items-center q-pa-sm q-pt-md">
        <div>
          <div v-if="selectedCurrency" class="q-ml-md text-h5" style="font-size: medium;">
            {{ selectedCurrency.symbol }} <q-icon size="sm" name='mdi-menu-down'/>
          </div>
          <q-menu anchor="bottom left" self="top left" >
            <q-list class="md-font-size" :class="{'pt-dark-card': darkMode}" style="min-width: 150px">
              <q-item
                v-for="(currency, index) in fiatCurrencies"
                :key="index"
                clickable
                v-close-popup
                @click="selectCurrency(index)">
                <q-item-section :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">{{ currency.name }} ({{ currency.symbol }})</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <q-space />
        <div class="q-pr-md">
          <q-btn unelevated ripple dense size="md" icon="filter_list" @click="openFilter()">
            <q-badge v-if="!defaultFiltersOn" floating color="red"/>
          </q-btn>
        </div>
      </div>
      <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'SELL' }" @click="transactionType='SELL'">Buy BCH</button>
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'BUY'}" @click="transactionType='BUY'">Sell BCH</button>
      </div>
      <div v-if="!loading" class="q-mt-md">
        <q-pull-to-refresh
          @refresh="refreshData">
          <div v-if="!listings || listings.length == 0" class="relative text-center" style="margin-top: 50px;">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
          </div>
          <div v-else>
            <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 180}px`" style="overflow:auto;">
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
                  <q-item clickable @click="selectListing(listing)">
                    <q-item-section>
                      <div class="q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                        <div class="row">
                          <div class="col ib-text">
                            <div class="">
                              <span
                                :class="{'pt-dark-label': darkMode}"
                                class="md-font-size"
                                @click.stop.prevent="viewUserProfile(listing.owner, listing)">
                                {{ listing.owner.name }}
                              </span>
                              <q-badge class="q-mx-xs" v-if="listing.is_owned" rounded size="xs" color="blue-6" label="You" />
                            </div>
                            <div class="row">
                              <q-rating
                                readonly
                                :model-value="listing.owner.rating"
                                :v-model="listing.owner.rating"
                                size="1.1em"
                                color="yellow-9"
                                icon="star"/>
                              <span class="q-mx-xs sm-font-size">({{ listing.owner.rating ? parseFloat(listing.owner.rating).toFixed(1) : 0 }})</span>
                            </div>
                            <div class="sm-font-size">
                              <span class="q-mr-sm">{{ listing.trade_count }} total trades </span>
                              <span class="q-ml-sm">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                            </div>
                            <span :class="{'pt-dark-label': darkMode}" class="col-transaction text-uppercase bold-text lg-font-size">
                              {{ formattedCurrency(listing.price) }}
                            </span>
                            <span class="sm-font-size">/BCH</span><br>
                            <div class="sm-font-size">
                              <div class="row">
                                <span class="col-3">Quantity</span>
                                <span class="col">{{ formattedCurrency(listing.trade_amount, false) }} BCH</span>
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
                          rounded outline :color="transactionType === 'SELL'? 'blue': 'red'">
                          {{ method.payment_type }}
                          </q-badge>
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
      <div v-else>
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
    </div>
  </q-card>
  <!-- Buy/Sell Form Here -->
  <div v-if="state !== 'SELECT' && !viewProfile">
    <FiatOrderForm
      :ad-id="selectedListing.id"
      v-on:back="state = 'SELECT'"
      @order-canceled="onOrderCanceled"
    />
  </div>
  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
      :filters="storeFilters"
      @back="openDialog = false"
      @submit="receiveDialog"
    />
  </div>
  <FiatProfileCard
    v-if="viewProfile"
    :userInfo="selectedUser"
    :type="selectedUser.is_owner ? 'self' : 'peer'"
    v-on:back="viewProfile = false"
  />
</template>
<script>
// import FiatStoreForm from './FiatStoreForm.vue'
import FiatOrderForm from './FiatOrderForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { formatCurrency } from 'src/wallet/ramp'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  emits: ['orderCanceled'],
  components: {
    // FiatStoreForm,
    FiatOrderForm,
    ProgressLoader,
    FiatProfileCard,
    MiscDialogs
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      viewProfile: false,
      transactionType: 'SELL',
      loading: false,
      peerProfile: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      state: 'SELECT',
      selectedListing: {},
      selectedUser: null,
      fiatCurrencies: [],
      totalPages: null,
      pageNumber: null,
      openDialog: false,
      dialogType: '',
      // minHeight: this.$q.screen.height - this.$q.screen.height * 0.25,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      defaultFilters: {
        price_order: 'ascending',
        price_types: ['FIXED', 'FLOATING'],
        payment_types: [],
        time_limits: [5, 15, 30, 60, 300, 720, 1440]
      },
      storeFilters: {},
      defaultFiltersOn: true
    }
  },
  watch: {
    transactionType (val) {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      if (vm.pageNumber === null || vm.totalPages === null) {
        vm.loading = true
        vm.resetAndRefetchListings()
      }
      vm.defaultFilters.price_order = val === 'SELL' ? 'ascending' : 'descending'
      vm.getStoreFilters()
    },
    async selectedCurrency () {
      this.loading = true
      await this.resetAndRefetchListings()
      this.loading = false
    }
  },
  computed: {
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
    await vm.fetchFiatCurrencies()
    await vm.fetchPaymentTypes()
    vm.getStoreFilters()
    if (!vm.listings || vm.listings.length === 0) {
      await vm.resetAndRefetchListings()
    }
    vm.loading = false
  },
  methods: {
    async fetchPaymentTypes () {
      const vm = this
      const paymentTypes = vm.$store.getters['ramp/paymentTypes']
      vm.defaultFilters.payment_types = paymentTypes.map(paymentType => paymentType.id)
    },
    async fetchFiatCurrencies () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/currency/fiat', { headers: vm.authHeaders })
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
    async fetchStoreListings (overwrite = false) {
      const vm = this
      if (this.selectedCurrency) {
        vm.loading = true
        const params = vm.storeFilters
        try {
          await vm.$store.dispatch('ramp/fetchAds', { component: 'store', params: params, overwrite: overwrite })
        } catch (error) {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        }
        vm.loading = false
      }
    },
    async loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchStoreListings()
      }
      done()
    },
    async refreshData (done) {
      await this.resetAndRefetchListings()
      done()
    },
    async resetAndRefetchListings () {
      const vm = this
      await vm.$store.commit('ramp/resetStorePagination')
      await vm.fetchStoreListings(true)
      vm.updatePaginationValues()
    },
    async filterAds () {
      const vm = this
      vm.loading = true
      const params = vm.storeFilters
      await vm.$store.commit('ramp/resetStorePagination')
      try {
        await vm.$store.dispatch('ramp/fetchAds', { component: 'store', params: params, overwrite: true })
      } catch (error) {
        console.error(error)
        if (error.response) {
          console.error(error.response)
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        }
      }
      vm.updatePaginationValues()
      vm.loading = false
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
    formattedCurrency (value, fiat = true) {
      if (fiat) {
        const currency = this.selectedCurrency.symbol
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
      vm.selectedListing = listing
      vm.state = vm.transactionType
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    viewUserProfile (user, data) {
      this.viewProfile = true
      this.selectedUser = {
        name: user,
        is_owner: data.is_owned
      }
    },
    maxAmount (tradeAmount, tradeCeiling) {
      if (parseFloat(tradeAmount) < parseFloat(tradeCeiling)) {
        return parseFloat(tradeAmount)
      } else {
        return parseFloat(tradeCeiling)
      }
    },
    receiveDialog (data) {
      this.openDialog = false
      const mutationName = this.transactionType === 'SELL' ? 'ramp/updateStoreSellFilters' : 'ramp/updateStoreBuyFilters'
      this.$store.commit(mutationName, data)
      this.getStoreFilters()
      this.filterAds()
    },
    isdefaultFiltersOn (filters) {
      if ((this.defaultFilters.price_order !== filters.price_order) ||
          (JSON.stringify(this.defaultFilters.price_types.sort()) !== JSON.stringify(filters.price_types.sort())) ||
          JSON.stringify(this.defaultFilters.payment_types.sort()) !== JSON.stringify(filters.payment_types.sort()) ||
          JSON.stringify(this.defaultFilters.time_limits.sort()) !== JSON.stringify(filters.time_limits.sort())) {
        return false
      }
      return true
    },
    openFilter () {
      this.openDialog = true
      this.dialogType = 'filterAd'
    },
    getStoreFilters () {
      const getterName = this.transactionType === 'SELL' ? 'ramp/storeSellFilters' : 'ramp/storeBuyFilters'
      const savedFilters = JSON.parse(JSON.stringify(this.$store.getters[getterName]))
      let paymentTypes = savedFilters.payment_types
      if (paymentTypes.length === 0) {
        paymentTypes = Array.from(this.defaultFilters.payment_types)
      }
      const filters = {
        owned: false,
        currency: this.selectedCurrency.symbol,
        trade_type: this.transactionType,
        payment_types: paymentTypes,
        time_limits: savedFilters.time_limits,
        price_order: savedFilters.price_order,
        price_types: savedFilters.price_types
      }
      this.storeFilters = filters
      this.defaultFiltersOn = this.isdefaultFiltersOn(filters)
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

.bold-text {
  font-weight: bold;
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
  color: #fff;
}
.btn-custom.active-sell-btn {
  background-color: #ed5f59 !important;
  color: #fff;
}
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
.transactions-wallet {
  color: #4C4F4F;
}
.ib-text {
  display: inline-block;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.subtext {
  opacity: .5;
}

</style>
