<template>
  <template v-if="finalRsvpList?.length === 0">
    <div class="q-mt-md row flex-center full-width text-h5 text-grey">
      No reservations found
    </div>
  </template>

  <template v-else>
    <div class="row">
      filters here
    </div>

    <q-scroll-area style="height: 70vh; width: 100%">
      <div class="row q-pt-sm q-px-sm q-gutter-y-md">
        <q-card
          v-for="(rsvp, index) in finalRsvpList"
          class="row q-py-sm q-px-md full-width pt-card"
          :class="getDarkModeClass(darkMode)"
        >
          <span class="col-12">
            {{ parseFiatCurrency(rsvp.amount_purchased_token, 'LIFT') }}
          </span>

          <div class="row justify-between">
            <span class="col-6">
              {{ parseFiatCurrency(rsvp.amount_purchased_usd, 'USD') }}
            </span>
            <span class="col-6 text-right">
              Approved last {{ parseLocaleDate(rsvp.approved_date) }}
            </span>
          </div>

          <div class="row col-12 justify-center q-mt-sm">
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
import { parseLocaleDate } from 'src/utils/engagementhub-utils/shared'

export default {
  name: 'ReservationsTabPanel',

  props: {
    reservationsList: { type: Array, default: null }
  },

  data () {
    return {
      finalRsvpList: []
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
    parseLocaleDate
  },

  async mounted () {
    this.finalRsvpList = [
      {
        saleGroup: 'seed',
        amount_purchased_token: 100000000,
        amount_purchased_usd: 15000,
        approved_date: '2025-05-25T14:01:49.525Z'
      },
      {
        saleGroup: 'priv',
        amount_purchased_token: 10000000,
        amount_purchased_usd: 2500,
        approved_date: '2025-05-25T14:01:49.525Z'
      },
      {
        saleGroup: 'pblc',
        amount_purchased_token: 100000,
        amount_purchased_usd: 50,
        approved_date: '2025-05-25T14:01:49.525Z'
      },
      {
        saleGroup: 'seed',
        amount_purchased_token: 100000000,
        amount_purchased_usd: 15000,
        approved_date: '2025-05-25T14:01:49.525Z'
      },
      {
        saleGroup: 'priv',
        amount_purchased_token: 10000000,
        amount_purchased_usd: 2500,
        approved_date: '2025-05-25T14:01:49.525Z'
      },
      {
        saleGroup: 'pblc',
        amount_purchased_token: 100000,
        amount_purchased_usd: 50,
        approved_date: '2025-05-25T14:01:49.525Z'
      }
    ]
  }
}
</script>