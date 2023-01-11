<template>
  <div>
    <HedgeOffersListItem
      v-for="(hedgeOffer, index) in hedgeOffers" :key="index"
      :hedge-position-offer="hedgeOffer"
      @removed="hedgePositionOffer => $emit('removed', hedgePositionOffer)"
      @updated="hedgePositionOffer => $emit('updated', hedgePositionOffer)"
    />
  </div>
</template>
<script setup>
import HedgeOffersListItem from './HedgeOffersListItem.vue';

const $emit = defineEmits([
  'removed',
  'updated',
])

defineProps({
  hedgeOffers: Array
})
</script>
