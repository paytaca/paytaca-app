<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="`Rewards`" backnavpath="/apps" class="apps-header" />

    <div
      class="row q-mx-lg q-gutter-y-md"
      style="padding-top: 50px; font-size: 18px;"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div
        class="row col-12 justify-between items-center q-pa-md group-currency"
        :class="getDarkModeClass(darkMode)"
        v-for="(promo, index) in promos"
        :key="index"
      >
        <div class="col-8">
          <span
            class="text-token"
            :class="darkMode ? isNotDefaultTheme(theme) ? 'text-grad' : 'dark' : 'light'"
          >
            {{ promo.name }}
          </span><br/>
          <span
            class="amount-text"
            :class="getDarkModeClass(darkMode, '', 'text-grad')"
          >
            {{ promo.points }} {{ pointsType[index] }}
          </span>
        </div>

        <div class="row col-3 justify-end">
          <q-btn
            rounded
            class="btn-scan button text-white bg-grad"
            icon="chevron_right"
            @click="$router.push({ name: promo.path })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav'

export default {
  name: 'RewardsPage',

  components: {
    HeaderNav
  },

  data () {
    return {
      pointsType: ['UP', 'RFP'/*, 'LP', 'CP', 'MP' */],
      promos: [
        { name: 'User Rewards', points: 0, path: 'user-rewards' },
        { name: 'Refer-a-Friend (RF) Promo', points: 0, path: 'rfp' } //,
        // { name: 'Loyalty Promo', points: 0 },
        // { name: 'Champion Promo', points: 0 },
        // { name: 'Paytaca Partner Rewards (PPR) Promo', points: 0 }
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
  }
}
</script>
