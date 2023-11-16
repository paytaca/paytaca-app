<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mb-lg q-pb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px;`"
  >
    <div v-if="state === 'initial' && isloaded">
      <div>
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="$emit('back')"
        />
      </div>
      <q-scroll-area :style="`height: ${minHeight - 100}px`" style="overflow-y:auto;">
        <div class="text-center q-pt-none">
          <q-icon size="4em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
          <div class="bold-text lg-font-size q-pt-sm">
            {{ user.name }} <q-icon @click="editNickname = true" v-if="type === 'self'" size="sm" name='o_edit' color="blue-grey-6"/>
          </div>
        </div>

        <!-- Edit Payment Methods -->
        <div class="row q-mx-lg q-px-md q-pt-md" v-if="type === 'self'">
          <q-btn
            rounded
            no-caps
            label="Edit Payment Methods"
            color="blue-8"
            class="q-space"
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
        <div class="text-center md-font-size subtext bold-text q-pt-md">
            <span>{{ user.trade_count }} total trades</span>&nbsp;&nbsp;
            <span>|</span>&nbsp;&nbsp;
            <span> {{ user.completion_rate ? user.completion_rate.toFixed(1) : 0 }}% completion</span>
        </div>
        <div class="row justify-center q-px-sm q-pt-sm">
          <q-rating
            readonly
            :model-value="user.rating ? user.rating : 0"
            :v-model="user.rating"
            size="1.5em"
            color="yellow-9"
            icon="star"
          />
          <span class="q-mx-sm">({{ user.rating ? user.rating.toFixed(1) : 0}} rating)</span>
        </div>

        <div class="q-px-sm q-pt-sm">
          <q-separator :dark="darkMode" class="q-mx-lg q-mt-md"/>
        </div>

        <!-- Comments -->
        <div>
          <div>
            <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
              <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-btn': reviewType == 'to-peer-review' }" @click="switchReviewType('to-peer-review')">Ad Review</button>
              <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-btn': reviewType == 'from-peer-review'}" @click="switchReviewType('from-peer-review')">User Review</button>
            </div>
          </div>
          <div v-if="reviewList.length !== 0"  class="text-center q-py-lg xm-font-size bold-text">
            Reviews
          </div>
          <div v-else class="text-center q-pt-md text-italized bold-text xm-font-size">
            No Reviews Yet
          </div>
          <div class="q-mx-lg q-px-md">
            <!-- <q-scroll-area :style="`height: ${ minHeight - 350 }px`" style="overflow-y:auto;"> -->
              <div class="q-pt-md" v-for="(review, index) in reviewList" :key="index">
                <div class="md-font-size bold-text">
                  {{  review.from_peer.name }}
                </div>
                <div class="sm-font-text">
                  <q-rating
                    readonly
                    v-model="review.rating"
                    size="2em"
                    color="yellow-9"
                    icon="star"
                  />
                </div>
                <div class="q-pt-sm q-px-xs">
                  <q-input
                    v-model="review.comment"
                    :dark="darkMode"
                    dense
                    disable
                    outlined
                    autogrow
                  />
                </div>
                <q-separator :dark="darkMode" class="q-mt-md"/>
              </div>
            <!-- </q-scroll-area> -->
          </div>
          <div v-if="reviewList.length !== 0">
            <div class="text-center text-blue md-font-size q-mt-md" @click="openReviews = true">See All {{ reviewType === 'to-peer-review' ? 'Ad' : 'User' }} Reviews</div>
          </div>
        </div>
      </q-scroll-area>
    </div>
    <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
    <div v-if="state === 'edit-pm'">
      <AddPaymentMethods
        :type="'Profile'"
        v-on:back="state = 'initial'"
      />
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
      :toPeerID="userId"
      :fromPeerID="userId"
      :type="reviewType"
      @back="openReviews = false"
    />
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import AddPaymentMethods from './AddPaymentMethods.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import FeedbackDialog from './dialogs/FeedbackDialog.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      isloaded: false,
      user: null,
      userId: null,
      editNickname: false,
      state: 'initial',
      // minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      rating: 3,
      comment: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      reviewList: [],
      reviewType: 'to-peer-review',
      statusType: 'ONGOING',
      openReviews: false
    }
  },
  props: {
    userInfo: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: 'self'
    }
  },
  emits: ['back'],
  components: {
    MiscDialogs,
    AddPaymentMethods,
    ProgressLoader,
    FeedbackDialog
  },
  async mounted () {
    await this.processUserData()
    await this.fetchTopReview()
    this.isloaded = true
  },
  methods: {
    async processUserData () {
      if (this.type === 'self') {
        this.userId = this.$store.getters['ramp/getUser'].id
      } else {
        this.userId = this.userInfo.id
      }
      await this.getUserInfo()
    },
    getUserInfo () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/peer/detail', { headers: vm.authHeaders, params: { id: vm.userId } })
        .then(response => {
          console.log(response.data)
          vm.user = response.data
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async updateUserName (info) {
      const vm = this
      vm.$axios.put(vm.apiURL + '/peer/detail', { name: info.nickname }, { headers: vm.authHeaders })
        .then(response => {
          // console.log(response.data)
          vm.$store.commit('ramp/updateUser', response.data)
          this.processUserData()
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })

      this.editNickname = false
    },
    switchReviewType (type) {
      this.reviewType = type

      this.fetchTopReview()
    },
    async fetchTopReview () {
      const vm = this
      const url = `${vm.apiURL}/order/feedback/peer`
      let params = {}

      if (vm.reviewType === 'to-peer-review') {
        params.to_peer = this.userId
      } else {
        params.from_peer = this.userId
      }
      await vm.$axios.get(url, {
        params: params,
        headers: vm.authHeaders
      })
        .then(response => {
          if (response.data) {
            // const data = response.data
            vm.reviewList = response.data
            //console.log('reviews: ', vm.reviewList)

            // top 5 review
            if (vm.reviewList.length !== 0) {
              vm.reviewList = vm.reviewList.slice(0, 5)
            }
          }
        })
        .catch(error => {
          console.log(error)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
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

.bold-text {
  font-weight: bold;
}
.subtext {
  opacity: .5;
}
.btn-transaction {
  font-size: 14px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
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
  background-color: rgb(172, 177, 180) !important;
  color: #ffffff;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
</style>
