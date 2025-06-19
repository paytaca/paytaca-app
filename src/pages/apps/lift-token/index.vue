<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="'LIFT Token'"
      id="header-nav"
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
          id="section-tab"
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
            <reservations-tab-panel
              :reservationsList="reservationsList"
              :liftSwapContractAddress="liftSwapContractAddress"
              @on-successful-purchase="retrieveData"
            />
          </q-tab-panel>

          <q-tab-panel name="purchase" style="padding: 5px 0;">
            <purchases-tab-panel
              :purchasesList="purchasesList"
              :liftSwapContractAddress="liftSwapContractAddress"
            />
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
import { getContractAddressApi, getPurchasesData, getReservationsData } from 'src/utils/engagementhub-utils/lift-token'

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
      liftSwapContractAddress: '',

      reservationsList: [],
      purchasesList: []
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
    isNotDefaultTheme,

    async retrieveData () {
      this.isLoading = true

      const results = await Promise.allSettled([
        getReservationsData(), getPurchasesData(), getContractAddressApi()
      ])
      this.reservationsList = results[0].value
      this.purchasesList = results[1].value
      this.liftSwapContractAddress = results[2].value

      this.isLoading = false
    }
  },

  async mounted () {
    this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
    await this.retrieveData()
  }
}
</script>