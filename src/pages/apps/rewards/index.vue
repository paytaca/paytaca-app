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
          @click="isSummaryExpanded = false; isHelpActive = true"
        />
      </template>
    </header-nav>

    <!-- Collapsible Aggregated Points & LIFT Value Section -->
    <div class="q-mx-lg q-mt-md q-mb-md card-help-highlight">
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

              <template v-else-if="priceError && !isSummaryExpanded">
                <div class="text-caption" :class="darkMode ? 'text-red-5' : 'text-negative'">
                  <q-icon name="error" size="xs" /> {{ $t('PriceUnavailable') }}
                </div>
              </template>
              
              <!-- Loaded State -->
              <template v-else>
                <!-- Line 1: Points → LIFT -->
                <div class="text-weight-medium" style="font-size: 15px !important;">
                  <span class="text-primary">
                    {{ totalPoints === 1 ? $t('CountPoint', { points: totalPoints.toLocaleString() }) : $t('CountPoints', { points: totalPoints.toLocaleString() }) }}
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
                {{ $t('RewardsSummary') }}
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
                {{ $t('TotalPoints') }}
              </span>
              <span class="text-h6 text-weight-bold text-primary">
                {{ totalPoints === 1 ? $t('CountPoint', { points: totalPoints.toLocaleString() }) : $t('CountPoints', { points: totalPoints.toLocaleString() }) }}
              </span>
            </div>
            
            <!-- Conversion Ratio Display -->
            <div class="row justify-between items-center q-mb-xs q-px-sm">
              <span class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('ConversionRate') }}
              </span>
              <span class="text-caption text-weight-medium" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ formattedConversionRatio }}
              </span>
            </div>
            
            <!-- LIFT Conversion Display -->
            <div class="row justify-between items-baseline q-mb-md">
              <span class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ $t('ConvertibleTo') }}
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
                  {{ $t('CurrentLiftPrice') }}
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
                  {{ $t('EstimatedValue') }}
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

    <q-separator class="q-mx-md" />

    <!-- Referral Banner -->
    <q-slide-transition>
      <q-banner
        v-if="showReferralBanner"
        rounded
        class="q-mx-lg q-mt-md bg-grad text-white referral-banner"
      >
        <span>
          {{ $t('ReferralBannerText') }}
        </span>
        <span class="row justify-end text-caption text-blue-grey-1 q-mb-xs">
          <template v-if="bannerRemainingTime.hours > 1">
            {{ $t('CountHoursRemaining', { hours: bannerRemainingTime.hours }) }}
          </template>
          <template v-else-if="bannerRemainingTime.hours === 1">
            {{ $t('CountHourRemaining', { hour: bannerRemainingTime.hours }) }}
          </template>
          <template v-else-if="bannerRemainingTime.hours === 0 && bannerRemainingTime.minutes > 1">
            {{ $t('CountMinutesRemaining', { minutes: bannerRemainingTime.minutes }) }}
          </template>
          <template v-else-if="bannerRemainingTime.hours === 0 && bannerRemainingTime.minutes === 1">
            {{ $t('CountMinuteRemaining', { minute: bannerRemainingTime.minutes }) }}
          </template>
          <template v-else>
            {{ $t('LessThanMinuteRemaining') }}
          </template>
        </span>
        <template v-slot:action>
          <div class="row q-mt-xs">
            <q-btn
              no-caps
              unelevated
              :label="$t('EnterCode')"
              class="referral-banner-btn-primary"
              @click="isReferralDialogActive = true"
            />
            <q-btn
              no-caps
              outline
              :label="$t('Dismiss')"
              class="referral-banner-btn-secondary"
              @click="dismissReferralBanner"
            />
          </div>
        </template>
      </q-banner>
    </q-slide-transition>

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
      class="row q-mx-lg q-gutter-y-md q-pt-md justify-center"
      style="font-size: 18px;"
    >
      <!-- Loading State - Skeleton Cards -->
      <template v-if="isLoading">
        <div
          v-for="n in pointsType.length"
          :key="n"
          class="row col-12 justify-between items-center q-pa-md br-15 group-currency promo-card"
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
          class="col-12 card-help-highlight promo-card"
        >
          <div
            class="row full-width justify-between items-center q-pa-md br-15 group-currency"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="row col-2 promo-icon">
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
                {{ promo.points === 1 ? $t('CountPoint', { points: promo.points }) : $t('CountPoints', { points: promo.points }) }}
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

  <!-- Referral Code Dialog -->
  <q-dialog v-model="isReferralDialogActive">
    <q-card class="pt-card">
      <RewardsStep
        :wallet-hash="walletHash"
        :dark-mode="darkMode"
        :from-create-wallet="false"
        :referral-code="code"
        @on-proceed-to-next-step="onReferralDialogClose"
      />
    </q-card>
  </q-dialog>
