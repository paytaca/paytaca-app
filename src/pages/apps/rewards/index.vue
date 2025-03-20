<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="`Rewards`"
      :isRewardsPage="true"
    />

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
          <template v-if="isLoading">
            <progress-loader
              :color="isNotDefaultTheme(theme) ? theme : 'pink'"
              :isTight="true"
            />
          </template>
          <span
            v-else
            class="amount-text"
            :class="getDarkModeClass(darkMode, '', 'text-grad')"
          >
            {{ promo.points }} {{ pointsType[index].toUpperCase() }}
          </span>
        </div>

        <div class="row col-3 justify-end">
          <q-btn
            rounded
            class="btn-scan button text-white bg-grad"
            icon="chevron_right"
            :disable="isLoading"
            @click="$router.push({ name: promo.path, query: { id: promo.id ?? -1 } })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { createUserPromoData, getUserPromoData, Promos } from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RewardsPage',

  components: {
    HeaderNav,
    ProgressLoader
  },

  data () {
    return {
      isLoading: false,
      pointsType: ['up', 'rfp'/*, 'lp', 'cp', 'mp' */],
      promos: [
        {
          name: 'User Rewards',
          id: null,
          points: 0,
          path: 'user-rewards',
          shortName: Promos.USERREWARDS
        },
        {
          name: 'Refer-a-Friend (RF) Promo',
          id: null,
          points: 0,
          path: 'rfp',
          shortName: Promos.RFPROMO
        } //,
        // { name: 'Loyalty Promo', id: null, points: 0, path: '', shortName: 'lp' },
        // { name: 'Champion Promo', id: null, points: 0, path: '', shortName: 'cp' },
        // { name: 'Paytaca Partner Rewards (PPR) Promo', id: null, points: 0, path: '', shortName: 'pprp' }
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

  async mounted () {
    const vm = this

    // retrieve points from engagement-hub
    vm.isLoading = true

    await getUserPromoData()
      .then(async data => {
        if (data) {
          for (let i = 0; i < vm.promos.length; i++) {
            const promoId = data[vm.pointsType[i]].id
            vm.promos[i].id = promoId

            if (promoId) {
              const contract = new PromoContract(
                vm.$store.getters['global/getWallet']('bch')?.xPubKey,
                vm.promos[i].shortName
              )
              console.log(contract)
              await contract.subscribeAddress()
              vm.promos[i].points = await contract.getTokenBalance()
            } else vm.promos[i].points = 0
          }
        } else await createUserPromoData()
      })
    vm.isLoading = false
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme
  }
}
</script>
