<template>
  <q-dialog
    v-model="openDialog"
    @before-hide="$emit('back')"
    position="bottom"
    full-width
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <q-card class="br-15 pt-card-2 bottom-card" :class="getDarkModeClass(darkMode)" :style="`max-height: ${maxHeight}px;`">
      <q-btn
        flat
        padding="md"
        icon="close"
        class="close-button"
        @click="$emit('back')"
      />
      <div v-if="isloaded">
        <div class="lg-font-size">
          <div v-if="reviewList.length !== 0"  class="text-center q-pb-md xm-font-size text-weight-bold">
            {{ $t('Reviews') }}
          </div>
          <div v-else class="text-center text-weight-bold xm-font-size">
            {{ $t('NoReviewsYet') }}
          </div>
        </div>
        <!-- <q-pull-to-refresh @refresh="refreshReviews"> -->
          <q-list ref="scrollTargetRef" :style="`height: ${maxHeight - (maxHeight*.2)}px`" style="overflow:auto;">
            <q-pull-to-refresh @refresh="refreshReviews" :scroll-target="scrollTargetRef">
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
                    <div class="row text-weight-bold md-font-size">{{  review.from_peer.name }}</div>
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
            </q-pull-to-refresh>
          </q-list>
        <!-- </q-pull-to-refresh> -->
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'
import { formatDate } from 'src/exchange'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus.js'

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
    getDarkModeClass,
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
      const url = 'ramp-p2p/order/feedback/peer/'
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
      await backend.get(url, {
        params: params,
        authorize: true
      })
        .then(response => {
          if (response.data) {
            console.log(response)
            vm.reviewList.push(...response.data.feedbacks)
            vm.totalPages = response.data.total_pages
          }
        })
        .catch(error => {
          console.log(error)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    }
  }
}
</script>
<style scoped>
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
</style>
