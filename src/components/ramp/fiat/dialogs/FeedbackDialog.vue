<template>
  <q-dialog persistent position="bottom" v-model="openDialog" full-width>
    <q-card class="br-15" :style="`max-height: ${maxHeight}px;`">
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
      <div class="text-center q-pb-lg xm-font-size bold-text">
        Reviews
      </div>

      <q-pull-to-refresh @refresh="refreshReviews">
        <q-scroll-area :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">
          <div class="q-pt-md q-mx-lg q-pb-lg q-px-md" v-for="i in 10" :key="i">
            <div class="bold-text">User Name</div>
            <div class="q-py-xs q-pb-sm">
                <q-rating
                  readonly
                  v-model="feedback.rating"
                  size="1.5em"
                  color="yellow-9"
                  icon="star"
                />
              </div>
              <div>
                <q-input
                  v-model="feedback.comment"
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
      feedback: {
        rating: 5,
        comment: 'Heya',
        is_posted: false
      },
      reviewList: null,
      maxHeight: this.$q.screen.height*.75
    }
  },
  props: {
    openReviews: Boolean,
    orderID: Number
  },
  emits: ['back'],
  async mounted () {
    await this.fetchReviews()
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
          order_id: vm.orderID
        }
      })
        .then(response => {
          if (response.data) {
            // const data = response.data
            vm.reviewList = response.data
            console.log(vm.reviewList)
          }
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}
</script>
