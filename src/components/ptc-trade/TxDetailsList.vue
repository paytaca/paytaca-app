<template>
  <div class="row q-mt-md">
    <span
      class="q-mb-sm col-12 text-center text-bold"
      style="font-size: 18px;"
    >
      Transactions List
    </span>

    <q-scroll-area style="height: 50vh; width: 100vw;">
      <div
        v-for="(tx, index) in saleContractTransactions"
        class="text-body1"
      >
        <div class="row col-12 justify-between">
          <span>
            {{ parseTxid(tx.purchase_tx_id) }}
          </span>
          <span>
            {{ parseAmount(tx.purchase_amount) }}
          </span>
        </div>
        <span
          class="row col-12 justify-end transactions-wallet market-value"
          :class="getDarkModeClass(darkMode, 'text-weight-light', '')"
        >
          {{ parseLocaleDate(tx.purchase_date) }}
        </span>

        <q-separator spaced="lg" />
      </div>
    </q-scroll-area>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/rewards'

export default {
  name: 'SaleContractCard',

  props: {
    saleContractTransactions: { type: Object, default: null }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    parseLocaleDate,

    parseTxid (txid) {
      const txidLen = txid.length
      const prefix = txid.substring(0, 6)
      const suffix = txid.substring(txidLen - 6, txidLen)

      return `${prefix}...${suffix}`
    },
    parseAmount (amount) {
      return `${new Intl.NumberFormat().format(amount)} PTC`
    }
  }
}
</script>