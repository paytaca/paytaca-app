<template>
  <div class="row">
    <div class="col q-mt-sm se recipient-input-qr">
      <q-input
        filled
        label-slot
        v-model="recipientAddress"
        @focus="onInputFocus(index)"
        @blur="onEmptyRecipient"
        class="recipient-input"
        :disabled="disableRecipientInput"
        :readonly="disableRecipientInput"
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
            class="btn-scan button text-white bg-grad"
            icon="mdi-qrcode"
            size="md"
            @click="onQRScannerClick(true), onInputFocus(index)"
          />
          <q-btn
            round
            class="q-ml-sm btn-scan button text-white bg-grad"
            icon="upload"
            @click="onQRUploaderClick(), onInputFocus(index)"
          />    
        </template>
      </q-input>
      
      <!-- <q-btn
        round
        size="lg"
        class="btn-scan button text-white bg-grad"
        style="margin-bottom: 20px;"
        icon="mdi-qrcode"
        @click="onQRScannerClick(true), onInputFocus(index)"
      />
      <q-btn
        round
        size="lg"
        class="q-ml-sm btn-scan button text-white bg-grad"
        style="margin-bottom: 20px;"
        icon="upload"
        @click="onQRUploaderClick(), onInputFocus(index)"
      /> -->
    </div>
  </div>
  <div
    v-if="isLegacyAddress"
    style="border: 2px solid orange;"
    class="q-mx-md q-mb-md q-pa-sm text-center text-body2 text-bow"
    :class="getDarkModeClass(darkMode)"
    v-html="$t('LegacyAddressWarning')"
  />
  <div class="col-12">
    <q-input 
        v-if="assetIsFT && hasFTChange && hasFTChangeAddressOption && selectedChangeAddress" 
        label-slot
        bottom-slots
        :model-value="convertCashAddress(selectedChangeAddress, isChipnet, true)" 
        readonly
        filled
        dense>
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
  <template v-if="$store.state.global.online !== false">
    <div class="row" v-if="!isNFT">
      <div class="col q-mt-xs">
        <q-input
          type="text"
          inputmode="none"
          filled
          v-model="amountFormatted"
          ref="amountInput"
          @focus="readonlyState(true), onInputFocus(index)"
          @blur="readonlyState(false)"
          :label="$t('Amount')"
          :dark="darkMode"
          :loading="computingMax"
          :disabled="setAmountInFiat || recipient.fixedAmount || inputExtras.isBip21"
          :readonly="setAmountInFiat || recipient.fixedAmount || inputExtras.isBip21"
          :error="balanceExceeded"
          :error-message="balanceExceeded ? $t('BalanceExceeded') : ''"
          :key="inputExtras.amountFormatted"
        >
          <template v-slot:append>
            {{ asset.symbol }}
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
        <div
          v-if="sendAmountMarketValue && !setAmountInFiat"
          class="text-body2 text-grey q-mt-sm q-px-sm"
        >
          {{ `~ ${parseFiatCurrency(sendAmountMarketValue, currentSendPageCurrency())}` }}
        </div>
      </div>
    </div>

    <div class="row" v-if="!isNFT && setAmountInFiat && asset.id === 'bch'">
      <div class="col q-mt-xs">
        <q-input
          type="text"
          inputmode="none"
          filled
          ref="fiatInput"
          v-model="sendAmountInFiat"
          @focus="readonlyState(true), onInputFocus(index)"
          @blur="readonlyState(false)"
          :disabled="inputExtras.isBip21"
          :readonly="inputExtras.isBip21"
          :label="$t('Amount')"
          :dark="darkMode"
          :key="inputExtras.sendAmountInFiat"
        >
          <template v-slot:append>
            {{ String(currentSendPageCurrency()).toUpperCase() }}
          </template>
        </q-input>
        <div
          v-if="sendAmountMarketValue && !setAmountInFiat"
          class="text-body2 text-grey q-mt-sm q-px-sm"
        >
          {{ `~ ${parseFiatCurrency(sendAmountMarketValue, currentSendPageCurrency())}` }}
        </div>
      </div>
    </div>
  </template>

  <div class="row" v-if="!isNFT && !recipient.fixedAmount" style="padding-bottom: 15px">
    <div class="col q-mt-md balance-max-container">
      <span v-if="asset.id === 'bch'">
        {{ parseAssetDenomination(selectedDenomination, {
          ...asset,
          balance: currentWalletBalance
        }) }}
      </span>
      <span v-else>
        {{ convertTokenAmount(asset.balance, asset.decimals, decimalPlaces=asset.decimals) }} {{ asset.symbol }}
      </span>
      <template v-if="asset.id === 'bch' && setAmountInFiat">
        {{ `= ${parseFiatCurrency(convertToFiatAmount(currentWalletBalance), currentSendPageCurrency())}` }}
      </template>
      <!-- <a
        href="#"
        v-if="!computingMax || (setAmountInFiat && !recipient.sending)"
        class="max-button button button-text-primary text-grad"
        :class="getDarkModeClass(darkMode)"
        @click.prevent="onInputFocus(index), handleMaxClick()"
      >
        {{ $t('MAX') }}
      </a> -->
      <a
        href="#"
        v-if="!computingMax || (setAmountInFiat && !recipient.sending)"
        class="max-button text-grad"
        :class="getDarkModeClass(darkMode)"
        @click.prevent="onInputFocus(index), handleMaxClick()"
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
    <span
      v-html="cashbackAmountText()"
    ></span>
  </q-card>
