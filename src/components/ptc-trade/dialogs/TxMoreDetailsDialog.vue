<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
        <span class="text-h6">{{ parseTxid(txDetails.purchase_tx_id) }}</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row">
        <div class="q-my-md row text-body1">
          <span class="col-12">
            Purchase Date: {{ parseLocaleDate(txDetails.purchase_date) }}
          </span>
          <span class="col-12">
            Amount Purchased: {{ parseAmount(txDetails.purchase_amount) }}
          </span>
          <span class="col-12">
            Lockup Period: {{ parseLocaleDate(txDetails.lockup_date) }}
          </span>
        </div>

        <span class="q-mb-sm col-12 text-center text-body1 text-bold">
          Vesting Progress
        </span>

        <div
          v-for="(details, index) in txDetailsList"
          class="q-mb-sm row col-12"
        >
          <status-chip
            :isCompleted="!!details"
            :index="index + 1"
          />

          <template v-if="details">
            <div class="q-pl-sm col-10">
              <div class="row col-12 justify-between">
                <span>{{ parseTxid(details.tx_id) }}</span>
                <span>{{ parseLocaleDate(details.vested_date) }}</span>
              </div>
              <span>Vested {{ parseAmount(details.vested_amount) }}</span>
            </div>

          </template>

          <template v-else>
            <span class="q-pl-sm">Vesting has not happened yet</span>
          </template>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/shared'

import StatusChip from 'src/components/rewards/StatusChip.vue'

export default {
  name: 'TxMoreDetailsDialog',

  props: {
    txDetails: { type: Object, default: null },
  },

  components: {
    StatusChip
  },

  data () {
    return {
      txDetailsList: []
    }
  },

  mounted () {
    console.log(this.txDetails)
    let vestingCount = 0
    if (this.txDetails.sale_group === 'seed') vestingCount = 4
    else if (this.txDetails.sale_group === 'priv') vestingCount = 6

    const txList = this.txDetails.sale_transaction_details
    for (let i = txList.length - 1; i >= 0; i--) {
      this.txDetailsList.push(txList[i])
    }
    for (let i = this.txDetailsList.length; i < vestingCount; i++) {
      this.txDetailsList.push(null)
    }
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