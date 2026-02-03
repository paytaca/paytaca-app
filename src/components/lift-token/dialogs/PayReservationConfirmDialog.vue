<template>
  <q-dialog
    persistent
    seamless
    ref="confirmDialogRef"
    position="bottom"
    class="br-15 no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
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
        <span class="col-12 q-mb-sm">{{ $t("Pay") }}</span>

        <span class="col-12 text-h5 text-bold">
          {{ getAssetDenomination(denomination, purchase.bch) }}
        </span>
        <div class="col-12 text-subtitle2">
          <span> + ~{{ getAssetDenomination(denomination, 0.00001) }} </span>
          <q-icon name="info" size="1em" />
          <q-menu
            touch-position
            class="pt-card text-bow q-py-sm q-px-md br-15"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="row items-center q-gutter-sm">
              <div class="q-space">{{ $t("NetworkFee") }}</div>
            </div>
          </q-menu>
        </div>
        <span class="col-12 q-mt-xs text-subtitle1">
          ({{ parseFiatCurrency(purchase.usd, "usd") }})
        </span>

        <span class="col-12 q-my-sm text-grey">{{ $t("For") }}</span>
        <span class="col-12 text-h5 text-bold">
          {{ parseLiftToken(purchase.tkn) }}
        </span>
      </div>

      <drag-slide
        v-if="!isSliderLoading"
        disable-absolute-bottom
        @swiped="securityCheck"
      />
      <div v-if="isSliderLoading" class="row flex-center">
        <progress-loader />
        <span
          v-if="processingMessage !== ''"
          class="col-12 text-center text-h6 q-mb-sm"
        >
          {{ processingMessage }} ...
        </span>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import {
  getDarkModeClass,
} from "src/utils/theme-darkmode-utils";
import {
  parseFiatCurrency,
  getAssetDenomination,
} from "src/utils/denomination-utils";
import { parseLiftToken } from "src/utils/engagementhub-utils/shared";
import {
  executePurchaseFlow
} from "src/utils/engagementhub-utils/lift-token";
import { raiseNotifyError } from "src/utils/send-page-utils";
import { getMnemonic, Wallet } from "src/wallet"

import DragSlide from "src/components/drag-slide.vue";
import SecurityCheckDialog from "src/components/SecurityCheckDialog.vue";
import ProgressLoader from "src/components/ProgressLoader.vue";

export default {
  name: "PayReservationDialog",

  props: {
    purchase: { type: Object, default: null },
    rsvp: { type: Object, default: null },
    wallet: { type: Object, default: null },
    liftSwapContractAddress: { type: String, default: null },
    messageTimestamp: { type: Number, default: 0 }
  },

  components: {
    DragSlide,
    ProgressLoader,
  },

  data() {
    return {
      isSliderLoading: false,
      processingMessage: "",
    };
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    theme() {
      return this.$store.getters["global/theme"];
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    walletBalance() {
      const asset = this.$store.getters['assets/getAssets'][0]
      return asset?.spendable || 0
    }
  },

  methods: {
    getDarkModeClass,
    parseFiatCurrency,
    parseLiftToken,
    getAssetDenomination,
    securityCheck(reset = () => {}) {
      this.isSliderLoading = true;
      this.$q.dialog({ component: SecurityCheckDialog })
        .onOk(() => this.processPurchase())
        .onCancel(() => {
          reset?.();
          this.isSliderLoading = false;
        });
    },
    async ensureWallet() {
      if (this.wallet) return this.wallet
      const walletIndex = this.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new Wallet(mnemonic, 'BCH')
      return markRaw(wallet)
    },

    async processPurchase() {
      this.isSliderLoading = true;
      this.processingMessage = this.$t("SendingPayment");

      try {
        const wallet = await this.ensureWallet().catch(error => {
          console.error('Failed to initialize wallet for purchase:', error)
          return null
        })

        await executePurchaseFlow({
          purchase: this.purchase,
          liftSwapContractAddress: this.liftSwapContractAddress,
          saleGroup: this.rsvp.sale_group,
          messageTimestamp: this.messageTimestamp,
          wallet,
          walletBalance: this.walletBalance,
          reservationId: this.rsvp.id,
          partialPurchaseId: this.rsvp.reservation_partial_purchase?.id || -1,
          getStoreGetter: (path) => this.$store.getters[path]
        })

        this.processingMessage = "";
        this.$refs.confirmDialogRef.$emit("ok");
        this.$refs.confirmDialogRef.hide();
      } catch (error) {
        const message = this.$t(error?.message || 'PurchasePaymentError')
        console.error('PayReservationConfirmDialog purchase error:', message)
        raiseNotifyError(message, 5000);
      } finally {
        this.isSliderLoading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dim-text {
  color: #ed5f59;
  font-weight: 600;
}
</style>
