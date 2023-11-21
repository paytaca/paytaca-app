<template>
  <q-dialog
    v-model="openDialog"
    @before-hide="$emit('back')"
    position="bottom"
    full-width
    :class="darkMode ? 'text-white' : 'text-black'">
    <q-card class="br-15" :style="`max-height: ${maxHeight}px;`">
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
      <div v-if="isloaded">
        <div class="lg-font-size">
          <div v-if="reviewList.length !== 0"  class="text-center q-pb-md xm-font-size bold-text">
            Reviews
          </div>
          <div v-else class="text-center text-italized bold-text xm-font-size">
            No Reviews Yet
          </div>
        </div>
        <q-pull-to-refresh @refresh="refreshReviews">
          <q-scroll-area :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">
            <div class="q-py-md q-mx-lg q-pb-sm q-px-md" v-for="(review, index) in reviewList" :key="index">
              <div class="bold-text md-font-size">{{  review.from_peer.name }}</div>
              <div class="q-py-xs q-pb-sm">
                <q-rating
                  readonly
                  v-model="review.rating"
                  size="1.5em"
                  color="yellow-9"
                  icon="star"
                />
                <span class="sm-font-size"> ({{ review.rating }})</span>
              </div>
              <div v-if="review.comment.length > 0" class="md-font-size q-mx-sm">
                {{ review.comment }}
              </div>
            </div>
          </q-scroll-area>
        </q-pull-to-refresh>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      openDialog: this.openReviews,
      isloaded: false,
      feedback: {
        rating: 5,
        comment: 'Heya',
        is_posted: false
      },
      reviewList: null,
      maxHeight: this.$q.screen.height*0.75
    }
  },
  props: {
    openReviews: Boolean,
    adID: {
      type: Number,
      default: null
    },
    orderID: {
      type: Number,
      default: null
    },
    fromPeerID: {
      type: Number,
      default: null
    },
    toPeerID: {
      type: Number,
      default: null
    },
    type: {
      type: String,
      default: 'ad-review'
    }
  },
  emits: ['back'],
  async mounted () {
    // console.log('token', getCookie('token'))
    await this.fetchReviews()
    this.isloaded = true
  },
  methods: {
    refreshReviews (done) {
      console.log('refreshing')
      done()
    },
    async fetchReviews () {
      const vm = this

      const url = `${vm.apiURL}/order/feedback/peer`
      let params = {}

      switch (this.type) {
        case 'ad-review':
          params.ad_id = vm.adID
          break
        case 'order-review':
          params.order_id = vm.orderID
          break
        case 'to-peer-review':
          params.to_peer = vm.toPeerID
          break
        case 'from-peer-review':
          params.from_peer = vm.fromPeerID
          break
      }
      await vm.$axios.get(url, {
        params: params,
        headers: this.authHeaders
      })
        .then(response => {
          if (response.data) {
            // const data = response.data
            vm.reviewList = response.data
            // console.log('reviews: ', vm.reviewList)
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
<style scoped>
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
</style>
