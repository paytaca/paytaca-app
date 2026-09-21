<template>
  <div class="elite-row">
    <div class="elite-row-icon">
      <q-icon :name="item.asset === 'bch' ? 'currency_bitcoin' : 'workspace_premium'" />
    </div>
    <div class="elite-row-main">
      <div class="elite-row-title">
        {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}
        <span class="elite-row-tx">{{ item.txId.slice(0, 8) }}...{{ item.txId.slice(-8) }}</span>
      </div>
      <div class="elite-row-sub">{{ formatDateLocaleRelative(item.date, false) }}</div>
    </div>
    <div class="elite-row-side">
      <div class="elite-row-amt">
        <template v-if="item.asset === 'bch'">+<bch-amount :amount="getAssetDenomination('BCH', item.amount, false, true)" symbol="BCH" /></template>
        <template v-else>+{{ formatWithLocale(item.amount, { min: 0, max: LIFT_TOKEN_DECIMALS }) }} LIFT</template>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { formatWithLocale, getAssetDenomination } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import BchAmount from 'src/components/common/BchAmount.vue'

export default {
  name: 'EliteTopupRow',

  components: {
    BchAmount
  },

  props: {
    item: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      LIFT_TOKEN_DECIMALS
    }
  },

  methods: {
    formatDateLocaleRelative,
    formatWithLocale,
    getAssetDenomination
  }
}
</script>

<style lang="scss" scoped>
@import './elite-row-styles.scss';
</style>