<template>
  <!-- <div class="fixed back-btn" :style="$q.platform.is.ios ? 'top: 45px;' : 'top: 10px;'" v-if="pageName && pageName != 'main'" @click="customBack"></div> -->
  <div v-if="!$route.query?.edit">
    <HeaderNav :title="`P2P Exchange`" :backnavpath="previousRoute"/>
    <div class="q-mx-md q-mb-lg q-pb-lg text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="`height: ${minHeight}px;`">
      <div v-if="!isloaded">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
        </div>
      </div>
      <div v-else>
        <q-pull-to-refresh @refresh="refreshData">
          <div v-if="user" class="q-mb-lg">
            <div class="text-center q-pt-none">
              <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
              <div class="text-weight-bold lg-font-size q-pt-sm">
                <span id="target-name">{{ user.name }}</span>
                <q-icon
                class="q-ml-xs"
                size="1em"
                color="green"
                name="circle"/>
                <q-icon
                  @click="editNickname = true"
                  v-if="user?.self"
                  size="xs"
                  name='edit_square'
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                />
              </div>
            </div>
            <!-- Edit Payment Methods -->
            <div class="row q-mx-lg q-px-md q-pt-md" v-if="user?.self">
              <q-btn
                rounded
                no-caps
                :label="$t('EditPaymentMethods')"
                color="blue-8"
                class="q-space q-mx-md button"
                @click="onEditPayments"
                icon="o_payments"
                >
              </q-btn>
            </div>

            <!-- <div class="row q-mx-lg q-px-md q-pt-md" v-if="type !== 'self'">
              <q-btn
                rounded
                no-caps
                label="See User Ads"
                color="blue-8"
                class="q-space"
                icon="sym_o_sell"
                @click="fetchUserAds()"
                >
              </q-btn>
            </div> -->

            <!-- User Stats -->
            <div class="row justify-center q-px-sm q-pt-sm">
              <q-rating
                readonly
                :model-value="user.rating ? user.rating : 0"
                :v-model="user.rating"
                size="1.5em"
                color="yellow-9"
                icon="star"
                icon-half="star_half"
              />
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
        </q-pull-to-refresh>
        <div
          class="row q-mb-sm br-15 text-center pt-card btn-transaction md-font-size"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
          <button
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-btn': user?.self === false && activeTab === 'reviews'}"
            @click="activeTab = 'reviews'">
            {{ $t('REVIEWS') }}
          </button>
          <button
            v-if="!user?.self"
            class="col-grow br-15 btn-custom fiat-tab q-mt-none"
            :class="{'dark': darkMode, 'active-btn': activeTab === 'ads'}"
            @click="activeTab = 'ads'">
            {{ $t('ADS') }}
          </button>
        </div>
        <q-scroll-area :style="`height: ${!user?.self ? minHeight - 240 : minHeight - 280}px`" style="overflow-y:auto;">
          <!-- Reviews tab -->
          <div v-if="activeTab === 'reviews'">
            <div v-if="!loadingReviews && reviewsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
              {{ $t('NoReviewsYet') }}
            </div>
            <div v-else class="q-mx-lg q-px-md">
                <div class="q-pt-md" v-for="(review, index) in reviewsList" :key="index">
                  <div class="text-weight-bold sm-font-size">{{ userNameView(review.from_peer.name) }}</div>
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
                    <q-badge rounded :color="ad.trade_type === 'SELL'? 'blue': 'red'">{{ ad.trade_type }}</q-badge>
                    <div class="sm-font-size q-mr-sm">
                      <span class="q-mr-sm">
                        {{
                          $t(
                            'TradeCount',
                            { count: ad.trade_count },
                            `${ ad.trade_count || 0 } trades`
                          )
                        }}
                      </span>
                      <span class="q-ml-sm">
                        {{
                          $t(
                            'CompletionPercentage',
                            { percentage: formatCompletionRate(ad.completion_rate) },
                            `${ formatCompletionRate(ad.completion_rate) }% completion`
                          )
                        }}
                      </span><br>
                    </div>
                    <span
                      class="col-transaction text-uppercase text-weight-bold lg-font-size pt-label"
                      :class="getDarkModeClass(darkMode)">
                      {{ formattedCurrency(ad.price, ad?.fiat_currency?.symbol) }}
                    </span>
                    <span class="sm-font-size">/BCH</span><br>
                    <div class="sm-font-size">
                      <div class="row">
                        <span class="col-3">{{ $t('Quantity') }}</span>
                        <span class="col">{{ formattedCurrency(ad.trade_amount, false) }} BCH</span>
                      </div>
                      <div class="row">
                        <span class="col-3">{{ $t('Limit') }}</span>
                        <span class="col"> {{ parseFloat(ad.trade_floor) }} {{ ad.crypto_currency?.symbol }}  - {{ parseFloat(ad.trade_amount) }} {{ ad.crypto_currency?.symbol }}</span>
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
  </div>
  <AddPaymentMethods ref="addPaymentMethods" v-if="$route.query?.edit === 'payments'" :type="'Profile'"/>
  <MiscDialogs ref="misc" v-if="editNickname" :type="'editNickname'" v-on:back="editNickname = false" v-on:submit="updateUserName"/>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import AddPaymentMethods from 'src/components/ramp/fiat/AddPaymentMethods.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import FeedbackDialog from 'src/components/ramp/fiat/dialogs/FeedbackDialog.vue'
