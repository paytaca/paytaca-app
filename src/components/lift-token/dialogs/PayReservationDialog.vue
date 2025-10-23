<template>
  <q-dialog
    persistent
    seamless
    ref="purchaseDialogRef"
    class="no-click-outside"
  >
    <q-card
      class="payment-dialog-card full-width q-pa-lg text-body1 text-bow"
      :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
    >
      <div class="row justify-between items-center q-mb-lg">
        <span class="text-h5 text-weight-bold">{{ $t("PurchaseLift") }}</span>
        <q-btn
          flat
          round
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="price-info-box q-pa-sm q-mb-md" :class="getDarkModeClass(darkMode)">
        <div class="row justify-between">
          <span class="text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
            {{ formatWithLocale(SaleGroupPrice[rsvp.sale_group]) }} USD/LIFT
          </span>
          <span class="text-caption text-grey-7" :class="{'text-grey-4': darkMode}">
            {{ formatWithLocale(currentUsdPrice) }} USD/BCH
          </span>
        </div>
      </div>

      <div class="col">
        <custom-input
          v-model="amountTkn"
          :inputSymbol="'LIFT'"
          :inputRules="[
            val => (
              Number(this.amountBch) < this.walletBalance &&
              Number(val) * 10 ** 2 <= this.tknBalance
            ) || this.$t('BalanceExceeded')
          ]"
          :asset="null"
          :decimalObj="{ min: 0, max: 2 }"
          @on-amount-click="onKeyAction"
          @on-backspace-click="onKeyAction"
          @on-delete-click="onKeyAction"
        />
      </div>

      <div class="row full-width q-gutter-y-xs q-mb-xs">
        <div class="row col-12 justify-end q-px-md">
          <span
            class="text-weight-bolder max-button text-grad"
            style="cursor: pointer"
            :class="getDarkModeClass(darkMode)"
            @click="onMaxClick"
          >
            {{ $t("MAX") }}
          </span>
        </div>

        <span class="col-12 q-px-md">
          {{ getAssetDenomination("BCH", amountBch) }}
        </span>
        <span class="col-12 q-px-md">
          {{ parseFiatCurrency(amountUsd, "USD") }}
          <template v-if="this.rsvp.discount > 0">
            <q-icon name="info" size="1em" />
            <q-menu
              touch-position
              class="pt-card text-bow q-py-sm q-px-md br-15"
              :class="getDarkModeClass(darkMode)"
            >
              <div class="row items-center q-gutter-sm">
                <div class="q-space">
                  {{
                    $t(
                      "DiscountApplied2",
                      { discount: this.rsvp.discount },
                      `A ${this.rsvp.discount}% discount is applied`
                    )
                  }}
                </div>
              </div>
            </q-menu>
          </template>
        </span>
      </div>

      <div class="row justify-between">
        <span>{{ $t("WalletBalance") }}:</span>
        <span>{{ getAssetDenomination("BCH", bchBalance) }}</span>
      </div>

      <div class="row justify-between">
        <span>{{ $t("UnpaidLift") }}:</span>
        <span>{{ parseLiftToken(unpaidLift) }}</span>
      </div>

      <div class="row full-width justify-evenly q-mt-lg q-gutter-x-md">
        <q-btn
          unelevated
          rounded
          outline
          no-caps
          class="col dialog-btn-outline"
          :class="[getDarkModeClass(darkMode), `theme-${theme}`]"
          :label="$t('Cancel')"
          v-close-popup
        />
        <q-btn
          unelevated
          rounded
          no-caps
          class="col dialog-btn-primary"
          :class="`theme-${theme}`"
          :style="`background: linear-gradient(135deg, ${getThemeColor()} 0%, ${getDarkerThemeColor()} 100%);`"
          :label="$t('Purchase')"
          :disable="
            Number(amountTkn) === 0 ||
            Number(amountBch) > walletBalance ||
            Number(amountTkn) * 10 ** 2 > tknBalance
          "
          @click="openConfirmDialog"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { getOracleData, SaleGroupPrice } from "src/utils/engagementhub-utils/lift-token";
import { parseLiftToken } from "src/utils/engagementhub-utils/shared";
import {
  getAssetDenomination,
  parseFiatCurrency,
  formatWithLocale
} from "src/utils/denomination-utils";

import CustomInput from "src/components/CustomInput.vue";
import PayReservationConfirmDialog from "src/components/lift-token/dialogs/PayReservationConfirmDialog.vue";

