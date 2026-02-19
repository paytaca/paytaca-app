<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="$t('Rewards')"
      rewardsPage="home"
    />

    <div
      class="row q-mx-lg q-gutter-y-md"
      style="padding-top: 50px; font-size: 18px;"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div
        class="row col-12 justify-between items-center q-pa-md group-currency"
        :class="getDarkModeClass(darkMode)"
        v-for="(promo, index) in Object.values(promos)"
        :key="index"
      >
        <div class="col-8">
          <span
            class="text-token"
            :class="darkMode ? 'dark' : 'light'"
          >
            {{ promo.name }}
          </span><br/>
          <template v-if="isLoading">
            <progress-loader
              
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
            @click="redirectToPromoPage(promo)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ensureKeypair } from 'src/utils/memo-service'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Promos,
  PromosBytes,
  getUserPromoData,
  createUserPromoData,
  updateUserPromoData,
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav'
import HelpDialog from 'src/components/rewards/dialogs/HelpDialog.vue'
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
      swapContractAddress: '',
      pointsType: ['up', 'rp'/*, 'lp', 'cp', 'mp' */],
      promos: {
        up: {
          name: this.$t('UserRewards'),
          id: null,
          points: 0,
          path: 'user-rewards',
          shortName: Promos.USERREWARDS
        },
        rp: {
          name: this.$t('RFPromo'),
          id: null,
          points: 0,
          path: 'rfp',
          shortName: Promos.RFPROMO
        } //,
        // lp: { name: 'Loyalty Promo', id: null, points: 0, path: '' },
        // cp: { name: 'Champion Promo', id: null, points: 0, path: '' },
        // mp: { name: 'Paytaca Partner Rewards (PPR) Promo', id: null, points: 0, path: '' }
      }
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
    this.isLoading = true

    const data = await getUserPromoData()
    if (data) {
      // background update of last_viewed
      updateUserPromoData({ last_viewed: new Date() })

      try {
        const keyPair = await ensureKeypair()
        for (const type of this.pointsType) {
          const promoId = data[type]
          if (promoId) {
            const contract = new PromoContract(keyPair.pubkey, PromosBytes[type].toString())
            await contract.subscribeAddress()
            const promoBalance = await contract.getTokenBalance()
            this.promos[type].points = promoBalance
          }
        }
      } catch (error) {
        console.error(error)
      }
    } else {
      this.$q.dialog({
        component: HelpDialog,
        componentProps: { page: 'home' }
      })
      await createUserPromoData()
    }

    this.isLoading = false
  },

  methods: {
    getDarkModeClass,
    redirectToPromoPage (promo) {
      this.$router.push({
        name: promo.path,
        query: {
          id: promo.id ?? -1,
          address: this.swapContractAddress
        }
      })
    }
  }
}
</script>
