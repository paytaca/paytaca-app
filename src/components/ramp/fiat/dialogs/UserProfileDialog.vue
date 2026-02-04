<template>
  <q-dialog full-width no-shake position="bottom" v-model="showDialog" @before-hide="$emit('back')">
    <q-card
        v-if="!selectedListing && state === 'initial'"
        class="br-15 q-pt-sm text-bow bottom-card"
        :class="getDarkModeClass(darkMode)"
        :style="`height: ${minHeight}px; background-color: ${darkMode ? '#212f3d' : 'white'}`">
        <div v-if="!isloaded">
            <div class="row justify-center q-py-lg" style="margin-top: 50px">
            <ProgressLoader />
            </div>
        </div>
        <div v-else>
            <div v-if="state === 'initial'">
            <div v-if="user" class="q-mt-lg q-pt-md">
                <div class="text-center q-pt-none">
                    <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
                    <div class="text-weight-bold lg-font-size q-pt-sm">{{ user.name }}</div>
                </div>
                <!-- User Stats -->
                <div class="row justify-center q-px-sm">
                    <q-rating readonly :model-value="user.rating ? user.rating : 0" :v-model="user.rating" size="1.2em" color="yellow-9" icon="star"/>
                    <span class="q-mx-sm sm-font-size">
                      {{
                        $t(
                          'RatingValue',
                          { rating: user.rating ? user.rating?.toFixed(1) : 0 },
                          `(${ user.rating ? user.rating?.toFixed(1) : 0 } rating)`
                        )
                      }}
                    </span>
                </div>
                <div class="text-center sm-font-size q-pt-sm">
                    <span>
                      {{
                        $t(
                          'TradeCount',
                          { count: user.trade_count },
                          `${ user.trade_count || 0 } trades`
                        )
                      }}
                    </span>
                    &nbsp;&nbsp;
                    <span>|</span>
                    &nbsp;&nbsp;
                    <span>
                      {{
                        $t(
                          'CompletionPercentage',
                          { percentage: user.completion_rate ? user.completion_rate.toFixed(1) : 0 },
                          `${ user.completion_rate ? user.completion_rate.toFixed(1) : 0 }% completion`
                        )
                      }}
                    </span>
                </div>
            </div>
            <div class="row q-mb-sm br-15 text-center pt-card btn-transaction md-font-size" :class="getDarkModeClass(darkMode)" :style="`background-color: ${darkMode ? '' : '#f2f3fc !important;'}`">
                <button class="col-grow br-15 btn-custom fiat-tab q-mt-none" :class="{'dark': darkMode, 'active-btn': user.self === false && activeTab === 'reviews'}" @click="activeTab = 'reviews'"> {{ $t('REVIEWS') }} </button>
                <button v-if="!user?.self" class="col-grow br-15 btn-custom fiat-tab q-mt-none" :class="{'dark': darkMode, 'active-btn': activeTab === 'ads'}" @click="activeTab = 'ads'">ADS</button>
            </div>
            <q-scroll-area :style="`height: ${minHeight - 260}px`" style="overflow-y:auto;">
                <!-- Reviews tab -->
                <div v-if="activeTab === 'reviews'">
                    <div v-if="!loadingReviews && reviewsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
                      {{ $t('NoReviewsYet') }}
                    </div>
                    <div v-else class="q-mx-lg q-px-md">
                        <div class="q-pt-md" v-for="(review, index) in reviewsList" :key="index">
                            <div class="text-weight-bold sm-font-size">{{  userNameView(review.from_peer.name) }}</div>
                            <span class="row subtext">{{ formattedDate(review.created_at) }}</span>
                            <div class="sm-font-text">
                            <q-rating
                                readonly
                                v-model="review.rating"
                                size="1.5em"
                                color="yellow-9"
                                icon="star"
                            />
                            <span class="q-mx-sm sm-font-size">({{ review.rating ? review.rating?.toFixed(1) : 0}})</span>
                            </div>
                            <div v-if="review.comment.length > 0" class="q-pt-sm q-px-xs sm-font-size">
                            {{ review.comment }}
                            </div>
                            <q-separator :dark="darkMode" class="q-mt-md"/>
                        </div>
                        <div class="row justify-center" v-if="loadingReviews">
                            <q-spinner-dots size="35px"/>
                        </div>
                        <div class="row" v-else-if="hasMoreReviewsData">
                            <q-btn
                            dense
                            flat
                            class="col text-center text-blue sm-font-size"
                            @click=loadMoreData>
                            {{ $t('viewmore') }}
                            </q-btn>
                        </div>
                    </div>
                </div>
                <!-- Ads tab -->
                <div v-if="activeTab === 'ads'">
                    <div v-if="!loadingAds && adsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
                        {{ $t('NoAdsYet') }}
                    </div>
                    <div v-else class="q-mx-lg">
                        <q-item class="q-py-none" v-for="(ad, index) in adsList" :key="index" clickable @click="selectAd(ad)">
                        <q-item-section>
                            <div class="q-py-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                            <q-badge class="row" rounded :color="ad.trade_type === 'SELL'? 'blue': 'red'">{{ ad.trade_type }}</q-badge>
                            <span class="row text-uppercase text-weight-bold lg-font-size pt-label" :class="getDarkModeClass(darkMode)">
                              {{ ad?.fiat_currency?.symbol }} {{ formatCurrency(ad.price, ad?.fiat_currency?.symbol) }}
                            </span>
                            <div class="sm-font-size">
                                <div class="row">
                                <span class="col-3">{{ $t('Quantity') }}</span>
                                <span class="col">{{ formatCurrency(ad.trade_amount, tradeAmountCurrency(ad)) }} {{  tradeAmountCurrency(ad) }}</span>
                                </div>
                                <div class="row">
                                <span class="col-3">{{ $t('Limit') }}</span>
                                <span class="col"> {{ formatCurrency(ad.trade_floor, tradeLimitsCurrency(ad)) }} - {{ formatCurrency(minTradeAmount(ad), tradeLimitsCurrency(ad)) }} {{ tradeLimitsCurrency(ad) }}</span>
                                </div>
                            </div>
                            <div class="row sm-font-size q-gutter-md">
                              <span>
                                {{
                                  $t(
                                    'AppealableInCooldown',
                                    { cooldown: appealCooldown(ad.appeal_cooldown).label },
                                    `Appealable in ${ appealCooldown(ad.appeal_cooldown).label }`
                                  )
                                }}
                              </span>
                            </div>
                            </div>
                        </q-item-section>
                        </q-item>
                        <div class="row justify-center" v-if="loadingAds">
                        <q-spinner-dots size="35px"/>
                        </div>
                        <div class="row" v-else-if="hasMoreAdsData">
                        <q-btn
                            dense
                            flat
                            class="col text-center text-blue sm-font-size"
                            @click=loadMoreData>
                            {{ $t('viewmore') }}
                        </q-btn>
                        </div>
                    </div>
                </div>
            </q-scroll-area>
            </div>
        </div>
    </q-card>
    </q-dialog>
  </template>
