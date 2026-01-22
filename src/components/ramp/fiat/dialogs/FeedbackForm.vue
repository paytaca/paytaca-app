<template>
    <q-dialog ref="dialog" full-width no-shake v-model="showDialog" position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 pt-card text-bow bottom-card" style="width: 70%;" :class="getDarkModeClass(darkMode)">
          <div class="q-py-sm q-my-lg q-mx-lg q-px-sm" v-if="type === 'peer'">
            <div v-if="loading" class="row justify-center"><ProgressLoader/></div>
            <div v-else>
              <div class="q-mb-md text-center text-bold">
                <span style="font-size: large;">{{ !feedback.id ? $t('RateYourExperience') : $t('YourFeedback') }}</span>
              </div>
              <div v-if="step === 1">
                <div v-if="arbiterFeedback.created_at" class="fixed" style="margin-top: -5px; width: 83%;" >
                  <div class="row justify-end">
                    <q-btn
                      rounded
                      no-caps
                      icon="arrow_forward"
                      flat
                      color="blue"
                      @click="step++"
                    />
                  </div>
                </div>
                <div class="text-center">
                  <span style="font-size: medium;">{{ counterparty.name }}</span><br>
                  <span style="font-size: small; color: gray;">({{ counterparty.label }})</span>
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
                    :placeholder="$t('AddCommentHere')"
                    dense
                    outlined
                    autogrow
                    :counter="!feedback.id"
                    maxlength="200"
                  />
                </div>
              </div>

              <div v-if="step === 2">
                <div class="fixed" style="margin-top: -5px;">
                  <q-btn
                    rounded
                    no-caps
                    icon="arrow_back"
                    flat
                    color="blue"
                    @click="step--"
                  />
                </div>
                <div class="text-center">
                  <span style="font-size: medium;">{{ arbiter.name }}</span><br>
                  <span style="font-size: small; color: gray;">(Arbiter)</span>
                </div>
                <div class="q-py-xs text-center">
                  <q-rating
                    :readonly="btnLoading || arbiterFeedback.created_at ? true : false"
                    v-model="arbiterFeedback.rating"
                    size="3em"
                    color="yellow-9"
                    icon="star"
                  />
                </div>
                <div class="q-py-sm q-px-xs">
                  <q-input
                    v-if="!arbiterFeedback.created_at || arbiterFeedback.rating > 0 && arbiterFeedback.comment.length > 0"
                    v-model="arbiterFeedback.comment"
                    :dark="darkMode"
                    :readonly="btnLoading || arbiterFeedback.created_at ? true : false"
                    placeholder="Add comment here..."
                    dense
                    outlined
                    autogrow
                    :counter="!arbiterFeedback.created_at"
                    maxlength="200"
                  />
                </div>
              </div>

              <div class="row q-pt-xs q-px-xs">
                <q-btn
                  v-if="!feedback.id ? true : false"
                  :disable="btnLoading || disableButton"
                  rounded
                  :label="step === 1 && appealed ? $t('Next') : $t('Submit')"
                  class="q-space text-white"
                  color="blue-8"
                  :loading="btnLoading"
                  @click="handleButton"
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

            <div v-if="showPostMessage" class="text-center text-blue md-font-size q-mt-md">
                  {{ $t('ReviewPosted') }} {{ timer ? `(${timer})` : '' }}</div>
          </div>
        </q-card>
    </q-dialog>
</template>
<script>
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { commify } from 'ethers/lib/utils'

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
      arbiterFeedback: {
        rating: 0,
        comment: ''
      },
      showPostMessage: false,
      timer: null,
      counterparty: this.counterParty,
      appealed: false,
      step: 1
    }
  },
  components: {
    ProgressLoader
  },
  props: {
    orderId: Number,
    counterParty: Object,
    arbiter: Object,
    type: {
      type: String,
      default: 'peer'
    }
  },
  computed: {
    disableButton () {
      const vm = this
      if (vm.appealed) {
        if (vm.step === 1) {
          return vm.feedback.rating === 0
        } else {
          return vm.arbiterFeedback.rating === 0
        }
      } else {
        return vm.feedback.rating === 0
      }
    }
  },
  mounted () {
    this.checkAppeal()
    this.fetchFeedback()
  },
  methods: {
    getDarkModeClass,
    async checkAppeal () {
      const vm = this
      const url = `/ramp-p2p/order/${vm.orderId}/appeal/`

      await backend.get(url, { authorize: true })
        .then(response => {
          vm.appealed = true
        })
        .catch(error => {
          console.log(error.response)
          if (error.response) {
            if (error.response.status === 400) {
              if (error.response?.data?.error.includes('no appeal')) {
                vm.appealed = false
              }
            } else if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    async fetchFeedback () {
      const vm = this
      const url = '/ramp-p2p/order/feedback/peer/'
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
          if (response.data?.feedbacks?.length > 0) {
            vm.feedback = response.data.feedbacks[0]
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
        .finally(() => {
          if (!vm.appealed) {
            vm.loading = false
          }
        })

      if (vm.appealed) {
        const arbiterUrl = '/ramp-p2p/order/feedback/arbiter/'
        const arbiterParams = {
          limit: 1,
          page: 1,
          from_peer: vm.$store.getters['ramp/getUser'].id,
          order_id: vm.orderId
        }

        await backend.get(arbiterUrl, {
          params: arbiterParams,
          authorize: true
        })
          .then(response => {
            if (response.data?.feedbacks?.length > 0) {
              vm.arbiterFeedback = response.data.feedbacks[0]
            }
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
              bus.emit('network-error')
            }
          })
          .finally(() => { vm.loading = false })
      }
    },
    handleButton () {
      if (this.step === 1 && this.appealed) {
        this.step++
      } else {
        this.sendFeedback()
      }
    },
    sendFeedback () {
      const vm = this
      vm.btnLoading = true
      const url = '/ramp-p2p/order/feedback/peer/'
      const body = {
        order_id: vm.orderId,
        rating: vm.feedback.rating,
        comment: vm.feedback.comment
      }
      backend.post(url, body, { authorize: true })
        .then(response => {
          console.log(response.data)
          vm.feedback = response.data

          if (!vm.appealed) {
            vm.$emit('submit', vm.feedback)
            vm.showPostMessage = true
            vm.autoClose()
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
        .finally(() => {
          if (!vm.appealed) {
            vm.btnLoading = false
          }
        })

      if (this.appealed) {
        const arbiterUrl = '/ramp-p2p/order/feedback/arbiter/'
        const arbiterBody = {
          order_id: vm.orderId,
          rating: vm.arbiterFeedback.rating,
          comment: vm.arbiterFeedback.comment
        }

        backend.post(arbiterUrl, arbiterBody, { authorize: true })
          .then(response => {
            console.log(response.data)
            vm.arbiterFeedback = response.data

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
              bus.emit('network-error')
            }
          })
          .finally(() => {
            vm.btnLoading = false
          })
      }
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
