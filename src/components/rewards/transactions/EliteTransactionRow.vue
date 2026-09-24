<template>
  <q-item class="elite-row">
    <q-item-section avatar>
      <div class="elite-row-icon">
        <q-icon :name="item.type === 'otc' ? 'store' : 'img:marketplace.svg'" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="elite-row-title">
        {{ item.type === 'otc' ? 'OTC' : 'Marketplace' }}
        <span class="elite-row-ref" @click="redirect">
          {{ item.type === 'otc' ? `Ref. ID ${item.ref_id}` : `Order #${item.order_id}` }}
          <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
        </span>
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ item.merchant_name }}
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ formatDateLocaleRelative(item.created_at, false) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="elite-row-amt">
        +{{ parseLiftToken(item.lift_cashback_received) }}
      </div>
      <div class="elite-row-bch">
        +{{ parseFiatCurrencyWrapper(item.fiat_lift_cashback_received) }}
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
    parseLiftToken,
    parseFiatCurrencyWrapper,

    redirect () {
      if (this.item.type === 'mkp' && this.item.order_id) {
        this.$router.push({
          name: 'app-marketplace-order',
          params: { orderId: this.item.order_id }
        })
      } else if (this.item.tx_id) {
        this.$router.push({
          name: 'transaction-detail',
          params: { txid: this.item.tx_id },
          query: { from: 'app-rewards-elite-history' }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import './elite-row-styles.scss';

.elite-row-bch {
  font-size: 10.5px;
  font-weight: 800;
  margin-top: 2px;
}
</style>