<template>
  <q-card
    v-if="inputExtras.merchantData"
    class="q-pa-sm q-mt-md q-mb-sm row items-center"
    :class="getDarkModeClass(darkMode)"
  >
    <q-avatar v-if="(inputExtras.merchantData.logoData || inputExtras.merchantData.logo)" size="36px" rounded>
      <q-img :src="inputExtras.merchantData.logoData || inputExtras.merchantData.logo" />
    </q-avatar>
    <span class="q-ml-sm text-subtitle1">{{ inputExtras.merchantData.name }}</span>
    <q-badge
      :color="inputExtras.merchantData.verified ? 'positive' : 'grey-6'"
      class="q-ml-sm"
      align="middle"
      transparent
    >
      <q-icon
        :name="inputExtras.merchantData.verified ? 'mdi-shield-check' : 'mdi-shield-off'"
        size="14px"
        class="q-mr-xs"
      />
      {{ inputExtras.merchantData.verified ? $t('VerifiedMerchant', {}, 'Verified') : $t('UnverifiedMerchant', {}, 'Unverified') }}
    </q-badge>
  </q-card>
  <div class="row">
    <div class="col q-mt-sm se recipient-input-qr">
      <q-input
        filled
        label-slot
        clearable
        clear-icon="close"
        :disabled="inputExtras.isBip21"
        :readonly="inputExtras.isBip21"
        v-model="recipientAddress"
        @focus="onInputFocus(index, '')"
        @blur="onEmptyRecipient"
        class="recipient-input"
        :error="emptyRecipient || inputExtras.incorrectAddress"
        :error-message="
          emptyRecipient
            ? $t('EmptyRecipient')
            : inputExtras.incorrectAddress
              ? $t(
                  'InvalidRecipient',
                  { walletType: walletType.toUpperCase() },
                  `Recipient should be a valid ${walletType.toUpperCase()} address`
                )
              : ''
        "
        :dark="darkMode"
        :key="[
          recipient.recipientAddress,
          recipient.fixedRecipientAddress,
          inputExtras.scannedRecipientAddress
        ]"
      >
        <template v-slot:label id="sub-btn"> 
          {{ $t('Recipient') }}
        </template>
        <template v-slot:append>
          <q-btn id="send-form-qr"
            round
            class="q-ml-xs btn-scan button text-white bg-grad"
            icon="mdi-qrcode"
            size="md"
            @click="onQRScannerClick(true), onInputFocus(index, '')"
          />
          <q-btn id="send-form-upload"
            round
            class="q-ml-sm btn-scan button text-white bg-grad"
            icon="upload"
            @click="onQRUploaderClick(), onInputFocus(index, '')"
          />
        </template>
      </q-input>
    </div>
  </div>
  <div
    v-if="inputExtras.isLegacyAddress"
    style="border: 2px solid orange;"
    class="q-mx-md q-mb-md q-pa-sm text-center text-body2 text-bow"
    :class="getDarkModeClass(darkMode)"
    v-html="$t('LegacyAddressWarning')"
  />
  <div
    v-if="inputExtras.isWalletAddress"
    style="border: 2px solid orange;"
    class="q-mx-md q-mb-md q-pa-sm text-center text-body2 text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    {{ $t('SameWalletAddressWarning') }}
  </div>
  <div class="col-12">
    <q-input
      v-if="assetIsFT && hasFTChange && hasFTChangeAddressOption && selectedChangeAddress"
      label-slot
      bottom-slots
      :model-value="convertCashAddress(selectedChangeAddress, isChipnet, true)"
      readonly
      filled
      dense
    >
      <template v-slot:label>
        {{ $t('SendTokenChangeTo') }}
      </template>
      <template v-slot:prepend>
        <q-btn dense flat icon="help" no-caps @click.stop="showWillSendChangeToHelp "/>
      </template>
      <template v-slot:append>
        <q-btn class="text-grad" flat @click.stop=openSelectChangeAddressDialog>
          <q-icon name="edit" class="text-grad"></q-icon>
        </q-btn>
      </template>
    </q-input>
  </div>
