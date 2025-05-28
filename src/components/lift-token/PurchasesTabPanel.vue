<template>
  <div class="row text-body1 justify-evenly">
    <sale-group-chip
      :saleGroup="'all'"
      :outline="isChipOutline('all')"
      @click="filterPurchasesList('all')"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.SEED"
      :outline="isChipOutline(SaleGroup.SEED)"
      @click="filterPurchasesList(SaleGroup.SEED)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PRIVATE"
      :outline="isChipOutline(SaleGroup.PRIVATE)"
      @click="filterPurchasesList(SaleGroup.PRIVATE)"
    />
    <sale-group-chip
      :saleGroup="SaleGroup.PUBLIC"
      :outline="isChipOutline(SaleGroup.PUBLIC)"
      @click="filterPurchasesList(SaleGroup.PUBLIC)"
    />
    <sale-group-chip
      :saleGroup="'lock'"
      :outline="isChipOutline('lock')"
      @click="filterPurchasesList('lock')"
    />
    <sale-group-chip
      :saleGroup="'vest'"
      :outline="isChipOutline('vest')"
      @click="filterPurchasesList('vest')"
    />
  </div>

  <q-separator spaced />

  <template v-if="finalPurchasesList?.length === 0">
    <div class="q-mt-md row flex-center full-width text-h5 text-grey">
      No purchases found
    </div>
  </template>

  <template v-else>
    <q-scroll-area style="height: 60vh; width: 100%">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md">
        <q-card
          v-for="(purchase, index) in finalPurchasesList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row col-12 justify-between">
            <div class="row col-7 justify-start">
              <sale-group-chip :saleGroup="purchase.sale_group" />
            </div>
            <div class="row col-5 justify-end">
              <sale-group-chip
                :saleGroup="purchase.vesting_details.length > 0 ? 'vest' : 'lock'"
              />
            </div>
          </div>

          <span class="row col-12 flex-center text-bold">
            {{ parseLiftToken(purchase.purchased_amount_tkn) }}
          </span>

          <div class="row col-12 justify-between text-subtitle1">
            fds
          </div>

          <div
            class="row col-12 justify-between text-subtitle2"
            style="line-height: 1.2em;"
          >
            gdf
          </div>
        </q-card>
      </div>
    </q-scroll-area>
  </template>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'

import SaleGroupChip from 'src/components/lift-token/SaleGroupChip.vue'

export default {
  name: 'PurchasesTabPanel',

  props: {
    purchasesList: { type: Array, default: null }
  },

  components: {
    SaleGroupChip
  },

  data () {
    return {
      SaleGroup,

      finalPurchasesList: [],

      selectedFilter: 'all'
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

    filterPurchasesList (saleGroup) {
      this.selectedFilter = saleGroup
      if (saleGroup === 'all') {
        this.finalPurchasesList = this.purchasesList
      } else if (saleGroup === 'lock') {
        this.finalPurchasesList = this.purchasesList.filter(
          a => a.vesting_details.length === 0
        )
      } else if (saleGroup === 'vest') {
        this.finalPurchasesList = this.purchasesList.filter(
          a => a.vesting_details.length > 0
        )
      } else {
        this.finalPurchasesList = this.purchasesList.filter(
          a => a.sale_group === saleGroup
        )
      }
    },
    isChipOutline (saleGroup) {
      if (this.selectedFilter === 'all') return false
      return saleGroup !== this.selectedFilter
    },
  },

  mounted () {
    this.finalPurchasesList = this.purchasesList
  }
}
</script>