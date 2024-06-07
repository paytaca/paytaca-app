<template>
  <div
    class="q-mx-md q-mb-lg q-pb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`"
  >
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
    <div v-else>
      <div class="q-mb-lg">
        <div class="text-center q-pt-none">
          <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
          <div class="text-weight-bold lg-font-size q-pt-sm">
            <span id="target-name">{{ arbiter.name }}</span>
            <q-icon
              @click="editNickname = true"
              size="sm"
              name='o_edit'
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
            />
          </div>
        </div>
        <!-- Edit Payment Methods -->
        <div class="row q-mx-lg q-px-md q-pt-md">
          <q-btn
            rounded
            no-caps
            label="Settings"
            color="blue-8"
            class="q-space q-mx-md button"
            @click="openSettings"
            icon="settings"
          />
        </div>

        <!-- User Stats -->
        <div class="row justify-center q-px-sm q-pt-sm">
          <q-rating
            readonly
            :model-value="arbiter.rating ? arbiter.rating : 0"
            :v-model="arbiter.rating"
            size="1.5em"
            color="yellow-9"
            icon="star"
            icon-half="star_half"
          />
          <!-- <span class="q-mx-sm sm-font-size">({{ arbiter.rating ? arbiter.rating?.toFixed(1) : 0}} rating)</span> -->
          <span class="q-mx-sm sm-font-size">({{ arbiter.rating }} rating)</span>
        </div>
      </div>

      <div
        class="row q-mb-sm br-15 text-center pt-card btn-transaction md-font-size"
        :class="getDarkModeClass(darkMode)"
        :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
        <button
          class="col-grow br-15 btn-custom fiat-tab q-mt-none ctive-btn"
          :class="{'dark': darkMode }"
          >
            REVIEWS
        </button>
      </div>

      <q-scroll-area :style="`height: ${ minHeight - 280 }px`" style="overflow-y:auto;">
        <div v-if="!loadingReviews">
          <div v-if="reviewsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
            No Reviews Yet
          </div>
          <div v-else class="q-mx-lg q-px-md">
            <div class="q-pt-md" v-for="(review, index) in reviewsList" :key="index">
              <div class="text-weight-bold sm-font-size">{{ userNameView(review.peer.name) }}</div>
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
                view more
              </q-btn>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>

  <MiscDialogs
    v-if="editNickname"
    :type="'editNickname'"
    v-on:back="editNickname = false"
    v-on:submit="updateUserName"
  />
</template>
<script>
import MiscDialogs from '../fiat/dialogs/MiscDialogs.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AppealSettings from './AppealSettings.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { formatDate, formatCurrency, getAppealCooldown } from 'src/wallet/ramp'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      isloaded: false,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125,
      editNickname: false,
      arbiter: null,

      reviewsTotalPages: null,
      reviewsPageNumber: 1,
      loadingReviews: false,

      reviewsList: [],
      user: {
        rating: 5
      }
    }
  },
  computed: {
    hasMoreReviewsData () {
      return this.reviewsPageNumber < this.reviewsTotalPages
    },
  },
  components: {
    ProgressLoader,
    MiscDialogs
  },
  mounted () {
    this.fetchArbiter()
    this.fetchFeedback()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    openSettings () {
      this.$q.dialog({
        component: AppealSettings
      })
        // .onOk(currency => {
        //   // const index = this.fiatCurrencies.indexOf(currency)
        //   this.selectedCurrency = currency
        //   this.updateFiatCurrency()
        //   this.readOnlyState = false
        // })
        // .onDismiss(() => {
        //   this.readOnlyState = false
        // })
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    async fetchArbiter () {
      const vm = this
      const url = '/ramp-p2p/arbiter/detail'

      await backend.get(url, { authorize: true })
        .then(response => {
          vm.arbiter = response.data
          vm.arbiter.rating = Number(vm.arbiter.rating)
        })
    },
    async fetchFeedback () {
      const vm = this
      vm.loadingReviews = true
      const arbiterUrl = '/ramp-p2p/order/feedback/arbiter'
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
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
        .finally(() => {
          vm.loadingReviews = false
          vm.isloaded = true
        })
    },
    async updateUserName (data) {
      const vm = this

      const url = '/ramp-p2p/arbiter/detail'
      const body = {
        name: data.nickname
      }

      await backend.patch(url, body, { authorize: true })
        .then(response => {
          vm.arbiter = response.data
        })
    },
    userNameView (name) {
      const limitedView = name.length > 15 ? name.substring(0, 15) + '...' : name

      return limitedView
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
