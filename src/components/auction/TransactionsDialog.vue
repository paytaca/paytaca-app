<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">

      <!--Title-->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Transactions</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
        <!--While page is loading-->
        <div v-if="isLoading" class="row justify-center q-pa-md">
          <q-spinner color="primary" size="32px" />
        </div>

        <!--Data has been loaded-->
        <template v-else>
          <div
            v-for="(tx, index) in transactions"
            :key="tx.id"
            class="q-mb-sm"
          >
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center q-gutter-x-xs">
                <q-icon
                  :name="tx.type === 'in' ? 'arrow_downward' : 'arrow_upward'"
                  color="primary"
                  size="xs"
                />
                <span class="text-caption text-weight-bold">{{ tx.label }}</span>
              </div>
              <span class="text-caption text-weight-bold text-primary">
                {{ tx.type === 'in' ? '+' : '-' }}
                {{ getFormattedBCH(tx.amount).main }}<span style="opacity: 0.4;">{{ getFormattedBCH(tx.amount).zeros }}</span> BCH
              </span>
            </div>
            
            <!--Display if txid exists-->
            <div v-if="tx.txid" class="text-caption ellipsis" style="opacity: 0.5;">{{ tx.txid }}</div>
            
            <div class="text-caption row items-center no-wrap" style="opacity: 0.45;">
              <!--Display if tx timestamp exists-->
              <div v-if="tx.timestamp">
                {{ tx.timestamp }}
              </div>

              <!--Show Pending transaction-->
              <div v-else>
                <q-spinner-oval size="14px" class="q-mr-xs" />
                <span>Pending</span>
              </div>
            </div>
            
            <q-separator v-if="index < transactions.length - 1" spaced="xs" />
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
// Quasar/Vue imports
// Imports
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { date } from 'quasar'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { callAPI } from 'src/auction/api'
import { formatBCH as getFormattedBCH } from 'src/pages/apps/auction/helper-functions'

// Props
const props = defineProps({
  modelValue: Boolean,
  bidId: {
    type: [String, Number],
    default: null
  },
  lotId: {
    type: [String, Number],
    default: null
  }
})

// Data to be emitted
defineEmits(['update:modelValue'])

// Quasar variables
const $store = useStore()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(false)

// Component-specific variables
const bidPriceBch = ref(null)
const biddingDate = ref(null)
const deliveredDate = ref(null)

// Formats a transaction date for display.
const formatTxDate = (value) => {
  if (!value) return null
  return date.formatDate(value, 'MMM DD, YYYY hh:mm A')
}

// Loads the bid details and delivery date shown in the transaction list.
const fetchBidData = async () => {
  if (!props.bidId) return

  isLoading.value = true
  try {
    const resultBid = await callAPI('biddings', props.bidId)
    if (resultBid.success && resultBid.data) {
      const bid = resultBid.data
      bidPriceBch.value = bid.bid_price_bch
      biddingDate.value = bid.date_bid
    }
    
    const delivery = await $store.dispatch('auction/fetchDeliveryDetails', props.lotId)
    const deliveredEvent = delivery?.delivery_events?.find(event => event.status === 'Delivered')
    deliveredDate.value = deliveredEvent?.date_of_event ?? null
  } catch (err) {
    console.error('Failed to load bid for transactions:', err)
  } finally {
    isLoading.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) fetchBidData()
})

const transactions = computed(() => {
  if (!bidPriceBch.value) return []

  return [
    {
      id: 'sent',
      type: 'out',
      label: 'Sent',
      amount: bidPriceBch.value,
      timestamp: formatTxDate(biddingDate.value),
    },
    {
      id: 'receive',
      type: 'in',
      label: 'Received',
      amount: bidPriceBch.value,
      timestamp: formatTxDate(deliveredDate.value),
    },
  ]
})
</script>
