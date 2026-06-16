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
          <div v-if="props.currentPriceBch !== null" class="text-h5 text-weight-bold">
            {{ formatBCH(props.currentPriceBch).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ formatBCH(props.currentPriceBch).zeros }}</span> BCH
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
import { computed } from 'vue'
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
  currentPriceBch: {
    type: Number,
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
    bid_price_bch: props.currentPriceBch
  })
}
</script>