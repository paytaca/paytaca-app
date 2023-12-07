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
        :disabled="disableRecipientInput || setAmountInFiat"
        :readonly="disableRecipientInput || setAmountInFiat"
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
      </q-input>
      <q-btn
        round
        size="lg"
        class="btn-scan button text-white bg-grad"
        icon="mdi-qrcode"
        @click="onQRScannerClick(true), onInputFocus(index)"
      />
    </div>
  </div>

  <template v-if="$store.state.global.online !== false">
    <div class="row" v-if="!isNFT">
      <div class="col q-mt-md">
        <q-input
          type="text"
          inputmode="none"
          filled
          v-model="amountFormatted"
          @focus="readonlyState(true), onInputFocus(index)"
          @blur="readonlyState(false)"
          :label="$t('Amount')"
          :dark="darkMode"
          :loading="computingMax"
          :disabled="setAmountInFiat"
          :readonly="setAmountInFiat"
          :error="balanceExceeded"
          :error-message="balanceExceeded ? $t('Balance exceeded') : ''"
          :key="inputExtras.amountFormatted"
        >
          <template v-slot:append>
            {{ asset.symbol === 'BCH' ? selectedDenomination : asset.symbol }}
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
      <div class="col q-mt-md">
        <q-input
          type="text"
          inputmode="none"
          filled
          v-model="sendAmountInFiat"
          @focus="readonlyState(true), onInputFocus(index)"
          @blur="readonlyState(false)"
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
      <!-- TODO adjust balance from previously-entered amounts -->
      {{ parseAssetDenomination(selectedDenomination, asset) }}
      <template v-if="asset.id === 'bch' && setAmountInFiat">
        {{ `= ${parseFiatCurrency(convertToFiatAmount(asset.balance), currentSendPageCurrency())}` }}
      </template>
      <a
        href="#"
        v-if="!computingMax || (setAmountInFiat && !recipient.sending)"
        class="max-button button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        @click.prevent="onInputFocus(index), handleMaxClick()"
      >
        {{ $t('MAX') }}
      </a>
    </div>
  </div>
</template>

<script>
import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'
import ConfirmSetMax from 'src/pages/transaction/dialog/ConfirmSetMax.vue'

import {
  parseAssetDenomination,
  getAssetDenomination,
  parseFiatCurrency
} from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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

    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function },
    setMaximumSendAmount: { type: Function }
  },

  emits: [
    'on-qr-scanner-click',
    'read-only-state',
    'on-input-focus',
    'on-balance-exceeded',
    'on-recipient-input',
    'on-empty-recipient'
  ],

  data () {
    return {
      // recipientAddress: '',
      amount: 0,
      amountFormatted: 0,
      sendAmountInFiat: 0,
      balanceExceeded: false,
      emptyRecipient: false,
      selectedDenomination: 'BCH'
    }
  },

  mounted () {
    // this.recipientAddress = this.recipient.recipientAddress
    this.amount = this.recipient.amount
    this.amountFormatted = this.inputExtras.amountFormatted
    this.sendAmountInFiat = this.inputExtras.sendAmountInFiat
    this.selectedDenomination = this.denomination
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
    }
  },

  methods: {
    parseAssetDenomination,
    getAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
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
      this.amountFormatted = parseFloat(getAssetDenomination(value, this.amount || 0, true))
    },
    onEmptyRecipient () {
      this.emptyRecipient = this.recipientAddress === ''
      this.$emit('on-empty-recipient', this.emptyRecipient)
    }
  },

  watch: {
    amount: function (value) {
      // TODO adjust balance from previously-entered amounts
      this.balanceExceeded = value > this.asset.balance
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
      margin-right: 10px;
    }
  }
  .balance-max-container {
    font-size: 18px;
    color: gray;

    .max-button {
      float: right;
      text-decoration: none;
      color: #3b7bf6;
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
</style>
