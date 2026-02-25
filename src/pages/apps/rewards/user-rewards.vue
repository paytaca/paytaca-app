<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="$t('UserRewards', 'User Rewards')"
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

    <div
      class="q-px-md q-pt-md"
      :style="{ 'padding-top': $q.platform.is.ios ? '0px' : '0px' }"
    >
      <!-- Hero Section: Total Points -->
      <q-card
        class="q-mb-lg hero-card card-help-highlight"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="text-center q-py-lg">
          <div class="text-subtitle2 q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
            {{ $t('YouCurrentlyHave', 'You currently have') }}
          </div>

          <!-- Loading State -->
          <template v-if="isLoading">
            <q-skeleton type="text" width="150px" height="48px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="text" width="100px" height="20px" class="q-mx-auto q-mb-md" />
            <q-skeleton type="QBtn" width="160px" height="44px" class="q-mx-auto" />
          </template>

          <!-- Loaded State -->
          <template v-else>
            <div 
              class="row flex-center q-mb-sm points-display"
              :class="{ 'animate-points': points > 0 }"
            >
              <span class="text-h3 text-bold text-primary">
                {{ animatedPoints }}
              </span>
              <span
                class="text-h5 text-weight-bold q-ml-xs"
                :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
              >
                UP
              </span>
            </div>

            <q-btn
              rounded
              size="lg"
              class="button redeem-btn full-width"
              :class="getDarkModeClass(darkMode)"
              :label="$t('RedeemPoints', 'Redeem Points')"
              :disable="points === 0"
              @click="openRedeemPointsDialog"
            />
          </template>
        </q-card-section>
      </q-card>

      <!-- One-Time Points Section -->
      <div class="section-header q-mb-sm card-help-highlight">
        <q-icon name="repeat_one" size="md" class="q-mr-sm" color="primary" />
        <span class="text-h6">{{ $t('OneTimePoints', 'One-time Points') }}</span>
      </div>

      <!-- Loading Skeletons for One-Time -->
      <template v-if="isLoading">
        <q-card
          flat
          v-for="n in 3" :key="`skeleton-onetime-${n}`"
          class="achievement-card q-mb-md"
        >
          <q-card-section>
            <div class="row items-center q-gutter-md">
              <q-skeleton type="circle" size="40px" />
              <div class="col">
                <q-skeleton type="text" width="60%" height="20px" class="q-mb-xs" />
                <q-skeleton type="text" width="40%" height="16px" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </template>

      <!-- One-Time Achievement Cards -->
      <template v-else-if="!isLoading && isFirstTimeUser">
        <!-- Welcome/Intro Card for first-time view -->
        <q-intersection once transition="jump-up" class="q-mb-md">
          <q-card class="welcome-card" :class="getDarkModeClass(darkMode)" flat bordered>
            <q-card-section class="bg-primary text-grey-10">
              <div class="row items-center">
                <q-icon name="celebration" size="32px" class="q-mr-md" />
                <div>
                  <div class="text-h6">Welcome, New Explorer!</div>
                  <div class="text-caption">Complete tasks to earn UP</div>
                </div>
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-body2">
                Start your journey by completing the one-time tasks below. Each completed task rewards you with UP that can be redeemed for LIFT tokens!
              </div>
              <q-linear-progress
                :value="oneTimeProgress"
                color="primary"
                class="q-mt-md rounded-borders"
                size="8px"
              />
              <div class="text-caption q-mt-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ completedOneTimeCount }} of {{ totalOneTimeTasks }} tasks completed
              </div>
            </q-card-section>
          </q-card>
        </q-intersection>

        <!-- Initial UP from Referral -->
        <q-intersection once transition="jump-up" class="q-mb-md">
          <q-card class="achievement-card" :class="getDarkModeClass(darkMode)" flat>
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <achievement-icon
                  :complete="hasReceivedInitialPoints"
                  :dark-mode-class="getDarkModeClass(darkMode)"
                />
                <div class="col">
                  <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                    {{ $t('InitialUP', { points: '5 UP' }, 'Initial points from referral') }}
                  </div>
                  <div v-if="hasReceivedInitialPoints" class="text-caption text-green-7">
                    {{ $t(
                        'EarnedOn',
                        { date: parseLocaleDate(dateJoined) },
                        `Earned on ${parseLocaleDate(dateJoined)}`
                      ) }}
                  </div>
                  <div v-else class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    {{ $t('NotYetEarned', 'Not yet earned') }}
                  </div>
                </div>
                <points-badge
                  :complete="hasReceivedInitialPoints"
                  :dark-mode-class="getDarkModeClass(darkMode)"
                  :points="5"
                />
              </div>
            </q-card-section>
          </q-card>
        </q-intersection>

        <!-- Referral Complete -->
        <q-intersection once transition="jump-up" class="q-mb-md">
          <q-card class="achievement-card" :class="getDarkModeClass(darkMode)" flat>
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <achievement-icon
                  :complete="isReferralComplete"
                  :dark-mode-class="getDarkModeClass(darkMode)"
                />
                <div class="col">
                  <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                    {{ $t('PointsFrom1stTx', 'Bonus points after completing 1st transaction') }}
                  </div>
                  <div v-if="isReferralComplete" class="text-caption text-green-7">
                    {{ $t(
                        'EarnedOn',
                        { date: parseLocaleDate(referralCompleteDate) },
                        `Earned on ${parseLocaleDate(referralCompleteDate)}`
                      ) }}
                  </div>
                  <div v-else class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    {{ $t('NotYetEarned', 'Not yet earned') }}
                  </div>
                </div>
                <points-badge
                  :complete="isReferralComplete"
                  :dark-mode-class="getDarkModeClass(darkMode)"
                  :points="5"
                />
              </div>
            </q-card-section>
          </q-card>
        </q-intersection>

        <!-- First Seven Transactions -->
        <q-intersection once transition="jump-up" class="q-mb-md">
          <q-expansion-item
            class="achievement-expansion"
            :class="getDarkModeClass(darkMode)"
            :default-expanded="!isFirstSevenComplete"
          >
            <template v-slot:header>
              <div class="row items-center q-py-sm full-width">
                <achievement-icon
                  :complete="isFirstSevenComplete"
                  :dark-mode-class="getDarkModeClass(darkMode)"
                />
                <div class="col q-px-md">
                  <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                    {{ $t('PointsFromSeven', 'Points from first 7 transactions') }}
                  </div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    {{ completedFirstSevenCount }}/7 transactions completed
                  </div>
                </div>
                <q-linear-progress
                  :value="firstSevenProgress"
                  color="primary"
                  class="q-mr-xs"
                  style="width: 60px;"
                  size="6px"
                  rounded
                />
              </div>
            </template>

            <q-card flat class="achievement-sub-card" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <q-item
                  v-for="(item, index) in firstSevenTransactions"
                  :key="index"
                  class="task-item q-mb-sm row items-center"
                >
                  <q-item-section avatar>
                    <span
                      class="task-number"
                      :class="[item.ref_id !== '' ? 'completed' : 'pending', getDarkModeClass(darkMode)]"
                    >
                      {{ index + 1 }}
                    </span>
                  </q-item-section>
                  <q-item-section v-if="item.ref_id !== '' && item.date != ''">
                    <q-item-label class="row items-center" @click="redirectToTx(item.tx_id)">
                      <span class="text-weight-medium">
                        Ref ID {{ item.ref_id }}
                      </span>
                      <q-icon name="open_in_new" size="14px" class="q-ml-sm" color="primary" />
                    </q-item-label>
                    <q-item-label caption>
                      {{ $t('LastDate', { date: parseLocaleDate(item.date) }, `last ${parseLocaleDate(item.date)}`) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section v-else :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                    Transaction {{ index + 1 }}: Not yet completed
                  </q-item-section>
                  <q-item-section side v-if="item.ref_id !== '' && item.date != ''">
                    <points-badge
                      :complete="true"
                      :dark-mode-class="getDarkModeClass(darkMode)"
                      :points="item.points_earned"
                    />
                  </q-item-section>
                </q-item>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-intersection>
      </template>

      <template v-else>
        <!-- Non-new users message -->
        <q-intersection once v-if="!isFirstTimeUser" transition="jump-up">
          <q-card
            flat
            class="empty-state-card q-pa-md text-center"
            :class="getDarkModeClass(darkMode, 'text-grey-6', 'text-grey-8')"
          >
            <q-icon name="info" size="32px" class="q-mb-sm" />
            <div class="text-body2">
              {{ $t('NonNewUsersWarning', 'Sorry, only new users can avail the one-time points.') }}
            </div>
          </q-card>
        </q-intersection>
      </template>

      <!-- Continuous Points Section -->
      <div class="section-header q-mb-sm q-mt-lg card-help-highlight">
        <q-icon name="loop" size="md" class="q-mr-sm" color="primary" />
        <span class="text-h6">{{ $t('ContinuousPoints', 'Continuous Points') }}</span>
      </div>

      <span class="row justify-center text-body1 q-mb-sm">
        {{ $t('PointsFromMarketplace', 'Points from Marketplace transactions') }}
      </span>

      <!-- Loading Skeletons for Continuous -->
      <template v-if="isLoading">
        <q-card v-for="n in 2" :key="`skeleton-continuous-${n}`" class="q-mb-md" flat>
          <q-card-section>
            <q-skeleton type="text" width="40%" height="24px" class="q-mb-sm" />
            <q-skeleton type="text" width="70%" height="16px" />
          </q-card-section>
        </q-card>
      </template>

      <!-- Continuous Points Content -->
      <template v-else>
        <q-expansion-item
          v-for="(monthData, index) in marketplaceTransactions"
          :key="index"
          class="month-expansion q-mb-sm"
          :class="getDarkModeClass(darkMode)"
          default-opened
        >
          <template v-slot:header>
            <div class="row items-center q-gutter-sm full-width">
              <q-icon name="calendar_today" size="20px" color="primary" />
              <div class="col text-subtitle1 text-weight-medium">
                {{ parseLocaleDate(monthData.month, false) }}
              </div>
              <div class="text-caption q-mr-sm" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ monthData.orders.length }} {{ monthData.orders.length === 1 ? 'order' : 'orders' }}
              </div>
            </div>
          </template>

          <q-card class="month-orders-card" :class="getDarkModeClass(darkMode)" flat>
            <q-list separator>
              <q-item
                v-for="(order, orderIndex) in monthData.orders"
                :key="orderIndex"
                clickable
                @click="redirectToMarketplaceOrder(order.order_id)"
              >
                <q-item-section>
                  <q-item-label class="row items-center">
                    <span class="text-weight-medium">Order #{{ order.order_id }}</span>
                    <q-icon name="open_in_new" size="14px" class="q-ml-sm" color="primary" />
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t('LastDate', { date: parseLocaleDate(order.date) }, `last ${parseLocaleDate(order.date)}`) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <points-badge
                    :complete="true"
                    :dark-mode-class="getDarkModeClass(darkMode)"
                    :points="8"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <!-- Empty State for Continuous -->
        <q-card
          v-if="marketplaceTransactions.length === 0"
          class="empty-state-card q-pa-lg text-center"
          :class="getDarkModeClass(darkMode, 'text-grey-6', 'text-grey-8')"
          flat
        >
          <q-icon name="shopping_bag" size="48px" class="q-mb-md" />
          <div class="text-subtitle1 q-mb-sm">
            {{ $t('PointsFromMarketplaceWarning1', 'You do not have any Marketplace transactions yet.') }}
          </div>
          <div class="text-body2">
            {{ $t('PointsFromMarketplaceWarning2', 'Order from the Marketplace to start earning points!') }}
          </div>
        </q-card>
      </template>
    </div>
  </div>

  <help-card v-model="isHelpActive" :page="'ur'" />
