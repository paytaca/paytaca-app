<template>
  <div v-if="state === 'selection'"
    class="q-mx-md q-mx-none q-mb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <div class="q-mb-lg q-pb-lg q-pt-xs">
      <q-pull-to-refresh @refresh="refreshData">
        <div class="row justify-start items-center q-mx-none">
          <div
            class="col-8 row br-15 text-center pt-card btn-transaction md-font-size"
            :class="getDarkModeClass(darkMode)"
            :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
            <button
              class="col-grow br-15 btn-custom fiat-tab q-mt-none"
              :class="{'dark': darkMode, 'active-buy-btn': transactionType == 'BUY'}"
              @click="transactionType='BUY'">
              {{ $t('BuyAds') }}
            </button>
            <button
              class="col-grow br-15 btn-custom fiat-tab q-mt-none"
              :class="{'dark': darkMode, 'active-sell-btn': transactionType == 'SELL'}"
              @click="transactionType='SELL'">
              {{ $t('SellAds') }}
            </button>
          </div>
          <div class="col">
            <q-btn
              rounded
              no-caps
              padding="sm"
              icon="add"
              :disable="disableCreateBtn"
              :class="transactionType === 'BUY'? 'buy-add-btn': 'sell-add-btn'"
              @click="onCreateAd()"
            />
          </div>
        </div>
      </q-pull-to-refresh>
      <div class="q-mt-md q-mx-md">
        <div v-if="listings.length == 0"  class="relative text-center" style="margin-top: 50px;">
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
            <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 90}px`" style="overflow:auto;">
              <div v-for="(listing, index) in listings" :key="index">
                <q-item>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            class="q-mb-none text-uppercase pt-label"
                            :class="getDarkModeClass(darkMode)"
                            style="font-size: 13px;">
                            {{ listing.price_type }}
                          </span><br>
                          <div class="row q-gutter-md">
                            <span>
                              {{
                                $t(
                                  'TradeCount',
                                  { count: listing.trade_count },
                                  `${ listing.trade_count } trades`
                                )
                              }}
                            </span>
                            <span>
                              {{
                                $t(
                                  'CompletionPercentage',
                                  { percentage: Number(listing.completion_rate?.toFixed(2)) },
                                  `${ Number(listing.completion_rate?.toFixed(2)) }% completion`
                                )
                              }}
                            </span>
                          </div>
                          <span class="text-weight-bold pt-label col-transaction lg-font-size" :class="getDarkModeClass(darkMode)">
                            {{ listing.fiat_currency.symbol  }} {{ formatCurrency(listing.price, listing.fiat_currency.symbol).replace(/[^\d.,-]/g, '') }}
                          </span>
                          <span class="sm-font-size">/BCH</span>
                          <div class="sm-font-size row q-gutter-md" :class="listing.trade_amount === 0 ? 'text-red': ''">
                            <span>{{ $t('Quantity') }}</span>
                            <span>{{ formatCurrency(listing.trade_amount, tradeAmountCurrency(listing)) }} {{ tradeAmountCurrency(listing) }}</span>
                          </div>
                          <div class="sm-font-size row q-gutter-md" :class="listing.trade_amount === 0 ? 'text-red': ''">
                            <span>{{ $t('Limits') }}</span>
                            <span>{{ formatCurrency(listing.trade_floor, tradeLimitsCurrency(listing)) }} - {{ formatCurrency(listing.trade_ceiling, tradeLimitsCurrency(listing)) }} {{ tradeLimitsCurrency(listing) }}</span>
                          </div>
                          <div class="sm-font-size">
                            <span>
                              {{
                                $t(
                                  'AppealableInCooldown',
                                  { cooldown: appealCooldown(listing.appeal_cooldown).label },
                                  `Appealable in ${ appealCooldown(listing.appeal_cooldown).label }`
                                )
                              }}
                            </span>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="row q-gutter-xs justify-end">
                            <q-btn
                              outline
                              rounded
                              padding="sm"
                              icon="edit"
                              size="sm"
                              color="button"
                              @click="onEditAd(listing.id)"
                            />
                            <q-btn
                              outline
                              rounded
                              padding="sm"
                              size="sm"
                              icon="delete"
                              color="button"
                              @click="onDeleteAd(listing.id)"
                            />
                          </div>
                          <div class="row justify-end q-mt-sm">
                            <q-btn
                              outline
                              rounded
                              padding="xs sm"
                              size="sm"
                              class="q-ml-xs text-weight-bold"
                              :loading="visibilityLoading[listing.id]"
                              :color="listing.is_public ? darkMode ? 'green-13' : 'green-8' : darkMode ? 'red-13' : 'red'"
                              :icon="listing.is_public ? 'visibility' : 'visibility_off'"
                              @click="onToggleAdVisibility(listing, index)">
                              <span class="q-mx-xs">{{ listing.is_public ? 'public' : 'private'}}</span>
                            </q-btn>
                          </div>
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-xs">
                        <q-badge v-for="(method, index) in listing.payment_methods" :key="index" rounded outline :color="darkMode ? 'white': 'black'">
                          {{ typeof(method) === 'object' ? method?.payment_type?.short_name : method }}
                        </q-badge>
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
  </div>
  <FiatAdsDialogs
    v-if="openDialog"
    :type="dialogName"
    v-on:back="onDialogBack"
    v-on:selected-option="receiveDialogOption"
  />
  <MiscDialogs
    v-if="openMiscDialog"
    type="info"
    :action="dialogName"
    @back="openMiscDialog = false"
    @submit="receiveFilter"
  />
</template>
<script>
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import FiatAdsDialogs from 'src/components/ramp/fiat/dialogs/FiatAdsDialogs.vue'
import { formatCurrency, getAppealCooldown } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'

export default {
  setup () {
    const scrollTarget = ref(null)
    return {
      scrollTarget
    }
  },
  components: {
    FiatAdsDialogs,
    MiscDialogs
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      openMiscDialog: false,
      openDialog: false,
      dialogName: '',
      transactionType: this.$store.getters['ramp/adListingTab'],
      state: 'selection', // 'create' 'edit'
      loading: false,
      totalPages: null,
      pageNumber: null,
      selectedAdId: null,
      pageName: 'main',
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      loadingMoreData: false,
      listings: [],
      displayEmptyList: false,
      disableCreateBtn: false,
      visibilityLoading: {}
    }
  },
  watch: {
    state (val) {
      if (val === 'create') {
        this.$router.push({ name: 'ads-create' })
      }
    },
    transactionType (value) {
      const vm = this
      vm.disableCreateBtn = true
      vm.displayEmptyList = false
      vm.scrollToTop()
      vm.resetAndRefetchListings()
      vm.checkAdLimit()
      vm.$store.commit('ramp/updateAdListingTab', value)
    }
  },
  computed: {
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
  mounted () {
    this.resetAndRefetchListings()
    this.resetListings()
    this.checkAdLimit()
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    async getFiatCurrencies () {
      try {
        const { data: currencies } = await backend.get('/ramp-p2p/ad/currency/', { params: { trade_type: this.transactionType }, authorize: true })
        console.log('currencies: ', currencies)
        this.disableCreateBtn = currencies.length === 0
      } catch (error) {
        this.handleRequestError(error)
      }
    },
    checkAdLimit () {
      const showAdLimitMessage = this.$store.getters['ramp/showAdLimitMessage']
      if (showAdLimitMessage) {
        backend.get('ramp-p2p/ad/check/limit/', { params: { trade_type: this.transactionType }, authorize: true })
          .then(response => {
            console.log(response)
            if (response.data?.exceeds_limit) {
              bus.emit('post-notice', 'ad-limit')
            }
          })
          .catch(error => {
            this.handleRequestError(error)
          })
      }
    },
    resetListings (append = false, newData = []) {
      const vm = this
      switch (vm.transactionType) {
        case 'BUY':
          if (!append) {
            vm.listings = [...vm.buyListings]
          } else {
            vm.listings = [...vm.listings, ...newData]
          }
          break
        case 'SELL':
          if (!append) {
            vm.listings = [...vm.sellListings]
          } else {
            vm.listings = [...vm.listings, ...newData]
          }
      }
    },
    onToggleAdVisibility (ad, index) {
      this.toggleAdVisibility(ad, index)
    },
    tradeAmountCurrency (ad) {
      return (ad.trade_limits_in_fiat ? ad.fiat_currency.symbol : ad.crypto_currency.symbol)
    },
    tradeLimitsCurrency (ad) {
      return (ad.trade_limits_in_fiat ? ad.fiat_currency.symbol : ad.crypto_currency.symbol)
    },
    appealCooldown (appealCooldownChoice) {
      return getAppealCooldown(appealCooldownChoice)
    },
    async fetchAds (overwrite = false) {
      const vm = this
      const args = {
        component: 'ads',
        params: {
          trade_type: vm.transactionType,
          owned: true
        },
        overwrite: overwrite
      }
      await vm.$store.dispatch('ramp/fetchAds', args)
        .then(response => {
          vm.updatePaginationValues()
          vm.resetListings(this.loadingMoreData, response)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async toggleAdVisibility (ad, index) {
      if (!ad) return
      this.visibilityLoading[ad.id] = true
      await backend.put(`ramp-p2p/ad/${ad.id}/`, { is_public: !ad.is_public }, { authorize: true })
        .then(response => {
          this.listings[index].is_public = response.data.is_public
        })
        .catch(error => {
          this.handleRequestError(error)
        })
      this.visibilityLoading[ad.id] = false
    },
    async loadMoreData () {
      const vm = this
      if (!vm.hasMoreData) {
        return
      }
      vm.updatePaginationValues()
      vm.loadingMoreData = true
      if (vm.pageNumber < vm.totalPages) {
        await vm.fetchAds()
      }
      vm.loadingMoreData = false
    },
    async deleteAd () {
      const vm = this
      await backend.delete(`/ramp-p2p/ad/${vm.selectedAdId}/`, { authorize: true })
        .then(() => {
          setTimeout(() => {
            vm.dialogName = 'notifyDeleteAd'
            vm.openDialog = true
          }, 50)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    refreshData (done) {
      done()
      this.resetAndRefetchListings()
    },
    async resetAndRefetchListings () {
      const vm = this
      vm.displayEmptyList = false
      vm.$store.commit('ramp/resetAdsPagination')
      vm.loading = true
      await vm.fetchAds(true)

      setTimeout(() => {
        vm.displayEmptyList = true
      }, 150)

      vm.getFiatCurrencies()
      vm.loading = false
    },
    updatePaginationValues () {
      const vm = this
      vm.totalPages = vm.$store.getters['ramp/getAdsTotalPages'](this.transactionType)
      vm.pageNumber = vm.$store.getters['ramp/getAdsPageNumber'](this.transactionType)
    },
    openFilter () {
      this.dialogName = 'filterAd'
      this.openMiscDialog = true
    },
    receiveFilter (data) {
      this.openMiscDialog = false
    },
    onSubmit () {
      const vm = this
      vm.state = 'selection'
      vm.selectedAdId = null
      vm.resetAndRefetchListings()
      bus.emit('show-menu', 'ads')
      vm.pageName = 'main'
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
      bus.emit('show-menu', 'ads')
    },
    onCreateAd () {
      this.$router.push({ name: 'p2p-ads-create-form', query: { type: this.transactionType, step: 1 } })
    },
    onEditAd (id) {
      const vm = this
      vm.state = 'edit'
      vm.selectedAdId = id
      vm.pageName = 'ad-form-1'
      this.$router.push({ name: 'p2p-ads-edit-form', params: { ad: id }, query: { step: 1 } })
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
    scrollToTop () {
      if (this.$refs.scrollTarget) {
        this.$refs.scrollTarget.$el.scrollTop = 0
      }
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

  .lg-font-size {
    font-size: large;
  }

  .md-font-size {
    font-size: medium;
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
  .btn-custom.dark {
    background-color: #1c2833;
  }
  .col-transaction {
    padding-top: 2px;
    font-weight: 500;
  }
  .buy-add-btn {
    background-color: rgb(60, 100, 246);
    color: white;
  }
  .sell-add-btn {
    background-color: #ed5f59;
    color: white;
  }
  .back-btn {
    background-color: transparent;
    height: 50px;
    width: 70px;
    z-index: 1;
    left: 10px;
  }
  </style>
