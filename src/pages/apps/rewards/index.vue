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
      <template #top-right-menu>
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
    <div v-if="error" class="row flex-center q-mx-lg q-pt-md" style="min-height: 33vh;">
      <div class="error-state-card text-center q-pa-xl" :class="getDarkModeClass(darkMode)">
        <q-icon 
          :name="darkMode ? 'mdi-emoticon-sad' : 'mdi-emoticon-sad-outline'" 
          size="64px" 
          class="text-bow-muted q-mb-md" 
          :class="getDarkModeClass(darkMode)" 
        />
        <div class="text-subtitle1 text-bow-muted q-mb-md" :class="getDarkModeClass(darkMode)">
          {{ error }}
        </div>
        <q-btn
          rounded
          outline
          no-caps
          :label="$t('Retry')"
          icon="refresh"
          class="text-bow-muted"
          :class="getDarkModeClass(darkMode)"
          @click="loadRewards()"
        />
      </div>
    </div>

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
                {{ promo.points }} {{ pointsType[index].toUpperCase() }}
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

  <help-card v-model="isHelpActive" />
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

import HeaderNav from 'src/components/header-nav'
import HelpCard from 'src/components/rewards/HelpCard.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RewardsPage',

  components: {
    HeaderNav,
    ProgressLoader,
    HelpCard
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
    },
    theme () {
      return this.$store.getters['global/theme']
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

      try {
        const data = await getUserPromoData()
        if (data) {
          updateUserPromoData({ last_viewed: new Date() })

          try {
            const keyPair = await ensureKeypair()
            for (const type of this.pointsType) {
              const promoId = data[type]
              if (promoId) {
                const targetPromo = PromosBytes[type].toString()
                const contract = new PromoContract(keyPair.pubkey, targetPromo)
                await contract.subscribeAddress()
                const promoBalance = await contract.getTokenBalance()
                this.promos[type].points = promoBalance
              }
            }
          } catch (error) {
            console.error(error)
            this.error = this.$t('FailedToLoadPromoData', 'Failed to load promo data. Please try again later.')
          }
        } else {
          this.isHelpActive = true
          await createUserPromoData()
        }
      } catch (error) {
        console.error(error)
        this.error = this.$t('FailedToLoadRewards', 'Failed to load rewards. Please try again later.')
      } finally {
        this.isLoading = false
      }
    },

    redirectToPromoPage (promo) {
      this.$router.push(`rewards/${promo.path}/${promo.id ?? -1}/`)
      // this.$router.push({
      //   name: promo.path,
      //   query: {
      //     id: promo.id ?? -1,
      //     address: this.swapContractAddress
      //   }
      // })
    }
  }
}
</script>

<style lang="scss" scoped>
.error-state-card {
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);

  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
