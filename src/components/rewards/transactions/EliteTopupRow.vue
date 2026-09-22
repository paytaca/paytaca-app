<template>
  <q-item class="elite-row">
    <q-item-section avatar>
      <div class="elite-row-icon">
        <q-icon :name="item.asset === 'bch' ? 'img:bch-logo.png' : 'img:lift-token.png'" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="elite-row-title">
        {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}
        <span class="elite-row-tx">{{ item.txId.slice(0, 8) }}...{{ item.txId.slice(-8) }}</span>
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ formatDateLocaleRelative(item.date, false) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="elite-row-amt">
        <template v-if="item.asset === 'bch'">+<bch-amount :amount="getAssetDenomination('BCH', item.amount, false, true)" symbol="BCH" /></template>
        <template v-else>+{{ formatWithLocale(item.amount, { min: 0, max: LIFT_TOKEN_DECIMALS }) }} LIFT</template>
      </div>
    </q-item-section>
  </q-item>
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