export default {
  name: "PayReservationDialog",

  props: {
    rsvp: { type: Object, default: null },
    wallet: { type: Object, default: null },
    liftSwapContractAddress: { type: String, default: null },
  },

  components: {
    CustomInput
  },

  data() {
    return {
      SaleGroupPrice,

      intervalId: null,
      customKeyboardState: "dismiss",
      amountFormatted: '0',
      amountUsd: 0,
      amountBch: 0,
      amountTkn: 0,
      unpaidLift: 0,
      bchBalance: 0,
      tknBalance: 0,
      currentUsdPrice: 0,
      currentMessageTimestamp: 0
    };
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    theme() {
      return this.$store.getters["global/theme"];
    },
    selectedMarketCurrency() {
      const currency = this.$store.getters["market/selectedCurrency"];
      return currency?.symbol;
    },
    walletBalance() {
      const asset = this.$store.getters["assets/getAssets"][0];
      return asset.spendable;
    },
  },

  methods: {
    getDarkModeClass,
    parseLiftToken,
    getAssetDenomination,
    parseFiatCurrency,
    formatWithLocale,

    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },
    getDarkerThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#1e88e5',
        'glassmorphic-gold': '#fb8c00',
        'glassmorphic-green': '#43a047',
        'glassmorphic-red': '#e91e63'
      }
      return themeColors[this.theme] || themeColors['glassmorphic-blue']
    },

    parseToken() {
      let tkn = this.rsvp.reserved_amount_tkn;
      if (Object.keys(this.rsvp.reservation_partial_purchase).length > 0) {
        tkn = this.rsvp.reservation_partial_purchase.tkn_unpaid;
      }
      return tkn;
    },
    computeUsdBch() {
      this.amountUsd =
        Number(this.amountTkn) * SaleGroupPrice[this.rsvp.sale_group];
      if (this.rsvp.discount > 0) {
        this.amountUsd =
          this.amountUsd - this.amountUsd * (this.rsvp.discount / 100);
      }

      let bch = this.amountUsd / this.currentUsdPrice;
      if (bch === Infinity) bch = this.amountBch;

      this.amountBch = bch || 0;
    },
    computeBalances() {
      const tkn = this.parseToken();

      this.bchBalance = (this.walletBalance - this.amountBch).toFixed(8);
      this.tknBalance = tkn;
      this.unpaidLift = this.parseToken() - Number(this.amountTkn * 10 ** 2);
    },

    onKeyAction (val) {
      this.amountTkn = val
      if (Number(this.amountTkn) === 0) {
        this.amountBch = 0;
        this.amountUsd = 0;
        this.amountTkn = 0;
      }
      this.computeUsdBch();
      this.computeBalances();
    },
    onMaxClick() {
      this.amountTkn = this.parseToken() / 10 ** 2;
      this.computeUsdBch();
      this.computeBalances();
    },

    openConfirmDialog() {
      clearInterval(this.intervalId);
      this.$q
        .dialog({
          component: PayReservationConfirmDialog,
          componentProps: {
            purchase: {
              tkn: Number(this.amountTkn) * 10 ** 2,
              bch: Number(this.amountBch),
              usd: Number(this.amountUsd),
            },
            rsvp: this.rsvp,
            wallet: this.wallet,
            liftSwapContractAddress: this.liftSwapContractAddress,
            messageTimestamp: this.currentMessageTimestamp
          },
        })
        .onCancel(() => {
          this.intervalId = setInterval(async () => {
            const oracleData = await getOracleData()
            this.currentUsdPrice = oracleData.price
            this.currentMessageTimestamp = oracleData.messageTimestamp
            this.computeUsdBch();
            this.computeBalances();
          }, 60000);
        })
        .onOk(() => {
          this.$refs.purchaseDialogRef.$emit("ok");
          this.$refs.purchaseDialogRef.hide();
        });
    },
  },

  async mounted() {
    const oracleData = await getOracleData()
    this.currentUsdPrice = oracleData.price
    this.currentMessageTimestamp = oracleData.messageTimestamp
    this.computeUsdBch();
    this.computeBalances();

    this.intervalId = setInterval(async () => {
      const oracleData = await getOracleData()
      this.currentUsdPrice = oracleData.price
      this.currentMessageTimestamp = oracleData.messageTimestamp
      this.computeUsdBch();
      this.computeBalances();
    }, 60000);
  },

  unmounted() {
    clearInterval(this.intervalId);
  },
};
</script>

<style lang="scss" scoped>
.price-info-box {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.dialog-btn-outline {
  font-weight: 600;
  border-width: 2px;
  padding: 10px 24px;
  
  &.theme-glassmorphic-blue {
    border-color: #42a5f5;
    color: #42a5f5;
    
    &.dark {
      border-color: #64b5f6;
      color: #64b5f6;
    }
  }
  
  &.theme-glassmorphic-gold {
    border-color: #ffa726;
    color: #ffa726;
    
    &.dark {
      border-color: #ffb74d;
      color: #ffb74d;
    }
  }
  
  &.theme-glassmorphic-green {
    border-color: #4caf50;
    color: #4caf50;
    
    &.dark {
      border-color: #66bb6a;
      color: #66bb6a;
    }
  }
  
  &.theme-glassmorphic-red {
    border-color: #f54270;
    color: #f54270;
    
    &.dark {
      border-color: #f77;
      color: #f77;
    }
  }
}

.dialog-btn-primary {
  font-weight: 600;
  color: white;
  padding: 10px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
}
</style>

<style lang="scss">
.q-field--dark.q-field--error {
  .text-negative,
  .q-field__messages,
  .q-field__label,
  .q-field__control.text-negative {
    color: #e57373 !important;
  }
}
</style>
