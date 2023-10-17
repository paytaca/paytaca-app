<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none q-mb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px;`"
    v-if="state === 'SELECT' && !viewProfile">
    <div class="q-mb-lg q-pb-lg">
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
          <q-icon size="sm" name='sym_o_filter_list' @click="openFilter()"/>
        </div>
      </div>
      <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'SELL' }" @click="transactionType='SELL'">Buy BCH</button>
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'BUY'}" @click="transactionType='BUY'">Sell BCH</button>
      </div>
      <div v-if="!loading" class="q-mt-md">
        <q-pull-to-refresh
          @refresh="refreshData">
          <div v-if="listings.length == 0" class="relative text-center" style="margin-top: 50px;">
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
                            <span
                              :class="{'pt-dark-label': darkMode}"
                              class="q-mb-none md-font-size"
                              style="font-weight: 400;"
                              @click.stop.prevent="viewUserProfile(listing.owner, listing)">
                              <!-- <q-icon size="sm" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>&nbsp;{{ listing.owner }} -->

                              {{ listing.owner }} &nbsp; <q-badge v-if="listing.is_owned" rounded size="sm" color="blue-6" label="You" />
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
                                <span>{{ formattedCurrency(listing.trade_amount, false) }} BCH</span>
                            </div>
                            <div class="row sm-font-size">
                                <span class="q-mr-md">Limit</span>
                                <span> {{ parseFloat(listing.trade_floor) }} {{ listing.crypto_currency.symbol }}  - {{ parseFloat(listing.trade_ceiling) }} {{ listing.crypto_currency.symbol }}</span>
                                <!-- <span> {{ formattedCurrency(listing.trade_floor) }} - {{ formattedCurrency(listing.trade_ceiling) }}</span> -->
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
    <!-- <FiatStoreForm
      v-on:back="state = 'SELECT'"
      :listingData="selectedListing"
      :transactionType="state"
    /> -->
  </div>

  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
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
import { loadP2PWalletInfo, formatCurrency, getCookie } from 'src/wallet/ramp'
import { ref } from 'vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { SignatureTemplate } from 'cashscript'

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
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      // minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      adFilter: {}
      // adFilter: null, //add set adFilter default // clear filter // horizontal scroll area for selected  filter
    }
  },
  watch: {
    transactionType () {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      if (vm.pageNumber === null || vm.totalPages === null) {
        vm.loading = true
        vm.resetAndRefetchListings()
      }
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
    if (!vm.listings || vm.listings.length === 0) {
      vm.loading = true
    }
    console.log('FiatStore authHeaders:', vm.authHeaders)
    await vm.fetchFiatCurrencies()
    await vm.resetAndRefetchListings()
    vm.loading = false
  },
  methods: {
    receiveDialog (data) {
      // console.log(data)
      this.openDialog = false
    },
    async fetchFiatCurrencies () {
      const vm = this
      console.log('FiatStore authHeaders:', vm.authHeaders)
      vm.$axios.get(vm.apiURL + '/currency/fiat', { headers: vm.authHeaders })
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
    async fetchStoreListings (overwrite = false) {
      const vm = this
      if (this.selectedCurrency) {
        const params = {
          currency: vm.selectedCurrency.symbol,
          trade_type: vm.transactionType
        }
        try {
          await vm.$store.dispatch('ramp/fetchAds', { component: 'store', params: params, overwrite: overwrite })
        } catch (error) {
          console.error(error.response)
        }
        vm.loading = false
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
    async refreshData (done) {
      // console.log('refreshing store')
      await this.resetAndRefetchListings()
      done()
    },
    async resetAndRefetchListings () {
      // reset pagination and reload ads list
      const vm = this
      await vm.$store.commit('ramp/resetStorePagination')
      await vm.fetchStoreListings(true)
      vm.updatePaginationValues()
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
      // console.log('onOrderCanceled')
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
      // console.log(this.selectedUser)
    },
    async filterAds () {
      const vm = this
      vm.loading = true
      console.log('filtering ads')
      const params = {
        currency: 'PHP',
        limit: 20
      }
      const url = `${vm.apiURL}/ad`
      await this.$axios.get(url, {
        headers: vm.authHeaders,
        params: params
      })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.log(error)
        })
      // try {
      //   await vm.$store.dispatch('ramp/fetchAds', { component: 'store', params: params, headers: headers, overwrite: false })
      // } catch (error) {
      //   console.error(error)
      // }
      vm.loading = false
    },
    openFilter () {
      this.filterAds()
      this.openDialog = true
      this.dialogType = 'filterAd'
    }
  }
}
</script>
<style lang="scss" scoped>
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
