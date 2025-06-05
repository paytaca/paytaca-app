<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
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
            :color="isNotDefaultTheme(theme) ? theme : 'pink'"
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
            :color="isNotDefaultTheme(theme) ? theme : 'pink'"
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
                    {{ $t('You earned') }}&nbsp;
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
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import {
  convertPoints,
  getRfPromoData,
  createRfPromoData,
  updateUserPromoData,
  parseLocaleDate,
  getPromoPointsDivisorData,
  updateRfPromoData,
  Promos,
  getKeyPairFromWalletMnemonic,
  getContractInitialBalance
} from 'src/utils/engagementhub-utils/rewards'

import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import ReferralQrDialog from 'src/components/rewards/ReferralQrDialog.vue'
import RedeemPointsDialog from 'src/components/rewards/dialogs/RedeemPointsDialog.vue'
import HelpDialog from 'src/components/rewards/dialogs/HelpDialog.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

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
      rfpId: -1,
      points: 0,
      pointsDivisor: 0,
      redeemablePoints: 10000,
      referralCode: '',
      rfpContract: null,

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
    const vm = this

    vm.isLoading = true

    const pointsDivHeight = vm.$refs.points_div.clientHeight
    let scrollAreaHeight = document.body.clientHeight - pointsDivHeight - 200
    if (vm.$q.platform.is.ios) scrollAreaHeight -= 50
    vm.$refs.referrals_list.$el.setAttribute(
      'style',
      `height: ${scrollAreaHeight}px; width: 100vw;`
    )

    const keyPair = await getKeyPairFromWalletMnemonic()
    vm.rfpContract = new PromoContract(Promos.RFPROMO, keyPair.pubKey)

    let rfpData = null
    vm.rfpId = Number(vm.id)
    if (vm.rfpId > -1) {
      rfpData = await getRfPromoData(vm.rfpId)
    } else {
      // open help dialog
      vm.$q.dialog({
        component: HelpDialog,
        componentProps: { page: Promos.RFPROMO }
      })

      // create RFPromo entry in engagement-hub
      rfpData = await createRfPromoData()
      await updateUserPromoData({ rfp_id: rfpData.id })
      await updateRfPromoData(rfpData.id, {
        contract_ct_address: vm.rfpContract.contract.tokenAddress
      })

      await vm.rfpContract.subscribeAddress()
      // call API to add BCH balance to newly-created contract
      await getContractInitialBalance({
        contract_address: vm.rfpContract.contract.address
      })
    }


    if (rfpData) {
      await getPromoPointsDivisorData()
        .then(data => {
          vm.pointsDivisor = data.rfp_divisor
        })

      vm.points = await vm.rfpContract.getTokenBalance()
      vm.redeemablePoints = rfpData.redeemable_points
      vm.referralCode = rfpData.referral_code
      vm.referralsList = rfpData.rfp_referrals.sort((a, b) => {
        return new Date(b.date_created) - new Date(a.date_created)
      })
      vm.pointsDivisor = 4
    }

    vm.isLoading = false
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseLocaleDate,
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
          rfpId: this.rfpId,
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
          promoId: vm.rfpId,
          address: vm.address,
          redeemablePoints: vm.redeemablePoints
        }
      }).onDismiss(async () => {
        vm.isLoading = true
        vm.points = await vm.rfpContract.getTokenBalance()
        vm.isLoading = false
      })
    }
  }
}
</script>
