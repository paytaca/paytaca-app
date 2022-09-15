<template>
  <div>
    <q-card-section
      v-for="(hedgeOffer, index) in hedgeOffers" :key="index"
    >
      <div class="row q-mb-sm">
        <q-badge :color="statusToColor(hedgeOffer.status)">{{ hedgeOffer.status }}</q-badge>
        <div class="q-space"></div>
        <div class="text-grey">{{ formatDate(hedgeOffer.created_at) }}</div>
      </div>
      <div class="row">
        <div class="col">
          <div>{{ hedgeOffer.satoshis / (10**8) }} BCH</div>
        </div>
        <div class="col" style="text-align:right">
          {{ hedgeOffer.low_liquidation_multiplier }}x -
          {{ hedgeOffer.high_liquidation_multiplier }}x
        </div>
      </div>
      <div>
        <q-icon name="mdi-timer-sand"/>
        {{ hedgeOffer.duration_seconds }} seconds
      </div>
      <!-- <div style="word-break: break-all;">
        {{ hedgeOffer }}
      </div> -->
    </q-card-section>
  </div>
</template>
<script setup>
import { formatDate } from 'src/wallet/anyhedge/formatters'

defineProps({
  hedgeOffers: Array
})


const statusColorMap = { pending: 'amber', settled: 'green', cancelled: 'red' }
function statusToColor(value) {
  return statusColorMap[value] || 'grey'
}

</script>