<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="`RF ${$t('Promo')}`"
      :rewardsPage="Promos.RFPROMO"
    >
      <template #top-right-menu v-if="!isLoading && !pointsError && !dataError">
        <q-btn
          round
          class="button"
          icon="question_mark"
          size="sm"
          @click="isHelpActive = true"
        />
      </template>
    </header-nav>

    <div
      class="q-px-md q-pt-md"
      :style="{ 'padding-top': $q.platform.is.ios ? '0px' : '0px' }"
    >
      <!-- Hero Section: Total Points with Redeemable Limit -->
      <q-card
        class="q-mb-lg hero-card card-help-highlight"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="text-center q-py-lg">
          <!-- Loading State -->
          <template v-if="isLoading">
            <q-skeleton type="text" width="150px" height="48px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="text" width="100px" height="20px" class="q-mx-auto q-mb-md" />
            <q-skeleton type="QBtn" width="160px" height="44px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="QBtn" width="160px" height="44px" class="q-mx-auto" />
          </template>

          <!-- Error State -->
          <error-card
            v-else-if="!isLoading && pointsError"
            :is-points-card="true"
            :is-rewards-home-page="false"
            :error-text="pointsError"
            @on-retry="loadData()"
          />

          <!-- Loaded State -->
          <template v-else>
            <div class="text-subtitle2 q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
              {{ $t('YouCurrentlyHave', 'You currently have') }}
            </div>

            <div
              class="row flex-center q-mb-sm points-display"
              :class="{ 'animate-points': animatedPoints > 0 }"
            >
              <span class="text-h3 text-bold text-primary">
                {{ animatedPoints }}
              </span>
              <span
                class="text-h5 text-weight-bold q-ml-xs"
                :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
              >
                points
              </span>
            </div>

            <!-- Redeemable Points Badge and Progress -->
            <div class="card-help-highlight">
              <div class="q-mb-md">
                <q-badge
                  class="q-px-md q-py-xs text-subtitle2"
                  :color="darkMode ? 'deep-purple-4' : 'deep-purple-6'"
                  text-color="white"
                >
                  <q-icon name="local_activity" size="16px" class="q-mr-xs" />
                  {{ $t('RFPRedeemable', { redeemedPoints: getRemainingRedeemable }, `${getRemainingRedeemable} points redeemable this month`) }}
                </q-badge>
              </div>
  
              <!-- Progress Bar for Redeemable Points -->
              <div class="q-mx-auto q-mb-lg" style="max-width: 280px;">
                <div class="row justify-between text-caption q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                  <span>{{ $t('MonthlyLimit', 'Monthly limit') }}</span>
                  <span>
                    {{ $t(
                        'PercentageUsed',
                        { 
                          percent: Math.round(redeemedPoints / rpMax * 100),
                          points: redeemedPoints
                        },
                        `${Math.round(redeemedPoints / rpMax * 100)}% (${redeemedPoints} points) used`
                      ) }}
                  </span>
                </div>
                <q-linear-progress
                  :value="redeemedPoints / rpMax"
                  color="primary"
                  class="rounded-borders"
                  size="8px"
                  track-color="purple-6"
                />
              </div>
            </div>

            <q-btn
              rounded
              size="lg"
              class="button redeem-btn full-width q-mb-md"
              :class="getDarkModeClass(darkMode)"
              :label="$t('RedeemPoints', 'Redeem Points')"
              :disable="points !== 0 || redeemedPoints !== 0"
              @click="openRedeemPointsDialog"
            />

            <q-btn
              rounded
              outline
              size="md"
              class="button button-text-primary full-width referral-btn card-help-highlight"
              :label="$t('ShowReferralQR', 'Show Referral QR')"
              @click="openReferralQrDialog"
            />
          </template>
        </q-card-section>
      </q-card>

      <!-- Error state for data -->
      <error-card
        v-if="dataError"
        :is-points-card="false"
        :is-rewards-home-page="false"
        :error-text="dataError"
        @on-retry="loadData()"
      />

      <!-- Referral Status Section -->
      <template v-else>
        <div class="section-header q-mb-sm card-help-highlight">
          <q-icon name="group" size="md" class="q-mr-sm" color="primary" />
          <span class="text-h6">{{ $t('ReferralStatus', 'Referral Status') }}</span>
        </div>

        <!-- Loading Skeletons for Referrals -->
        <template v-if="isLoading">
          <achievement-card v-for="n in 3" :key="`skeleton-referral-${n}`">
            <template #achievement-card-content>
              <q-card-section>
                <div class="row items-center q-gutter-md">
                  <q-skeleton type="circle" size="40px" />
                  <div class="col">
                    <q-skeleton type="text" width="60%" height="20px" class="q-mb-xs" />
                    <q-skeleton type="text" width="40%" height="16px" />
                  </div>
                </div>
              </q-card-section>
            </template>
          </achievement-card>
        </template>

        <!-- Referral List -->
        <template v-else>
          <div v-if="referralsList.length > 0" class="q-mx-sm q-mt-sm q-gutter-y-sm">
            <q-intersection once transition="jump-up" v-for="(item, index) in referralsList" :key="index">
              <achievement-card>
                <template #achievement-card-content>
                  <q-card-section>
                    <div class="row items-center q-gutter-md">
                      <achievement-icon
                        :complete="item.has_transacted"
                        :dark-mode-class="getDarkModeClass(darkMode)"
                      />
                      <div class="col">
                        <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                          {{ formatWalletHashDisplay(item.wallet_hash) }}
                        </div>
                        <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                          {{ $t(
                              'WalletCreatedOn',
                              { dateCreated: formatDateLocaleRelative(item.date_created, false) },
                              `Wallet created on ${formatDateLocaleRelative(item.date_created, false)}`
                            ) }}
                        </div>
                        <div v-if="item.has_transacted" class="text-caption text-green-7">
                          {{ $t('UserHasTransacted', 'User has already transacted') }}
                        </div>
                        <div v-else class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                          {{ $t('UserNotTransacted', 'User has not transacted yet') }}
                        </div>
                      </div>
                      <points-badge
                        :complete="item.has_transacted"
                        :dark-mode-class="getDarkModeClass(darkMode)"
                        :points="10"
                      />
                    </div>
                  </q-card-section>
                </template>
              </achievement-card>
            </q-intersection>
          </div>

          <!-- Empty State -->
          <q-card
            v-else
            class="empty-state-card q-pa-lg text-center"
            :class="getDarkModeClass(darkMode, 'text-grey-6', 'text-grey-8')"
            flat
          >
            <q-icon name="group_off" size="48px" class="q-mb-md" />
            <div class="text-subtitle1 q-mb-sm">
              {{ $t('ReferralStatusWarning1', 'No referrals yet') }}
            </div>
            <div class="text-body2">
              {{ $t('ReferralStatusWarning2', 'Share your referral QR code to start earning points!') }}
            </div>
          </q-card>
        </template>
      </template>
    </div>
  </div>

  <help-card v-model="isHelpActive" :page="'rfp'" />
