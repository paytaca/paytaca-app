<template>
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
        :error="emptyRecipient"
        :error-message="emptyRecipient ? $t('EmptyRecipient') : ''"
        :dark="darkMode"
        :key="[
          recipient.recipientAddress,
          recipient.fixedRecipientAddress,
          inputExtras.scannedRecipientAddress
        ]"
      >
        <template v-slot:label>
          {{ $t('Recipient') }}
        </template>
        <template v-slot:append>
          <q-btn
            round
            class="q-ml-xs btn-scan button text-white bg-grad"
            icon="mdi-qrcode"
            size="md"
            @click="onQRScannerClick(true), onInputFocus(index, '')"
          />
          <q-btn
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
  <div class="row" v-if="!isNFT">
    <div class="col q-mt-xs">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="amountFormatted"
        ref="amountInput"
        class="bch-input-field"
        @focus="onInputFocus(index, 'bch')"
        :label="$t('Amount')"
        :dark="darkMode"
        :loading="computingMax"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded"
        :error-message="balanceExceeded ? $t('BalanceExceeded') : ''"
        :key="inputExtras.amountFormatted"
      >
        <template v-slot:append>
          {{ asset.id === 'bch' ? selectedDenomination : asset.symbol }}
          <DenominatorTextDropdown
            v-if="!recipient.fixedAmount"
            @on-selected-denomination="onSelectedDenomination"
            :selectedNetwork="asset.symbol"
            :darkMode="darkMode"
            :theme="theme"
            :currentCountry="currentCountry"
          />
        </template>
      </q-input>
    </div>
  </div>

  <div class="row" v-if="!isNFT && asset.id === 'bch'">
    <div class="col q-mt-xs">
      <q-input
        type="text"
        inputmode="none"
        filled
        v-model="sendAmountInFiat"
        ref="fiatInput"
        class="fiat-input-field"
        @focus="onInputFocus(index, 'fiat')"
        :disabled="recipient.fixedAmount || inputExtras.isBip21"
        :readonly="recipient.fixedAmount || inputExtras.isBip21"
        :error="balanceExceeded"
        :error-message="balanceExceeded ? $t('BalanceExceeded') : ''"
        :label="$t('Amount')"
        :dark="darkMode"
        :key="inputExtras.sendAmountInFiat"
      >
        <template v-slot:append>
          {{ String(currentSendPageCurrency()).toUpperCase() }}
        </template>
      </q-input>
    </div>
  </div>

  <div class="row" v-if="!isNFT && !recipient.fixedAmount" style="padding-bottom: 15px">
    <div class="col q-mt-md balance-max-container" :class="getDarkModeClass(darkMode)">
      <span v-if="asset.id === 'bch'">
        {{ parseAssetDenomination(selectedDenomination, {
          ...asset,
          balance: currentWalletBalance
        }) }}
      </span>
      <span v-else>
        {{ currentWalletBalance }} {{ asset.symbol }}
      </span>
      <template v-if="asset.id === 'bch'">
        {{ ` = ${parseFiatCurrency(
          convertToFiatAmount(currentWalletBalance, selectedAssetMarketPrice), currentSendPageCurrency())
        }` }}
      </template>
      <a
        href="#"
        v-if="!computingMax || !recipient.sending"
        class="max-button text-grad"
        :class="getDarkModeClass(darkMode)"
        @click.prevent="onInputFocus(index, ''), handleMaxClick()"
      >
        {{ $t('MAX') }}
      </a>
    </div>
  </div>
  <q-card
    class="row text-center justify-center q-pa-sm q-my-sm text-subtitle2 pt-card"
    :class="getDarkModeClass(darkMode)"
    v-if="inputExtras.cashbackData && inputExtras.cashbackData.cashback_amount > -1"
  >
    <span v-html="cashbackAmountText()"></span>
  </q-card>
</template>

<script>

import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import ConfirmSetMax from 'src/pages/transaction/dialog/ConfirmSetMax.vue'
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

export default {
  components: {
    DenominatorTextDropdown
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
    selectedAssetMarketPrice: { type: Number },
    isNFT: { type: Boolean },
    currentWalletBalance: { type: Number },

    currentSendPageCurrency: { type: Function },
    setMaximumSendAmount: { type: Function },
    defaultSelectedFtChangeAddress: { type: String }
  },

  emits: [
    'on-qr-scanner-click',
    'on-input-focus',
    'on-balance-exceeded',
    'on-recipient-input',
    'on-empty-recipient',
    'on-selected-denomination-change',
    'on-qr-uploader-click',
    'on-selected-change-address'
  ],

  data () {
    return {
      amount: 0,
      amountFormatted: 0,
      sendAmountInFiat: 0,
      balanceExceeded: false,
      emptyRecipient: false,
      selectedDenomination: 'BCH',
      changeAddresses: [],
      selectedChangeAddress: ''
    }
  },

  mounted () {
    this.amount = this.recipient.amount
    this.amountFormatted = this.inputExtras.amountFormatted
    this.sendAmountInFiat = this.inputExtras.sendAmountInFiat
    if (this.inputExtras.isBip21) {
      this.selectedDenomination = 'BCH'
    } else {
      this.selectedDenomination = this.inputExtras.selectedDenomination
    }
    this.selectedChangeAddress = this.defaultSelectedFtChangeAddress
  },

  computed: {
    recipientAddress: {
      get () {
        return this.recipient.recipientAddress
      },
      set (value) {
        this.emptyRecipient = !!value
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
    onInputFocus (index, field) {
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
      this.$emit('on-empty-recipient', this.emptyRecipient)
    },
    onQRUploaderClick () {
      this.$emit('on-qr-uploader-click')
    },
    cashbackAmountText () {
      const message = this.inputExtras.cashbackData.message
      const amountBch = this.inputExtras.cashbackData.cashback_amount
      const amountFiat = parseFiatCurrency(
        convertToFiatAmount(this.inputExtras.cashbackData.cashback_amount),
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
    }
  },

  watch: {
    amount: function (value) {
      if (this.asset.id.startsWith('ct/')) {
        this.balanceExceeded = value > (this.asset.balance / (10 ** this.asset.decimals))
      } else if (this.asset.id === 'bch') {
        this.balanceExceeded = parseFloat(this.currentWalletBalance) < 0
      }

      this.$emit('on-balance-exceeded', this.balanceExceeded)
    }
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
      text-decoration: none;
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
</style>
