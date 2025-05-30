<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    position="bottom"
    class="br-15 no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-end items-center">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row flex-center full-width q-mb-md text-center text-h6">
        <span class="col-12 q-mb-sm">Pay</span>

        <template v-if="isLoading">
          <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
        </template>
        <template v-else>
          <span class="col-12 text-h5 text-bold">
            {{ bchAmount }}
          </span>
          <div class="col-12 text-subtitle2">
            <span>
              + 0.00001 BCH
            </span>
            <q-icon name="info" size="1em"/>
            <q-menu
              touch-position
              class="pt-card text-bow q-py-sm q-px-md br-15"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="row items-center q-gutter-sm">
                <div class="q-space">{{ $t('NetworkFee') }}</div>
              </div>
            </q-menu>
          </div>
          <span class="col-12 q-mt-xs text-subtitle1">
            ({{ parseFiatCurrency(rsvp.amount_purchased_usd, 'usd') }})
          </span>
        </template>
        
        <span class="col-12 q-my-sm text-grey">for</span>
        <span class="col-12 text-h5 text-bold">
          {{ parseLiftToken(rsvp.amount_purchased_token) }}
        </span>
      </div>

      <template v-if="isSufficientBalance">
        <drag-slide v-if="!isLoading" disable-absolute-bottom @swiped="securityCheck" />
      </template>
      <template v-else>
        <span class="row q-px-lg q-pb-md text-center text-body1 dim-text">
          Not enough balance to pay for reserved LIFT tokens
        </span>
      </template>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { parseFiatCurrency, getAssetDenomination } from 'src/utils/denomination-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'

import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'PayReservationDialog',

  props: {
    rsvp: { type: Object, default: null }
  },

  components: {
    DragSlide,
    ProgressLoader
  },

  data () {
    return {
      bchAmount: 0,
      intervalId: null,
      isLoading: false,
      isSufficientBalance: true
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency?.symbol
    },
    currentUsdPrice () {
      let usdPrice = this.$store.getters['market/getAssetPrice']('bch', 'USD')
      if (!usdPrice) {
        this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
        usdPrice = this.$store.getters['market/getAssetPrice']('bch', 'USD')
      }
      return usdPrice
    },
    walletBalance () {
      const asset = this.$store.getters['assets/getAssets'][0]
      return asset.spendable
    }
  },

  watch: {
    bchAmount (value) {
      if (Number(`${value}`.split(' ')[0]) === 0) this.isLoading = true
      else this.isLoading = false
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseFiatCurrency,
    parseLiftToken,

    getBchPrice (amount) {
      let bch = amount / this.currentUsdPrice
      if (bch === Infinity) bch = `${this.bchAmount}`.split(' ')[0]

      return bch
    },

    securityCheck (reset = () => {}) {
      this.isLoading = true
      clearInterval(this.intervalId)

      this.$q.dialog({
        component: SecurityCheckDialog,
      })
        .onOk(() => { console.log('yey') })
        .onCancel(() => {
          reset?.()
          this.intervalId = setInterval(() => {
            this.bchAmount = getAssetDenomination(
              'BCH', this.getBchPrice(this.rsvp.amount_purchased_usd)
            )
          }, 3000)
        })

      this.isLoading = false
    }
  },

  async mounted () {
    this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
    this.bchAmount = getAssetDenomination(
      'BCH', this.getBchPrice(this.rsvp.amount_purchased_usd)
    )
    this.intervalId = setInterval(() => {
      this.bchAmount = getAssetDenomination(
        'BCH', this.getBchPrice(this.rsvp.amount_purchased_usd)
      )
    }, 5000)

    const bch = this.bchAmount.split(' ')[0]
    this.isSufficientBalance = this.walletBalance >= Number(bch)
  },

  unmounted () {
    clearInterval(this.intervalId)
  }
}
</script>

<style lang="scss" scoped>
  .dim-text {
    color: #ed5f59;
    font-weight: 600;
  }
</style>