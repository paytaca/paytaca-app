<template>
  <q-dialog ref="dialog" full-width no-shake v-model="showDialog" position="bottom">
    <q-card class="br-15 pt-card text-bow bottom-card" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <div class="q-py-sm q-my-lg q-mx-lg q-px-sm">
        <div v-if="loading" class="row justify-center"><ProgressLoader/></div>
        <div v-else>
          <div class="q-mb-md text-center text-bold">
            <span style="font-size: large;">Feedback</span>
          </div>

          <!-- Arrow Button -->
          <div v-if="reviews.length === 0" class="text-center">
            <q-img src="empty-wallet.svg" class="vertical-top q-my-md" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">{{ $t('NothingToDisplay') }}</p>
          </div>
          <div v-else>
            <div class="fixed" style="margin-top: -5px;" v-if="index === 1">
              <q-btn
                rounded
                no-caps
                icon="arrow_back"
                flat
                color="blue"
                @click="index--"
              />
            </div>
            <div class="fixed" style="margin-top: -5px; width: 83%;" v-if="index === 0 && reviews.length > 1">
              <div class="row justify-end">
                <q-btn
                  rounded
                  no-caps
                  icon="arrow_forward"
                  flat
                  color="blue"
                  @click="index++"
                />
              </div>
            </div>

            <!-- Feedback Contents -->
            <div class="text-center">
              <span style="font-size: medium;">{{ reviews[index].peer.name }}</span><br>
              <span style="font-size: small; color: gray;">({{ userLabel(reviews[index].peer.id) }})</span>
            </div>
            <div class="q-py-xs text-center">
              <q-rating
                readonly
                v-model="reviews[index].rating"
                size="3em"
                color="yellow-9"
                icon="star"
              />
            </div>
            <div class="q-py-sm q-px-xs">
              <q-input
                v-if="reviews[index].comment.length > 0"
                v-model="reviews[index].comment"
                :dark="darkMode"
                readonly
                dense
                outlined
                autogrow
              />
            </div>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true,
      loading: false,
      index: 0,
      reviews: null
    }
  },
  props: {
    order: Object
  },
  components: {
    ProgressLoader
  },
  mounted () {
    const vm = this
    vm.loading = true
    vm.fetchFeedback()
  },
  methods: {
    getDarkModeClass,
    async fetchFeedback () {
      const vm = this
      const url = '/ramp-p2p/order/feedback/arbiter/'
      const params = {
        limit: 5,
        page: 1,
        order_id: vm.order.id
      }

      await backend.get(url, {
        params: params,
        authorize: true
      })
        .then(response => {
          vm.reviews = response.data.feedbacks
        })
        .catch(error => {
          bus.emit('handle-request-error', error)
        })
        .finally(() => { vm.loading = false })
    },
    userLabel (id) {
      const vm = this
      const members = vm.order.members

      for (const type in members) {
        if (members[type] && type !== 'arbiter') {
          if (members[type].id === id) {
            return type.charAt(0).toUpperCase() + type.slice(1)
          }
        }
      }
    }
  }
}
</script>