<script>
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { formatDate, formatCurrency, getAppealCooldown } from 'src/exchange'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      showDialog: true,
      isloaded: false,
      user: null,
      editNickname: false,
      activeTab: 'reviews', // 'reviews | 'ads'
      state: 'initial',
      reviewsList: [],
      adsList: [],
      retry: false,
      selectedListing: null,

      reviewsTotalPages: null,
      reviewsPageNumber: 1,
      loadingReviews: false,

      adsTotalPages: null,
      adsPageNumber: 1,
      loadingAds: false,
      showUserProfile: true,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (90 + 120) : this.$q.screen.height - (60 + 100)
    }
  },
  props: {
    userInfo: Object,
    clickableAds: {
      type: Boolean,
      default: true
    }
  },
  emits: ['back'],
  components: {
    ProgressLoader
  },
  watch: {
    activeTab (value) {
      if (value === 'ads') {
        this.fetchAds()
        this.reviewsList = []
        this.reviewsPageNumber = 1
      }
      if (value === 'reviews') {
        this.fetchReviews()
        this.adsList = []
        this.adsPageNumber = 1
      }
    }
  },
  computed: {
    hasMoreReviewsData () {
      return this.reviewsPageNumber < this.reviewsTotalPages
    },
    hasMoreAdsData () {
      return this.adsPageNumber < this.adsTotalPages
    }
  },
  mounted () {
    this.processUserData()
    this.fetchReviews()
  },
  methods: {
    getDarkModeClass,
    formatCurrency,
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
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
      return Math.min.apply(null, [tradeAmount, tradeCeiling])
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    processUserData () {
      let self = false
      if (this.userInfo) {
        this.user = this.userInfo
        self = this.userInfo.self
      } else {
        this.user = { ...this.$store.getters['ramp/getUser'] }
        self = true
      }
      this.getUserInfo(this.user.id).then(user => {
        this.user = user
        this.user.self = self
      })
    },
    getUserInfo (userId) {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get(`/ramp-p2p/peer/${userId}/`, { authorize: true })
          .then(response => {
            vm.isloaded = true
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            vm.isloaded = true
            reject(error)
          })
      })
    },
    loadMoreData () {
      const vm = this
      if (vm.activeTab === 'ads') {
        if (!vm.hasMoreAdsData) return
        vm.adsPageNumber++
        vm.fetchAds()
      }
      if (vm.activeTab === 'reviews') {
        if (!vm.hasMoreReviewsData) return
        vm.reviewsPageNumber++
        vm.fetchReviews()
      }
    },
    fetchReviews () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loadingReviews = true
        const params = {
          limit: 5,
          page: vm.reviewsPageNumber,
          to_peer: this.user?.id
        }
        backend.get('/ramp-p2p/order/feedback/peer/', {
          params: params,
          authorize: true
        })
          .then(response => {
            if (response.data) {
              vm.reviewsList.push(...response.data.feedbacks)
              vm.reviewsTotalPages = response.data.total_pages
            }
            vm.loadingReviews = false
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            vm.loadingReviews = false
            reject(error)
          })
      })
    },
    fetchAds () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loadingAds = true
        const params = {
          limit: 5,
          page: vm.adsPageNumber,
          owner_id: vm.user.id
        }
        params.to_peer = this.userId
        backend.get('/ramp-p2p/ad/', {
          params: params,
          authorize: true
        })
          .then(response => {
            if (response.data) {
              vm.adsList.push(...response.data.ads)
              vm.adsTotalPages = response.data.total_pages
            }
            vm.loadingAds = false
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            vm.loadingAds = false
            reject(error)
          })
      })
    },
    selectAd (ad) {
      if (this.clickableAds) {
        this.$router.push({ name: 'p2p-store-form', params: { ad: ad?.id } })
      }
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    appealCooldown (appealCooldownChoice) {
      return getAppealCooldown(appealCooldownChoice)
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
  <style lang="scss" scoped>
  .xs-font-size {
    font-size: x-small;
  }
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }

  .lg-font-size {
    font-size: large;
  }
  .subtext {
    opacity: .5;
  }
  .btn-transaction {
    font-size: 14px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    margin-left: 10%;
    margin-right: 10%;
    margin-top: 10px;
  }
  .btn-custom {
    height: 30px;
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
  .btn-custom.active-btn {
    background-color: rgb(60, 100, 246) !important;
    color: #fff !important;
  }
  .btn-custom.dark {
    background-color: #1c2833;
  }
  .col-transaction {
    padding-top: 2px;
    font-weight: 500;
  }
  </style>
