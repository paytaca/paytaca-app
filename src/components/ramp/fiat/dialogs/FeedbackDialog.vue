<template>
  <q-dialog position="bottom" v-model="openDialog" full-width :class="darkMode ? 'text-white' : 'text-black'">
    <q-card class="br-15" :style="`max-height: ${maxHeight}px;`">
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
      <div v-if="isloaded">
        <div style="font-weight: 500; font-size: 15px;">
          <div v-if="reviewList.length !== 0"  class="text-center q-pb-md xm-font-size bold-text">
            Reviews
          </div>
          <div v-else class="text-center text-italized bold-text xm-font-size">
            No Reviews Yet
          </div>
        </div>
        <q-pull-to-refresh @refresh="refreshReviews">
          <q-scroll-area :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">

            <div style="font-weight: 500;" class="q-pt-md q-mx-lg q-pb-sm q-px-md" v-for="(review, index) in reviewList" :key="index">
              <div>{{  review.from_peer.name }}</div>
              <div style="font-size: 12px; opacity: .5;">Order #{{  review.order }}</div>
              <div class="q-py-xs q-pb-sm">
                  <q-rating
                    readonly
                    v-model="review.rating"
                    size="1.5em"
                    color="yellow-9"
                    icon="star"
                  />
                  <span style="font-size: 12px; opacity: .5; ">({{ review.rating }})</span>
                </div>
                <div>
                  <q-input
                    v-model="review.comment"
                    :dark="darkMode"
                    readonly
                    dense
                    outlined
                    autogrow
                    maxlength="200"
                  />
                </div>
            </div>
          </q-scroll-area>
        </q-pull-to-refresh>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getCookie } from 'src/wallet/ramp'
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
    type: {
      type: String,
      default: 'ad-reviews'
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
      console.log(this.authHeaders)
      let params = null
      if (this.type === 'ad-reviews') {
        params = {
          ad_id: vm.adID
        }
      } else {
        params = {
          order_id: vm.orderID
        }
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
