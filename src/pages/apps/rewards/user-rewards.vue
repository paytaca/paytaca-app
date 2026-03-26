<template>
  <div id="app-container" class="sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="$t('UserRewards', 'User Rewards')"
    >
      <template #top-right-menu v-if="!isLoading && !pointsError && !dataError">
        <q-btn
          round
          class="button"
          icon="question_mark"
          size="sm"
          @click="isOneTimeSectionExpanded = false, isHelpActive = true"
        />
      </template>
    </header-nav>

    <div
      class="q-px-md q-pt-md"
      :style="{ 'padding-top': $q.platform.is.ios ? '0px' : '0px' }"
    >
      <!-- Hero Section: Total Points -->
      <q-card
        class="q-mb-lg hero-card"
        :class="getDarkModeClass(darkMode)"
        flat
      >
        <q-card-section class="text-center q-py-lg">
          <!-- Loading State -->
          <template v-if="isLoading">
            <q-skeleton type="text" width="150px" height="48px" class="q-mx-auto q-mb-sm" />
            <q-skeleton type="text" width="100px" height="20px" class="q-mx-auto q-mb-md" />
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
            <div class="card-help-highlight">
              <div class="text-subtitle2 q-mb-xs" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ $t('YouCurrentlyHave', 'You currently have') }}
              </div>
              
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
                  points
                </span>
              </div>
            </div>

            <q-btn
              rounded
              size="lg"
              class="button redeem-btn full-width card-help-highlight"
              :class="getDarkModeClass(darkMode)"
              :label="$t('RedeemPoints', 'Redeem Points')"
              :disable="points === 0"
              @click="openRedeemPointsDialog"
            />

            <q-btn
              rounded
              outline
              size="md"
              class="button button-text-primary full-width q-mt-md card-help-highlight"
              :style="{ maxWidth: '200px' }"
              :class="getDarkModeClass(darkMode)"
              :label="$t('ViewRedeemHistory', 'View Redeem History')"
              @click="openRedeemHistoryDialog"
            />
          </template>
        </q-card-section>
      </q-card>

      <!-- Error state -->
      <error-card
        v-if="dataError"
        :is-points-card="false"
        :is-rewards-home-page="false"
        :error-text="dataError"
        @on-retry="loadData()"
      />

      <template v-else>
        <!-- One-Time Points Section -->
        <div 
          class="section-header q-mb-sm card-help-highlight collapsible-header"
          :class="{ 'expanded': isOneTimeSectionExpanded }"
          @click="isOneTimeSectionExpanded = !isOneTimeSectionExpanded"
        >
          <q-icon name="repeat_one" size="md" class="q-mr-sm" color="primary" />
          <span class="text-h6">{{ $t('OneTimePoints', 'One-time Points') }}</span>
          <q-space />
          <div class="row items-center q-gutter-sm">
            <span
              v-if="isFirstTimeUser"
              class="text-caption"
              :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
            >
              {{ completedOneTimeCount }}/{{ totalOneTimeTasks }}
            </span>
            <q-btn
              flat
              round
              dense
              :icon="isOneTimeSectionExpanded ? 'expand_less' : 'expand_more'"
              class="chevron-btn"
              :class="{ 'rotate': isOneTimeSectionExpanded }"
              @click.stop="isOneTimeSectionExpanded = !isOneTimeSectionExpanded"
            />
          </div>
        </div>
  
        <!-- One-Time Content with Transition -->
        <transition name="slide-fade" mode="out-in">
          <div v-show="isOneTimeSectionExpanded" class="collapsible-content">
            <!-- Loading Skeletons for One-Time -->
            <template v-if="isLoading">
              <achievement-card v-for="n in 3" :key="`skeleton-onetime-${n}`">
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
                        <div class="text-caption">Complete tasks to earn points</div>
                      </div>
                    </div>
                  </q-card-section>
                  <q-card-section>
                    <div class="text-body2">
                      Start your journey by completing the one-time tasks below. Each completed task rewards you with points that can be redeemed and exchanged for LIFT tokens!
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
              <q-intersection once transition="jump-up">
                <achievement-card>
                  <template #achievement-card-content>
                    <q-card-section>
                      <div class="row items-center q-gutter-md">
                        <achievement-icon
                          :complete="hasReceivedFirstVisitBonus"
                          :dark-mode-class="getDarkModeClass(darkMode)"
                        />
                        <div class="col">
                          <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                            New user referral bonus
                          </div>
                          <div v-if="hasReceivedFirstVisitBonus" class="text-caption text-green-7">
                            {{ $t(
                                'EarnedOn',
                                { date: formatDateLocaleRelative(dateJoined, false) },
                                `Earned on ${formatDateLocaleRelative(dateJoined, false)}`
                              ) }}
                          </div>
                          <div v-else class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                            {{ $t('NotYetEarned', 'Not yet earned') }}
                          </div>
                        </div>
                        <points-badge
                          :complete="hasReceivedFirstVisitBonus"
                          :dark-mode-class="getDarkModeClass(darkMode)"
                          :points="5"
                        />
                      </div>
                    </q-card-section>
                  </template>
                </achievement-card>
              </q-intersection>
      
              <!-- Referral Complete -->
              <q-intersection once transition="jump-up">
                <achievement-card>
                  <template #achievement-card-content>
                    <q-card-section>
                      <div class="row items-center q-gutter-md">
                        <achievement-icon
                          :complete="hasReceivedFirstTxBonus"
                          :dark-mode-class="getDarkModeClass(darkMode)"
                        />
                        <div class="col">
                          <div class="text-subtitle1 text-weight-medium" style="line-height: normal;">
                            {{ $t('PointsFrom1stTx', 'First transaction bonus') }}
                          </div>
                          <div v-if="hasReceivedFirstTxBonus" class="text-caption text-green-7">
                            {{ $t(
                                'EarnedOn',
                                { date: formatDateLocaleRelative(firstTxDate, false) },
                                `Earned on ${formatDateLocaleRelative(firstTxDate, false)}`
                              ) }}
                          </div>
                          <div v-else class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                            {{ $t('NotYetEarned', 'Not yet earned') }}
                          </div>
                        </div>
                        <points-badge
                          :complete="hasReceivedFirstTxBonus"
                          :dark-mode-class="getDarkModeClass(darkMode)"
                          :points="5"
                        />
                      </div>
                    </q-card-section>
                  </template>
                </achievement-card>
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
                          {{ $t('PointsFromSeven', 'First seven transactions bonus') }}
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
                            {{ $t(
                                'LastDate',
                                { date: formatDateLocaleRelative(item.date, false) },
                                `last ${formatDateLocaleRelative(item.date, false)}`
                              ) }}
                          </q-item-label>
                        </q-item-section>
                        <q-item-section v-else :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                          Not yet completed
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
          </div>
        </transition>
  
        <!-- Continuous Points Section -->
        <div class="section-header q-mb-sm q-mt-lg card-help-highlight">
          <q-icon name="loop" size="md" class="q-mr-sm" color="primary" />
          <span class="text-h6">{{ $t('ContinuousPoints', 'Continuous Points') }}</span>
        </div>
  
        <span class="row justify-center text-body1 q-mb-sm">
          {{ $t('PointsFromMerchant', 'Points from Merchant transactions') }}
        </span>
  
        <!-- Loading Skeletons for Continuous -->
        <template v-if="isLoading">
          <achievement-card v-for="n in 2" :key="`skeleton-continuous-${n}`">
            <template #achievement-card-content>
              <q-card-section>
                <q-skeleton type="text" width="40%" height="24px" class="q-mb-sm" />
                <q-skeleton type="text" width="70%" height="16px" />
              </q-card-section>
            </template>
          </achievement-card>
        </template>
  
        <!-- Continuous Points Content -->
        <template v-else>
          <!-- Summary Card -->
          <achievement-card v-if="totalMarketplaceTxCount > 0">
            <template #achievement-card-content>
              <q-card-section>
                <div class="row items-center q-gutter-md">
                  <q-icon
                    name="img:marketplace.png"
                    size="32px"
                    class="q-pa-sm bg-primary"
                    style="border-radius: 50%;"
                  />
                  <div class="col">
                    <div class="text-h6 text-weight-bold text-primary">
                      {{ totalMarketplaceTxCount }} {{ totalMarketplaceTxCount === 1 ? 'order' : 'orders' }}
                    </div>
                    <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                      {{ totalMarketplacePoints }} {{ totalMarketplacePoints === 1 ? 'point' : 'points' }} earned
                    </div>
                    <div
                      class="text-caption" 
                      :class="darkMode ? 'text-grey-6' : 'text-grey-8'"
                    >
                      {{ formatMonthDisplay(firstMarketplaceTxDate) }} - {{ formatMonthDisplay(lastMarketplaceTxDate) }}
                    </div>
                  </div>
                </div>
                <q-btn
                  outline
                  rounded
                  color="primary"
                  class="full-width q-mt-sm"
                  :label="$t('ViewFullHistory', 'View Full History')"
                  @click="openMarketplaceHistory"
                />
              </q-card-section>
            </template>
          </achievement-card>
  
          <!-- Empty State for Continuous -->
          <q-card
            v-if="totalMarketplaceTxCount === 0"
            class="empty-state-card q-pa-lg text-center"
            :class="getDarkModeClass(darkMode, 'text-grey-6', 'text-grey-8')"
            flat
          >
            <q-icon
              name="img:marketplace.png"
              size="48px"
              class="q-mb-md q-pa-md bg-primary"
              style="border-radius: 50%;"
            />
            <div class="text-subtitle1 q-mb-sm">
              {{ $t('PointsFromMarketplaceWarning1', 'You do not have any merchant transactions yet.') }}
            </div>
            <div class="text-body2">
              {{ $t('PointsFromMarketplaceWarning2', 'Order from the Marketplace or pay over-the-counter at partner merchants to start earning points!') }}
            </div>
          </q-card>
        </template>
      </template>
    </div>
  </div>

  <help-card
    v-model="isHelpActive"
    :page="'ur'"
    @on-exit-postprocess="isOneTimeSectionExpanded = completedOneTimeCount !== totalOneTimeTasks"
  />
