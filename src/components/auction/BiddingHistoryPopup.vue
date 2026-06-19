<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-subtitle1 text-weight-bold">Bidding History</div>
          <div class="text-caption" style="opacity: 0.6;">
            {{ bids.length }} {{ bids.length === 1 ? 'bid' : 'bids' }} placed
          </div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div v-if="loading">
          <q-skeleton v-for="n in 4" :key="n" height="20px" class="q-mb-md" />
        </div>

        <template v-else-if="bids.length">
          <div
            v-for="(bid, index) in sortedBids"
            :key="bid.id"
            class="q-mb-sm"
          >
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center q-gutter-x-xs">
                <q-icon
                  :name="bid.id === highestBid?.id ? 'emoji_events' : 'gavel'"
                  :color="bid.id === highestBid?.id ? 'positive' : 'grey'"
                  size="xs"
                />
                <span class="text-caption text-weight-bold">
                  {{ isOwnBid(bid) ? 'You' : truncateWallet(bid.user_id) }}
                </span>
                <q-badge v-if="bid.id === highestBid?.id" color="positive" rounded dense>Highest</q-badge>
              </div>
              <span
                class="text-caption text-weight-bold"
                :class="bid.id === highestBid?.id ? 'text-positive' : ''"
              >
                {{ getFormattedBCH(Number(bid.bid_price_bch || 0)).main }}<span style="opacity: 0.55;">{{ getFormattedBCH(Number(bid.bid_price_bch || 0)).zeros }}</span>
                BCH
              </span>
            </div>
            <div class="text-caption ellipsis">{{ formatFiat(bid.bid_price_fiat) }}</div>
            <div class="text-caption" style="opacity: 0.75;">{{ formatRelativeTime(bid.bidding_date) }}</div>
            <q-separator v-if="index !== sortedBids.length - 1" spaced="xs" />
          </div>
        </template>

        <div v-else class="text-caption text-center q-py-md" style="opacity: 0.5;">
          No bids yet.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { date } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Store } from 'src/store'
import { callAPI } from 'src/auction/api.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  lotId: {
    type: [String, Number],
    required: true
  }
})
defineEmits(['update:modelValue'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

const loading = ref(false)

const bids = ref([])

const fetchBids = async () => {
  if (!props.lotId) {
    bids.value = []
    return
  }

  loading.value = true
  try {
    const res = await callAPI('biddings-by-lot', props.lotId)
    if (res?.success) {
      bids.value = Array.isArray(res.data) ? res.data : []
    } else {
      console.error('[BiddingHistoryPopup] fetchBids error:', res?.error)
      bids.value = []
    }
  } catch (err) {
    console.error('[BiddingHistoryPopup] fetchBids exception:', err)
    bids.value = []
  } finally {
    loading.value = false
  }
}

const sortedBids = computed(() =>
  [...bids.value].sort((a, b) => new Date(b.bidding_date) - new Date(a.bidding_date))
)

const highestBid = computed(() => {
  if (!bids.value.length) return null
  return bids.value.reduce((max, b) => (b.bid_price_bch > max.bid_price_bch ? b : max), bids.value[0])
})

const isOwnBid = (bid) => !!walletHash && bid.user_id === walletHash

const truncateWallet = (hash) => {
  if (!hash) return 'Unknown bidder'
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatRelativeTime = (dateString) => {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A')
}

watch(() => props.modelValue, (val) => {
  if (val) fetchBids()
})
</script>