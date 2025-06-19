<template>
  <q-dialog
    persistent
    seamless
    ref="purchaseDialogRef"
    class="no-click-outside"
  >
    <q-card
      class="full-width q-pa-md pt-card-2 text-body1 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-between items-center q-mb-md">
        <span class="text-h6">Purchase LIFT</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row justify-between q-mb-md">
        <span>{{ SaleGroupPrice[rsvp.sale_group] }} USD/LIFT</span>
        <span>{{ currentUsdPrice }} USD/BCH</span>
      </div>

      <div class="row full-width q-gutter-y-xs q-mb-sm">
        <q-input
          filled
          type="text"
          inputmode="none"
          class="col-12"
          ref="input-tkn"
          v-model="amountTkn"
          @focus="customKeyboardState = 'show'"
          :label="$t('Amount')"
          :dark="darkMode"
          :error="
            Number(amountBch) > walletBalance ||
            (Number(amountTkn) * (10 ** 2)) > rsvp.reserved_amount_tkn
          "
          :error-message="$t('BalanceExceeded')"
        >
          <template v-slot:append>
            <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
              LIFT
            </div>
          </template>
        </q-input>

        <span class="col-12 q-pl-md">{{ getAssetDenomination('BCH', amountBch) }}</span>
        <span class="col-12 q-pl-md">{{ parseFiatCurrency(amountUsd, 'USD') }}</span>
      </div>

      <div class="row justify-between">
        <span>Wallet balance:</span>
        <span>{{ getAssetDenomination('BCH', bchBalance) }}</span>
      </div>

      <div class="row justify-between">
        <span>Unpaid LIFT:</span>
        <span>{{ parseLiftToken(unpaidLift) }}</span>
      </div>

      <div class="row full-width justify-evenly q-mt-md">
        <q-btn
          rounded
          outline
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Cancel')"
          v-close-popup
        />
        <q-btn
          rounded
          class="button"
          :label="'Purchase'"
          :disable="
            Number(amountTkn) === 0 ||
            Number(amountBch) > walletBalance ||
            (Number(amountTkn) * (10 ** 2)) > rsvp.reserved_amount_tkn
          "
          @click="openConfirmDialog"
        />
      </div>
    </q-card>

    <custom-keyboard
      :custom-keyboard-state="customKeyboardState"
      v-on:addKey="setAmount"
      v-on:makeKeyAction="makeKeyAction"
    />
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseKey } from 'src/utils/custom-keyboard-utils'
import { SaleGroupPrice } from 'src/utils/engagementhub-utils/lift-token'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'

import CustomKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'
import PayReservationConfirmDialog from 'src/components/lift-token/dialogs/PayReservationConfirmDialog.vue'

export default {
  name: 'PayReservationDialog',

  props: {
    rsvp: { type: Object, default: null },
    wallet: { type: Object, default: null },
    liftSwapContractAddress: { type: String, default: null }
  },

  components: {
    CustomKeyboard
  },

  data () {
    return {
      SaleGroupPrice,

      intervalId: null,
      customKeyboardState: 'dismiss',
      amountUsd: 0,
      amountBch: 0,
      amountTkn: 0,
      unpaidLift: 0,
      bchBalance: 0
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
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
      return usdPrice || 0
    },
    walletBalance () {
      const asset = this.$store.getters['assets/getAssets'][0]
      return asset.spendable
    }
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    getAssetDenomination,
    parseFiatCurrency,

    computeUsdBch () {
      this.amountUsd = Number(this.amountTkn) * SaleGroupPrice[this.rsvp.sale_group]

      let bch = this.amountUsd / this.currentUsdPrice
      if (bch === Infinity) bch = this.amountBch

      this.amountBch = bch || 0
    },
    computeBalances () {
      this.bchBalance = (this.walletBalance - this.amountBch).toFixed(8)
      this.unpaidLift = this.rsvp.reserved_amount_tkn - Number(this.amountTkn * (10 ** 2))
    },

    setAmount (key) {
      this.$refs['input-tkn'].nativeEl.focus({ focusVisible: true })

      const currentAmount = this.amountTkn
      const currentCaret = this.$refs['input-tkn'].nativeEl.selectionStart
      const parsedAmount = parseKey(key, currentAmount, currentCaret, null)

      this.amountTkn = parsedAmount
      this.computeUsdBch()
      this.computeBalances()
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        this.$refs['input-tkn'].nativeEl.focus({ focusVisible: true })
        try {
          this.amountTkn = this.amountTkn.slice(0, -1)
        } catch {
          this.amountBch = 0
          this.amountUsd = 0
          this.amountTkn = 0
        }
      } else if (action === 'delete') {
        this.$refs['input-tkn'].nativeEl.focus({ focusVisible: true })
        this.amountBch = 0
        this.amountUsd = 0
        this.amountTkn = 0
      } else this.customKeyboardState = 'dismiss'
      
      this.computeUsdBch()
      this.computeBalances()
    },

    openConfirmDialog () {
      clearInterval(this.intervalId)
      this.$q.dialog({
        component: PayReservationConfirmDialog,
        componentProps: {
          purchase: {
            tkn: Number(this.amountTkn) * (10 ** 2),
            bch: Number(this.amountBch),
            usd: Number(this.amountUsd)
          },
          rsvp: this.rsvp,
          wallet: this.wallet,
          liftSwapContractAddress: this.liftSwapContractAddress
        }
      })
        .onCancel(() => {
          this.intervalId = setInterval(() => {
            this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
            this.computeUsdBch()
            this.computeBalances()
          }, 20000)
        })
        .onOk(() => {
          this.$refs.purchaseDialogRef.$emit('ok')
          this.$refs.purchaseDialogRef.hide()
        })
    }
  },

  mounted () {
    this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
    this.computeUsdBch()
    this.computeBalances()

    this.intervalId = setInterval(() => {
      this.$store.dispatch('market/updateAssetPrices', { customCurrency: 'USD' })
      this.computeUsdBch()
      this.computeBalances()
    }, 20000)
  },

  unmounted () {
    clearInterval(this.intervalId)
  }
}
</script>

<style lang="scss">
.q-field--dark.q-field--error {
  .text-negative,
  .q-field__messages,
  .q-field__label,
  .q-field__control.text-negative {
    color: #e57373 !important
  }
}
</style>