</template>

<script>

import { copyToClipboard } from 'quasar'
import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import ConfirmSetMax from 'src/pages/transaction/dialog/ConfirmSetMax.vue'
import { convertTokenAmount } from 'src/wallet/chipnet'
import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency,
  customNumberFormatting
} from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseCashbackMessage } from 'src/utils/engagementhub-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertCashAddress } from 'src/wallet/chipnet';
import SelectChangeAddress from './SelectChangeAddress.vue'

export default {
  components: {
    DenominatorTextDropdown,
    // eslint-disable-next-line vue/no-unused-components
    ConfirmSetMax
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
    setAmountInFiat: { type: Boolean },
    selectedAssetMarketPrice: { type: Number },
    isNFT: { type: Boolean },
    currentWalletBalance: { type: Number },

    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function },
    setMaximumSendAmount: { type: Function },
    defaultSelectedFtChangeAddress: { type: String}
  },

  emits: [
    'on-qr-scanner-click',
    'read-only-state',
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
      isLegacyAddress: false,
      changeAddresses: [],
      selectedChangeAddress: ''
    }
  },

  mounted () {
    this.amount = this.recipient.amount
    this.amountFormatted = this.inputExtras.amountFormatted
    this.sendAmountInFiat = this.inputExtras.sendAmountInFiat
    this.isLegacyAddress = this.inputExtras.isLegacyAddress
    if (this.inputExtras.isBip21) {
      this.selectedDenomination = 'BCH'
    } else {
      this.selectedDenomination = this.inputExtras.selectedDenomination
    }
    this.selectedChangeAddress = this.defaultSelectedFtChangeAddress
    // this.selectLastAddressConnectedToAppAsDefaultChangeAddress()
  },

  computed: {
    recipientAddress: {
      get () {
        return this.recipient.recipientAddress
      },
      set (value) {
        this.emptyRecipient = value === ''
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
    disableRecipientInput () {
      return this.recipient.fixedRecipientAddress || this.inputExtras.scannedRecipientAddress
    },
    sendAmountMarketValue () {
      const parsedAmount = Number(this.amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    assetIsFT() {
      return this.$props.asset?.id?.startsWith('ct/') && this.$props.asset?.balance > 0
    },
    walletAddresses() {
      return this.$store.getters['global/walletAddresses'] || []
    },
    connectedApps() {
      const distinct = (value, index, list) => {
        return list.findIndex((item) => item.address === value.address && item.app_url === value.app_url) == index
      }
      return this.$store.getters['global/walletConnectedApps']?.filter(distinct)
    },
    hasFTChangeAddressOption() {
      return this.connectedApps?.length > 0
    },
    hasFTChange () {
      const decimals = this.asset?.decimals || 0
      if (isNaN(this.amountFormatted)) return false
      if (Number(this.amountFormatted) <= 0) return false
      let scaledFtSendAmount = BigInt(Math.round(this.amountFormatted * Math.pow(10, decimals)));
      let scaledFtCurrentBalance = BigInt(Math.round(this.currentWalletBalance * Math.pow(10, decimals)));
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
    onQRScannerClick (value) {
      this.$emit('on-qr-scanner-click', value)
    },
    readonlyState (value) {
      this.$emit('read-only-state', value)
    },
    handleMaxClick () {
      this.$q.dialog({ component: ConfirmSetMax })
        .onOk(() => {
          this.setMaximumSendAmount()
        })
    },
    onInputFocus (value) {
      this.$emit('on-input-focus', value)
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
        this.convertToFiatAmount(this.inputExtras.cashbackData.cashback_amount),
        this.currentSendPageCurrency()
      )
      const merchantName = this.inputExtras.cashbackData.merchant_name

      return parseCashbackMessage(message, amountBch, amountFiat, merchantName)
    },
    openSelectChangeAddressDialog() {
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
        class:`pt-card text-bow ${vm.getDarkModeClass(vm.darkMode)}`
      }).onOk(selectedChangeAddress => {
        vm.selectedChangeAddress = selectedChangeAddress
        vm.$emit('on-selected-change-address', selectedChangeAddress)
      }).onCancel(() => {})
    },
    formatFtChangeAddressForDisplay (address) {
      return shortenAddressForDisplay(convertCashAddress(address, this.isChipnet))
    },
    showWillSendChangeToHelp() {
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
      }
      if (this.asset.id === 'bch') {
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
      // margin-right: 10px;
    }
  }
  .balance-max-container {
    font-size: 18px;
    color: gray;

    .max-button {
      float: right;
      text-decoration: none;
      // color: #3b7bf6;
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
