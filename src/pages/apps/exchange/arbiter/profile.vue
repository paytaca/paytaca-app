<template>
  <HeaderNav :title="`P2P Ramp`" backnavpath="/apps" class="header-nav" />
  <div
    class="q-mx-md q-mb-lg q-pb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader />
      </div>
    </div>
    <div v-else>
      <q-pull-to-refresh ref="pullToRefresh" @refresh="refreshContent">
        <div class="q-mb-lg">
          <div class="text-center q-pt-none">
            <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
            <q-btn round flat icon="settings" :style="$q.platform.is.ios ? 'top: 105px' : 'top: 70px;'" style="position: fixed; right: 40px;" @click="openSettings=true"></q-btn>
            <div class="text-weight-bold lg-font-size q-pt-sm">
              <span id="target-name">{{ arbiter?.name }}</span>
              <q-icon
                class="q-ml-xs"
                size="1em"
                :color="inactiveFor?.value <= 0 ? 'green' : 'grey'"
                name="circle"/>
              <q-icon
                @click="editNickname = true"
                size="xs"
                name='edit_square'
                class="q-mx-xs button button-text-primary"
                :class="getDarkModeClass(darkMode)"
              />
            </div>
          </div>
          <div v-if="inactiveFor?.value > 0" class="row justify-center subtext">
            <span>Inactive {{ inactiveTime }}</span>
          </div>
          <!-- Rating -->
          <div class="row justify-center q-px-sm">
            <q-rating
              readonly
              :model-value="arbiter?.rating ? Number(arbiter?.rating) : 0"
              size="1.2em"
              color="yellow-9"
              icon="star"
              icon-half="star_half"
            />
            <span class="q-mx-sm sm-font-size">({{ Number(arbiter?.rating).toFixed(1) }} rating)</span>
          </div>
          <!-- Currencies -->
          <div v-if="arbiter?.fiat_currencies.length > 0" class="row justify-center q-mt-xs q-mb-sm q-gutter-xs">
            <q-badge :color="darkMode ? 'blue-grey-2' : 'primary'" outline v-for="(currency, index) in currencies" :key="index" @click="viewCurrencies=true">{{ currency.symbol }}</q-badge>
            <q-badge :color="darkMode ? 'blue-grey-2' : 'primary'" outline v-if="arbiter?.fiat_currencies.length > 5" @click="viewCurrencies=true">+{{ arbiter?.fiat_currencies.length - 5 }}</q-badge>
          </div>
          <div v-else class="row justify-center subtext">
            <span>No currency assigned</span>
          </div>
        </div>
      </q-pull-to-refresh>
      <div
        class="row justify-center q-mb-sm br-15 text-center pt-card btn-transaction md-font-size"
        :class="getDarkModeClass(darkMode)"
        :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
        REVIEWS
      </div>

      <q-scroll-area :style="`height: ${ minHeight - 280 }px`" style="overflow-y:auto;" class="scroll-y" @touchstart.native="preventPull">
        <div v-if="!loadingReviews">
          <div v-if="reviewsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
            No Reviews Yet
          </div>
          <div v-else class="q-mx-lg q-px-md">
            <div class="q-pt-md" v-for="(review, index) in reviewsList" :key="index">
              <div class="text-weight-bold sm-font-size">{{ userNameView(review?.peer?.name) }}</div>
              <span class="row subtext">{{ formattedDate(review.created_at) }}</span>
              <div class="sm-font-text">
                <q-rating
                  readonly
                  v-model="review.rating"
                  size="1.5em"
                  color="yellow-9"
                  icon="star"
                />
                <span class="q-mx-sm sm-font-size">({{ review?.rating ? review?.rating?.toFixed(1) : 0}})</span>
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
                view more
              </q-btn>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
  <ArbiterCurrenciesDialog v-if="viewCurrencies" :currencies="arbiter?.fiat_currencies" @back="viewCurrencies=false"/>
  <AppealSettings v-if="openSettings" @set-inactive="onSetInactive" @back="openSettings=false"/>
  <MiscDialogs
    v-if="editNickname"
    :type="'editNickname'"
    v-on:back="editNickname = false"
    v-on:submit="updateUserName"
  />
