<template>
  <q-item class="elite-row">
    <q-item-section avatar>
      <div class="elite-row-icon">
        <q-icon :name="item.type === 'otc' ? 'store' : 'img:marketplace.svg'" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="elite-row-title">
        <span class="row elite-row-type">
          {{ parseItemType(item.type) }}
        </span>
        <span class="row elite-row-ref" @click="redirect">
          {{ item.type === 'otc' ? `Ref. ID ${item.ref_id}` : `Order #${item.order_id}` }}
          <q-icon name="open_in_new" size="14px" />
        </span>
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

    <div class="elite-row-date text-caption">
      <span class="row">
        {{ item.merchant_name }}
      </span>
      <span class="row" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
        {{ formatDateLocaleRelative(item.created_at, false) }}
      </span>
    </div>
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

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    formatDateLocaleRelative,
    parseLiftToken,
    parseFiatCurrencyWrapper,

    parseItemType (type) {
      switch (type) {
        case 'otc':
          return 'Over-the-counter'
        case 'mkp':
          return 'Marketplace'
        default:
          return 'Unknown purchase'
      }
    },

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
@import 'src/css/rewards/elite-row-styles.scss';
</style>