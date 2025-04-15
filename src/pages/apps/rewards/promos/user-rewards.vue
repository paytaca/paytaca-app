<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="`User Rewards`"
      :isRewardsPage="true"
    />

    <div
      class="row q-mx-lg q-gutter-y-md q-pt-lg justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div class="row justify-center q-gutter-y-xs" ref="points_div">
        <span class="col-12 text-center text-subtitle1">You currently have</span>
        <div v-if="isLoading" class="row col-12 justify-center q-mb-lg">
          <progress-loader
            :color="isNotDefaultTheme(theme) ? theme : 'pink'"
            :isTight="true"
          />
        </div>
        <template v-else>
          <span class="col-12 text-center text-h5 text-bold">{{ points }} UP</span>
          <span
            class="q-mb-sm col-12 text-center subtext-gray"
            :class="getDarkModeClass(darkMode)"
          >
            ({{ pointsConvertion }})
          </span>
        </template>

        <q-btn
          rounded
          class="q-mt-md button"
          label="Redeem Points"
          :disable="points === 0"
          @click="openRedeemPointsDialog"
        />
      </div>

      <div
        class="row col-12 justify-center q-pa-md shadow-up-1 points-earned-div"
        :class="getDarkModeClass(darkMode)"
      >
        <span class="text-h6 q-mb-sm">Points Earned</span>

        <div v-if="isLoading" class="row col-12 justify-center">
          <progress-loader
            :color="isNotDefaultTheme(theme) ? theme : 'pink'"
            :isTight="true"
          />
        </div>

        <template v-else>
          <q-tabs
            no-caps
            v-model="currentTab"
            class="col-12"
            :indicator-color="isNotDefaultTheme(theme) ? 'transparent' : ''"
            @click="adjustScrollAreaHeight"
          >
            <q-tab
              name="onetime"
              label="One-time Points"
              class="network-selection-tab rewards"
              :class="getDarkModeClass(darkMode)"
            />
            <q-tab
              name="recurring"
              label="Continuous Points"
              class="network-selection-tab rewards"
              :class="getDarkModeClass(darkMode)"
            />
          </q-tabs>
        </template>

        <q-tab-panels
          animated
          v-model="currentTab"
          class="row full-width"
        >
          <q-tab-panel name="onetime">
            <q-scroll-area ref="onetime">
              <div v-if="!isLoading" class="row q-gutter-x-sm q-gutter-y-md">
                <template v-if="isFirstTimeUser">
                  <status-chip :isCompleted="isReferralComplete" />
                  <span class="col-10">
                    <span class="text-subtitle1">
                      5 PHP with of BCH from referral and after completing 1st transaction
                    </span>
                    <br/>
                    <span v-if="isReferralComplete" class="q-ml-sm">
                      earned on {{ parseLocaleDate(referralCompleteDate) }}
                    </span>
                    <span
                      v-else
                      class="q-ml-sm subtext-gray not-earned-label"
                      :class="getDarkModeClass(darkMode)"
                    >
                      not yet earned
                    </span>
                  </span>

                  <status-chip :isCompleted="isFirstSevenComplete" />
                  <div class="col-10">
                    <span class="text-subtitle1">Points from first 7 transactions</span>

                    <div class="row q-gutter-y-sm q-mt-xs">
                      <div
                        v-for="(item, index) in firstSevenTransactions"
                        class="row col-12 q-gutter-x-sm"
                        :key="index"
                      >
                        <status-chip
                          :isCompleted="item.ref_id !== '' && item.date != ''"
                          :index="index + 1"
                        />
                        <div class="col-10">
                          <template v-if="item.ref_id !== '' && item.date != ''">
                            Earned&nbsp;<strong>{{ item.points_earned }} UP</strong>
                            from {{ item.ref_id }}
                            last {{ parseLocaleDate(item.date) }}
                          </template>
                          <span
                            v-else
                            class="subtext-gray not-earned-label"
                            :class="getDarkModeClass(darkMode)"
                          >
                            Not yet earned
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <span class="full-width text-center text-h6">
                    Sorry, only new users can avail the one-time points.
                  </span>
                </template>
              </div>
            </q-scroll-area>
          </q-tab-panel>

          <q-tab-panel name="recurring">
            <q-scroll-area ref="recurring">
              <div>
                <span class="text-subtitle1">
                  Points from Marketplace transactions
                </span>

                <div
                  v-if="marketplaceTransactions.length > 0"
                  class="row q-gutter-y-sm q-mt-xs"
                >
                  <div
                    v-for="(item, index) in marketplaceTransactions"
                    class="row q-gutter-y-sm"
                    :key="index"
                  >
                    <span class="col-12 q-pl-sm text-subtitle1 text-bold">
                      {{ parseLocaleDate(item.month, false) }}
                    </span>

                    <div
                      v-for="(order, i) in item.orders"
                      :key="i"
                    >
                      <span class="row q-pl-lg">
                        Earned&nbsp;<strong>8 UP</strong>
                        &nbsp;from Order&nbsp;
                        <span
                          class="text-underline cursor-pointer"
                          @click="redirectToMarketplaceOrder(order.order_id)"
                        >
                          #{{ order.order_id }}
                        </span>
                        &nbsp;last {{ parseLocaleDate(order.date) }}
                      </span>
                    </div>
                  </div>
                </div>

                <span v-else class="q-mt-md row justify-center text-center text-subtitle1">
                  You do not have any Marketplace transactions yet.<br/><br/>
                  Order from the Marketplace to start earning points!
                </span>
              </div>
            </q-scroll-area>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import {
  convertPoints,
  parseLocaleDate,
  createUserRewardsData,
  getUserRewardsData,
  updateUserPromoData,
  getPromoPointsDivisorData,
  updateUserRewardsData,
  Promos,
  getKeyPairFromWalletMnemonic,
  getContractInitialBalance
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav'
import StatusChip from 'src/components/rewards/StatusChip.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'UserRewards',

  components: {
    HeaderNav,
    StatusChip,
    ProgressLoader
  },

  props: {
    id: { type: String, default: '-1' },
    address: { type: String, default: '' }
  },

  data () {
    return {
      isLoading: false,
      currentTab: 'onetime',
      urId: -1,
      points: 0,
      pointsDivisor: 0,

      isReferralComplete: false,
      referralCompleteDate: null,
      isFirstSevenComplete: false,
      isFirstTimeUser: true,
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
    }
  },

  async mounted () {
    const vm = this

    vm.isLoading = true
    vm.adjustScrollAreaHeight()

    const keyPair = await getKeyPairFromWalletMnemonic()
    vm.urContract = new PromoContract(Promos.USERREWARDS, keyPair.pubKey)

    let urData = null
    vm.urId = Number(vm.id)
    if (vm.urId > -1) {
      urData = await getUserRewardsData(vm.urId)
    } else {
      // create UserReward entry in engagement-hub
      urData = await createUserRewardsData()
      await updateUserPromoData({ ur_id: urData.id })
      await updateUserRewardsData(urData.id, {
        contract_ct_address: vm.urContract.contract.tokenAddress
      })

      await vm.urContract.subscribeAddress()
      // call API to add BCH balance to newly-created contract
      await getContractInitialBalance({
        contract_address: vm.urContract.contract.address
      })
    }

    if (urData) {
      await getPromoPointsDivisorData()
        .then(data => {
          vm.pointsDivisor = data.ur_divisor
        })

      vm.points = await vm.urContract.getTokenBalance()
      vm.isReferralComplete = urData.is_referral_complete
      vm.isFirstSevenComplete = urData.is_first_seven_complete
      vm.referralCompleteDate = urData.referral_complete_date
      vm.isFirstTimeUser = urData.is_first_time_user

      if (urData.ur_months.length > 0) {
        for (const transaction of urData.ur_months) {
          vm.marketplaceTransactions.push({
            month: transaction.timeframe,
            orders: transaction.ur_mp_transactions.sort((a, b) => {
              return new Date(b.date) - new Date(a.date)
            })
          })
        }
      }

      if (urData.ur_seven_transactions.length > 0) {
        vm.firstSevenTransactions = urData.ur_seven_transactions
      }
      for (let i = vm.firstSevenTransactions.length; i < 7; i++) {
        vm.firstSevenTransactions.push({ ref_id: '', date: '', points: 0 })
      }
    }

    vm.isLoading = false
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseLocaleDate,
    adjustScrollAreaHeight () {
      const vm = this

      const pointsDivHeight = vm.$refs.points_div.clientHeight
      let scrollAreaHeight = document.body.clientHeight - pointsDivHeight - 300
      if (vm.$q.platform.is.ios) scrollAreaHeight -= 30

      if (vm.currentTab === 'onetime') {
        vm.$refs.onetime.$el.setAttribute('style', `height: ${scrollAreaHeight}px;`)
      } else if (vm.currentTab === 'recurring') {
        vm.$refs.recurring.$el.setAttribute('style', `height: ${scrollAreaHeight}px;`)
      }
    },
    redirectToMarketplaceOrder (orderId) {
      this.$router.push({ name: 'app-marketplace-order', params: { orderId } })
    },
    async openRedeemPointsDialog () {
      const vm = this

      vm.$q.dialog({
        component: RedeemPointsDialog,
        componentProps: {
          points: vm.points,
          pointsType: Promos.USERREWARDS,
          pointsDivisor: vm.pointsDivisor,
          promoId: vm.urId,
          address: vm.address
        }
      }).onDismiss(async () => {
        vm.isLoading = true
        vm.points = await vm.urContract.getTokenBalance()
        vm.isLoading = false
      })
    }
  }
}
</script>

<style lang="scss">
.q-tab-panels {
  background: transparent;
}
</style>
