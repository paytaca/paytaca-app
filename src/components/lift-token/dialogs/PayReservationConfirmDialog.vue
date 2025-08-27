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
        <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
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
import {
  getDarkModeClass,
  isNotDefaultTheme,
} from "src/utils/theme-darkmode-utils";
import {
  parseFiatCurrency,
  getAssetDenomination,
} from "src/utils/denomination-utils";
import { parseLiftToken } from "src/utils/engagementhub-utils/shared";
import {
  generateSignature,
  getAddressPath,
  processPurchaseApi,
} from "src/utils/engagementhub-utils/lift-token";
import { getChangeAddress, raiseNotifyError } from "src/utils/send-page-utils";
import { getWalletByNetwork } from "src/wallet/chipnet";
import { getWalletTokenAddress } from "src/utils/engagementhub-utils/rewards";
import { loadLibauthHdWallet } from "src/wallet"

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
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseFiatCurrency,
    parseLiftToken,
    getAssetDenomination,

    securityCheck(reset = () => {}) {
      this.isSliderLoading = true;

      this.$q
        .dialog({
          component: SecurityCheckDialog,
        })
        .onOk(() => this.processPurchase())
        .onCancel(() => {
          reset?.();
          this.isSliderLoading = false;
        });
    },
    async processPurchase() {
      this.isSliderLoading = true;
      this.processingMessage = this.$t("SendingPayment");

      // send paid bch to lift swap contract
      const bch = this.purchase.bch;
      const recipient = [
        {
          address: this.liftSwapContractAddress,
          amount: bch,
          tokenAmount: undefined,
        },
      ];
      const changeAddress = getChangeAddress("bch");
      const result = await getWalletByNetwork(this.wallet, "bch").sendBch(
        0, "", changeAddress, null, undefined, recipient
      );

      if (result.success) {
        this.processingMessage = this.$t("ProcessingPurchase");

        // get wif
        const addressPath = await getAddressPath(this.rsvp.bch_address)
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, false)
        const wif = libauthWallet.getPrivateKeyWifAt(addressPath);

        // record transaction
        const signature = await generateSignature(result.txid, wif);
        const satsWithFee = Math.floor(bch * 10 ** 8); // compute p2pkh

        const tokenAddress = await getWalletTokenAddress();

        const data = {
          purchased_amount_usd: this.purchase.usd,
          purchased_amount_tkn: this.purchase.tkn,
          purchased_amount_sats: satsWithFee,

          current_date: new Date().toISOString(),
          tx_id: result.txid,

          buyer_sig: signature,
          buyer_token_address: tokenAddress,
          // bch address used for this transaction, can be or
          // not be the bch address used for the reservation
          buyer_tx_address: this.$store.getters["global/getAddress"]("bch"),

          reservation: this.rsvp.id,
          partial_purchase: this.rsvp.reservation_partial_purchase?.id || -1,
          
          message_timestamp: this.messageTimestamp
        };

        const isSuccessful = await processPurchaseApi(data);

        if (isSuccessful) {
          this.processingMessage = "";
          this.$refs.confirmDialogRef.$emit("ok");
          this.$refs.confirmDialogRef.hide();
        } else raiseNotifyError(this.$t("PurchasePaymentError"));
      } else raiseNotifyError(this.$t("PaymentSendingError"));

      this.isSliderLoading = false;
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
