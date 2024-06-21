<template>
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
    <div v-if="$route.name === 'p2p-ads'">
      <AdListings />
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
  </template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import FiatAdsDialogs from 'src/components/ramp/fiat/dialogs/FiatAdsDialogs.vue'
import FiatAdsForm from 'src/components/ramp/fiat/FiatAdsForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AdListings from 'src/components/ramp/fiat/AdListings.vue'
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
    HeaderNav,
    AdListings
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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100)
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
