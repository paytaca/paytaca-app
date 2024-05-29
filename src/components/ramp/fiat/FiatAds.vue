<template>
  <!-- back button -->
  <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="pageName != 'main'" @click="customBack"></div>
  <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>

  <div
    v-if="state === 'selection'"
    class="q-mx-md q-mx-none q-mb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <div class="q-mb-lg q-pb-lg q-pt-xs">
      <div class="row justify-start items-center q-mx-none">
        <div
          class="col-8 row br-15 text-center pt-card btn-transaction md-font-size"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
          <button
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-buy-btn': transactionType == 'BUY'}"
            @click="transactionType='BUY'">
            Buy Ads
          </button>
          <button
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-sell-btn': transactionType == 'SELL'}"
            @click="transactionType='SELL'">
            Sell Ads
          </button>
        </div>
        <div class="col">
          <q-btn
            rounded
            no-caps
            padding="sm"
            icon="add"
            :class="transactionType === 'BUY'? 'buy-add-btn': 'sell-add-btn'"
            @click="() => {
              state = 'create'
              pageName = 'ad-form-1'
            }"
          />
        </div>
      </div>
      <!-- </q-pull-to-refresh> -->
      <div class="q-mt-md q-mx-md">
        <!-- <q-pull-to-refresh @refresh="refreshData"> -->
          <div v-if="listings.length == 0"  class="relative text-center" style="margin-top: 50px;">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
          </div>
          <div v-else>
            <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - 90}px`" style="overflow:auto;">
              <q-pull-to-refresh :scroll-target="scrollTargetRef" @refresh="refreshData">
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
                                class="q-mb-none text-uppercase pt-label"
                                :class="getDarkModeClass(darkMode)"
                                style="font-size: 13px;">
                                {{ listing.price_type }}
                              </span><br>
                              <div class="row q-gutter-md">
                                <span>{{ listing.trade_count }} trades</span>
                                <span>{{ listing.completion_rate }}% completion</span>
                              </div>
                              <span class="text-weight-bold pt-label col-transaction lg-font-size" :class="getDarkModeClass(darkMode)">
                                {{ listing.fiat_currency.symbol  }} {{ formatCurrency(listing.price, listing.fiat_currency.symbol).replace(/[^\d.,-]/g, '') }}
                              </span>
                              <span class="sm-font-size">/BCH</span>
                              <div class="sm-font-size row q-gutter-md">
                                <span>Quantity</span>
                                <span>{{ formatCurrency(listing.trade_amount, tradeAmountCurrency(listing)) }} {{ tradeAmountCurrency(listing) }}</span>
                              </div>
                              <div class="sm-font-size row q-gutter-md">
                                <span>Limits</span>
                                <span>{{ formatCurrency(listing.trade_floor, tradeLimitsCurrency(listing)) }} - {{ formatCurrency(minTradeAmount(listing), tradeLimitsCurrency(listing)) }} {{ tradeLimitsCurrency(listing) }}</span>
                              </div>
                              <div class="sm-font-size">
                                <span>Appealable in </span>
                                <span class="text-weight-bold">{{ appealCooldown(listing.appeal_cooldown).label }}</span>
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
                                  disable
                                  padding="xs sm"
                                  size="sm"
                                  class="q-ml-xs text-weight-bold"
                                  :color="listing.is_public ? darkMode ? 'green-13' : 'green-8' : darkMode ? 'red-13' : 'red'"
                                  :icon="listing.is_public ? 'visibility' : 'visibility_off'">
                                  <span class="q-mx-xs">{{ listing.is_public ? 'public' : 'private'}}</span>
                                </q-btn>
                              </div>
                            </div>
                          </div>
                          <div class="q-gutter-sm q-pt-xs">
                            <q-badge v-for="(method, index) in listing.payment_methods" :key="index" rounded outline :color="darkMode ? 'white': 'black'" :label="method.payment_type.name" />
                          </div>
                        </div>
                      </q-item-section>
                    </q-item>
                  </div>
                </q-infinite-scroll>
              </q-pull-to-refresh>
            </q-list>
          </div>
        <!-- </q-pull-to-refresh> -->
      </div>
    </div>
    <q-inner-loading :showing="loading">
      <ProgressLoader/>
    </q-inner-loading>
  </div>
  <FiatAdsForm
    ref="fiatAdsForm"
    v-if="state !== 'selection'"
    @back="onFormBack()"
    @submit="onSubmit()"
    :adsState="state"
    :transactionType="transactionType"
    :selectedAdId="selectedAdId"
    @update-page-name="(val) => {
        pageName = val
      }"
  />
  <FiatAdsDialogs
    v-if="openDialog === true"
    :type="dialogName"
    v-on:back="onDialogBack"
    v-on:selected-option="receiveDialogOption"
  />
  <MiscDialogs
    v-if="openMiscDialog"
    :type="dialogName"
    @back="openMiscDialog = false"
    @submit="receiveFilter"
  />
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import FiatAdsDialogs from './dialogs/FiatAdsDialogs.vue'
import FiatAdsForm from './FiatAdsForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { formatCurrency, formatDate, getAppealCooldown } from 'src/wallet/ramp'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

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
    FiatAdsDialogs,
    MiscDialogs,
    ProgressLoader,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      openMiscDialog: false,
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
      pageName: 'main',
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
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
      vm.resetAndRefetchListings()
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
  mounted () {
    this.resetAndRefetchListings()
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    customBack () {
      const vm = this
      switch (vm.pageName) {
        case 'ad-form-1':
          vm.onFormBack()
          vm.pageName = 'main'
          break
        case 'ad-form-2':
          vm.$refs.fiatAdsForm.step--
          vm.pageName = 'ad-form-1'
          break
        case 'ad-form-3':
          vm.$refs.fiatAdsForm.step--
          vm.pageName = 'ad-form-2'
          break
      }
    },
    tradeAmountCurrency (ad) {
      return (ad.trade_amount_in_fiat ? ad.fiat_currency.symbol : ad.crypto_currency.symbol)
    },
    tradeLimitsCurrency (ad) {
      return (ad.trade_limits_in_fiat ? ad.fiat_currency.symbol : ad.crypto_currency.symbol)
    },
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
    appealCooldown (appealCooldownChoice) {
      return getAppealCooldown(appealCooldownChoice)
    },
    fetchAds (overwrite = false) {
      const vm = this
      const params = {
        trade_type: vm.transactionType,
        owned: true
      }
      vm.loading = true
      vm.$store.dispatch('ramp/fetchAds', { component: 'ads', params: params, overwrite: overwrite })
        .then(() => {
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
    },
    loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      vm.updatePaginationValues()
      if (vm.pageNumber < vm.totalPages) {
        vm.fetchAds()
      }
      done()
    },
    deleteAd () {
      const vm = this
      backend.delete(`/ramp-p2p/ad/${vm.selectedAdId}`, { authorize: true })
        .then(() => {
          setTimeout(() => {
            vm.dialogName = 'notifyDeleteAd'
            vm.openDialog = true
          }, 50)
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    refreshData (done) {
      this.resetAndRefetchListings()
      done()
    },
    resetAndRefetchListings () {
      const vm = this
      vm.$store.commit('ramp/resetAdsPagination')
      vm.fetchAds(true)
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
    onEditAd (id) {
      const vm = this
      vm.state = 'edit'
      vm.selectedAdId = id
      vm.pageName = 'ad-form-1'
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
