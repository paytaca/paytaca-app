<template>
  <span class="bch-amount">
    <span class="main">{{ parts.main }}</span><span class="trailing-zeros">{{ parts.trailingZeros }}</span><span v-if="parts.symbol" class="symbol"> {{ parts.symbol }}</span>
  </span>
</template>

<script>
import { splitBchAmount } from 'src/utils/denomination-utils'

export default {
  name: 'BchAmount',
  props: {
    /** The formatted amount string, e.g., "0.91801000 BCH" or "0.91801000" */
    amount: {
      type: String,
      required: true
    },
    /** The denomination (BCH, mBCH, sats) */
    denomination: {
      type: String,
      default: 'BCH'
    },
    /** Optional symbol to display */
    symbol: {
      type: String,
      default: ''
    }
  },
  computed: {
    parts () {
      return splitBchAmount(this.amount, this.denomination, this.symbol)
    }
  }
}
</script>

<style scoped>
.bch-amount {
  font-variant-numeric: tabular-nums;
}

.bch-amount .trailing-zeros {
  opacity: 0.4;
}

.bch-amount .symbol {
  font-weight: normal;
}
</style>
