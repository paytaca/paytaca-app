<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="'LIFT Token'"
    />

    <template v-if="isLoading">
      <div class="q-mt-xl q-pt-xl row flex-center text-center text-h5 full-width">
        <span class="q-mb-md col-12 text-bow" :class="getDarkModeClass(darkMode)">
          Retrieving details ...
        </span>
        <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
      </div>
    </template>

    <template v-else>
      <div
        class="row q-mx-lg q-gutter-y-xs"
        style="font-size: 18px; margin-top: -20px;"
      >
        <q-tabs
          v-model="sectionTab"
          class="col-12"
          :indicator-color="isNotDefaultTheme(theme) ? 'transparent' : ''"
        >
          <q-tab
            name="reserves"
            :label="'Reservations'"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
          <q-tab
            name="purchase"
            :label="'Purchases'"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
        </q-tabs>

        <q-tab-panels
          animated
          v-model="sectionTab"
          style="background-color: transparent;"
          class="row full-width full-height text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <q-tab-panel name="reserves" style="padding: 5px 0;">
            <reservations-tab-panel :reservationsList="reservationsList" />
          </q-tab-panel>

          <q-tab-panel name="purchase" style="padding: 5px 0;">
            <purchases-tab-panel :purchasesList="purchasesList" />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReservationsTabPanel from 'src/components/lift-token/ReservationsTabPanel.vue'
import PurchasesTabPanel from 'src/components/lift-token/PurchasesTabPanel.vue'

export default {
  name: 'LiftTokenPage',

  components: {
    HeaderNav,
    ProgressLoader,
    ReservationsTabPanel,
    PurchasesTabPanel
  },

  data () {
    return {
      isLoading: false,
      sectionTab: 'reserves',

      reservationsList: [
        {
          sale_group: 'seed',
          amount_purchased_token: 100000000,
          amount_purchased_usd: 15000,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        },
        {
          sale_group: 'priv',
          amount_purchased_token: 10000000,
          amount_purchased_usd: 2500,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        },
        {
          sale_group: 'pblc',
          amount_purchased_token: 100000,
          amount_purchased_usd: 50,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        },
        {
          sale_group: 'seed',
          amount_purchased_token: 100000000,
          amount_purchased_usd: 15000,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        },
        {
          sale_group: 'priv',
          amount_purchased_token: 10000000,
          amount_purchased_usd: 2500,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        },
        {
          sale_group: 'pblc',
          amount_purchased_token: 100000,
          amount_purchased_usd: 50,
          approved_date: '2025-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5'
        }
      ],
      purchasesList: [
        {
          sale_group: 'seed',
          purchased_amount_tkn: 100000000,
          purchased_amount_usd: 15000,
          purchased_amount_bch: 12.34567890,
          purchased_date: '2025-05-25T14:01:49.525Z',
          lockup_date: '2026-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
          vesting_details: []
        },
        {
          sale_group: 'priv',
          purchased_amount_tkn: 10000000,
          purchased_amount_usd: 2500,
          purchased_amount_bch: 1.23456789,
          purchased_date: '2025-05-25T14:01:49.525Z',
          lockup_date: '2026-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
          vesting_details: []
        },
        // {
        //   sale_group: 'pblc',
        //   purchased_amount_tkn: 100000,
        //   purchased_amount_usd: 50,
        //   purchased_amount_bch: 0.12345678,
        //   purchased_date: '2025-05-25T14:01:49.525Z',
        //   lockup_date: '2026-05-25T14:01:49.525Z',
        //   bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
        //   vesting_details: []
        // },
        {
          sale_group: 'seed',
          purchased_amount_tkn: 100000000,
          purchased_amount_usd: 15000,
          purchased_amount_bch: 12.34567890,
          purchased_date: '2025-05-25T14:01:49.525Z',
          lockup_date: '2026-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
          vesting_details: []
        },
        {
          sale_group: 'priv',
          purchased_amount_tkn: 10000000,
          purchased_amount_usd: 2500,
          purchased_amount_bch: 1.23456789,
          purchased_date: '2025-05-25T14:01:49.525Z',
          lockup_date: '2026-05-25T14:01:49.525Z',
          bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
          vesting_details: []
        }//,
        // {
        //   sale_group: 'pblc',
        //   purchased_amount_tkn: 100000,
        //   purchased_amount_usd: 50,
        //   purchased_amount_bch: 0.12345678,
        //   purchased_date: '2025-05-25T14:01:49.525Z',
        //   lockup_date: '2026-05-25T14:01:49.525Z',
        //   bch_address: 'bitcoincash:zpx2cpp67gfwe09039s5ykuss2as6kukagww3c7vd5',
        //   vesting_details: []
        // }
      ]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme
  },

  async mounted () {
    this.isLoading = true

    // retrieve details from engagement hub

    this.isLoading = false
  }
}
</script>