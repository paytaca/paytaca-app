<template>
  <div class="row items-center">
    <q-icon name="ac_unit" size="1em" class="stablehedge-balance-icon"/>
    <div>{{ bchBalance }} BCH</div>
  </div>
</template>
<script>
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, onUnmounted } from 'vue'

export default defineComponent({
  name: 'StablehedgeWidget',
  setup() {
    window.t = stablehedgePriceTracker;
    const $store = useStore();
    const bchBalance = computed(() => {
      const sats = $store.getters['stablehedge/totalTokenBalancesInSats']
      return sats / 10 ** 8
    })

    let unsubscribePriceTracker = null;
    onMounted(() => {
      unsubscribePriceTracker = stablehedgePriceTracker.subscribe()
    })
    onUnmounted(() => unsubscribePriceTracker?.())

    return {
      bchBalance,
    }
  }
})
</script>
<style lang="scss" scoped>
.stablehedge-balance-icon {
  margin-top: -1px;
  margin-right: map-get($space-xs, 'x');
}
</style>
