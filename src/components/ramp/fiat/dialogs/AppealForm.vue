<template>
    <!-- Appeal Dialog -->
    <q-dialog full-width persistent no-shake v-model="showAppealConfirmation" position="bottom">
        <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row">
            <div class="col text-h6 text-center">{{ $t('SubmittingAnAppeal') }}&nbsp;&nbsp;</div>
        </q-card-section>
        <q-card-section class="text-left q-pt-none q-px-lg">
            <span>
              {{ $t('AppealFormAgreement1') }}
            </span>
            <br><br>
            <span class="q-pt-lg">
              {{ $t('AppealFormAgreement2') }}
            </span>
            <br><br>
        </q-card-section>
        <q-card-actions class="q-pt-xs text-center" align="center">
            <q-btn flat :label="$t('Cancel')" @click="$emit('back')" color="red" v-close-popup />
            <q-btn
            flat
            :label="$t('IUnderstandProceed')"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="onProceedAppeal"
            v-close-popup/>
        </q-card-actions>
        </q-card>
    </q-dialog>
    <q-dialog full-width v-model="showAppealForm" position="bottom" @before-hide="$emit('back')">
        <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
        <!-- <q-card-section>
            <div class="text-h6 text-center">Appeal Form</div>
        </q-card-section> -->
        <q-card-section class="q-mt-md">
            <div class="q-mx-md md-font-size">
                <div class=" text-weight-bold">{{ $t('AppealType') }}</div>
                <div class="q-gutter-sm q-pt-sm">
                    <q-badge
                      class="q-pa-sm"
                      rounded
                      :outline="!(selectedAppealType && appealType.value === selectedAppealType.value)"
                      color="blue-grey-6"
                      @click="selectedAppealType = appealType"
                      v-for="appealType in appealTypeOpts"
                      :key="appealType.value" >
                      {{ appealType.label }}
                    </q-badge>
                </div>
                <div class="text-weight-bold q-mt-md">{{ $t('Reasons') }}</div>
                <div class="q-gutter-sm q-pt-sm">
                    <q-badge
                      class="q-pa-sm"
                      rounded
                      color="blue-grey-6"
                      :outline="!(selectedReasons.includes(reason))"
                      @click="updateAppealReasons(reason)"
                      v-for="reason in reasonOpts" :key="reason" >
                      {{ reason }}
                    </q-badge>
                </div>
            </div>
        </q-card-section>
        <q-card-actions class="q-pt-lg text-center" align="center">
            <q-btn class="md-font-size" flat :label="$t('Cancel')" color="red" @click="$emit('back')" v-close-popup />
            <q-btn
              flat
              :label="$t('Submit')"
              class="md-font-size"
              :disable="!selectedAppealType || selectedReasons.length === 0"
              @click="submitAppeal()"
              v-close-popup
            />
        </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script>
import { generateChatRef, updateChatMembers } from 'src/wallet/ramp/chat'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  emits: ['back', 'submit'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showAppealConfirmation: true,
      showAppealForm: false,
      selectedReasons: [],
      selectedAppealType: null,
      reasonOpts: [
        this.$t('AppealFormReasonOpt1'),
        this.$t('AppealFormReasonOpt2'),
        this.$t('AppealFormReasonOpt3')
      ],
      appealTypeOpts: [
        {
          label: this.$t('Release'),
          value: 'RLS'
        },
        {
          label: this.$t('Refund'),
          value: 'RFN'
        }
      ]
    }
  },
  props: {
    type: String,
    order: Object
  },
  mounted () {
    if (this.type === 'seller') {
      this.appealTypeOpts = [{ label: this.$t('Refund'), value: 'RFN' }]
      this.selectedAppealType = { label: this.$t('Refund'), value: 'RFN' }
    }
  },
  methods: {
    getDarkModeClass,
    async submitAppeal () {
      const vm = this
      const data = {
        type: vm.selectedAppealType?.value,
        reasons: vm.selectedReasons
      }
      await backend.post(`/ramp-p2p/order/${vm.order.id}/appeal`, data, { authorize: true })
        .then(vm.addArbiterToChat())
        .then(response => {
          vm.$emit('update-status', response.data.status?.status)
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
    },
    addArbiterToChat () {
      const vm = this
      const members = [vm.order?.members.buyer.public_key, vm.order?.members.seller.public_key].join('')
      const chatRef = generateChatRef(vm.order.id, vm.order.created_at, members)
      vm.fetchOrderMembers(vm.order.id)
        .then(members => {
          const arbiter = members.filter(member => member.is_arbiter === true)
          const arbiterMembers = arbiter.map(({ chat_identity_id }) => ({ chat_identity_id, is_admin: true }))
          updateChatMembers(chatRef, arbiterMembers)
        })
    },
    fetchOrderMembers (orderId) {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/order/${orderId}/members`, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            console.error(error.response)
            reject(error)
          })
      })
    },
    onProceedAppeal () {
      this.showAppealConfirmation = false
      this.showAppealForm = true
    },
    updateAppealReasons (reason) {
      if (this.selectedReasons.includes(reason)) {
        const index = this.selectedReasons.indexOf(reason)
        if (index > -1) {
          this.selectedReasons.splice(index, 1)
        }
      } else {
        this.selectedReasons.push(reason)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
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
