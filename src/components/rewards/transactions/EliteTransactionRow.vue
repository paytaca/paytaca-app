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
          {{ item.type === 'otc' ? `Ref. ID ${item.refId}` : `Order ${item.orderId}` }}
          <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
        </span>
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ item.merchantName }}
      </q-item-label>
      <q-item-label class="text-caption elite-row-sub">
        {{ formatDateLocaleRelative(item.date, false) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="elite-row-amt">+{{ formatWithLocale(item.liftCashback, { min: 0, max: LIFT_TOKEN_DECIMALS }) }} LIFT</div>
      <div class="elite-row-bch"><bch-amount :amount="getAssetDenomination('BCH', item.bchSpent, false, true)" symbol="BCH" /> spent</div>
    </q-item-section>
  </q-item>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { formatWithLocale, getAssetDenomination } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import BchAmount from 'src/components/common/BchAmount.vue'

export default {
  name: 'EliteTransactionRow',

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
    getAssetDenomination,

    redirect () {
      if (this.item.type === 'marketplace' && this.item.orderId) {
        this.$router.push({
          name: 'app-marketplace-order',
          params: { orderId: this.item.orderId }
        })
      } else if (this.item.txId) {
        this.$router.push({
          name: 'transaction-detail',
          params: { txid: this.item.txId },
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