<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;">
    <div v-if="state !== 'selection'">
      <FiatAdsForm
        @back="onBack()"
        :adsState="state"
        :transactionType="transactionType"
        :selectedAdId="selectedAdId"
      />
    </div>
    <div v-if="state === 'selection'">
      <div class="row items-center justify-between q-mt-md q-mr-lg q-pb-xs">
        <q-icon class="q-pl-lg" size="sm" name='sym_o_filter_list'/>
        <q-btn
          rounded
          no-caps
          padding="sm"
          class="q-ml-md"
          icon="add"
          :class="transactionType === 'BUY'? 'buy-add-btn': 'sell-add-btn'"
          @click="state = 'create'"
        />
      </div>
      <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell</button>
      </div>
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-mt-md q-mx-md">
        <div v-if="listings.length == 0"  class="relative text-center" style="margin-top: 50px;">
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
                <q-item>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase"
                            style="font-size: 13px;">
                            {{ listing.price_type }}
                          </span><br>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase"
                            style="font-size: 16px;">
                            {{ formattedCurrency(listing.price) }}
                          </span>
                          <span style="font-size: 12px;">
                            /BCH
                          </span>
                          <div class="row sm-font-size">
                            <span class="q-mr-md">Quantity</span>
                            <span>{{ formattedCurrency(listing.crypto_amount, false) }} BCH</span>
                          </div>
                          <div class="row sm-font-size">
                            <span class="q-mr-md">Limit</span>
                            <span> {{ formattedCurrency(listing.trade_floor) }} - {{ formattedCurrency(listing.trade_ceiling) }} </span>
                          </div>
                          <div class="row" style="font-size: 12px; color: grey">{{ formattedDate(listing.created_at) }}</div>
                        </div>
                        <div class="text-right">
                          <q-btn
                            outline
                            rounded
                            padding="sm"
                            icon="edit"
                            size="sm"
                            color="grey-6"
                            @click="editAds(listing.id)"
                          />
                          <q-btn
                            outline
                            rounded
                            padding="sm"
                            size="sm"
                            icon="delete"
                            color="grey-6"
                            class="q-ml-xs"
                            @click="deleteAds(index)"
                          />
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <!-- <q-badge v-for="method in listing.payment_methods" rounded outline :color="transactionType === 'buy'? 'blue': 'red'" :label="method.payment_type" /> -->
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
  </q-card>

  <FiatAdsDialogs
    v-if="openDialog === true"
    :type="dialogName"
    v-on:back="openDialog = false"
    v-on:selected-option="receiveDialogOption"
  />
</template>
<script>
import FiatAdsDialogs from './dialogs/FiatAdsDialogs.vue'
import FiatAdsForm from './FiatAdsForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { loadP2PWalletInfo, formatCurrency, formatDate } from 'src/wallet/ramp'
import { ref } from 'vue'

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
    FiatAdsForm,
    ProgressLoader,
    FiatAdsDialogs
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      wallet: null,
      openDialog: false,
      dialogName: '',
      selectedIndex: null,
      editListing: {},
      transactionType: 'BUY',
      state: 'selection', // 'create' 'edit'
      // buyListings: [],
      // sellListings: [],
      // listings: [],
      loading: false,
      totalPages: null,
      pageNumber: null,
      selectedAdId: null
    }
  },
  watch: {
    state (val) {
      if (val === 'create') {
        this.$router.push({ name: 'ads-create' })
      }
    },
    transactionType () {
      const vm = this
      vm.resetAndScrollToTop()
      vm.updatePaginationValues()
      // console.log('>>> user has switched transaction type')
      // console.log('pageNumber:', this.pageNumber, 'totalPages:', vm.totalPages)
      if (vm.pageNumber === null || vm.totalPages === null) {
        vm.loading = true
        this.fetchAds()
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
      return this.$store.getters['ramp/getAdsBuyListings']
    },
    sellListings () {
      return this.$store.getters['ramp/getAdsSellListings']
    },
    hasMoreData () {
      const vm = this
      vm.updatePaginationValues()
      return (vm.pageNumber < vm.totalPages || (!vm.pageNumber && !vm.totalPages))
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.updatePaginationValues()
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchAds()
  },
  methods: {
    async onBack () {
      const vm = this
      vm.state = 'selection'
      vm.selectedAdId = null
      // await vm.$store.dispatch('ramp/resetAdsPagination')
      // await vm.fetchAds()
      vm.updatePaginationValues()
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getAdsTotalPages'](this.transactionType)
      vm.pageNumber = vm.$store.getters['ramp/getAdsPageNumber'](this.transactionType)
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
      console.log('loadMoreData')
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchAds()
      }
      done()
    },
    async fetchAds () {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'AD_LIST', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      // console.log('headers:', headers)
      const params = { trade_type: vm.transactionType }
      try {
        await vm.$store.dispatch('ramp/fetchAds', { component: 'ads', params: params, headers: headers })
      } catch (error) {
        console.error(error)
      }
      vm.loading = false
    },
    formattedDate (value) {
      return formatDate(value)
    },
    formattedCurrency (value, fiat = true) {
      if (fiat) {
        const currency = this.selectedCurrency.symbol
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    sortedListings (type) {
      const vm = this

      const sorted = vm.listings.filter(function (test) {
        return test.trade_type.toLowerCase() === type
      })
      return sorted
    },
    editAds (id) {
      const vm = this
      vm.state = 'edit'
      console.log('selectedAdId:', id)
      vm.selectedAdId = id

      // switch (vm.transactionType) {
      //   case 'BUY':
      //     vm.editListing = vm.buyListings[index]
      //     break
      //   case 'SELL':
      //     vm.editListing = vm.sellListings[index]
      //     break
      // }
    },
    deleteAds (index) {
      const vm = this
      // console.log('delete')

      vm.dialogName = 'deleteAd'
      vm.openDialog = true
      vm.selectedIndex = index
    },
    checkEmptyListing () {
      const vm = this
      // if (vm.transactionType === 'BUY') {
      //   return vm.buyListings.length === 0
      // } else {
      //   return vm.sellListings.length === 0
      // }
      return vm.listings.length === 0
    },
    receiveDialogOption (option) {
      const vm = this

      switch (vm.dialogName) {
        case 'deleteAd':
          if (option === 'confirm') {
            if (vm.transactionType === 'BUY') {
              vm.buyListings.splice(vm.selectedIndex, 1)
            } else {
              vm.sellListings.splice(vm.selectedIndex, 1)
            }

            setTimeout(() => {
              vm.dialogName = 'notifyDeleteAd'
              vm.openDialog = true
            }, 50)
          }
          break
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.btn-transaction {
font-size: 16px;
background-color: rgb(242, 243, 252);
border-radius: 24px;
padding: 4px;
margin-left: 12%;
margin-right: 12%;
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
.btn-custom.active-buy-btn {
background-color: rgb(60, 100, 246) !important;
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
  opacity: .5;
}
.buy-add-btn {
  background-color: rgb(60, 100, 246);
  color: white;
}
.sell-add-btn {
  background-color: #ed5f59;
  color: white;
}
</style>
