<template>
  <q-dialog 
    :model-value="isToggledBuyItNow" 
    @update:model-value="$emit('update:isToggledBuyItNow', $event)" 
    position="bottom"
  >
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pa-md text-center">
        <q-avatar icon="bolt" color="red-1" text-color="red" size="md" class="q-mb-sm" />
        <div class="text-h6 text-weight-bold">Buy It Now?</div>

        <div class="q-mt-sm">
          <div v-if="currentPriceFiat !== null" class="text-h5 text-weight-bold">
            ₱{{ formatFiat(currentPriceFiat) }}
          </div>
          <div class="text-caption text-grey-6">
            <span v-if="currentPriceBch !== null">
              {{ formatBCH(currentPriceBch).main
              }}<span :style="{ opacity: 0.45 }">{{ formatBCH(currentPriceBch).zeros }}</span> BCH
            </span>
          </div>
          <p class="text-caption q-mt-xs text-grey-6">
            Price drops over time. This is the current price.
          </p>
        </div>
      </q-card-section>

      <q-card-section class="row q-col-gutter-sm q-px-md q-pb-md">
        <div class="col-6">
          <q-btn
            outline
            no-caps
            class="full-width text-weight-medium"
            color="primary"
            label="Cancel"
            @click="$emit('update:isToggledBuyItNow', false)"
          />
        </div>
        <div class="col-6">
          <q-btn
            unelevated
            no-caps
            class="full-width text-weight-medium"
            color="green"
            label="Buy It Now"
            :loading="loading"
            @click="confirmPurchase"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  isToggledBuyItNow: {
    type: Boolean,
    required: true
  },
  lot: {
    type: Object,
    default: null
  },
  auction: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isToggledBuyItNow', 'confirm-buy-it-now'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])


const nowMs = ref(Date.now())
let ticker = null

const startMs = computed(() => props.auction ? new Date(props.auction.start_date).getTime() : null)
const endMs = computed(() => props.auction ? new Date(props.auction.end_date).getTime()   : null)

const startingPriceFiat = computed(() => Number(props.lot?.starting_price ?? props.lot?.estimated_amount_fiat ?? 0))
const floorPriceFiat = computed(() => Number(props.lot?.threshold_bid_fiat ?? props.lot?.threshold_bid ?? 0))
const startingPriceBch  = computed(() => Number(props.lot?.estimated_amount ?? 0))
const floorPriceBch = computed(() => Number(props.lot?.threshold_bid ?? 0))

const priceProgress = computed(() => {
  if (!startMs.value || !endMs.value) return 1
  const total  = endMs.value - startMs.value
  const elapsed = Math.max(0, Math.min(nowMs.value - startMs.value, total))
  return total > 0 ? Math.max(0, 1 - elapsed / total) : 0
})

const currentPriceFiat = computed(() => {
  const hi = startingPriceFiat.value
  const lo = floorPriceFiat.value
  if (!hi) return null
  return lo + (hi - lo) * priceProgress.value
})

const currentPriceBch = computed(() => {
  const hi = startingPriceBch.value
  const lo = floorPriceBch.value
  if (!hi) return null
  return lo + (hi - lo) * priceProgress.value
})

watch(() => props.isToggledBuyItNow, (open) => {
  if (open) {
    nowMs.value = Date.now()
    ticker = setInterval(() => { nowMs.value = Date.now() }, 1000)
  } else {
    clearInterval(ticker)
  }
})

onUnmounted(() => clearInterval(ticker))

const formatFiat = (val) => {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatBCH = (val) => {
  if (val == null) return { main: '—', zeros: '' }
  const str = Number(val).toFixed(8)
  const [int, dec] = str.split('.')
  const significant   = dec.replace(/0+$/, '') || '0'
  const trailingZeros = dec.slice(significant.length)
  return { main: `${int}.${significant}`, zeros: trailingZeros }
}

const confirmPurchase = () => {
  emit('confirm-buy-it-now', {
    bid_price_fiat: currentPriceFiat.value,
    bid_price_bch: currentPriceBch.value
  })
}
</script>