</template>

<script>
import { ensureKeypair } from 'src/utils/memo-service'
import { formatDateLocaleRelative } from 'src/utils/time'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Promos,
  PromosBytes,
  awardInitialUP,
  getUserRewardsData,
  updateUserPromoData,
  updateUserRewardsData,
  createUserRewardsData,
} from 'src/utils/engagementhub-utils/rewards'

import i18n from 'src/i18n'

import HeaderNav from 'src/components/header-nav.vue'
import StatusChip from 'src/components/rewards/StatusChip.vue'
import PointsBadge from 'src/components/rewards/PointsBadge.vue'
import HelpCard from 'src/components/rewards/cards/HelpCard.vue'
import ErrorCard from 'src/components/rewards/cards/ErrorCard.vue'
import AchievementIcon from 'src/components/rewards/AchievementIcon.vue'
import AchievementCard from 'src/components/rewards/cards/AchievementCard.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'
import RedeemHistoryDialog from 'src/components/rewards/dialogs/RedeemHistoryDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'UserRewards',

  components: {
    HeaderNav,
    StatusChip,
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
      isOneTimeSectionExpanded: true,
      currentTab: 'onetime',
      urId: -1,
      points: 0,
      animatedPoints: 0,
      pointsDivisor: 0,
      pointsError: '',
      dataError: '',

      hasReceivedFirstTxBonus: false,
      firstTxDate: null,
      isFirstSevenComplete: false,
      isFirstTimeUser: true,
      hasReceivedFirstVisitBonus: false,
      has_viewed_page: false,
      dateJoined: '',
      urContract: null,

      totalMarketplaceTxCount: 0,
      totalMarketplacePoints: 0,
      firstMarketplaceTxDate: null,
      lastMarketplaceTxDate: null,

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
    completedOneTimeCount () {
      let count = 0
      if (this.hasReceivedFirstVisitBonus) count++
      if (this.hasReceivedFirstTxBonus) count++
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
    },
    userLocale () {
      // Prefer app-selected language; fall back to i18n locale; then browser locale.
      const fromStore = this.$store.getters['global/language']
      const candidate = fromStore || i18n || globalThis?.navigator?.language || 'en-US'
      return String(candidate).replace('_', '-')
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
      this.pointsError = ''
      this.dataError = ''

      this.urId = Number(this.$route.params.id || -1)

      // initialize UR Promo Contract and retrieve points
      try {
        const keyPair = await ensureKeypair()
        this.urContract = new PromoContract(keyPair.pubkey, PromosBytes.UR)
        if (this.urId === -1) await this.urContract.subscribeAddress()
        this.points = await this.urContract.getTokenBalance()
        this.animatePointsCounter()
      } catch (error) {
        console.error(error)
        this.pointsError = this.$t('FailedToLoadPoints', 'Unable to load your points at the moment. Please try again later. Rest assured, your points remain safe and intact.')
      }
      
      // fetch and load data
      let urData = null
      if (this.urId === -1) {
        // new user; create and update necessary data
        urData = await createUserRewardsData()
        this.urId = urData.id
        Promise.allSettled([
          await updateUserPromoData({ up: urData.id }),
          await updateUserRewardsData(urData.id, {
            contract_ct_address: this.urContract.contract.tokenAddress
          })
        ])
      } else {
        urData = await getUserRewardsData(this.urId)
      }
      
      if (urData && Object.keys(urData).length > 0) {
        this.has_viewed_page = urData.has_viewed_page

        if (!urData.has_viewed_page) {
          // mark has_viewed_page to true
          urData = await updateUserRewardsData(this.urId, {
            has_viewed_page: true,
            contract_ct_address: this.urContract.contract.tokenAddress
          })

          // send 5 initial points when user is a first time user and was referred
          if (urData.is_first_time_user) {
            await awardInitialUP({ ur: this.urId })
            urData = await getUserRewardsData(this.urId)
            // sleep to allow utxos to update
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.points = await this.urContract.getTokenBalance()
            this.animatePointsCounter()
          }

          // display help dialog if has_viewed_page is false
          this.isOneTimeSectionExpanded = false
          this.isHelpActive = true
        }

        this.propagateData(urData)
      } else {
        this.dataError = this.$t('FailedToLoadData', 'Unable to load at the moment. Please try again later.')
      }

      this.isLoading = false
    },
    propagateData (urData) {
      // one-time points
      this.isFirstTimeUser = urData.is_first_time_user
      this.isFirstSevenComplete = urData.is_first_seven_complete
      this.hasReceivedFirstVisitBonus = urData.has_received_first_visit_bonus
      this.hasReceivedFirstTxBonus = urData.has_received_first_tx_bonus
      this.firstTxDate = urData.first_tx_date
      this.dateJoined = urData.date_joined

      // continuous points marketplace
      this.totalMarketplaceTxCount = urData.total_transaction_count
      this.totalMarketplacePoints = urData.total_marketplace_points
      this.firstMarketplaceTxDate = urData.first_transaction_date
      this.lastMarketplaceTxDate = urData.last_transaction_date

      this.firstSevenTransactions = urData.ur_seven_transactions
      for (let i = this.firstSevenTransactions.length; i < 7; i++) {
        this.firstSevenTransactions.push({ ref_id: '', date: '', points: 0 })
      }

      // collapse one-time points if done collecting everything
      if (this.completedOneTimeCount === this.totalOneTimeTasks) {
        this.isOneTimeSectionExpanded = false
      }
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

    formatMonthDisplay (date) {
      const dt = new Date(date);
      if (Number.isNaN(dt.getTime())) return '';

      try {
        return new Intl.DateTimeFormat(this.userLocale, {
          year: 'numeric',
          month: 'short'
        }).format(dt)
      } catch {
        return dt.toLocaleString()
      }
    },
    redirectToMarketplaceOrder (orderId) {
      this.$router.push({ name: 'app-marketplace-order', params: { orderId } })
    },
    redirectToTx (txId) {
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: txId },
        query: { from: 'user-rewards' },
      })
    },
    async openRedeemPointsDialog () {
      this.$q.dialog({
        component: RedeemPointsDialog,
        componentProps: {
          promoId: this.urId,
          promoBytes: PromosBytes.UR
        }
      }).onDismiss(async () => {
        this.isLoading = true
        this.points = await this.urContract.getTokenBalance()
        this.animatePointsCounter()
        this.isLoading = false
      })
    },
    openMarketplaceHistory () {
      this.$router.push({
        name: 'app-rewards-merchant-history',
        params: { id: this.urId }
      })
    },
    openRedeemHistoryDialog () {
      this.$q.dialog({
        component: RedeemHistoryDialog,
        componentProps: {
          promo: Promos.USERREWARDS,
          promoId: this.urId
        }
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
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.6), 0 0 0 0 rgba(139, 92, 246, 0.4); 
  }
  50% { 
    box-shadow: 0 0 25px 3px rgba(139, 92, 246, 0.5), 0 0 40px 6px rgba(139, 92, 246, 0.3); 
  }
}

.section-header {
  display: flex;
  align-items: center;
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
// Collapsible One-Time Section Styles
.collapsible-header {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  padding: 8px 12px;
  margin-left: -12px;
  margin-right: -12px;
  border-radius: 12px;
  
  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
  
  &.expanded {
    background: rgba(59, 123, 246, 0.05);
  }
  
  &.dark {
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    &.expanded {
      background: rgba(59, 123, 246, 0.1);
    }
  }
}

.chevron-btn {
  transition: transform 0.3s ease;
  
  &.rotate {
    transform: rotate(180deg);
  }
}

// Slide animation for content
.slide-fade-enter-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

.collapsible-content {
  overflow: hidden;
}

// Summary Card Styles
.summary-card {
  border-radius: 16px;
  background: rgba(59, 123, 246, 0.08);
  border: 1px solid rgba(59, 123, 246, 0.15);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 123, 246, 0.15);
  }

  &.dark {
    background: rgba(59, 123, 246, 0.12);
    border: 1px solid rgba(59, 123, 246, 0.25);

    &:hover {
      box-shadow: 0 4px 12px rgba(59, 123, 246, 0.25);
    }
  }
}
</style>
