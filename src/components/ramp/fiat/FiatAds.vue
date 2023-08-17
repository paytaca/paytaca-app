<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`min-height: ${minHeight}px;`">
    <div v-if="state !== 'selection'">
      <FiatAdsForm
        @back="onFormBack()"
        @submit="onSubmit()"
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
      <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy Ads</button>
        <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell Ads</button>
      </div>
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-mt-md q-mx-md">
        <q-pull-to-refresh
          @refresh="refreshData">
          <div v-if="listings.length == 0"  class="relative text-center" style="margin-top: 50px;">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
          </div>
          <div v-else>
            <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - (minHeight*.2)}px`" style="overflow:auto;">
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
                              {{ formattedCurrency(listing.price, listing.fiat_currency.symbol) }}
                            </span>
                            <span style="font-size: 12px;">
                              /BCH
                            </span>
                            <div class="row sm-font-size">
                              <span class="q-mr-md">Quantity</span>
                              <span>{{ formattedCurrency(listing.crypto_amount, null, false) }} BCH</span>
                            </div>
                            <div class="row sm-font-size">
                              <span class="q-mr-md">Limit</span>
                              <span> {{ formattedCurrency(listing.trade_floor, listing.fiat_currency.symbol) }} - {{ formattedCurrency(listing.trade_ceiling, listing.fiat_currency.symbol) }} </span>
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
                              @click="onEditAd(listing.id)"
                            />
                            <q-btn
                              outline
                              rounded
                              padding="sm"
                              size="sm"
                              icon="delete"
                              color="grey-6"
                              class="q-ml-xs"
                              @click="onDeleteAd(listing.id)"
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
        </q-pull-to-refresh>
      </div>
    </div>
  </q-card>

  <FiatAdsDialogs
    v-if="openDialog === true"
    :type="dialogName"
    v-on:back="onDialogBack"
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
      loading: false,
      totalPages: null,
      pageNumber: null,
      selectedAdId: null,
      minHeight: this.$q.screen.height - 210
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
      if (vm.pageNumber === null || vm.totalPages === null) {
        if (!vm.listings || vm.listings.length === 0) {
          vm.loading = true
          this.fetchAds()
        }
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
    if (!vm.listings || vm.listings.length === 0) {
      vm.loading = true
    }
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)
    await vm.resetAndRefetchListings()
    vm.loading = false
  },
  methods: {
    async fetchAds (overwrite = false) {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'AD_LIST', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const params = { trade_type: vm.transactionType, owned: true }
      vm.$store.dispatch(
        'ramp/fetchAds',
        { component: 'ads', params: params, headers: headers, overwrite: overwrite })
        .then(response => {
          vm.loading = false
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async loadMoreData (_, done) {
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
    async deleteAd () {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'AD_DELETE', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const url = vm.apiURL + '/ad/' + vm.selectedAdId
      try {
        await vm.$axios.delete(url, { headers: headers })

        setTimeout(() => {
          vm.dialogName = 'notifyDeleteAd'
          vm.openDialog = true
        }, 50)
      } catch (error) {
        console.error(error.response)
      }
      vm.loading = false
    },
    async refreshData (done) {
      console.log('refreshing ads')
      await this.resetAndRefetchListings()
      done()
    },
    async resetAndRefetchListings () {
      const vm = this
      await vm.$store.dispatch('ramp/resetAdsPagination')
      await vm.fetchAds(true)
      vm.updatePaginationValues()
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getAdsTotalPages'](this.transactionType)
      vm.pageNumber = vm.$store.getters['ramp/getAdsPageNumber'](this.transactionType)
    },
    onSubmit () {
      const vm = this
      vm.state = 'selection'
      vm.selectedAdId = null
      vm.resetAndRefetchListings()
    },
    onDialogBack () {
      const vm = this
      vm.openDialog = false
      switch (vm.dialogName) {
        case 'notifyDeleteAd':
          vm.resetAndRefetchListings()
          break
      }
    },
    onFormBack () {
      const vm = this
      vm.state = 'selection'
      vm.selectedAdId = null
    },
    onEditAd (id) {
      const vm = this
      vm.state = 'edit'
      vm.selectedAdId = id
    },
    onDeleteAd (id) {
      const vm = this
      vm.dialogName = 'deleteAd'
      vm.openDialog = true
      vm.selectedAdId = id
    },
    receiveDialogOption (option) {
      const vm = this
      switch (vm.dialogName) {
        case 'deleteAd':
          if (option === 'confirm') {
            vm.deleteAd()
          }
          break
      }
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
    formattedDate (value) {
      return formatDate(value)
    },
    formattedCurrency (value, currency, fiat = true) {
      if (fiat) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
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
