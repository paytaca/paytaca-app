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
        <span class="col-12 q-my-sm text-grey">for</span>
        <span class="col-12 text-h5 text-bold">
          {{ parseLiftToken(rsvp.amount_purchased_token) }}
        </span>
      </div>

      <drag-slide v-if="!isLoading" disable-absolute-bottom @swiped="securityCheck" />
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseFiatCurrency, getAssetDenomination } from 'src/utils/denomination-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'

import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'

export default {
  name: 'PayReservationDialog',

  props: {
    rsvp: { type: Object, default: null }
  },

  components: {
    DragSlide
  },

  data () {
    return {
      bchAmount: 0,
      intervalId: null,
      isLoading: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency?.symbol
    }
    ,
    currentUsdPrice () {
      let usdPrice = this.$store.getters['market/getAssetPrice']('bch', 'USD')
      if (!usdPrice) {
        this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
        usdPrice = this.$store.getters['market/getAssetPrice']('bch', 'USD')
      }
      return usdPrice
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
          }, 5000)
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
  },

  unmounted () {
    clearInterval(this.intervalId)
  }
}
</script>