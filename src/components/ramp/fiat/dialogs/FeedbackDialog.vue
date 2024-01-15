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
          <q-scroll-area ref="scrollTargetRef" :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">
            <q-infinite-scroll
              ref="infiniteScroll"
              :items="reviewList"
              @load="loadMoreData"
              :offset="0"
              :scroll-target="scrollTargetRef">
              <template v-slot:loading>
                <div class="row justify-center q-my-md" v-if="hasMoreData">
                  <q-spinner-dots color="primary" size="40px" />
                </div>
              </template>
              <q-item class="q-mx-lg q-pb-sm q-px-md" v-for="(review, index) in reviewList" :key="index">
                <q-item-section>
                  <div class="row bold-text md-font-size">{{  review.from_peer.name }}</div>
                  <span class="row subtext">{{ formattedDate(review.created_at) }}</span>
                  <div class="row q-py-xs q-pb-sm">
                    <q-rating
                      readonly
                      v-model="review.rating"
                      size="1.5em"
                      color="yellow-9"
                      icon="star"
                    />
                    <span class="sm-font-size q-mx-sm">({{ review.rating }})</span>
                  </div>
                  <div class="row md-font-size q-mx-sm" v-if="review.comment.length > 0">
                    {{ review.comment }}
                  </div>
                  <q-separator :dark="darkMode" class="q-mt-md"/>
                </q-item-section>
              </q-item>
            </q-infinite-scroll>
          </q-scroll-area>
        </q-pull-to-refresh>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'
import { formatDate } from 'src/wallet/ramp'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      openDialog: this.openReviews,
      isloaded: false,
      reviewList: [],
      maxHeight: this.$q.screen.height * 0.75,
      limit: 7,
      page: 0,
      totalPages: 0
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
  computed: {
    hasMoreData () {
      return (this.page < this.totalPages)
    }
  },
  async mounted () {
    await this.fetchReviews()
    this.isloaded = true
  },
  methods: {
    loadMoreData (_, done) {
      const vm = this
      if (!vm.hasMoreData) {
        done(true)
        return
      }
      if (vm.page < vm.totalPages) {
        vm.fetchReviews()
      }
      done()
    },
    refreshReviews (done) {
      done()
    },
    formattedDate (value) {
      const relative = true
      return formatDate(value, relative)
    },
    async fetchReviews () {
      const vm = this
      const url = `${vm.apiURL}/order/feedback/peer`
      vm.page += 1
      const params = {
        limit: vm.limit,
        page: vm.page
      }

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
            vm.reviewList.push(...response.data.feedbacks)
            vm.totalPages = response.data.total_pages
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

.subtext {
  opacity: .5;
}
</style>
