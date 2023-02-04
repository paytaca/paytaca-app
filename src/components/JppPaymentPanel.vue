<template>
  <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
    <q-card-section>
        <div class="text-h6 ellipsis">Payment</div>
        <div class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">PaymentID:</div>
          <div class="ellipsis">#{{ jpp?.parsed?.paymentId }}</div>
          <q-btn
            flat
            icon="content_copy"
            size="sm"
            padding="xs"
            @click="copyToClipboard(jpp?.parsed?.paymentId, 'Payment ID Copied')"
          />
        </div>
        <div v-if="jpp?.parsed?.paymentUrl" class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">URL:</div>
          <div class="ellipsis">{{ jpp?.parsed?.paymentUrl }}</div>
          <q-btn
            flat
            icon="content_copy"
            size="sm"
            padding="xs"
            @click="copyToClipboard(jpp?.parsed?.paymentUrl, 'Link Copied')"
          />
        </div>
        <div v-if="jpp?.parsed?.time" class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Created:</div>
          <div>{{ formatTimestampToText(jpp?.parsed?.time) }}</div>
        </div>
        <div v-if="jpp?.parsed?.expires" class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Expires:</div>
          <div>{{ formatTimestampToText(jpp?.parsed?.expires) }}</div>
        </div>
        <div v-if="jpp?.parsed?.memo" class="q-my-sm">
          <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">Memo:</div>
          <q-banner
            class="text-body1 rounded-borders"
            :class="darkMode ? 'text-white': ''"
            style="border: 1px solid grey;background-color: inherit;">
            {{ jpp.parsed?.memo }}
          </q-banner>
        </div>
        <div>
          <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
            Recipient{{ jpp?.parsed?.outputs?.length > 1 ? 's' : '' }}:
          </div>
          <div
            v-for="(output, index) in jpp?.parsed?.outputs" :key="index"
            class="row no-wrap items-start q-mb-sm q-gutter-x-xs"
          >
            <div class="q-space">
              {{ ellipsisText(output.address, {start: 16, end: 5 }) }}
              <q-popup-proxy :breakpoint="0">
                <div
                  :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']"
                  class="text-body2"
                  style="word-break:break-all;"
                >
                  {{ output.address }}
                </div>
              </q-popup-proxy>
            </div>
            <div class="text-right">{{ output.amount / 10 ** 8 }} BCH</div>
          </div>
          <div v-if="jpp?.parsed?.outputs?.length > 1" class="row items-center q-mb-sm text-subtitle1">
            <div class="q-space">Total:</div>
            <div>{{ jpp.total / 10 ** 8 }} BCH</div>
          </div>
        </div>
        <div v-if="jpp.txids.length">
          <div class="text-subtitle1" style="margin-bottom:-8px">
            Transaction{{ jpp.txids.length > 1 ? 's' : '' }}
          </div>
          <div v-for="(txid, index) in jpp.txids" :key="index" class="row items-center">
            <div class="q-space ellipsis">{{ ellipsisText(txid, {start: 10, end: 10 }) }}</div>
            <div class="row q-gutter-x-sm">
              <q-btn size="0.7em" padding="0.8em" rounded icon="content_copy" @click="copyToClipboard(txid)"/>
              <q-btn size="0.7em" padding="0.8em" rounded icon="open_in_new" target="_blank" :href="txLink(txid)"/>
            </div>
          </div>
        </div>
        <div v-if="loading" class="column items-center">
          <q-spinner size="2em"/>
          <div>{{ loadingMsg }}</div>
        </div>
        <q-banner v-else-if="errorMsg" class="bg-red text-white rounded-borders">
          {{ errorMsg }}
        </q-banner>
        <div v-if="!showDragSlide && !loading" class="q-mt-sm">
          <q-btn
            no-caps
            :color="darkMode ? 'grad' : 'brandblue'"
            label="Confirm"
            class="full-width"
            @click="showDragSlide = true"
          />
        </div>
      </q-card-section>
      <DragSlide
        v-if="showDragSlide && !loading"
        @swiped="onSwipe()"
        class="fixed-bottom"
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
      />
  </q-card>
</template>
<script setup>
import { ellipsisText, formatTimestampToText } from "src/wallet/anyhedge/formatters";
import { computed, inject, ref, watch } from "vue"
import { useStore } from "vuex"
import { useQuasar } from "quasar";
import { JSONPaymentProtocol } from "src/wallet/payment-uri"
import { Wallet } from "src/wallet/index"
import DragSlide from "./drag-slide.vue";
import SecurityCheckDialog from "./SecurityCheckDialog.vue";

const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const $emit = defineEmits([
  'paid',
])

const props = defineProps({
  jpp: {
    type: JSONPaymentProtocol,
    required: true,
  },
  wallet: {
    type: Wallet,
    required: true,
  }
})

function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

function txLink(txid) {
  return `https://blockchair.com/bitcoin-cash/transaction/${txid}/`
}


const showDragSlide = ref(true)
function onSwipe() {
  $q.dialog({
    component: SecurityCheckDialog,
  })
    .onOk(() => completePayment())
    .onDismiss(() => {
      showDragSlide.value = false
    })
}

watch(() => [props.jpp?.parsed?.paymentId], () => {
  errorMsg.value = ''
})
const loading = ref(false)
const loadingMsg = ref('')
const errorMsg = ref('')
function completePayment() {
  errorMsg.value = ''
  loading.value = true
  loadingMsg.value = 'Completing payment'
  Promise.resolve({ skip: false })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Preparing transaction'
      await props.jpp.prepareTransaction(props.wallet)
      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in preparing transaction'
      }
      return {skip: true}
    })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Verifying transaction'
      await props.jpp.verifyPayment()

      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in verifying transaction'
      }
      return {skip: true}
    })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Completing payment'
      await props.jpp.pay()
      $emit('paid', props.jpp.txids)
      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in completing payment'
      }
      return {skip: true}
    })
    .finally(() => {
      loading.value = false
      loadingMsg.value = ''
    })
}
</script>
