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
  generateSignature,
  getAddressPath,
  processPurchaseApi,
} from "src/utils/engagementhub-utils/lift-token";
import { getChangeAddress, raiseNotifyError } from "src/utils/send-page-utils";
import { getWalletByNetwork } from "src/wallet/chipnet";
import { getWalletTokenAddress } from "src/utils/engagementhub-utils/rewards";
import { loadLibauthHdWallet, getMnemonic, Wallet } from "src/wallet"
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

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
    parseFiatCurrency,
    parseLiftToken,
    getAssetDenomination,
    async getBuyerAddress() {
      const addressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
      const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
      const address = await generateReceivingAddress({
        walletIndex: this.$store.getters['global/getWalletIndex'],
        derivationPath: getDerivationPathForWalletType('bch'),
        addressIndex: validAddressIndex,
        isChipnet: this.$store.getters['global/isChipnet']
      })
      if (!address) {
        throw new Error(this.$t('FailedToGenerateAddress') || 'Failed to generate address')
      }
      return address
    },
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
        if (!this.liftSwapContractAddress) {
          const message = this.$t('ContractAddressUnavailable', {}, 'Unable to resolve the contract address. Please try again later.')
          raiseNotifyError(message)
          return
        }

        const wallet = await this.ensureWallet().catch(error => {
          console.error('Failed to initialize wallet for purchase:', error)
          return null
        })
        if (!wallet) {
          const message = this.$t('WalletUnavailable', {}, 'Wallet is not ready. Please try again.')
          raiseNotifyError(message)
          return
        }

        if (this.purchase.bch <= 0 || Number.isNaN(this.purchase.bch)) {
          const message = this.$t('InvalidPurchaseAmount', {}, 'Purchase amount is not valid.')
          raiseNotifyError(message)
          return
        }
        // Note: Fees are handled automatically by watchtower library (deducted from change output).
        // estimatedNetworkFeeBch is used only for balance validation to ensure sufficient funds.
        // The 7th parameter is priceId (for BIP21 price tracking), not fee.
        // Get change address for BCH transaction
        const changeAddress = await getChangeAddress('bch')
        const result = await getWalletByNetwork(wallet, 'bch').sendBch(
          undefined,
          '',
          changeAddress,
          null,
          undefined,
          [
            {
              address: this.liftSwapContractAddress,
              amount: this.purchase.bch,
              tokenAmount: undefined
            }
          ],
          undefined // priceId - not used for this transaction
        )
        if (!result?.success || !result?.txid) {
          throw new Error(this.$t('PaymentSendingError', {}, 'Failed to send payment.'))
        }

        // Generate BCH address dynamically
        const addressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
        const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
        const buyerAddress = await generateReceivingAddress({
          walletIndex: this.$store.getters['global/getWalletIndex'],
          derivationPath: getDerivationPathForWalletType('bch'),
          addressIndex: validAddressIndex,
          isChipnet: this.$store.getters['global/isChipnet']
        })
        if (!buyerAddress) {
          throw new Error(this.$t('FailedToGenerateAddress') || 'Failed to generate address')
        }
        const addressPath = await getAddressPath(buyerAddress)
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, false)
        const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
        const signature = await generateSignature(result.txid, wif)
        const satsWithFee = Math.floor(this.purchase.bch * 10 ** 8)
        const tokenAddress = await getWalletTokenAddress()
        const pubkeyHex = libauthWallet.getPubkeyAt(addressPath).toString('hex')

        const data = {
          purchased_amount_usd: this.purchase.usd,
          purchased_amount_tkn: this.purchase.tkn,
          purchased_amount_sats: satsWithFee,
          current_date: new Date().toISOString(),
          tx_id: result.txid,
          buyer_sig: signature,
          buyer_token_address: tokenAddress,
          buyer_tx_address: buyerAddress,
          reservation: this.rsvp.id,
          partial_purchase: this.rsvp.reservation_partial_purchase?.id || -1,
          sale_group: this.rsvp.sale_group,
          public_key: pubkeyHex,
          message_timestamp: this.messageTimestamp
        }

        const isSuccessful = await processPurchaseApi(data)
        if (!isSuccessful) {
          throw new Error(this.$t('PurchasePaymentError', {}, 'Failed to record the purchase.'))
        }

        if (isSuccessful) {
          this.processingMessage = "";
          this.$refs.confirmDialogRef.$emit("ok");
          this.$refs.confirmDialogRef.hide();
        } else raiseNotifyError(this.$t("PurchasePaymentError"));
      } catch (error) {
        console.error('BuyLiftDialog proceeds error:', error)
        raiseNotifyError(this.$t("PurchasePaymentError"));
        this.$emit('purchase', { success: false, errorMessage: error?.message || error?.toString() || this.$t("PurchasePaymentError") })
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