<template v-if="!sending">
  <div class="row" v-if="!isNFT">
    <div class="col q-mt-xs" style="position: relative;">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="amountFormatted"
        ref="amountInput"
        class="bch-input-field"
        @focus="onInputFocus(index, 'bch')"
        @keydown="onKeyboardInput"
        :label="cauldronEnabled ? $t('ReceiveAmount') : $t('Amount')"
        :dark="darkMode"
        :loading="computingMax"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded && !cauldronEnabled"
        :error-message="balanceExceeded && !cauldronEnabled ? $t('BalanceExceeded') : ''"
        :key="inputExtras.amountFormatted"
      >
        <template v-slot:append>
          {{ asset?.id === 'bch' ? selectedDenomination : (asset?.symbol || '') }}
          <DenominatorTextDropdown
            v-if="!recipient.fixedAmount"
            @on-selected-denomination="onSelectedDenomination"
            :selectedNetwork="asset?.symbol"
            :darkMode="darkMode"
            :theme="theme"
            :currentCountry="currentCountry"
          />
        </template>
      </q-input>
      <KeyboardTooltip v-if="activeKeyboardTip === 'bch'" :dark-mode="darkMode" :key="'bch-' + keyboardTipCounter" />
    </div>
  </div>

  <div class="row" v-if="!isNFT && asset?.id === 'bch'">
    <div class="col q-mt-xs" style="position: relative;">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="fiatFormatted"
        ref="fiatInput"
        class="fiat-input-field"
        @focus="onInputFocus(index, 'fiat')"
        @keydown="onKeyboardInput"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded && !cauldronEnabled"
        :error-message="balanceExceeded && !cauldronEnabled ? $t('BalanceExceeded') : ''"
        :label="cauldronEnabled ? $t('ReceiveAmount') : $t('Amount')"
        :dark="darkMode"
        :key="inputExtras.fiatFormatted"
      >
        <template v-slot:append>
          {{ String(currentSendPageCurrency()).toUpperCase() }}
        </template>
      </q-input>
      <KeyboardTooltip v-if="activeKeyboardTip === 'fiat'" :dark-mode="darkMode" :key="'fiat-' + keyboardTipCounter" />
    </div>
  </div>
  <template v-if="!isNFT && !cauldronEnabled">
    <div v-if="asset?.id?.startsWith?.('ct/')" class="q-mt-sm text-center">
      <div v-if="showAdvancedOptions">
        <p class="q-mb-xs text-caption text-weight-medium text-bow">
          {{ $t('NoTokenBalanceCauldronHint', { symbol: (asset?.symbol || '').toUpperCase() }, 'You have no {symbol} tokens, click below to auto-swap from BCH') }}
        </p>
        <q-btn
          no-caps
          :label="$t('SendUsingBchWithCauldron')"
          icon="img:cauldron-logo.svg"
          color="pt-primary1"
          padding="sm md"
          class="full-width q-my-sm"
          @click="toggleCauldron"
        />
        <q-btn
          v-if="addAnotherRecipient"
          no-caps
          icon="person_add"
          color="pt-primary1"
          padding="sm md"
          class="full-width q-my-sm"
          @click="addAnotherRecipient"
        >
          {{ $t('AddAnotherRecipient') }}
        </q-btn>
      </div>
      <q-btn
        no-caps
        flat
        dense
        color="pt-primary1"
        class="text-caption"
        @click="showAdvancedOptions = !showAdvancedOptions"
      >
        {{ showAdvancedOptions ? $t('HideAdvancedOptions', {}, 'Hide Advanced Options') : $t('ShowAdvancedOptions', {}, 'Show Advanced Options') }}
      </q-btn>
    </div>
    <div v-else-if="asset?.id === 'bch'" class="q-mt-sm text-center">
      <div v-if="showAdvancedOptions">
        <q-btn
          no-caps
          :label="$t('SendUsingTokensWithCauldron')"
          icon="img:cauldron-logo.svg"
          color="pt-primary1"
          padding="sm md"
          class="full-width q-my-sm"
          @click="toggleCauldron"
        />
        <q-btn
          v-if="addAnotherRecipient"
          no-caps
          icon="person_add"
          color="pt-primary1"
          padding="sm md"
          class="full-width q-my-sm"
          @click="addAnotherRecipient"
        >
          {{ $t('AddAnotherRecipient') }}
        </q-btn>
      </div>
      <q-btn
        no-caps
        flat
        dense
        color="pt-primary1"
        class="text-caption"
        @click="showAdvancedOptions = !showAdvancedOptions"
      >
        {{ showAdvancedOptions ? $t('HideAdvancedOptions', {}, 'Hide Advanced Options') : $t('ShowAdvancedOptions', {}, 'Show Advanced Options') }}
      </q-btn>
    </div>
    <div v-else class="q-mt-sm text-center">
      <div v-if="showAdvancedOptions">
        <q-btn
          v-if="addAnotherRecipient"
          no-caps
          icon="person_add"
          color="pt-primary1"
          padding="sm md"
          class="full-width q-my-sm"
          @click="addAnotherRecipient"
        >
          {{ $t('AddAnotherRecipient') }}
        </q-btn>
      </div>
      <q-btn
        no-caps
        flat
        dense
        color="pt-primary1"
        class="text-caption"
        @click="showAdvancedOptions = !showAdvancedOptions"
      >
        {{ showAdvancedOptions ? $t('HideAdvancedOptions', {}, 'Hide Advanced Options') : $t('ShowAdvancedOptions', {}, 'Show Advanced Options') }}
      </q-btn>
    </div>
  </template>
  <div v-else-if="!isNFT && cauldronEnabled" class="row items-start no-wrap q-mt-sm">
    <div class="full-width">
      <q-input
        ref="cauldronAmountInput"
        type="text"
        inputmode="none"
        filled
        :loading="calculatingCauldronTrade"
        readonly
        v-model="cauldronAmountFormatted"
        :label="$t('SpendAmount')"
        :dark="darkMode"
        :hint="cauldronStatusMessage"
        :error="Boolean(effectiveCauldronErrorMessage)"
        :error-message="effectiveCauldronErrorMessage"
      >
        <template v-slot:append>
          <q-btn
            size="lg"
            padding="none"
            flat
            no-caps
            :color="cauldronEnabled ? undefined : 'grey'"
            :label="assetIsBch ? (cauldronToken?.bcmr?.token?.symbol || $t('SelectToken')) : 'BCH'"
            @click="cauldronTokenDialog = assetIsBch"
          />
        </template>
      </q-input>
    </div>
    <q-btn
      flat
      size="md"
      icon="close"
      class="q-ml-xs q-my-sm"
      round
      @click="toggleCauldron"
    />
  </div>

  <div class="row" v-if="!isNFT && !recipient.fixedAmount" style="padding-bottom: 15px">
    <div class="col q-mt-md balance-max-container" :class="getDarkModeClass(darkMode)">
      <template v-if="currentWalletBalanceAsAsset?.id === 'bch' && asset?.id === 'bch'">
        <span v-bch-amount="{ denomination: selectedDenomination }">
        {{ parseAssetDenomination(selectedDenomination, currentWalletBalanceAsAsset) }}
      </span>
        {{ ` = ${parseFiatCurrency(
          convertToFiatAmount(currentWalletBalance, selectedAssetMarketPrice), currentSendPageCurrency())
        }` }}
      </template>
      <span v-else v-bch-amount="{ denomination: selectedDenomination }">
        {{ parseAssetDenomination(selectedDenomination, currentWalletBalanceAsAsset) }}
      </span>
      <q-btn
        flat
        dense
        no-caps
        v-if="!computingMax || !recipient.sending"
        class="max-button"
        color="pt-primary1"
        :class="getDarkModeClass(darkMode)"
        :label="$t('MAX')"
        @click="onInputFocus(index, ''), handleMaxClick()"
      />
    </div>
  </div>
