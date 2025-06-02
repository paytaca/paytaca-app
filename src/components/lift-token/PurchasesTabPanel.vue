<template>
  <div class="row text-body1 justify-evenly" id="filter">
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
    <sale-group-chip
      :saleGroup="'comp'"
      :outline="isChipOutline('comp')"
      @click="filterPurchasesList('comp')"
    />
  </div>

  <q-separator spaced />

  <template v-if="finalPurchasesList?.length === 0">
    <div class="q-mt-md row flex-center full-width text-h5 text-grey">
      No purchases found
    </div>
  </template>

  <template v-else>
    <q-scroll-area :style="`height: ${scrollAreaHeight}; width: 100%`">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md cursor-pointer">
        <q-card
          v-ripple
          v-for="(purchase, index) in finalPurchasesList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
          @click="openPurchaseInfoDialog(purchase)"
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
            <span class="col-6">
              {{ parseFiatCurrency(purchase.purchased_amount_usd, 'usd') }}
            </span>
            <span class="col-6 text-right">
              {{ getAssetDenomination('BCH', purchase.purchased_amount_bch) }}
            </span>
          </div>

          <div
            class="row col-12 q-pb-xs justify-between text-subtitle2"
            style="line-height: 1.2em;"
          >
            <template v-if="new Date() > new Date(purchase.lockup_date)">
              <span class="q-pr-xs col-6">
                <template v-if="purchase.vesting_details.length === 0">
                  Lockup period is over
                </template>
                <template v-else>
                  Last vesting period was
                  {{ parseLocaleDate(purchase.vesting_details[0].vested_date) }}
                </template>
              </span>
              <span class="q-pl-xs col-6 text-right">
                <template v-if="checkVestingCount(purchase.vesting_details)">
                  Vesting period is over
                </template>
                <template v-else>
                  Next vesting priod is
                  {{ parseNextVestingDate(purchase.vesting_details) }}
                </template>
              </span>
            </template>

            <template v-else>
              <span class="q-pr-xs col-6">
                Purchased on {{ parseLocaleDate(purchase.purchased_date) }}
              </span>
              <span class="q-pl-xs col-6 text-right">
                Locked until {{ parseLocaleDate(purchase.lockup_date) }}
              </span>
            </template>

          </div>
        </q-card>
      </div>
    </q-scroll-area>
  </template>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLiftToken, parseLocaleDate } from 'src/utils/engagementhub-utils/shared'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'
import { parseFiatCurrency, getAssetDenomination } from 'src/utils/denomination-utils'

import SaleGroupChip from 'src/components/lift-token/SaleGroupChip.vue'
import PurchaseInfoDialog from './dialogs/PurchaseInfoDialog.vue'

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

      selectedFilter: 'all',
      scrollAreaHeight: '63vh'
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
    parseFiatCurrency,
    getAssetDenomination,
    parseLocaleDate,

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
      } else if (saleGroup === 'comp') {
        this.finalPurchasesList = this.purchasesList.filter(
          a => a.vesting_details.length === 4
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
    openPurchaseInfoDialog (purchase) {
      this.$q.dialog({
        component: PurchaseInfoDialog,
        componentProps: { purchase }
      })
    }
  },

  mounted () {
    this.finalPurchasesList = this.purchasesList

    const headerNavHeight = document.getElementById('header-nav')?.clientHeight
    const sectionTabHeight = document.getElementById('section-tab')?.clientHeight
    const filterHeight = document.getElementById('filter')?.clientHeight

    const divsHeight = headerNavHeight + sectionTabHeight + filterHeight
    const screenHeight = this.$q.screen.height
    this.scrollAreaHeight = `${screenHeight - divsHeight - 35}px`
  }
}
</script>