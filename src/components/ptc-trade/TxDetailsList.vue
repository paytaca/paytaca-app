<template>
  <div class="row q-mt-md">
    <span
      class="q-mb-md col-12 text-center text-bold"
      style="font-size: 18px;"
    >
      Transactions List
    </span>

    <template v-if="saleContractTransactions.length > 0">
      <q-scroll-area style="height: 50vh; width: 100vw;">
        <div
          v-for="(tx, index) in saleContractTransactions"
          class="text-body1"
        >
          <div class="row col-12 justify-between text-bold">
            <span>{{ parseTxid(tx.purchase_tx_id) }}</span>
            <span>{{ parseAmount(tx.purchase_amount) }}</span>
          </div>

          <div class="row col-12 justify-between">
            <span class="col-6">
              Purchased on {{ parseLocaleDate(tx.purchase_date) }}
            </span>
            <span class="col-6 text-right">
              Locked until {{ parseLocaleDate(tx.lockup_date) }}
            </span>
          </div>

          <q-separator spaced="lg" />
        </div>
      </q-scroll-area>
    </template>

    <template v-else>
      <span
        class="row full-width flex-center transactions-wallet market-value"
        :class="getDarkModeClass(darkMode)"
      >
        No transactions found
      </span>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/shared'

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