</template>
<q-card
    class="row text-center justify-center q-pa-sm q-my-sm text-subtitle2 pt-card"
    :class="getDarkModeClass(darkMode)"
    v-if="inputExtras.cashbackData && inputExtras.cashbackData.cashback_amount > -1"
  >
    <span v-html="cashbackAmountText()"></span>
  </q-card>
  <TokenSelectDialog
    v-model="cauldronTokenDialog"
    @select-token="onCauldronTokenSelect"
  />
</template>

<script>

import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import ConfirmSetMax from 'src/pages/transaction/dialog/ConfirmSetMax.vue'
import TokenSelectDialog from 'src/components/cauldron/TokenSelectDialog.vue'
import { convertTokenAmount, convertCashAddress } from 'src/wallet/chipnet'
import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency,
  customNumberFormatting
} from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseCashbackMessage } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertToFiatAmount } from 'src/utils/send-page-utils'

import SelectChangeAddress from 'src/components/SelectChangeAddress.vue'
import KeyboardTooltip from 'src/components/KeyboardTooltip.vue'

export default {
  components: {
    KeyboardTooltip,
    DenominatorTextDropdown,
    TokenSelectDialog
  },

  props: {
    recipient: {
      type: Object,
      required: true
    },
    inputExtras: {
      type: Object,
      required: true
    },
    asset: {
      type: Object,
      required: true
    },
    index: { type: Number },
    showQrScanner: { type: Boolean },
    computingMax: { type: Boolean },
    calculatingCauldronTrade: Boolean,
    selectedAssetMarketPrice: { type: Number },
    isNFT: { type: Boolean },

    // Wallet balance is normalized (not in it's base units)
    currentWalletBalance: { type: Number },
    currentWalletBalanceAssetId: String,

    cauldronErrorMessage: String,
    cauldronStatusMessage: String,

    currentSendPageCurrency: { type: Function },
    setMaximumSendAmount: { type: Function },
    defaultSelectedFtChangeAddress: { type: String },
    walletType: { type: String },
    addAnotherRecipient: { type: Function, default: undefined },
    sending: { type: Boolean, default: false },
  },

  emits: [
    'on-qr-scanner-click',
    'on-input-focus',
    'on-recipient-input',
    'on-empty-recipient',
    'on-selected-denomination-change',
    'on-qr-uploader-click',
    'on-selected-change-address',
    'on-cauldron-toggle'
  ],

  data () {
    return {
      amount: '',
      fiatAmount: '',
      amountFormatted: '',
      fiatFormatted: '',
      balanceExceeded: false,
      emptyRecipient: false,
      selectedDenomination: 'BCH',
      changeAddresses: [],
      selectedChangeAddress: '',
      cauldronTokenDialog: false,
      cauldronToken: null,
      cauldronEnabled: false,
      showAdvancedOptions: false,
      cauldronAmount: '',
      cauldronAmountFormatted: '',
      activeKeyboardTip: null,
      keyboardTipTimer: null,
      keyboardTipCounter: 0,
      currentFocusedField: null,
    }
  },

  beforeUnmount () {
    clearTimeout(this.keyboardTipTimer)
  },

  beforeMount () {
    this.syncPropsData();
  },

  computed: {
    recipientAddress: {
      get () {
        return this.recipient.recipientAddress
      },
      set (value) {
        // We'll hope the event handler for this updates the this.recipient.recipientAddress
        this.$emit('on-recipient-input', value)
      }
    },
    defaultChangeAddress () {
      return this.$store.getters['global/getChangeAddress']('bch')
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    sendAmountMarketValue () {
      const parsedAmount = Number(this.amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    currentWalletBalanceAsAsset() {
      let asset = { ...this.asset };
      if (this.currentWalletBalanceAssetId || this.currentWalletBalanceAssetId !== this.asset?.id) {
        asset = { ...this.$store.getters['assets/getAsset'](this.currentWalletBalanceAssetId)[0] }
      }

      if (asset.id === 'bch') {
        asset.balance = this.currentWalletBalance;
      } else {
        // Although currentWalletBalance is assumed to always be in normalized version
        // In the codebase, asset balances are normalized for BCH and base units in non BCH assets
        // So we have to convert to base units here
        const decimals = parseInt(asset?.decimals) || 0;
        const balanceUnits = Number((this.currentWalletBalance * 10 ** decimals).toFixed(decimals));
        asset.balance = balanceUnits;
      }

      return asset;
    },
    assetIsBch () {
      return this.$props.asset?.id === 'bch';
    },
    assetIsFT () {
      return this.$props.asset?.id?.startsWith('ct/') && this.$props.asset?.balance > 0
    },
    walletAddresses () {
      return this.$store.getters['global/walletAddresses'] || []
    },
    connectedApps () {
      const distinct = (value, index, list) => {
        return list.findIndex((item) => item.address === value.address && item.app_url === value.app_url) === index
      }
      return this.$store.getters['global/walletConnectedApps']?.filter(distinct)
    },
    hasFTChangeAddressOption () {
      return this.connectedApps?.length > 0
    },
    hasFTChange () {
      const decimals = this.asset?.decimals || 0
      if (isNaN(this.amountFormatted)) return false
      if (Number(this.amountFormatted) <= 0) return false
      const scaledFtSendAmount = BigInt(Math.round(this.amountFormatted * Math.pow(10, decimals)))
      const scaledFtCurrentBalance = BigInt(Math.round(this.currentWalletBalance * Math.pow(10, decimals)))
      const ftChangeAmount = scaledFtCurrentBalance - scaledFtSendAmount
      return ftChangeAmount > 0
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    effectiveCauldronErrorMessage() {
        // :error="balanceExceeded && cauldronEnabled"
        // :error-message="balanceExceeded && cauldronEnabled ? $t('BalanceExceeded') : ''"
      if (this.balanceExceeded && this.cauldronEnabled) {
        return this.$t('BalanceExceeded')
      }

      return this.cauldronErrorMessage;
    }
  },

  methods: {
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    customNumberFormatting,
    shortenAddressForDisplay,
    convertCashAddress,
    convertTokenAmount,
    convertToFiatAmount,

    onQRScannerClick (value) {
      this.$emit('on-qr-scanner-click', value)
    },
    handleMaxClick () {
      this.$q.dialog({ component: ConfirmSetMax })
        .onOk(() => {
          this.setMaximumSendAmount()
        })
    },
    onKeyboardInput (e) {
      e.preventDefault()
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = this.currentFocusedField
      this.keyboardTipCounter++
      this.keyboardTipTimer = setTimeout(() => { this.activeKeyboardTip = null }, 10000)
    },
    onInputFocus (index, field) {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
      this.currentFocusedField = field
      this.$emit('on-input-focus', { index, field })
    },
    onSelectedDenomination (value) {
      this.selectedDenomination = value
      this.amountFormatted = this.customNumberFormatting(getAssetDenomination(value, this.amount || 0, true))

      this.$emit('on-selected-denomination-change', {
        denomination: this.selectedDenomination,
        amountFormatted: this.amountFormatted
      })
    },
    onEmptyRecipient () {
      this.emptyRecipient = this.recipientAddress === ''
      console.debug('onEmptyRecipient', { recipientAddress: this.recipientAddress, emptyRecipient: this.emptyRecipient })
      this.$emit('on-empty-recipient', this.emptyRecipient)
    },
    onQRUploaderClick () {
      this.$emit('on-qr-uploader-click')
    },
    cashbackAmountText () {
      const message = this.inputExtras.cashbackData.message
      const amountBch = this.inputExtras.cashbackData.cashback_amount
      const amountFiat = parseFiatCurrency(
        convertToFiatAmount(amountBch, this.selectedAssetMarketPrice),
        this.currentSendPageCurrency()
      )
      const merchantName = this.inputExtras.cashbackData.merchant_name

      return parseCashbackMessage(message, amountBch, amountFiat, merchantName)
    },
    openSelectChangeAddressDialog () {
      const vm = this
      this.$q.dialog({
        component: SelectChangeAddress,
        componentProps: {
          walletAddresses: vm.walletAddresses,
          connectedApps: vm.connectedApps,
          defaultChangeAddress: vm.defaultChangeAddress,
          defaultSelectedAddress: vm.selectedChangeAddress,
          darkMode: vm.darkMode
        },
        class: `pt-card text-bow ${vm.getDarkModeClass(vm.darkMode)}`
      }).onOk(selectedChangeAddress => {
        vm.selectedChangeAddress = selectedChangeAddress
        vm.$emit('on-selected-change-address', selectedChangeAddress)
      }).onCancel(() => {})
    },
    formatFtChangeAddressForDisplay (address) {
      return shortenAddressForDisplay(convertCashAddress(address, this.isChipnet))
    },
    showWillSendChangeToHelp () {
      this.$q.dialog({
        message: this.$t('SelectChangeAddressHelp'),
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        ok: {
          noCaps: true,
          label: this.$t('Ok'),
          color: 'brandblue',
          class: `button q-mr-md ${this.getDarkModeClass(this.darkMode)}`
        }
      })
    },
    toggleCauldron() {
      this.cauldronEnabled = !this.cauldronEnabled;
      this.emitCauldronToggle();

      if (this.cauldronEnabled && !this.cauldronToken && this.assetIsBch) this.cauldronTokenDialog = true

      // When enabling cauldron for a CashToken, focus the amount input and show the custom keyboard
      if (this.cauldronEnabled && this.asset?.id?.startsWith?.('ct/')) {
        this.$nextTick(() => {
          if (this.$refs.amountInput) {
            this.$refs.amountInput.focus()
          }
        })
      }
    },
    onCauldronTokenSelect (token) {
      this.cauldronToken = token
      this.emitCauldronToggle();
    },
    emitCauldronToggle() {
      this.$emit('on-cauldron-toggle', {
        index: this.index,
        enable: this.cauldronEnabled,
        token: this.cauldronToken,
        amountFormatted: this.cauldronAmountFormatted,
      })
    },
    syncPropsData() {
      console.debug('Syncing Props data');

      // Syncing this.recipient.recipientAddress is handled somewhere else
      this.amount = this.recipient.amount
      this.amountFormatted = this.inputExtras.amountFormatted
      this.cauldronAmount = this.recipient.cauldronAmount;
      this.fiatFormatted = this.inputExtras.fiatFormatted

      this.balanceExceeded = this.inputExtras.balanceExceeded;
      this.emptyRecipient = this.inputExtras.emptyRecipient;

      if (this.inputExtras.isBip21) {
        this.selectedDenomination = 'BCH'
      } else {
        this.selectedDenomination = this.inputExtras.selectedDenomination
      }

      if (this.inputExtras.cauldron) {
        this.cauldronEnabled = this.inputExtras.cauldron.enable;
        this.cauldronAmountFormatted = this.inputExtras.cauldron.amountFormatted || ''

        if (this.inputExtras.cauldron.token) {
          this.cauldronToken = this.inputExtras.cauldron.token;
        }
      }
    }
  },

  watch: {
    recipient: {
      deep: true,
      handler() {
        this.syncPropsData();
      },
    },
    inputExtras: {
      deep: true,
      handler() {
        this.syncPropsData();
      },
    },
    amountFormatted () {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
    },
    fiatFormatted () {
      clearTimeout(this.keyboardTipTimer)
      this.activeKeyboardTip = null
    },
  }
}
</script>

<style lang="scss" scoped>
  .recipient-input-qr {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;

    .recipient-input {
      flex: 1;
    }
  }
  .balance-max-container {
    font-size: 18px;
    color: gray;

    &.light {
      color: #111c2c;
    }

    .max-button {
      float: right;
      min-height: unset;
      padding: 2px 8px;
      border: 1px solid;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
  }

</style>

<style lang="scss">
  .q-field--dark.q-field--error {
    .text-negative,
    .q-field__messages,
    .q-field__label,
    .q-field__control.text-negative {
      color: #e57373 !important
    }
  }
  .cashback-text {
    color: #ed5f59;
    font-weight: bold;

    &.amount {
      font-size: 18px;
      color: $green-7;
    }
  }

  .change-address-banner {
    background: inherit;
    position:relative;
    border-radius: 15px;
    font-family: monospace
  }

  .change-address-banner:after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgb(253,253,253, .023);
    border: 1px solid #80808038;
    border-radius: 15px;
  }

  .bch-input-field.q-field--focused .q-field__control,
  .fiat-input-field.q-field--focused .q-field__control {
    box-shadow: 0 0 0 2px var(--q-primary);
    border-radius: 4px;
    transition: box-shadow 0.2s ease;
  }
</style>
