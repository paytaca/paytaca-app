<template>
  <q-item class="elite-row">
    <q-item-section avatar>
      <div class="elite-row-icon">
        <q-icon :name="item.asset === 'sats' ? 'img:bch-logo.png' : 'img:lift-token.png'" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="elite-row-title">
        {{ item.asset.toUpperCase() }}
        <span class="elite-row-tx" @click="redirect">
          Ref. ID {{ item.ref_id }}
          <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
        </span>
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ formatDateLocaleRelative(item.created_at, false) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="elite-row-amt">
        <template v-if="item.asset === 'sats'">
          {{ parseFiatCurrencyWrapper(item.top_up_amount) }}
        </template>
        <template v-else>
          +{{ parseLiftToken(item.top_up_amount, true) }}
        </template>
      </div>
    </q-item-section>
  </q-item>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'

export default {
  name: 'EliteTopupRow',

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
    parseLiftToken,
    parseFiatCurrencyWrapper,

    redirect () {
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: this.item.tx_id },
        query: { from: 'app-rewards-elite-history' }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import './elite-row-styles.scss';
</style>