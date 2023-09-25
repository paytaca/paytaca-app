<template>
  <q-dialog persistent position="bottom" v-model="openDialog" full-width>
    <q-card class="br-15" :style="`max-height: ${maxHeight}px;`">
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
      <div v-if="isloaded">
        <div v-if="reviewList.length !== 0"  class="text-center q-pb-lg xm-font-size bold-text">
          Reviews
        </div>
        <div v-else class="text-center text-italized bold-text xm-font-size">
          No Reviews Yet
        </div>

        <q-pull-to-refresh @refresh="refreshReviews">
          <q-scroll-area :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">

            <div class="q-pt-md q-mx-lg q-pb-lg q-px-md" v-for="(review, index) in reviewList" :key="index">
              <div class="bold-text">{{  review.from_peer.nickname }}</div>
              <div class="q-py-xs q-pb-sm">
                  <q-rating
                    readonly
                    v-model="review.rating"
                    size="1.5em"
                    color="yellow-9"
                    icon="star"
                  />
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
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
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
    adID: Number
  },
  emits: ['back'],
  async mounted () {
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

      await vm.$axios.get(url, {
        params: {
          ad_id: vm.adID
        }
      })
        .then(response => {
          if (response.data) {
            // const data = response.data
            vm.reviewList = response.data
            console.log('reviews: ', vm.reviewList)
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
