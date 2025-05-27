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
            purchases here
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

export default {
  name: 'LiftTokenPage',

  components: {
    HeaderNav,
    ProgressLoader,
    ReservationsTabPanel
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
          approved_date: '2025-05-25T14:01:49.525Z'
        },
        {
          sale_group: 'priv',
          amount_purchased_token: 10000000,
          amount_purchased_usd: 2500,
          approved_date: '2025-05-25T14:01:49.525Z'
        },
        {
          sale_group: 'pblc',
          amount_purchased_token: 100000,
          amount_purchased_usd: 50,
          approved_date: '2025-05-25T14:01:49.525Z'
        },
        {
          sale_group: 'seed',
          amount_purchased_token: 100000000,
          amount_purchased_usd: 15000,
          approved_date: '2025-05-25T14:01:49.525Z'
        },
        {
          sale_group: 'priv',
          amount_purchased_token: 10000000,
          amount_purchased_usd: 2500,
          approved_date: '2025-05-25T14:01:49.525Z'
        },
        {
          sale_group: 'pblc',
          amount_purchased_token: 100000,
          amount_purchased_usd: 50,
          approved_date: '2025-05-25T14:01:49.525Z'
        }
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