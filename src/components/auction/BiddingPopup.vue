<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card
      class="br-15 pt-card-2 text-bow full-width"
      :class="getDarkModeClass(darkMode)"
      style="max-width: 480px; border-radius: 20px 20px 0 0 !important;"
    >
      <q-card-section class="q-pb-sm">
        <!-- Bid dialog title and connected wallet -->
        <div class="row items-center no-wrap">
          <div>
            <div class="text-caption text-weight-bold text-uppercase q-mb-xs" style="letter-spacing: 0.12em; opacity: 0.45;">
              PLACE BID
            </div>
            <div class="text-h6 text-weight-bold">Select a Price</div>
          </div>
          <q-space />
          <q-btn flat round v-close-popup padding="xs" class="text-grey">
            <q-icon name="close" size="20px" />
          </q-btn>
        </div>

        <q-chip
          dense
          outline
          color="grey"
          class="q-mt-sm q-px-sm"
          style="max-width: 180px; opacity: 0.6;"
        >
          <q-icon name="account_balance_wallet" size="13px" class="q-mr-xs" />
          <span class="ellipsis text-caption text-weight-medium" style="max-width: 130px;">{{ walletLabel }}</span>
        </q-chip>
      </q-card-section>

      <q-separator :dark="darkMode" />
      
      <q-card-section class="q-py-sm">
        <!-- Current bid floor and minimum bid validation -->
        <div class="row items-center q-gutter-xs text-caption" style="opacity: 0.65;">
          <q-icon name="gavel" size="13px" />
          <span>{{ hasBidsYet ? 'Highest bid:' : 'Starting floor price:' }}</span>
          <span class="text-weight-bold">
            <template v-if="auction?.is_fiat">
              {{ formatFiat(currentFloorFiat) }} ({{ getFormattedBCH(currentFloorBch).main }}<span style="opacity: 0.55;">{{ getFormattedBCH(currentFloorBch).zeros }}</span> BCH)
            </template>
            <template v-else>
              {{ getFormattedBCH(currentFloorBch).main }}<span style="opacity: 0.55;">{{ getFormattedBCH(currentFloorBch).zeros }}</span> BCH ({{ formatFiat(currentFloorFiat) }})
            </template>
          </span>
        </div>
        <div v-if="isBelowMinimum" class="text-caption text-negative q-mt-xs">
          <q-icon name="warning" size="13px" class="q-mr-xs" />
          <template v-if="hasBidsYet">Bid must be higher than the current floor price.</template>
          <template v-else>Bid must be equal to or higher than the starting floor price.</template>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <!-- Suggested bid amounts -->
        <div class="text-caption text-weight-bold text-uppercase q-mb-sm">
          Quick select
        </div>

        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            v-for="amount in quickAmounts"
            :key="amount"
            no-caps
            unelevated
            :outline="price !== String(amount)"
            color="positive"
            :text-color="price === String(amount) ? 'white' : 'positive'"
            padding="xs md"
            class="text-weight-bold rounded-borders text-caption"
            @click="price = String(amount)"
          >
            <template v-if="auction?.is_fiat">
              <span class="text-weight-bold">₱{{ amount }}</span>
            </template>
            <template v-else>
              <span class="text-weight-bold">{{ getFormattedBCH(amount).main }}</span>
              <span class="text-weight-bold" style="opacity: 0.55;">{{ getFormattedBCH(amount).zeros }}</span>
              <span class="text-weight-bold q-ml-xs" style="opacity: 0.55;">BCH</span>
            </template>
          </q-btn>
        </div>

        <div class="row items-center q-gutter-sm q-mb-md">
          <q-separator class="col" :dark="darkMode" />
          <span class="text-caption text-italic" style="opacity: 0.45;">or enter custom</span>
          <q-separator class="col" :dark="darkMode" />
        </div>

        <!-- Custom bid amount input -->
        <q-input
          v-model="price"
          type="number"
          outlined
          dense
          :placeholder="auction?.is_fiat ? '0.00' : '0.00000000'"
          min="0"
          :step="auction?.is_fiat ? '1' : '0.00000001'"
          :dark="darkMode"
          input-class="text-weight-semibold"
          style="font-size: 18px;"
        >
          <template #prefix v-if="auction?.is_fiat">
            <span class="text-subtitle1 text-weight-bold q-mr-xs" style="opacity: 0.5;">₱</span>
          </template>
          <template #append v-if="!auction?.is_fiat">
            <span class="text-caption text-weight-bold" style="opacity: 0.35; letter-spacing: 0.06em;">BCH</span>
          </template>
        </q-input>

        <!-- Converted bid amount preview -->
        <div
          v-if="price && Number(price) > 0"
          class="row items-center q-mt-sm text-caption"
          style="opacity: 0.55;"
        >
          <q-icon name="sync" size="13px" class="q-mr-xs" />
          Value Breakdown:
          <span class="q-ml-xs text-weight-bold">
            <template v-if="auction?.is_fiat">
              {{ formatFiat(Number(price)) }} &rarr; {{ getFormattedBCH(convertedOutputBch).main }}<span style="font-size: 11px; opacity: 0.55;">{{ getFormattedBCH(convertedOutputBch).zeros }}</span> BCH
            </template>
            <template v-else>
              {{ getFormattedBCH(Number(price)).main }}<span style="font-size: 11px; opacity: 0.55;">{{ getFormattedBCH(Number(price)).zeros }}</span> BCH &rarr; {{ formatFiat(convertedOutputFiat) }}
            </template>
          </span>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none q-pb-lg">
        <!-- Submit the selected bid -->
        <q-btn
          no-caps
          unelevated
          color="positive"
          :disable="!price || Number(price) <= 0 || isBelowMinimum || loading"
          :loading="loading"
          class="full-width text-weight-bold"
          style="border-radius: 12px; height: 50px; font-size: 15px;"
          @click="placeBid"
        >
          Place Bid
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
// Imports
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'

