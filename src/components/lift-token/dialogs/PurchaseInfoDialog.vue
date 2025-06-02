<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 text-bow full-width" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-xs">
        <div>
          <sale-group-chip :saleGroup="purchase.sale_group" />
          <sale-group-chip :saleGroup="parseStatus()" />
        </div>

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
        <div class="row col-12 text-body1">
          <span class="col-12 text-body2 dim-text">Amount Purchased</span>
          <span class="col-12">
            {{ parseLiftToken(purchase.purchased_amount_tkn) }}
          </span>
          <span class="col-12 q-mb-sm">
            {{ parseFiatCurrency(purchase.purchased_amount_usd, 'USD') }} |
            {{ getAssetDenomination('BCH', purchase.purchased_amount_bch) }}
          </span>

          <span class="col-12 text-body2 dim-text">Date Purchased</span>
          <span class="col-12 q-mb-sm">
            {{ parseLocaleDate(purchase.purchased_date) }}
          </span>

          <template v-if="purchase.sale_group !== SaleGroup.PUBLIC">
            <span class="col-12 text-body2 dim-text">Lockup Period</span>
            <span class="col-12 q-mb-sm">
              {{ parseLocaleDate(purchase.lockup_date) }}
            </span>
          </template>

          <span class="col-12 text-body2 dim-text">BCH Address</span>
          <span class="col-12 q-mb-sm">
            {{ parseBchAddress(purchase.bch_address) }}
          </span>
        </div>

        <span
          v-if="purchase.sale_group !== SaleGroup.PUBLIC"
          class="q-mb-sm col-12 text-center text-body1 dim-text"
        >
          Vesting Progress
        </span>

        <div
          v-for="(details, index) in vestingDetailsList"
          class="q-mb-sm row col-12"
        >
          <status-chip
            :isCompleted="!!details"
            :index="index + 1"
          />

          <template v-if="details">
            <div class="q-pl-sm col-10">
              <span col-12>{{ parseLocaleDate(details.vested_date) }}</span>
              <span col-12>Vested {{ parseLiftToken(details.vested_amount) }}</span>
            </div>

          </template>

          <template v-else>
            <span class="q-pl-sm text-grey">Vesting has not occurred yet</span>
          </template>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken, parseLocaleDate } from 'src/utils/engagementhub-utils/shared'
import { parseFiatCurrency, getAssetDenomination } from 'src/utils/denomination-utils'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'

import StatusChip from 'src/components/rewards/StatusChip.vue'
import SaleGroupChip from '../SaleGroupChip.vue'

export default {
  name: 'PurchaseInfoDialog',

  props: {
    purchase: { type: Object, default: null }
  },

  components: {
    StatusChip,
    SaleGroupChip
  },

  data () {
    return {
      SaleGroup,

      vestingDetailsList: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    parseLocaleDate,
    parseFiatCurrency,
    getAssetDenomination,

    parseBchAddress (address) {
      const addLen = address.length
      return `${address.substring(0, 17)}...${address.substring(addLen - 7, addLen)}`
    },
    parseStatus () {
      if (this.purchase.vesting_details.length === 4) return 'comp'
      return this.purchase.vesting_details.length > 0 ? 'vest' : 'lock'
    }
  },

  mounted () {
    for (let i = 0; i < 4; i++) {
      this.vestingDetailsList.push(null)
    }
  }
}
</script>

<style lang="scss" scoped>
  .dim-text {
    color: #ed5f59;
    font-weight: 600;
  }
</style>