</template>

<script>
import { fetchTokensList } from 'src/wallet/cauldron/tokens'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAddress0_0PublicKey } from 'src/utils/memo-key-utils'
import { formatWithLocale, parseFiatCurrency } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_CATEGORY, LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import {
  PromosBytes,
  getUserPromoData,
  createUserPromoData,
  updateUserPromoData,
  getLiftConversionRatio,
  Promos,
  updateUserRewardsData,
  updateRfPromoData,
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import HelpCard from 'src/components/rewards/cards/HelpCard.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import RewardsStep from 'src/components/registration/RewardsStep.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RewardsPage',

  props: {
    code: { type: String, default: '' }
  },

  components: {
    HeaderNav,
    HelpCard,
    ErrorCard,
    RewardsStep
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

      // Unmount flag to prevent memory leaks
      isUnmounted: false,

      // Collapsible section state
      isSummaryExpanded: false,

      // Referral banner state
      isReferralDialogActive: false,
      isReferralBannerDismissed: false,
      referralCodeEligibilityDate: null,
      bannerRemainingTime: null,
      enableReferralBanner: false, // value coming from UserPromo API

      pointsType: ['ur', 'rp'/*, 'lp', 'cp', 'mp'*/],
      promos: {
        ur: {
          name: this.$t('UserRewards'),
          id: null,
          points: 0,
          icon: 'redeem',
          path: 'user-rewards'
        },
        rp: {
          name: this.$t('RFPromo'),
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

    walletHash () {
      return this.$store.getters['global/getWallet']('bch')?.walletHash || ''
    },

    walletCreatedAt () {
      return this.$store.getters['global/walletCreatedAt']
    },

    showReferralBanner () {
      if (this.isHelpActive) return false
      if (this.isLoading || this.error) return false
      if (this.isReferralBannerDismissed) return false
      if (!this.bannerRemainingTime) return false
      return this.enableReferralBanner
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
      if (this.liftBchPrice === 0) return '0'
      if (!this.liftBchPrice) return '--'
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
      if (this.totalFiatValue === 0) return `0 ${this.selectedCurrency?.symbol}`
      if (!this.totalFiatValue) return '--'
      return parseFiatCurrency(this.totalFiatValue, this.selectedCurrency?.symbol)
    },

    // Format conversion ratio display
    formattedConversionRatio () {
      if (!this.liftConversionRatio || this.liftConversionRatio === 0) return '--'
      const pointsTranslate = this.liftConversionRatio === 1
        ? this.$t('CountPoint', { points: this.liftConversionRatio })
        : this.$t('CountPoints', { points: this.liftConversionRatio })
      return `${pointsTranslate} = 1 LIFT`
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
    // Set flag to prevent interval creation after unmount
    this.isUnmounted = true
    // Cleanup Cauldron price polling interval
    if (this.cauldronPriceIntervalId != null) {
      clearInterval(this.cauldronPriceIntervalId)
    }
  },

  async mounted () {
    await this.loadRewards()

    if (this.code) {
      this.isReferralDialogActive = true
    }
  },

  methods: {
    getDarkModeClass,

    toggleSummary () {
      this.isSummaryExpanded = !this.isSummaryExpanded
    },

    dismissReferralBanner () {
      this.isReferralBannerDismissed = true
    },

    onReferralDialogClose () {
      this.isReferralDialogActive = false
      this.isReferralBannerDismissed = true
      this.loadRewards()
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
          this.priceError = this.$t('LiftTokenNotFoundError')
        }
      } catch (error) {
        console.error('Error fetching LIFT price from Cauldron:', error)
        this.priceError = this.$t('LiftTokenPriceFetchError')
        this.liftBchPriceValue = null
        this.liftUsdPriceValue = null
      } finally {
        this.isPriceLoading = false
      }
    },

    startCauldronPricePolling () {
      // Prevent creating interval if component is unmounting/unmounted
      if (this.isUnmounted) return

      // Clear any existing interval
      if (this.cauldronPriceIntervalId != null) {
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

      const [upResp, ratioResp] = await Promise.allSettled(
        [getUserPromoData(), getLiftConversionRatio()]
      )
      const upData = upResp.value
      const ratioData = ratioResp.value

      // process fetched ratioData
      this.liftConversionRatio = ratioData.conversionRatio
      this.referralCodeEligibilityDate = ratioData.eligibilityDate

      // check referral code eligibility of wallet
      this.checkReferralCodeEligibility(upData)

      // process fetched upData
      if (upData && Object.keys(upData).length > 0) {
        try {
          this.totalPoints = 0
          const walletIndex = this.$store.getters['global/getWalletIndex']
          const userPubkey = await getAddress0_0PublicKey(walletIndex)
          for (const type of this.pointsType) {
            const promoId = upData[type]?.pk ?? null
            if (promoId) {
              const targetPromo = PromosBytes[type.toUpperCase()]
              const contract = new PromoContract(userPubkey, targetPromo)
              const promoBalance = await contract.getTokenBalance()
              this.totalPoints += promoBalance
              this.promos[type].points = promoBalance
              this.promos[type].id = promoId

              if (contract.contract.tokenAddress !== upData[type].contract_ct_address) {
                // update promo contract address in background
                switch (type) {
                  case Promos.USERREWARDS:
                    updateUserRewardsData(
                      promoId, { contract_ct_address: contract.contract.tokenAddress }
                    )
                    break
                  case Promos.RFPROMO:
                    updateRfPromoData(
                      promoId, { contract_ct_address: contract.contract.tokenAddress }
                    )
                    break
                  default:
                    break
                }
              }
            }
          }
        } catch (error) {
          console.error(error)
          this.error = this.$t('PromoDataLoadingError')
        }
      } else if (upData && Object.keys(upData).length === 0) {
        await createUserPromoData()
      } else {
        this.error = this.$t('PointsLoadError')
      }

      // Fetch LIFT token price from Cauldron API
      await this.fetchLiftPriceFromCauldron()
      
      // Start polling Cauldron prices (every 60 seconds)
      this.startCauldronPricePolling()

      this.isLoading = false

      setTimeout(() => {
        this.$nextTick(() => {
          if (upData && !upData?.last_viewed) this.isHelpActive = true
          updateUserPromoData({ last_viewed: new Date() })
        })
      }, 250)
    },

    checkReferralCodeEligibility (upData) {
      // check if wallet creation date is older than referral code eligibility date
      // check referral banner dismissal timestamp from API
      if (
        this.referralCodeEligibilityDate &&
        this.walletCreatedAt &&
        new Date(this.referralCodeEligibilityDate) < new Date(this.walletCreatedAt) &&
        upData?.enable_referral_banner
      ) {
        this.bannerRemainingTime = upData?.banner_remaining_time
        this.enableReferralBanner = upData?.enable_referral_banner
      }
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

<style lang="scss" scoped>
/* Smooth card transition */
.transition-card {
  transition: all 0.3s ease;
}

/* Chevron rotation transition */
.transition-rotate {
  transition: transform 0.3s ease;
}

.referral-banner {
  :deep(.q-banner__content) {
    font-weight: 500;
  }
  :deep(.q-banner__actions) {
    padding-top: 0;
  }
}

.referral-banner-btn-primary {
  background: rgba(255, 255, 255, 0.95);
  color: var(--q-primary);
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  padding: 4px 16px;
  min-height: 32px;

  &:hover {
    background: #fff;
  }
}

.referral-banner-btn-secondary {
  border-color: rgba(255, 255, 255, 0.7);
  color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  font-weight: 500;
  font-size: 13px;
  padding: 4px 16px;
  min-height: 32px;

  &:hover {
    border-color: #fff;
    color: #fff;
  }
}

@media (min-width: 600px) {
  .promo-card {
    max-width: 500px;

    .promo-icon {
      justify-content: center;
    }
  }
}
</style>
