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

    <!-- Collapsible Aggregated Points & LIFT Value Section -->
    <div class="q-mx-lg q-mt-md q-mb-md">
      <div
        class="br-15 q-pa-md group-currency cursor-pointer transition-card"
        :class="[getDarkModeClass(darkMode), { 'q-pb-md': !isSummaryExpanded }]"
        style="background: linear-gradient(135deg, rgba(101, 85, 192, 0.1) 0%, rgba(60, 52, 107, 0.05) 100%);"
        @click="toggleSummary"
      >
        <!-- Header with Instant Text Swap -->
        <div class="row items-center justify-between">
          <div class="col">
            <!-- Collapsed: Essential Info -->
            <div v-if="!isSummaryExpanded" class="column q-gutter-y-xs">
              <!-- Loading State -->
              <template v-if="isLoading || isPriceLoading">
                <div class="row items-center q-gutter-x-sm">
                  <q-skeleton type="text" width="180px" height="20px" />
                </div>
                <div class="row items-center q-gutter-x-sm">
                  <q-skeleton type="text" width="150px" height="16px" />
                </div>
              </template>
              
              <!-- Loaded State -->
              <template v-else>
                <!-- Line 1: Points → LIFT -->
                <div class="text-weight-medium" style="font-size: 15px !important;">
                  <span class="text-primary">
                    {{ totalPoints.toLocaleString() }} points
                  </span>
                  <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    &nbsp;=&nbsp;
                  </span>
                  <span
                    class="text-token"
                    :class="getDarkModeClass(darkMode)"
                    style="font-size: 15px !important;"
                  >
                    {{ formattedLiftAmount }} LIFT
                  </span>
                </div>
                
                <!-- Line 2: BCH • Fiat -->
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  {{ formattedTotalBch }} BCH • {{ formattedTotalFiat }}
                </div>
              </template>
            </div>
            
            <!-- Expanded: Rewards Summary Header -->
            <div v-else class="row items-center">
              <q-icon name="stars" color="primary" size="sm" class="q-mr-sm" />
              <span class="text-subtitle1 text-weight-medium">
                Rewards Summary
              </span>
            </div>
          </div>
          
          <!-- Chevron - Centered Vertically -->
          <div class="col-auto flex flex-center" v-if="!isLoading">
            <q-icon 
              :name="isSummaryExpanded ? 'expand_less' : 'expand_more'"
              size="sm"
              class="transition-rotate text-bow"
              :class="[{ 'rotate-180': isSummaryExpanded }, getDarkModeClass(darkMode)]"
            />
          </div>
        </div>

        <!-- Expanded State Content (Animated) -->
        <q-slide-transition>
          <div v-show="isSummaryExpanded" class="q-pt-sm">
            
            <!-- Total Points Display -->
            <div class="row justify-between items-baseline q-mb-xs">
              <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                Total Points
              </span>
              <span class="text-h6 text-weight-bold text-primary">
                {{ totalPoints.toLocaleString() }} points
              </span>
            </div>
            
            <!-- Conversion Ratio Display -->
            <div class="row justify-between items-center q-mb-xs q-px-sm">
              <span class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                Conversion Rate
              </span>
              <span class="text-caption text-weight-medium" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ formattedConversionRatio }}
              </span>
            </div>
            
            <!-- LIFT Conversion Display -->
            <div class="row justify-between items-baseline q-mb-md">
              <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                Convertible to
              </span>
              <span class="text-subtitle1 text-weight-medium">
                <span class="text-token" :class="getDarkModeClass(darkMode)">
                  {{ formattedLiftAmount }} LIFT
                </span>
              </span>
            </div>
            
            <q-separator class="q-my-sm" :class="getDarkModeClass(darkMode)" />

            <!-- Price Error Message -->
            <div
              v-if="priceError"
              class="text-caption q-mt-sm"
              :class="darkMode ? 'text-red-5' : 'text-negative'"
            >
              <q-icon name="error_outline" size="xs" class="q-mr-xs" />
              {{ priceError }}
            </div>
            
            <template v-else>
              <!-- Current LIFT Price -->
              <div class="q-mb-sm">
                <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  Current LIFT Price
                </div>
                <div class="row items-center gap-sm">
                  <span class="text-body2 text-weight-medium">
                    {{ formattedBchPrice }} BCH
                  </span>
                  <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    &nbsp;≈&nbsp;
                  </span>
                  <span class="text-body2" :class="getDarkModeClass(darkMode)">
                    {{ formattedFiatPrice }}
                  </span>
                </div>
              </div>
              
              <!-- Total Value Estimate -->
              <div 
                class="q-pa-sm br-10"
                :class="darkMode ? 'bg-dark' : 'bg-grey-2'"
                style="border-left: 3px solid var(--q-primary);"
              >
                <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  Estimated Value
                </div>
                <div class="column">
                  <span class="text-h6 text-weight-bold text-primary">
                    ≈ {{ formattedTotalBch }} BCH
                  </span>
                  <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    ≈ {{ formattedTotalFiat }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </q-slide-transition>
      </div>
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAddress0_0PublicKey } from 'src/utils/memo-key-utils'
import { formatWithLocale, parseFiatCurrency } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_CATEGORY, LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import { fetchTokensList } from 'src/wallet/cauldron/tokens'
import {
  PromosBytes,
  getUserPromoData,
  createUserPromoData,
  updateUserPromoData,
  getLiftConversionRatio,
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import HelpCard from 'src/components/rewards/cards/HelpCard.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'

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
      totalPoints: 0,
      liftConversionRatio: 1,

      // LIFT token price tracking
      liftAssetId: `ct/${LIFT_TOKEN_CATEGORY}`,
      isPriceLoading: false,
      priceError: null,

      // Cauldron API price storage
      liftBchPriceValue: null,
      liftUsdPriceValue: null,
      cauldronPriceIntervalId: null,

      // Collapsible section state
      isSummaryExpanded: false,

      pointsType: ['ur', 'rp'/*, 'lp', 'cp', 'mp'*/],
      promos: {
        ur: {
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

    // User's selected fiat currency
    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },

    // Calculate LIFT token amount from points
    liftTokenAmount () {
      if (!this.liftConversionRatio || this.liftConversionRatio === 0) return 0
      return this.totalPoints / this.liftConversionRatio
    },

    // Get LIFT price in BCH from Cauldron data
    liftBchPrice () {
      return this.liftBchPriceValue
    },

    // Get LIFT price in user's selected fiat currency
    liftFiatPrice () {
      if (!this.selectedCurrency?.symbol || !this.liftBchPriceValue) return null
      
      // Get BCH price in user's fiat from store (for fiat conversion rates)
      const bchToFiat = this.$store.getters['market/getAssetPrice']('bch', this.selectedCurrency.symbol)
      
      if (!bchToFiat) return null
      
      // Convert: LIFT price (in BCH) × BCH price (in fiat) = LIFT price in fiat
      return this.liftBchPriceValue * bchToFiat
    },

    // Calculate total BCH value of user's convertible LIFT
    totalBchValue () {
      const price = this.liftBchPrice
      if (!price || price === 0) return 0
      return price * this.liftTokenAmount
    },

    // Calculate total fiat value of user's convertible LIFT
    totalFiatValue () {
      const price = this.liftFiatPrice
      if (!price || price === 0) return 0
      return price * this.liftTokenAmount
    },

    // Format LIFT amount with proper decimals (using convertTokenAmount)
    formattedLiftAmount () {
      if (this.liftTokenAmount === 0) return '0'
      const hasFraction = this.liftTokenAmount % 1 !== 0
      return formatWithLocale(
        this.liftTokenAmount,
        { min: hasFraction ? LIFT_TOKEN_DECIMALS : 0, max: LIFT_TOKEN_DECIMALS }
      )
    },

    // Format BCH price with 8 decimals
    formattedBchPrice () {
      if (!this.liftBchPrice || this.liftBchPrice === 0) return '--'
      return this.liftBchPrice.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
      })
    },

    // Format total BCH value with 8 decimals
    formattedTotalBch () {
      if (this.totalBchValue === 0) return '0'
      if (!this.totalBchValue) return '--'
      return this.totalBchValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
      })
    },

    // Format fiat price using parseFiatCurrency with locale detection
    formattedFiatPrice () {
      if (!this.liftFiatPrice || this.liftFiatPrice === 0) return '--'
      return parseFiatCurrency(this.liftFiatPrice, this.selectedCurrency?.symbol)
    },

    // Format total fiat value
    formattedTotalFiat () {
      if (this.totalFiatValue === 0) return '0'
      if (!this.totalFiatValue) return '--'
      return parseFiatCurrency(this.totalFiatValue, this.selectedCurrency?.symbol)
    },

    // Format conversion ratio display
    formattedConversionRatio () {
      if (!this.liftConversionRatio || this.liftConversionRatio === 0) return '--'
      return `${this.liftConversionRatio} points = 1 LIFT`
    }
  },

  watch: {
    // Refetch prices when currency changes
    'selectedCurrency.symbol' (newSymbol, oldSymbol) {
      if (newSymbol && newSymbol !== oldSymbol) {
        this.$store.dispatch('market/updateAssetPrices', {
          assetId: this.liftAssetId,
          customCurrency: newSymbol
        })
      }
    }
  },

  beforeUnmount () {
    // Cleanup Cauldron price polling interval
    if (this.cauldronPriceIntervalId) {
      clearInterval(this.cauldronPriceIntervalId)
    }
  },

  async mounted () {
    await this.loadRewards()
  },

  methods: {
    getDarkModeClass,

    toggleSummary () {
      this.isSummaryExpanded = !this.isSummaryExpanded
    },

    async fetchLiftPriceFromCauldron () {
      try {
        this.isPriceLoading = true
        this.priceError = null

        const tokens = await fetchTokensList({ token_id: LIFT_TOKEN_CATEGORY })
        
        if (tokens && tokens.length > 0) {
          const liftToken = tokens[0]
          // Format prices according to Cauldron's approach: price / 10^(8 - decimals)
          this.liftBchPriceValue = liftToken.price_now 
            ? liftToken.price_now / Math.pow(10, 8)
            : null
          this.liftUsdPriceValue = liftToken.price_now_usd
            ? liftToken.price_now_usd / Math.pow(10, 8 - LIFT_TOKEN_DECIMALS)
            : null
        } else {
          this.liftBchPriceValue = null
          this.liftUsdPriceValue = null
          this.priceError = 'LIFT token not found on Cauldron'
        }
      } catch (error) {
        console.error('Error fetching LIFT price from Cauldron:', error)
        this.priceError = 'Unable to fetch LIFT price from Cauldron'
        this.liftBchPriceValue = null
        this.liftUsdPriceValue = null
      } finally {
        this.isPriceLoading = false
      }
    },

    startCauldronPricePolling () {
      // Clear any existing interval
      if (this.cauldronPriceIntervalId) {
        clearInterval(this.cauldronPriceIntervalId)
      }
      
      // Poll every 60 seconds
      this.cauldronPriceIntervalId = setInterval(() => {
        this.fetchLiftPriceFromCauldron()
      }, 60 * 1000)
    },

    async loadRewards () {
      this.isLoading = true
      this.error = null
      this.isPriceLoading = true
      this.priceError = null

      const data = await getUserPromoData()
      const [upResp, ratioResp] = await Promise.allSettled(
        [getUserPromoData(), getLiftConversionRatio()]
      )
      const upData = upResp.value
      const ratioData = ratioResp.value

      // process fetched upData
      if (upData && Object.keys(upData).length > 0) {
        try {
          const walletIndex = this.$store.getters['global/getWalletIndex']
          const userPubkey = await getAddress0_0PublicKey(walletIndex)
          for (const type of this.pointsType) {
            const promoId = upData[type]
            if (promoId) {
              const targetPromo = PromosBytes[type.toUpperCase()]
              const contract = new PromoContract(userPubkey, targetPromo)
              const promoBalance = await contract.getTokenBalance()
              this.totalPoints += promoBalance
              this.promos[type].points = promoBalance
              this.promos[type].id = promoId
            }
          }
        } catch (error) {
          console.error(error)
          this.error = this.$t('FailedToLoadPromoData', 'Unable to load promo data at the moment. Please try again later.')
        }
      } else if (upData && Object.keys(upData.length === 0)) {
        await createUserPromoData()
      } else {
        this.error = this.$t('FailedToLoadPage', 'Unable to load points at the moment. Please try again later.')
      }

      // process fetched ratioData
      this.liftConversionRatio = ratioData

      // Fetch LIFT token price from Cauldron API
      await this.fetchLiftPriceFromCauldron()
      
      // Start polling Cauldron prices (every 60 seconds)
      this.startCauldronPricePolling()

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

<style scoped>
/* Smooth card transition */
.transition-card {
  transition: all 0.3s ease;
}

/* Chevron rotation transition */
.transition-rotate {
  transition: transform 0.3s ease;
}
</style>
