<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="`RF ${$t('Promo')}`"
      :rewardsPage="Promos.RFPROMO"
    />

    <div
      class="row q-mx-lg q-gutter-y-md q-pt-lg justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div class="row justify-center q-gutter-y-xs" ref="points_div">
        <span class="col-12 text-center text-subtitle1">
          {{ $t('YouCurrentlyHave') }}
        </span>
        <div v-if="isLoading" class="row col-12 justify-center q-mb-lg">
          <progress-loader
            
            :isTight="true"
          />
        </div>
        <template v-else>
          <span class="col-12 text-center text-h5 text-bold">{{ points }} RP</span>
          <span
            class="q-mb-md col-12 text-center subtext-gray"
            :class="getDarkModeClass(darkMode)"
          >
            ({{ pointsConvertion }})
          </span>

          <span class="q-mb-xs col-12 text-center">
            {{ $t(
                'RFPRedeemable',
                { redeemablePoints },
                `You can redeem ${redeemablePoints} RP this month`
              )
            }}
          </span>
        </template>
        <div class="row col-12 justify-center">
          <q-btn
            rounded
            class="button"
            :label="$t('RedeemPoints')"
            :disable="points === 0 || redeemablePoints === 0"
            @click="openRedeemPointsDialog"
          />
        </div>
        <div class="row col-12 justify-center">
          <q-btn
            rounded
            class="q-mt-md button"
            :label="$t('ShowReferralQR')"
            @click="openReferralQrDialog"
            :disable="isLoading"
          />
        </div>
      </div>

      <div
        class="row col-12 justify-center q-pa-md q-pb-lg shadow-up-1 points-earned-div"
        :class="getDarkModeClass(darkMode)"
      >
        <span class="row col-12 justify-center text-center text-h6 q-mb-sm">
          {{ $t('ReferralStatus') }}
        </span>

        <div v-if="isLoading" class="row col-12 justify-center">
          <progress-loader
            
            :isTight="true"
          />
        </div>

        <q-scroll-area ref="referrals_list" class="q-mx-sm">
          <template v-if="!isLoading">
            <div v-if="referralsList.length > 0" class="row q-mx-md q-gutter-y-sm">
              <div
                v-for="(item, index) in referralsList"
                class="row col-12"
                :key="index"
              >
                <span class="col-12 text-subtitle1">
                  {{ formatWalletHashDisplay(item.wallet_hash) }}
                </span>

                <div class="q-ml-md">
                  <span>
                    {{ $t(
                        'WalletCreatedOn',
                        { dateCreated: item.date_created },
                        `Wallet created on ${item.date_created}`
                      )
                    }}
                  </span><br/>
                  <span v-if="item.has_transacted">
                    {{ $t('YouEarned') }}&nbsp;
                    <span class="text-bold">5 RP</span>
                  </span>
                  <span
                    v-else
                    class="subtext-gray not-earned-label"
                    :class="getDarkModeClass(darkMode)"
                  >
                    {{ $t('UserNotTransacted') }}
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="row justify-center text-center text-subtitle1">
              {{ $t('ReferralStatusWarning1') }}<br/><br/>
              {{ $t('ReferralStatusWarning2') }}
            </div>
          </template>
        </q-scroll-area>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Promos,
  PromosBytes,
  convertPoints,
  getRfPromoData,
  createRfPromoData,
  updateUserPromoData,
  getPromoPointsDivisorData,
  updateRfPromoData,
  getKeyPairFromWalletMnemonic,
  getContractInitialBalance
} from 'src/utils/engagementhub-utils/rewards'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/shared'

import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReferralQrDialog from 'src/components/rewards/ReferralQrDialog.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'
import HelpDialog from 'src/components/rewards/dialogs/HelpDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'
import { ensureKeypair } from 'src/utils/memo-service'

export default {
  name: 'RFPromo',

  components: {
    HeaderNav,
    ProgressLoader
  },

  props: {
    id: { type: String, default: '-1' },
    address: { type: String, default: '' }
  },

  data () {
    return {
      Promos,
      
      isLoading: false,
      rpId: -1,
      points: 0,
      pointsDivisor: 0,
      redeemablePoints: 10000,
      referralCode: '',
      rpContract: null,
      pointsError: '',
      dataError: '',

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
    pointsConvertion () {
      return convertPoints(this.points, this.pointsDivisor)
    }
  },

  async mounted () {
    await this.loadData()
  },

  methods: {
    getDarkModeClass,
    parseLocaleDate,

    async loadData () {
      this.isLoading = true

      this.rpId = Number(this.$route.params.id || -1)

      // initialize UR Promo Contract and retrieve points
      try {
        const keyPair = await ensureKeypair()
        this.rpContract = new PromoContract(keyPair.pubkey, PromosBytes.RP)
        if (this.rpId === -1) await this.rpContract.subscribeAddress()
        this.points = await this.rpContract.getTokenBalance()
        // this.animatePointsCounter()
      } catch (error) {
        console.error(error)
        this.pointsError = this.$t('FailedToLoadPoints', 'Unable to load your points at the moment. Please try again later. Rest assured, your points remain safe and intact.')
      }

      // fetch and load data
      let rpData = null
      if (this.rpId === -1) {
        // TODO: add open help dialog
        // new user; create and update necessary data
        rpData = await createRfPromoData()
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
        this.redeemablePoints = rpData.redeemable_points
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
    openReferralQrDialog () {
      this.$q.dialog({
        component: ReferralQrDialog,
        componentProps: {
          code: this.referralCode,
          rpId: this.rpId,
          referralType: 'Friend'
        }
      })
    },
    openRedeemPointsDialog () {
      const vm = this

      vm.$q.dialog({
        component: RedeemPointsDialog,
        componentProps: {
          points: vm.points,
          pointsType: Promos.RFPROMO,
          pointsDivisor: vm.pointsDivisor,
          promoId: vm.rpId,
          address: vm.address,
          redeemablePoints: vm.redeemablePoints
        }
      }).onDismiss(async () => {
        vm.isLoading = true
        vm.points = await vm.rpContract.getTokenBalance()
        vm.isLoading = false
      })
    }
  }
}
</script>