import { Store } from 'src/store'
import { callAPI } from 'src/auction/api'
import { formatBCH as getFormattedBCH } from 'src/pages/apps/auction/helper-functions'

// Component props
const props = defineProps({
  modelValue: Boolean,
  lot: { type: Object, default: null },
  auction: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

// Events emitted to the parent component
const emit = defineEmits(['update:modelValue', 'place-bid'])

// Quasar and Vuex instances
const $q = useQuasar()
const $store = useStore()

// Shared display and exchange-rate state
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

// Dialog-specific bid state
const price = ref('')
const hasBidsYet = ref(false)

// Checks the server for a confirmed bid to determine the current bid floor.
const checkLiveBids = async () => {
  if (!props.lot?.id) return

  try {
    const result = await callAPI(`lots/${props.lot.id}/highest-bid`)
    
    if (
      result.success
      && result.data?.id
      && ['Highest', 'Winner'].includes(result.data.status)
    ) {
      hasBidsYet.value = true
    } else {
      hasBidsYet.value = false
    }
  } catch (err) {
    console.error('Error verifying bidding logs in popup:', err)
    hasBidsYet.value = false
  }
}

// Resets the input and refreshes bid status whenever the dialog opens.
watch(() => props.modelValue, async (open) => {
  if (open) {
    price.value = ''
    await checkLiveBids()
  }
})

// Shows the connected BCH wallet in shortened form.
const walletLabel = computed(() => {
  const wh = Store.getters['global/getWallet']('bch')?.walletHash
  if (!wh) return 'Not connected'
  return wh.length > 20 ? `${wh.slice(0, 10)}...${wh.slice(-10)}` : wh
})

// Converts the current price floor to BCH for display and validation.
const currentFloorBch = computed(() => {
  if (!props.lot) return 0
  if (props.auction?.is_fiat) {
    const fiatFloor = Number(props.lot.threshold_bid_fiat || 0)
    return bchToPhpRate.value > 0 ? fiatFloor / bchToPhpRate.value : 0
  }
  return Number(props.lot.threshold_bid_bch || 0)
})

// Converts the current price floor to fiat for display and validation.
const currentFloorFiat = computed(() => {
  if (!props.lot) return 0
  if (props.auction?.is_fiat) 
    return Number(props.lot.threshold_bid_fiat || 0)
  return Number(props.lot.threshold_bid_bch || 0) * bchToPhpRate.value
})

// Builds suggested bid amounts based on currency and whether bidding has started.
const quickAmounts = computed(() => {
  if (props.auction?.is_fiat) {
    const base = Math.ceil(currentFloorFiat.value)
    const step = 50
    
    if (!hasBidsYet.value) {
      return [base, base + step, base + step * 2, base + step * 3]
    }
    return [base + step, base + step * 2, base + step * 5, base + step * 10]
  } else {
    const base = Number(currentFloorBch.value)
    const step = 0.00005 
    
    if (!hasBidsYet.value) {
      return [
        base,
        parseFloat((base + step).toFixed(8)),
        parseFloat((base + step * 2).toFixed(8)),
        parseFloat((base + step * 3).toFixed(8))
      ]
    }
    return [
      parseFloat((base + step).toFixed(8)),
      parseFloat((base + step * 2).toFixed(8)),
      parseFloat((base + step * 5).toFixed(8)),
      parseFloat((base + step * 10).toFixed(8))
    ]
  }
})

// Checks whether the entered amount meets the current minimum bid.
const isBelowMinimum = computed(() => {
  if (!price.value || Number(price.value) <= 0) return false
  
  if (props.auction?.is_fiat) {
    return hasBidsYet.value 
      ? Number(price.value) <= currentFloorFiat.value 
      : Number(price.value) < currentFloorFiat.value
  } else {
    return hasBidsYet.value 
      ? Number(price.value) <= currentFloorBch.value 
      : Number(price.value) < currentFloorBch.value
  }
})

// Converts the entered amount to BCH for payment.
const convertedOutputBch = computed(() => {
  if (!price.value) return 0
  
  if (props.auction?.is_fiat) {
    return bchToPhpRate.value > 0 ? Number(price.value) / bchToPhpRate.value : 0
  }

  return Number(price.value)
})

// Converts the entered amount to fiat for the bid record.
const convertedOutputFiat = computed(() => {
  if (!price.value) return 0

  if (props.auction?.is_fiat) {
    return Number(price.value)
  }

  return Number(price.value) * bchToPhpRate.value
})

// Formats a fiat value as Philippine pesos.
const formatFiat = (val) => {
  if (val == null) return '—'
  return `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Verifies the wallet balance and emits the normalized bid amounts.
const placeBid = () => {
  const walletBalance = $store.getters['assets/getAssets'][0]?.spendable || 0

  if (walletBalance < parseFloat(convertedOutputBch.value.toFixed(8))) {
    $q.notify({
      type: 'negative',
      icon: 'account_balance_wallet',
      message: 'Insufficient balance!',
      timeout: 3000
    })
    return
  }

  emit('place-bid', {
    bid_price_bch: parseFloat(convertedOutputBch.value.toFixed(8)),
    bid_price_fiat: parseFloat(convertedOutputFiat.value.toFixed(2))
  })
}
</script>
