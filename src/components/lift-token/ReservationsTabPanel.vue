<template>
  <template v-if="finalRsvpList?.length === 0">
    <div class="q-mt-md row flex-center full-width text-h5 text-grey">
      No reservations found
    </div>
  </template>

  <template v-else>
    <div class="row text-body1">
      <sale-group-chip
        :outline="isChipOutline('all')"
        :saleGroup="'all'"
        @click="filterRsvpList('all')"
      />
      <sale-group-chip
        :outline="isChipOutline(SaleGroup.SEED)"
        :saleGroup="SaleGroup.SEED"
        @click="filterRsvpList(SaleGroup.SEED)"
      />
      <sale-group-chip
        :outline="isChipOutline(SaleGroup.PRIVATE)"
        :saleGroup="SaleGroup.PRIVATE"
        @click="filterRsvpList(SaleGroup.PRIVATE)"
      />
      <sale-group-chip
        :outline="isChipOutline(SaleGroup.PUBLIC)"
        :saleGroup="SaleGroup.PUBLIC"
        @click="filterRsvpList(SaleGroup.PUBLIC)"
      />
    </div>

    <q-separator spaced />

    <q-scroll-area style="height: 60vh; width: 100%">
      <div class="row q-pt-sm q-pb-md q-px-sm q-gutter-y-md">
        <q-card
          v-for="(rsvp, index) in finalRsvpList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row col-12 justify-end">
            
          </div>

          <div class="row col-12 q-mb-xs justify-between items-center">
            <span class="col-6 text-body1 text-bold">
              {{ parseLiftToken(rsvp.amount_purchased_token) }}
            </span>
            <div class="row col-6 justify-end">
              <sale-group-chip :saleGroup="rsvp.sale_group" />
            </div>
          </div>

          <div
            class="row col-12 justify-between text-subtitle2"
            style="line-height: 1.2em;"
          >
            <span class="col-6">
              {{ parseFiatCurrency(rsvp.amount_purchased_usd, 'USD') }}
            </span>
            <span class="col-6 text-right">
              Approved last {{ parseLocaleDate(rsvp.approved_date) }}
            </span>
          </div>

          <div class="row col-12 justify-center q-mt-md q-mb-xs">
            <q-btn
              label="Purchase"
              class="button"
            />
          </div>
        </q-card>
      </div>
    </q-scroll-area>
  </template>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { parseLocaleDate, parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { SaleGroup } from 'src/utils/engagementhub-utils/lift-token'

import SaleGroupChip from 'src/components/lift-token/SaleGroupChip.vue'

export default {
  name: 'ReservationsTabPanel',

  props: {
    reservationsList: { type: Array, default: null }
  },

  components: {
    SaleGroupChip
  },

  data () {
    return {
      SaleGroup,

      finalRsvpList: [],

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
    parseFiatCurrency,
    parseLocaleDate,
    parseLiftToken,

    filterRsvpList (saleGroup) {
      this.selectedFilter = saleGroup
      if (saleGroup === 'all') {
        this.finalRsvpList = this.reservationsList
      } else {
        this.finalRsvpList = this.reservationsList.filter(
          a => a.sale_group === saleGroup
        )
      }
    },
    isChipOutline (saleGroup) {
      if (this.selectedFilter === 'all') return false
      return saleGroup !== this.selectedFilter
    }
  },

  async mounted () {
    this.finalRsvpList = this.reservationsList
  }
}
</script>