import { updateChatIdentity } from 'src/exchange/chat'
import { formatDate, formatCurrency, getAppealCooldown } from 'src/exchange'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { loadLibauthHdWallet } from 'src/wallet'

export default {
  components: {
    MiscDialogs,
    AddPaymentMethods,
    ProgressLoader,
    FeedbackDialog,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isloaded: false,
      user: null,
      editNickname: false,
      activeTab: 'reviews', // 'reviews | 'ads'
      state: 'initial',
      reviewsList: [],
      adsList: [],
      openReviews: false,
      retry: false,
      selectedListing: null,

      reviewsTotalPages: null,
      reviewsPageNumber: 1,
      loadingReviews: false,

      adsTotalPages: null,
      adsPageNumber: 1,
      loadingAds: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (80 + 120) : this.$q.screen.height - (50 + 100),
      pageName: null,
      previousRoute: null,
      errorDialogActive: false,
      wallet: null
    }
  },
  props: {
    userInfo: Object
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
    })
  },
  emits: ['back', 'updatePageName', 'selectListing'],
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
  created () {
    bus.on('relogged', this.refreshData)
  },
  async mounted () {
    await this.loadWallet()
    if (!this.userInfo) {
      this.pageName = 'main'
    }
    this.fetchUser()
    this.fetchReviews()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async loadWallet () {
      const isChipnet = this.$store.getters['global/isChipnet']
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.wallet = await loadLibauthHdWallet(walletIndex, isChipnet)
    },
    onNavBack () {
      const currentRoute = this.$route.path
      if (currentRoute === this.previousRoute) {
        this.previousRoute = '/apps/exchange/peer-to-peer/store/'
      }
    },
    async onEditPayments () {
      this.state = 'edit-pm'
      if (!this.userInfo) {
        this.pageName = this.state
      } else {
        this.$emit('updatePageName', this.state)
      }
      await this.$router.push({ query: { edit: 'payments' } })
    },
    async refreshData (done) {
      this.fetchUser()
      this.fetchReviews()
      if (done) done()
    },
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
    },
    onBackPM () {
      this.$refs.addPaymentMethods.onBack()
    },
    customBack () {
      const vm = this
      switch (vm.pageName) {
        case 'edit-pm':
          vm.onBackPM()
          vm.pageName = 'main'
          break
      }
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    async fetchUser () {
      const vm = this
      const user = await backend.get(`/ramp-p2p/peer/`, { authorize: true })
        .then(response => {
          this.user = response.data
          this.user.self = true
        })
        .catch(error => {
          this.handleRequestError(error)
        })
        .finally(() => {
          vm.isloaded = true
        })
      return user
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
    async updateUserName (info) {
      const vm = this
      backend.patch('/ramp-p2p/peer/', { name: info.nickname }, { authorize: true })
        .then(response => {
          vm.$store.commit('ramp/updateUser', response.data)
          const payload = {
            id: this.user.chat_identity_id,
            name: response.data.name
          }
          vm.retry = true
          vm.exponentialBackoff(updateChatIdentity, 5, 1000, payload)
          this.fetchUser()
          this.editNickname = false
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    exponentialBackoff (fn, retries, delayDuration, ...info) {
      const vm = this
      const payload = info[0]

      return fn(payload)
        .then((data) => {
          if (data.data) {
            const chatIdentity = data.data
            vm.$store.commit('ramp/updateChatIdentity', { ref: chatIdentity.ref, chatIdentity: chatIdentity })
            vm.retry = false
          }

          if (vm.retry) {
            if (retries > 0) {
              return vm.delay(delayDuration)
                .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, payload))
            } else {
              vm.retry = false
            }
          }
        })
        .catch(error => {
          console.error(error)
          if (retries > 0) {
            return vm.delay(delayDuration)
              .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, payload))
          } else {
            vm.retry = false
          }
        })
    },
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
    },
    selectAd (ad) {
      bus.emit('view-ad', ad.id)
      this.$emit('select-listing', ad)
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    formattedCurrency (value, currency) {
      return formatCurrency(value, currency)
    },
    appealCooldown (appealCooldownChoice) {
      return getAppealCooldown(appealCooldownChoice)
    },
    handleRequestError (error) {
      console.error(error?.response || error)
      if (error.code === 'ECONNABORTED') {
        // Request timeout
        this.showErrorDialog('Request timed out. Please try again later.')
      } else if (!error.response) {
        // Network error
        bus.emit('network-error')
      } else {
        // HTTP status code error
        switch (error.response.status) {
          case 403:
            bus.emit('session-expired')
            break
          case 400:
            this.showErrorDialog('Bad Request. Please check the request parameters.')
            break
          case 500:
            this.showErrorDialog('Internal Server Error. Please try again later.')
            break
          default:
            console.log(`Error: ${error.response.status}. ${error.response.statusText}`)
        }
      }
    },
    showErrorDialog (message) {
      if (!this.errorDialogActive) {
        this.errorDialogActive = true
        this.$q.notify({
          type: 'warning',
          message: message,
          position: 'bottom',
          timeout: 5000,
          onDismiss: () => {
            this.errorDialogActive = false
          }
        })
      }
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
  .back-btn {
    background-color: transparent;
    height: 50px;
    width: 70px;
    z-index: 1;
    left: 10px;
  }
</style>
