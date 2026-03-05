<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps"
      :title="$t('Rewards')"
    >
      <template #top-right-menu v-if="!isLoading && !error">
        <q-btn
          round
          class="button"
          icon="question_mark"
          size="sm"
          @click="isHelpActive = true"
        />
      </template>
    </header-nav>

    <!-- Welcome Message -->
    <div class="q-mx-lg q-mt-md q-mb-md">
      <p class="text-body1 text-center q-ma-none">
        {{ $t('WelcomeToRewards', 'Welcome! Explore rewards and promos and start earning points.') }}
      </p>
    </div>

    <!-- Error State -->
    <error-card
      v-if="error"
      :is-points-card="false"
      :is-rewards-home-page="true"
      :error-text="error"
      @on-retry="loadRewards()"
    />

    <div
      v-else
      class="row q-mx-lg q-gutter-y-md q-pt-md"
      style="font-size: 18px;"
    >
      <!-- Loading State - Skeleton Cards -->
      <template v-if="isLoading">
        <div
          v-for="n in pointsType.length"
          :key="n"
          class="row col-12 justify-between items-center q-pa-md br-15 group-currency"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="col-8">
            <q-skeleton :dark="darkMode" type="text" width="60%" height="24px" class="q-mb-sm" />
            <q-skeleton :dark="darkMode" type="text" width="7rem" height="20px" />
          </div>
          <div class="row col-auto justify-end">
            <q-skeleton :dark="darkMode" type="circle" size="40px" />
          </div>
        </div>
      </template>

      <!-- Promo Cards -->
      <template v-else>
        <q-intersection
          v-for="(promo, index) in Object.values(promos)"
          :key="index"
          transition="jump-up"
          once
          class="col-12 card-help-highlight"
        >
          <div
            class="row full-width justify-between items-center q-pa-md br-15 group-currency"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="row col-2">
              <q-icon :name="promo.icon" size="md" color="primary" />
            </div>
            <div class="col-8">
              <span class="text-token" :class="getDarkModeClass(darkMode)">
                {{ promo.name }}
              </span><br/>
              <span
                class="amount-text"
                :class="getDarkModeClass(darkMode, '', 'text-grad')"
              >
                {{ promo.points }} points
              </span>
            </div>

            <div class="row col-2 justify-end">
              <q-btn
                round
                class="btn-scan button text-white bg-grad"
                icon="chevron_right"
                @click="redirectToPromoPage(promo)"
              />
            </div>
          </div>
        </q-intersection>
      </template>
    </div>
  </div>

  <help-card v-model="isHelpActive" :page="'home'" />
</template>

<script>
import { ensureKeypair } from 'src/utils/memo-service'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  PromosBytes,
  getUserPromoData,
  createUserPromoData,
  updateUserPromoData,
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import HelpCard from 'src/components/rewards/HelpCard.vue'
import ErrorCard from 'src/components/rewards/ErrorCard.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RewardsPage',

  components: {
    HeaderNav,
    HelpCard,
    ErrorCard,
  },

  data () {
    return {
      isLoading: false,
      isHelpActive: false,
      error: null,
      swapContractAddress: '',

      pointsType: ['up', 'rp'/*, 'lp', 'cp', 'mp'*/],
      promos: {
        up: {
          name: this.$t('UserRewards', 'User Rewards'),
          id: null,
          points: 0,
          icon: 'redeem',
          path: 'user-rewards'
        },
        rp: {
          name: this.$t('RFPromo', 'Refer-a-Friend Promo'),
          id: null,
          points: 0,
          icon: 'diversity_3',
          path: 'rfp'
        },
        // lp: { name: 'Loyalty Promo', id: null, points: 0, icon: '', path: '' },
        // cp: { name: 'Champion Promo', id: null, points: 0, icon: '', path: '' },
        // mp: { name: 'Paytaca Partner Rewards (PPR) Promo', id: null, points: 0, icon: '', path: '' }
      }
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  async mounted () {
    await this.loadRewards()
  },

  methods: {
    getDarkModeClass,

    async loadRewards () {
      this.isLoading = true
      this.error = null

      const data = await getUserPromoData()
      if (data && Object.keys(data).length > 0) {
        try {
          const keyPair = await ensureKeypair()
          for (const type of this.pointsType) {
            const promoId = data[type]
            if (promoId) {
              const targetPromo = PromosBytes[type.toUpperCase()]
              const contract = new PromoContract(keyPair.pubkey, targetPromo)
              const promoBalance = await contract.getTokenBalance()
              this.promos[type].points = promoBalance
              this.promos[type].id = promoId
            }
          }
        } catch (error) {
          console.error(error)
          this.error = this.$t('FailedToLoadPromoData', 'Unable to load promo data at the moment. Please try again later.')
        }
      } else if (data && Object.keys(data.length === 0)) {
        await createUserPromoData()
      } else {
        this.error = this.$t('FailedToLoadPage', 'Unable to load page at the moment. Please try again later.')
      }

      this.isLoading = false

      setTimeout(() => {
        this.$nextTick(() => {
          if (data && !data?.last_viewed) this.isHelpActive = true
          updateUserPromoData({ last_viewed: new Date() })
        })
      }, 250)
    },

    redirectToPromoPage (promo) {
      this.$router.push({
        name: promo.path,
        params: { id: promo.id ?? -1 }
      })
    }
  }
}
</script>