</template>

<script>
import { ensureKeypair } from 'src/utils/memo-service'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/shared'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Promos,
  PromosBytes,
  convertPoints,
  getUserRewardsData,
  updateUserPromoData,
  updateUserRewardsData,
  createUserRewardsData,
  getPromoPointsDivisorData,
  getContractInitialBalance,
  awardInitialUP
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav'
import HelpCard from 'src/components/rewards/HelpCard.vue'
import StatusChip from 'src/components/rewards/StatusChip.vue'
import PointsBadge from 'src/components/rewards/PointsBadge.vue'
import AchievementIcon from 'src/components/rewards/AchievementIcon.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'UserRewards',

  components: {
    HelpCard,
    HeaderNav,
    StatusChip,
    PointsBadge,
    AchievementIcon
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
      currentTab: 'onetime',
      upId: -1,
      points: 0,
      animatedPoints: 0,
      pointsDivisor: 0,

      isReferralComplete: false,
      referralCompleteDate: null,
      isFirstSevenComplete: false,
      isFirstTimeUser: true,
      hasReceivedInitialPoints: false,
      has_viewed_page: false,
      dateJoined: '',
      urContract: null,

      firstSevenTransactions: [],
      marketplaceTransactions: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    pointsConvertion () {
      return convertPoints(this.points, this.pointsDivisor)
    },
    completedOneTimeCount () {
      let count = 0
      if (this.hasReceivedInitialPoints) count++
      if (this.isReferralComplete) count++
      count += this.completedFirstSevenCount
      return count
    },
    totalOneTimeTasks () {
      return 9
    },
    oneTimeProgress () {
      return this.completedOneTimeCount / this.totalOneTimeTasks
    },
    completedFirstSevenCount () {
      return this.firstSevenTransactions.filter(t => t.ref_id !== '').length
    },
    firstSevenProgress () {
      return this.completedFirstSevenCount / 7
    }
  },

  async mounted () {
    this.isLoading = true

    this.upId = Number(this.$route.params.id || -1)

    try {
      const keyPair = await ensureKeypair()
      this.urContract = new PromoContract(keyPair.pubkey, PromosBytes.UP)
      if (this.upId === -1) await this.urContract.subscribeAddress()
      this.points = await this.urContract.getTokenBalance()
      this.animatePointsCounter()
    } catch (error) {
      console.error(error)
      this.error = this.$t('FailedToLoadPromoData', 'Failed to load points balance. Please try again later.')
    }
    
    let urData = null
    if (this.upId === -1) {
      urData = await createUserRewardsData()
      Promise.allSettled([
        await updateUserPromoData({ up: urData.id }),
        await updateUserRewardsData(urData.id, {
          contract_ct_address: this.urContract.contract.tokenAddress
        })
      ])
    } else {
      urData = await getUserRewardsData(this.upId)
    }
    
    if (urData) {
      this.has_viewed_page = urData.has_viewed_page

      if (!urData.has_viewed_page) {
        if (!urData.has_viewed_page) {
          // display help dialog if has_viewed_page is false
          console.log('help dialog yey')
          // vm.$q.dialog({
          //   component: HelpDialog,
          //   componentProps: { page: Promos.USERREWARDS }
          // })

          // send 5 initial UP when user is a first time user
          if (urData.is_first_time_user) {
            console.log('award initial UP yey')
            // await awardInitialUP({ ur_id: vm.upId })
            //   .then(async _resp => {
            //     vm.points = await vm.urContract.getTokenBalance()
            //   })
          }

          // mark has_viewed_page to true
          await updateUserRewardsData(this.upId, { has_viewed_page: true })
        }
      }

      this.isReferralComplete = urData.is_referral_complete
      this.isFirstSevenComplete = urData.is_first_seven_complete
      this.referralCompleteDate = urData.referral_complete_date
      this.isFirstTimeUser = urData.is_first_time_user
      this.hasReceivedInitialPoints = urData.has_received_initial_points
      this.dateJoined = urData.date_joined

      if (urData.ur_months.length > 0) {
        for (const transaction of urData.ur_months) {
          this.marketplaceTransactions.push({
            month: transaction.timeframe,
            orders: transaction.ur_mp_transactions.sort((a, b) => {
              return new Date(b.date) - new Date(a.date)
            })
          })
        }
      }

      if (urData.ur_seven_transactions.length > 0) {
        this.firstSevenTransactions = urData.ur_seven_transactions
      }
      for (let i = this.firstSevenTransactions.length; i < 7; i++) {
        this.firstSevenTransactions.push({ ref_id: '', date: '', points: 0 })
      }
    }

    this.isLoading = false
  },

  methods: {
    getDarkModeClass,
    parseLocaleDate,
    
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

    redirectToMarketplaceOrder (orderId) {
      this.$router.push({ name: 'app-marketplace-order', params: { orderId } })
    },
    redirectToTx (txId) {
      this.$router.push(`/transaction/tx/${txId}`)
    },
    async openRedeemPointsDialog () {
      const vm = this

      vm.$q.dialog({
        component: RedeemPointsDialog,
        componentProps: {
          points: vm.points,
          pointsType: Promos.USERREWARDS,
          pointsDivisor: vm.pointsDivisor,
          promoId: vm.upId,
          address: vm.address
        }
      }).onDismiss(async () => {
        vm.isLoading = true
        vm.points = await vm.urContract.getTokenBalance()
        vm.animatePointsCounter()
        vm.isLoading = false
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

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 123, 246, 0.4); }
  50% { box-shadow: 0 0 20px 4px rgba(59, 123, 246, 0.3); }
}

.section-header {
  display: flex;
  align-items: center;
  padding-left: 4px;
}

.achievement-card {
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &.dark {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
}

.achievement-expansion {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.12);

  &.dark {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.achievement-sub-card {
  background: transparent !important;
  box-shadow: none !important;
  
  &.dark {
    background: rgba(255, 255, 255, 0.02) !important;
  }
}

.welcome-card {
  border-radius: 16px;
  overflow: hidden;
  
  &.dark {
    background: rgba(59, 123, 246, 0.1);
  }
}

.task-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  
  &.completed {
    &.dark {
      background: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }

    &.light {
      background: rgba(76, 175, 80, 0.20);
      color: #2e7d32;
    }
  }
  
  &.pending {
    &.dark {
      background: rgba(158, 158, 158, 0.15);
      color: #9e9e9e;
    }
    &.light {
      background: rgba(158, 158, 158, 0.25);
      color: #616161;
    }
  }
}

.month-expansion {
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.12);

  &.dark {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.month-orders-card {
  background: transparent !important;
  box-shadow: none !important;
  
  &.dark {
    background: rgba(255, 255, 255, 0.02) !important;
  }
}

.empty-state-card {
  border-radius: 16px;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  
  &.dark {
    border: 1px dashed rgba(255, 255, 255, 0.1);
  }
}

.task-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
  
  .dark & {
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
