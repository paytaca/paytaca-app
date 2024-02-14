<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mb-lg q-pb-lg text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px; background-color: ${darkMode ? '#212f3d' : 'white'}`"
  >
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
    <div v-else>
      <div v-if="state === 'initial'">
        <q-btn
          flat
          padding="md md xs md"
          icon="arrow_back"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="$emit('back')"
        />
        <q-scroll-area :style="`height: ${minHeight - 100}px`" style="overflow-y:auto;">
          <div v-if="user" class="q-mb-lg">
            <div class="text-center q-pt-none">
              <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
              <div class="text-weight-bold lg-font-size q-pt-sm">
                {{ user.name }}
                <q-icon
                  @click="editNickname = true"
                  v-if="user?.self"
                  size="sm"
                  name='o_edit'
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
                label="Edit Payment Methods"
                color="blue-8"
                class="q-space q-mx-md button"
                @click="state= 'edit-pm'"
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
              />
              <span class="q-mx-sm sm-font-size">({{ user.rating ? user.rating.toFixed(1) : 0}} rating)</span>
            </div>
            <div class="text-center sm-font-size q-pt-sm">
                <span>{{ user.trade_count || 0 }} trades</span>&nbsp;&nbsp;
                <span>|</span>&nbsp;&nbsp;
                <span> {{ user.completion_rate ? user.completion_rate.toFixed(1) : 0 }}% completion</span>
            </div>
          </div>
          <!-- <div class="q-px-sm q-pt-sm">
            <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
          </div> -->
          <!-- Feedbacks -->
          <div
            class="row br-15 text-center pt-card btn-transaction md-font-size"
            :class="getDarkModeClass(darkMode)"
            :style="`background-color: ${darkMode ? '' : '#f2f3fc !important;'}`">
            <button
              class="col-grow br-15 btn-custom fiat-tab q-mt-none"
              :class="{'dark': darkMode, 'active-btn': !user?.self && activeTab === 'reviews'}"
              @click="activeTab = 'reviews'">
              REVIEWS
            </button>
            <button
              v-if="!user?.self"
              class="col-grow br-15 btn-custom fiat-tab q-mt-none"
              :class="{'dark': darkMode, 'active-btn': activeTab === 'ads'}"
              @click="activeTab = 'ads'">
              ADS
            </button>
          </div>
          <div v-if="activeTab === 'reviews'">
            <!-- Reviews tab -->
            <div v-if="reviewList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
              No Reviews Yet
            </div>
            <div v-else class="q-mx-lg q-px-md">
                <div class="q-pt-md" v-for="(review, index) in reviewList" :key="index">
                  <div class="text-weight-bold sm-font-size">{{  review.from_peer.name }}</div>
                  <span class="row subtext">{{ formattedDate(review.created_at) }}</span>
                  <div class="sm-font-text">
                    <q-rating
                      readonly
                      v-model="review.rating"
                      size="1.5em"
                      color="yellow-9"
                      icon="star"
                    />
                    <span class="q-mx-sm sm-font-size">({{ review.rating ? review.rating.toFixed(1) : 0}})</span>
                  </div>
                  <div v-if="review.comment.length > 0" class="q-pt-sm q-px-xs sm-font-size">
                    {{ review.comment }}
                  </div>
                  <q-separator :dark="darkMode" class="q-mt-md"/>
                </div>
              <div class="row">
                <q-btn
                  flat
                  class="col text-center text-blue sm-font-size q-mt-md"
                  @click="openReviews=true">
                  view more
                </q-btn>
              </div>
            </div>
          </div>
          <div v-if="activeTab === 'ads'">
            <div v-if="adsList?.length === 0" class="text-center q-pt-md text-italized xm-font-size">
              No Ads Yet
            </div>
            <!-- Ads tab -->
          </div>
        </q-scroll-area>
      </div>
      <div v-if="state === 'edit-pm'">
        <AddPaymentMethods
          :type="'Profile'"
          v-on:back="state = 'initial'"
        />
      </div>
    </div>
  </q-card>
  <MiscDialogs
    v-if="editNickname"
    :type="'editNickname'"
    v-on:back="editNickname = false"
    v-on:submit="updateUserName"
  />
  <!-- Feedback Dialog -->
  <div v-if="openReviews">
    <FeedbackDialog
      :openReviews="openReviews"
      :toPeerID="user.id"
      :fromPeerID="user.id"
      @back="openReviews = false"
    />
  </div>
</template>
<script>
import { updateChatIdentity } from 'src/wallet/ramp/chat'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import { formatDate } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (90 + 120) : this.$q.screen.height - (60 + 100),
      isloaded: false,
      user: null,
      editNickname: false,
      activeTab: 'reviews', // 'reviews | 'ads'
      state: 'initial',
      reviewList: [],
      adsList: [],
      openReviews: false,
      retry: false
    }
  },
  props: {
    userInfo: Object
  },
  emits: ['back'],
  components: {
    MiscDialogs,
    AddPaymentMethods,
    ProgressLoader,
    FeedbackDialog
  },
  mounted () {
    this.processUserData()
    this.fetchTopReview()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
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
        backend.get('/ramp-p2p/peer/detail', { params: { id: userId }, authorize: true })
          .then(response => {
            vm.isloaded = true
            resolve(response.data)
          })
          .catch(error => {
            console.error(error)
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            }
            vm.isloaded = true
            reject(error)
          })
      })
    },
    async updateUserName (info) {
      const vm = this
      backend.put('/ramp-p2p/peer/detail', { name: info.nickname }, { authorize: true })
        .then(response => {
          vm.$store.commit('ramp/updateUser', response.data)
          const payload = {
            ref: loadRampWallet().walletHash,
            name: response.data.name
          }
          vm.retry = true
          vm.exponentialBackoff(updateChatIdentity, 5, 1000, payload)
          this.processUserData()
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })

      this.editNickname = false
    },
    exponentialBackoff (fn, retries, delayDuration, ...info) {
      const vm = this
      const payload = info[0]

      return fn(payload)
        .then((data) => {
          if (data.data) {
            const chatIdentity = data.data
            vm.$store.commit('ramp/updateChatIdentity', chatIdentity)
            vm.retry = false
          }

          if (vm.retry) {
            console.log('retrying')
            if (retries > 0) {
              return vm.delay(delayDuration)
                .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, payload))
            } else {
              vm.retry = false
            }
          }
        })
        .catch(error => {
          console.log(error)
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
    switchReviewType (type) {
      if (this.reviewType !== type) {
        this.reviewType = type
        this.fetchTopReview()
      } else {
        console.log('not switch')
      }
    },
    fetchTopReview () {
      const vm = this
      const params = {
        limit: 5
      }
      params.to_peer = this.userId
      backend.get('/ramp-p2p/order/feedback/peer', {
        params: params,
        authorize: true
      })
        .then(response => {
          if (response.data) {
            vm.reviewList = response.data.feedbacks
            console.log('reviews:', response)
            // top 5 review
            if (vm.reviewList && vm.reviewList.length !== 0) {
              vm.reviewList = vm.reviewList.slice(0, 5)
            }
          }
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
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
  height: 35px;
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
