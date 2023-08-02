<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
    v-if="state === 'SELECT' && !viewProfile">
    <div>
      <div class="row no-wrap items-center q-pa-sm q-pt-md">
        <div>
          <div v-if="selectedCurrency" class="q-ml-md text-h5 md-font-size">
            {{ selectedCurrency.symbol }} <q-icon size="sm" name='mdi-menu-down'/>
          </div>
          <q-menu anchor="bottom left" self="top left" >
            <q-list class="text-h5 subtext md-font-size" :class="{'pt-dark-card': darkMode}" style="min-width: 150px;">
              <q-item
                v-for="(currency, index) in fiatCurrencies"
                :key="index"
                clickable
                v-close-popup
                @click="selectCurrency(index)"
              >
                <!-- <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section> -->
                <q-item-section :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">{{ currency.name }} ({{ currency.symbol }})</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <q-space />
        <div class="q-pr-md">
          <q-icon size="sm" name='sym_o_filter_list'/>
        </div>
      </div>
      <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'SELL' }" @click="transactionType='SELL'">Buy BCH</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'BUY'}" @click="transactionType='BUY'">Sell BCH</button>
      </div>
      <div v-if="!loading" class="q-mt-md">
        <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
        </div>
        <div v-else>
          <q-list ref="scrollTargetRef" style="max-height:60vh; overflow:auto;">
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
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none md-font-size"
                            style="font-weight: 400;"
                            @click.stop.prevent="viewUserProfile(listing.owner)">
                            <!-- <q-icon size="sm" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>&nbsp;{{ listing.owner }} -->
                            {{ listing.owner }}
                          </span><br>
                          <div class="row sm-font-size">
                            <span class="q-mr-sm">{{ listing.trade_count }} total trades </span>
                            <span class="q-ml-sm">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                          </div>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase lg-font-size">
                            {{ formattedCurrency(listing.price) }}
                          </span>
                          <span class="sm-font-size">/BCH</span><br>
                          <div class="row sm-font-size">
                              <span class="q-mr-md">Quantity</span>
                              <span>{{ formattedCurrency(listing.crypto_amount, false) }} BCH</span>
                          </div>
                          <div class="row sm-font-size">
                              <span class="q-mr-md">Limit</span>
                              <span> {{ formattedCurrency(listing.trade_floor) }} - {{ formattedCurrency(listing.trade_ceiling) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
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
    />
    <!-- <FiatStoreForm
      v-on:back="state = 'SELECT'"
      :listingData="selectedListing"
      :transactionType="state"
    /> -->
  </div>

  <!-- <div v-if="viewProfile">
    <MiscDialogs
      :type="'viewProfile'"
      v-on:back="viewProfile = false"
    />
  </div> -->
  <FiatProfileCard
    v-if="viewProfile"
    :userInfo="selectedUser"
    :type="'peer'"
    v-on:back="viewProfile = false"
  />
</template>
<script>
import FiatStoreForm from './FiatStoreForm.vue'
import FiatOrderForm from './FiatOrderForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import { ref } from 'vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  components: {
    FiatStoreForm,
    FiatOrderForm,
    ProgressLoader,
    FiatProfileCard
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      viewProfile: false,
      wallet: null,
      transactionType: 'SELL',
      loading: true,
      peerProfile: null,
      selectedCurrency: null,
      state: 'SELECT',
      selectedListing: {},
      selectedUser: null,
      fiatCurrencies: [],
      totalPages: null,
      pageNumber: null
    }
  },
  watch: {
    transactionType () {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      if (vm.pageNumber === null || vm.totalPages === null) {
        vm.loading = true
        this.fetchStoreListings()
      }
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
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.updatePaginationValues()
    // console.log('totalPages:', vm.totalPages, ', pageNumber:', vm.pageNumber)
    vm.selectedCurrency = vm.$store.getters['market/selectedCurrency']

    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchFiatCurrencies()
    await vm.fetchStoreListings()
  },
  methods: {
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
    async loadMoreData (_, done) {
      // console.log('loadMoreData')
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
    async fetchFiatCurrencies () {
      const vm = this

      vm.$axios.get(vm.apiURL + '/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)

          vm.fiatCurrencies = vm.availableFiat
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
    },
    async fetchStoreListings () {
      const vm = this
      if (this.selectedCurrency) {
        const params = {
          currency: vm.selectedCurrency.symbol,
          trade_type: vm.transactionType
        }
        try {
          await vm.$store.dispatch('ramp/fetchAds', { component: 'store', params: params })
        } catch (error) {
          console.error(error)
        }
        vm.loading = false
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
    selectCurrency (index) {
      this.selectedCurrency = this.fiatCurrencies[index]
      this.listings = []
      this.fetchStoreListings()
    },
    selectListing (listing) {
      const vm = this

      vm.selectedListing = listing
      vm.state = vm.transactionType
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    updateNickname (info) {
      this.$store.commit('global/editRampNickname', info.nickname)
      // this.proceed = true
    },
    viewUserProfile (user) {
      this.viewProfile = true
      this.selectedUser = {
        name: user
      }
    }
  }
}
</script>
<style lang="scss" scoped>
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