</template>
<script>
import MiscDialogs from 'src/components/ramp/fiat/dialogs/MiscDialogs.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AppealSettings from 'src/components/ramp/appeal/AppealSettings.vue'
import ArbiterCurrenciesDialog from 'src/components/ramp/appeal/dialogs/ArbiterCurrenciesDialog.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { formatDate } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { updateChatIdentity } from 'src/exchange/chat'
import { wallet } from 'src/exchange/wallet'

export default {
  components: {
    ProgressLoader,
    MiscDialogs,
    AppealSettings,
    ArbiterCurrenciesDialog,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isloaded: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125,
      settingHeight: this.$q.platform.is.ios ? 95 : 65,
      editNickname: false,
      arbiter: null,

      reviewsTotalPages: null,
      reviewsPageNumber: 1,
      loadingReviews: false,

      reviewsList: [],
      user: {
        rating: 5
      },
      openSettings: false,
      viewCurrencies: false,
      inactiveFor: null,
      currencies: []
    }
  },
  computed: {
    hasMoreReviewsData () {
      return this.reviewsPageNumber < this.reviewsTotalPages
    },
    inactiveTime () {
      let timeString = `until ${this.inactiveFor?.value} ${this.inactiveFor?.affix} later`
      if (this.inactiveFor?.affix?.startsWith('hour') && this.inactiveFor?.value > 24) {
        timeString = 'indefinitely'
      }
      return timeString
    }
  },
  mounted () {
    this.fetchArbiter()
    this.fetchFeedback()
  },
  methods: {
    getDarkModeClass,
    preventPull (e) {
      // Prevent pull-to-refresh from triggering when scrollable element is not at top
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
    refreshContent (done) {
      this.fetchArbiter()
      this.fetchFeedback()
      if (done) done()
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    onSetInactive () {
      this.fetchArbiter()
    },
    async fetchArbiter () {
      const vm = this
      const url = `/ramp-p2p/arbiter/${wallet.walletHash}`

      await backend.get(url, { authorize: true })
        .then(response => {
          vm.arbiter = response.data
          vm.currencies = vm.arbiter.fiat_currencies.slice(0, 5)
          vm.arbiter.rating = Number(vm.arbiter?.rating)
          vm.parseInactiveTime(vm.arbiter.inactive_until)
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    parseInactiveTime (inactiveUntil) {
      const providedTimestamp = new Date(inactiveUntil).getTime()
      const currentTimestamp = Date.now()
      const millisecondsDifference = providedTimestamp - currentTimestamp
      const hoursDifference = millisecondsDifference / (1000 * 60 * 60)
      let inactiveFor = {
        value: Number(Math.ceil(hoursDifference)),
        affix: hoursDifference.toFixed(0) > 1 ? 'hours' : 'hour'
      }
      if (hoursDifference < 1) {
        const minutesDifference = millisecondsDifference / (1000 * 60)
        inactiveFor = {
          value: Number(minutesDifference.toFixed(0)),
          affix: minutesDifference.toFixed(0) > 1 ? 'minutes' : 'minute'
        }
      }
      this.inactiveFor = inactiveFor
      return inactiveFor
    },
    async fetchFeedback () {
      const vm = this
      vm.loadingReviews = true
      const arbiterUrl = '/ramp-p2p/order/feedback/arbiter/'
      const arbiterParams = {
        limit: 20,
        page: vm.reviewsPageNumber
      }

      await backend.get(arbiterUrl, {
        params: arbiterParams,
        authorize: true
      })
        .then(response => {
          vm.reviewsList = response.data?.feedbacks.reverse()
          vm.reviewsTotalPages = response.data?.total_pages
        })
        .catch(error => {
          this.handleRequestError(error)
        })
        .finally(() => {
          vm.loadingReviews = false
          vm.isloaded = true
        })
    },
    async updateUserName (data) {
      const vm = this
      const url = '/ramp-p2p/arbiter/'
      try {
        await updateChatIdentity({ id: vm.arbiter.chat_identity_id, name: data.nickname })
        await backend.patch(url, { name: data.nickname }, { authorize: true })
          .then(async response => {
            vm.arbiter = response.data
            await vm.$store.dispatch('ramp/fetchUser')
          })
      } catch (error) {
        this.handleRequestError(error)
      }
      this.editNickname = false
    },
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
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
  .back-btn {
    background-color: transparent;
    height: 50px;
    width: 70px;
    z-index: 1;
    left: 10px;
  }
  </style>
