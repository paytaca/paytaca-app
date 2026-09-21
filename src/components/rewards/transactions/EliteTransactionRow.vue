<template>
  <div class="elite-row">
    <div class="elite-row-icon">
      <q-icon :name="item.type === 'otc' ? 'store' : 'storefront'" />
    </div>
    <div class="elite-row-main">
      <div class="elite-row-title">
        {{ item.type === 'otc' ? 'OTC' : 'Marketplace' }}
        <span class="elite-row-tx">{{ item.txId.slice(0, 8) }}...{{ item.txId.slice(-8) }}</span>
      </div>
      <div class="elite-row-sub">{{ formatDateLocaleRelative(item.date, false) }}</div>
    </div>
    <div class="elite-row-side">
      <div class="elite-row-amt">+{{ formatWithLocale(item.liftCashback, { min: 0, max: LIFT_TOKEN_DECIMALS }) }} LIFT</div>
      <div class="elite-row-bch">{{ formatWithLocale(item.bchSpent, { min: 0, max: 8 }) }} BCH spent</div>
    </div>
  </div>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { formatWithLocale } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'

export default {
  name: 'EliteTransactionRow',

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
    formatWithLocale
  }
}
</script>

<style lang="scss" scoped>
@import './elite-row-styles.scss';

.elite-row-bch {
  font-size: 10.5px;
  color: #6b6b7b;
  margin-top: 2px;
}

.dark .elite-row-bch {
  color: #9a97ad;
}
</style>