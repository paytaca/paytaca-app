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
        <!-- <q-list ref="scrollTargetRef" :style="`max-height: ${minHeight - (minHeight*.30)}px`" style="overflow:auto;">
          <q-infinite-scroll
            ref="infiniteScroll"
            :items="listings"
            @load="loadMoreData"
            :offset="0"
            :scroll-target="scrollTargetRef">
            <template v-slot:loading>
              <div class="row justify-center q-my-md" v-if="hasMoreData">
                <q-spinner-dots color="primary" size="40px" />
              </div>
            </template>
          </q-infinite-scroll>
        </q-list> -->

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
import { ref } from 'vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    const itemsRef = ref([ {}, {}, {}, {}, {}, {}, {} ])
    const itemsId = ref([ {}, {}, {}, {}, {}, {}, {} ])
    return {
      scrollTargetRef,

      onLoadRef (index, done) {
        setTimeout(() => {
          itemsRef.value.push({}, {}, {}, {}, {}, {}, {})
          done()
        }, 2000)
      },

      onLoadId (index, done) {
        setTimeout(() => {
          itemsId.value.push({}, {}, {}, {}, {}, {}, {})
          done()
        }, 2000)
      }

    }
  },
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
      maxHeight: this.$q.screen.height *.75
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
      console.log('Get Feedback')

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