</template>

<script>
import { ensureKeypair } from 'src/utils/memo-service'
import { formatDateLocaleRelative } from 'src/utils/time'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Promos,
  PromosBytes,
  convertPoints,
  getRfPromoData,
  createRfPromoData,
  updateRfPromoData,
  getRpMaxRedeemable,
  updateUserPromoData,
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav.vue'
import PointsBadge from 'src/components/rewards/PointsBadge.vue'
import HelpCard from 'src/components/rewards/cards/HelpCard.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import AchievementIcon from 'src/components/rewards/AchievementIcon.vue'
import AchievementCard from 'src/components/rewards/cards/AchievementCard.vue'
import ReferralQrDialog from 'src/components/rewards/dialogs/ReferralQrDialog.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RFPromo',

  components: {
    HeaderNav,
    PointsBadge,
    HelpCard,
    ErrorCard,
    AchievementIcon,
    AchievementCard,
  },

  props: {
    id: { type: String, default: '-1' },
    address: { type: String, default: '' }
  },

  data () {
    return {
      Promos,
      
      isLoading: false,
      isHelpActive: false,
      rpId: -1,
      points: 0,
      animatedPoints: 0,
      pointsDivisor: 0,
      redeemedPoints: 0,
      referralCode: '',
      rpContract: null,
      pointsError: '',
      dataError: '',
      rpMax: 0,

      referralsList: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    getRemainingRedeemable () {
      return this.rpMax - this.redeemedPoints
    },
    pointsConvertion () {
      return convertPoints(this.points, this.pointsDivisor)
    }
  },

  async mounted () {
    await this.loadData()
  },

  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,

    async loadData () {
      this.isLoading = true

      this.rpId = Number(this.$route.params.id || -1)

      // initialize RP Promo Contract and retrieve points
      try {
        const keyPair = await ensureKeypair()
        this.rpContract = new PromoContract(keyPair.pubkey, PromosBytes.RP)
        if (this.rpId === -1) await this.rpContract.subscribeAddress()
        this.points = await this.rpContract.getTokenBalance()
        this.animatePointsCounter()
      } catch (error) {
        console.error(error)
        this.pointsError = this.$t('FailedToLoadPoints', 'Unable to load your points at the moment. Please try again later. Rest assured, your points remain safe and intact.')
      }

      // fetch and load data
      let rpData = null
      if (this.rpId === -1) {
        // open help dialog
        this.isHelpActive = true

        // new user; create and update necessary data
        rpData = await createRfPromoData()
        this.rpId = rpData.id
        Promise.allSettled([
          await updateUserPromoData({ rp: rpData.id }),
          await updateRfPromoData(rpData.id, {
            contract_ct_address: this.rpContract.contract.tokenAddress
          })
        ])
      } else {
        rpData = await getRfPromoData(this.rpId)
      }

      if (rpData && Object.keys(rpData).length > 0) {
        this.rpMax = await getRpMaxRedeemable()
        this.redeemedPoints = rpData.redeemed_points
        this.referralCode = rpData.referral_code
        this.referralsList = rpData.rfp_referrals.sort((a, b) => {
          return new Date(b.date_created) - new Date(a.date_created)
        })
      } else {
        this.dataError = this.$t('FailedToLoadData', 'Unable to load at the moment. Please try again later.')
      }

      this.isLoading = false
    },

    formatWalletHashDisplay (walletHash) {
      const length = walletHash.length
      const prefix = walletHash.substring(0, 10)
      const suffix = walletHash.substring(length - 10, length)
      return `${prefix}...${suffix}`
    },

    animatePointsCounter () {
      const duration = 1000
      const start = 0
      const end = this.points
      const startTime = performance.now()

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        this.animatedPoints = Math.floor(start + (end - start) * easeOut)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      requestAnimationFrame(animate)
    },

    openReferralQrDialog () {
      this.$q.dialog({
        component: ReferralQrDialog,
        componentProps: {
          code: this.referralCode,
          promoId: this.rpId,
          promoType: Promos.RFPROMO,
          referralType: 'Friend'
        }
      })
    },
    openRedeemPointsDialog () {
      this.$q.dialog({
        component: RedeemPointsDialog,
        componentProps: {
          promoId: this.rpId,
          promoBytes: PromosBytes.RP,
          redeemedPoints: this.redeemedPoints,
          maxRedeemable: this.rpMax
        }
      }).onDismiss(async () => {
        this.isLoading = true
        this.points = await this.rpContract.getTokenBalance()
        this.isLoading = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.hero-card {
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(59, 123, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(59, 123, 246, 0.15);

  &.dark {
    background: linear-gradient(135deg, rgba(59, 123, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    border: 1px solid rgba(139, 92, 246, 0.25);
  }
}

.points-display {
  transition: transform 0.3s ease;
  
  &.animate-points {
    animation: points-pop 0.4s ease-out;
  }
}

@keyframes points-pop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.redeem-btn {
  max-width: 200px;
  font-weight: 600;
  
  &:not(:disabled) {
    animation: pulse-glow 2s ease-in-out infinite;
  }
}

.referral-btn {
  max-width: 200px;
  font-weight: 500;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 123, 246, 0.4); }
  50% { box-shadow: 0 0 20px 4px rgba(59, 123, 246, 0.3); }
}

.section-header {
  display: flex;
  align-items: center;
  padding-left: 4px;
}

.empty-state-card {
  border-radius: 16px;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  
  &.dark {
    border: 1px dashed rgba(255, 255, 255, 0.1);
  }
}
</style>
