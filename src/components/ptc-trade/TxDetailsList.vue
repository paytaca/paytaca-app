<template>
  <div class="row q-mt-md">
    <span
      class="q-mb-sm col-12 text-center text-bold"
      style="font-size: 18px;"
    >
      Transactions List
    </span>

    <template v-if="saleContractTransactions.length > 0">
      <q-scroll-area style="height: 50vh; width: 100vw;">
        <q-separator spaced="sm" />

        <q-list separator>
          <q-item 
            v-for="(tx, index) in saleContractTransactions"
            clickable
            v-ripple
            class="q-my-sm text-body1"
            @click="openMoreDetailsDialog(tx)"
          >
            <q-item-section class="row col-12">
              <q-item-label class="q-mb-xs row justify-between text-bold">
                <span>{{ parseTxid(tx.purchase_tx_id) }}</span>
                <span>{{ parseAmount(tx.purchase_amount) }}</span>
              </q-item-label>
              
              <q-item-label class="row justify-between text-subtitle2">
                <template v-if="new Date() > new Date(tx.lockup_date)">
                  <span class="q-pr-xs col-6">
                    <template v-if="tx.sale_transaction_details.length === 0">
                      Lockup period is over
                    </template>
                    <template v-else>
                      Last vesting period was
                      {{ parseLocaleDate(tx.sale_transaction_details[0].vested_date) }}
                    </template>
                  </span>
                  <span class="q-pl-xs col-6 text-right">
                    <template v-if="checkVestingCount(tx.sale_transaction_details)">
                      Vesting period is over
                    </template>
                    <template v-else>
                      Next vesting priod is
                      {{ parseNextVestingDate(tx.sale_transaction_details) }}
                    </template>
                  </span>
                </template>
  
                <template v-else>
                  <span class="q-pr-xs col-6">
                    Purchased on {{ parseLocaleDate(tx.purchase_date) }}
                  </span>
                  <span class="q-pl-xs col-6 text-right">
                    Locked until {{ parseLocaleDate(tx.lockup_date) }}
                  </span>
                </template>
              </q-item-label>
            </q-item-section>

          </q-item>
        </q-list>
        
        <q-separator spaced="sm" />
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

import TxMoreDetailsDialog from 'src/components/ptc-trade/dialogs/TxMoreDetailsDialog.vue'

export default {
  name: 'SaleContractCard',

  props: {
    saleContractTransactions: { type: Object, default: null },
    saleGroup: { type: String, default: 'seed' }
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
    },
    parseNextVestingDate (txDetails) {
      let vestingMonth
      if (this.saleGroup == 'seed') vestingMonth = 3
      else if (this.saleGroup == 'priv') vestingMonth = 1

      const vestingDate = new Date(txDetails[0].vested_date)
      const nextDate = vestingDate.setMonth(vestingDate.getMonth() + vestingMonth)
      return parseLocaleDate(nextDate)
    },
    checkVestingCount (txDetails) {
      let vestingCount
      if (this.saleGroup == 'seed') vestingCount = 4
      else if (this.saleGroup == 'priv') vestingCount = 6

      return txDetails.length === vestingCount
    },
    openMoreDetailsDialog (txDetails) {
      this.$q.dialog({
        component: TxMoreDetailsDialog,
        componentProps: { txDetails }
      })
    }
  }
}
</script>