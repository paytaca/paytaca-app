<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      class="apps-header"
      :title="`RF Promo`"
      :isRewardsPage="true"
    />

    <div
      class="row q-mx-lg q-gutter-y-md q-pt-lg justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div class="row justify-center q-gutter-y-xs" ref="points_div">
        <span class="col-12 text-center text-subtitle1">You currently have</span>
        <span class="col-12 text-center text-h5 text-bold">{{ points }} RFP</span>
        <span
          class="q-mb-md col-12 text-center subtext-gray"
          :class="getDarkModeClass(darkMode)"
        >
          {{ pointsConvertion }}
        </span>

        <span class="q-mb-xs col-12 text-center">
          You can redeem {{ redeemablePoints }} RFP this month
        </span>
        <div class="row col-12 justify-center">
          <q-btn
            rounded
            class="button"
            label="Redeem Points"
            :disable="points === 0"
          />
        </div>
        <div class="row col-12 justify-center">
          <q-btn
            rounded
            class="q-mt-md button"
            label="Show Referral QR Code"
          />
        </div>
      </div>

      <div
        class="row col-12 justify-center q-pa-md shadow-up-1 points-earned-div"
        :class="getDarkModeClass(darkMode)"
      >
        <span class="row col-12 justify-center text-center text-h6 q-mb-sm">
          Referral Status
        </span>

        <q-scroll-area ref="referrals_list" class="q-mx-lg">
          <div v-if="referralsList.length > 0" class="row q-gutter-y-sm">
            <div
              v-for="(item, index) in referralsList"
              class="row col-12"
              :key="index"
            >
              <span class="col-12 text-subtitle1">
                {{ item.wallet_hash.substring(0, 6) }} ...
                {{ item.wallet_hash.substring(item.wallet_hash.length - 6 , item.wallet_hash.length) }}
              </span>

              <div class="q-ml-md">
                <span>Wallet created on {{ item.date }}</span><br/>
                <span v-if="item.has_transacted">
                  You earned <span class="text-bold">5 RFP</span>
                </span>
                <span
                  v-else
                  class="subtext-gray not-earned-label"
                  :class="getDarkModeClass(darkMode)"
                >
                  User has not yet transacted
                </span>
              </div>
            </div>
          </div>

          <div v-else class="row justify-center text-center text-subtitle1">
            You do not have any referrals yet.<br/><br/>
            Refer other users to use Paytaca to start earning points!
          </div>
        </q-scroll-area>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { convertToBCH } from 'src/utils/denomination-utils'

import HeaderNav from 'src/components/header-nav'

export default {
  name: 'RFPromo',

  components: {
    HeaderNav
  },

  data () {
    return {
      points: 0,
      redeemablePoints: 10000,
      // [{ wallet_hash: '', date: '', has_transacted: false }]
      referralsList: []
      // referralsList: [
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: false
      //   },
      //   {
      //     wallet_hash: 'af1ffd1dfc671e05247b7604d823953967a4a570841fc76129918ae5210805b7',
      //     date: 'date',
      //     has_transacted: true
      //   }
      // ]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    fiatCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    bchMarketPrice () {
      if (!this.fiatCurrency) return 0
      return this.$store.getters['market/getAssetPrice']('bch', this.fiatCurrency)
    },
    pointsConvertion () {
      const fiat = this.points / 4
      const bch = convertToBCH(this.denomination, (fiat / this.bchMarketPrice))

      const finalFiat = `${fiat} ${this.fiatCurrency}`
      const finalBch = `${Number(bch) === 0 ? '0' : bch.toFixed(8)} ${this.denomination}`

      return `(${finalFiat} or ${finalBch})`
    }
  },

  mounted () {
    const pointsDivHeight = this.$refs.points_div.clientHeight
    let scrollAreaHeight = document.body.clientHeight - pointsDivHeight - 200
    if (this.$q.platform.is.ios) {
      scrollAreaHeight -= 50
    }
    this.$refs.referrals_list.$el.setAttribute(
      'style',
      `height: ${scrollAreaHeight}px; width: 100vw;`
    )
  },

  methods: {
    getDarkModeClass
  }
}
</script>
