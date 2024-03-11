<template>
    <q-dialog ref="dialog" full-width no-shake v-model="showDialog" position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
            <div class="q-py-sm q-my-lg q-mx-lg q-px-sm">
                <div v-if="loading" class="row justify-center"><ProgressLoader/></div>
                <div v-else>
                    <div class="q-mb-sm text-center">
                        <span style="font-size: large;">{{ !feedback.id ? 'Rate your Experience' : 'Your Feedback' }}</span>
                    </div>
                    <div class="q-py-xs text-center">
                        <q-rating
                        :readonly="btnLoading || feedback.id ? true : false"
                        v-model="feedback.rating"
                        size="3em"
                        color="yellow-9"
                        icon="star"
                        />
                    </div>
                    <div class="q-py-sm q-px-xs">
                        <q-input
                        v-if="!feedback.id || feedback.rating > 0 && feedback.comment.length > 0"
                        v-model="feedback.comment"
                        :dark="darkMode"
                        :readonly="btnLoading || feedback.id ? true : false"
                        placeholder="Add comment here..."
                        dense
                        outlined
                        autogrow
                        :counter="!feedback.id"
                        maxlength="200"
                        />
                    </div>
                    <div class="row q-pt-xs q-px-xs">
                        <q-btn
                        v-if="!feedback.id ? true : false"
                        :disable="btnLoading || feedback.rating === 0"
                        rounded
                        label='Submit'
                        class="q-space text-white"
                        color="blue-8"
                        :loading="btnLoading"
                        @click="sendFeedback"
                        />
                        <!-- <q-btn
                        v-else
                        rounded
                        label='Edit Review'
                        class="q-space text-white"
                        color="blue-8"
                        /> -->
                    </div>
                </div>
                <div v-if="showPostMessage" class="text-center text-blue md-font-size q-mt-md">Review Posted! {{ timer ? `(${timer})` : '' }}</div>
                </div>
        </q-card>
    </q-dialog>
</template>
<script>
import { backend } from 'src/wallet/ramp/backend'
import { bus } from 'src/wallet/event-bus'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  emits: ['back', 'submit'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      loading: true,
      btnLoading: false,
      showDialog: true,
      feedback: {
        rating: 0,
        comment: ''
      },
      showPostMessage: false,
      timer: null
    }
  },
  components: {
    ProgressLoader
  },
  props: {
    orderId: Number
  },
  mounted () {
    this.fetchFeedback()
  },
  methods: {
    getDarkModeClass,
    async fetchFeedback () {
      const vm = this
      const url = '/ramp-p2p/order/feedback/peer'
      const params = {
        limit: 1,
        page: 1,
        from_peer: vm.$store.getters['ramp/getUser'].id,
        order_id: vm.orderId
      }
      await backend.get(url, {
        params: params,
        authorize: true
      })
        .then(response => {
          console.log(response.data)
          if (response.data?.feedbacks?.length > 0) {
            vm.feedback = response.data.feedbacks[0]
          }
          console.log('feedback:', vm.feedback)
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
        .finally(() => { vm.loading = false })
    },
    sendFeedback () {
      const vm = this
      vm.btnLoading = true
      const url = '/ramp-p2p/order/feedback/peer'
      const body = {
        order_id: vm.orderId,
        rating: vm.feedback.rating,
        comment: vm.feedback.comment
      }
      backend.post(url, body, { authorize: true })
        .then(response => {
          console.log(response.data)
          vm.feedback = response.data
          vm.$emit('submit', vm.feedback)
          vm.showPostMessage = true
          vm.autoClose()
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
          }
        })
        .finally(() => { vm.btnLoading = false })
    },
    autoClose () {
      let distance = 5
      const x = setInterval(() => {
        distance--
        this.timer = distance + 1

        if (distance < 0) {
          console.log()
          clearInterval(x)
          this.$refs.dialog.hide()
        }
      }, 1000)
    }
  }
}
</script>
