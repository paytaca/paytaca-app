<template>
  <div class="row">
    <div class="col q-mt-sm se recipient-input-qr">
      <q-input
        filled
        label-slot
        class="recipient-input"
        v-model="recipientAddress"
        :dark="darkMode"
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
      <!-- adjust balance from previously-entered amounts -->
      {{ parseAssetDenomination(selectedDenomination, asset) }}
      <template v-if="asset.id === 'bch' && setAmountInFiat">
        {{ `= ${parseFiatCurrency(convertToFiatAmount(asset.balance), currentSendPageCurrency())}` }}
      </template>
      <a
        href="#"
        v-if="!computingMax || (setAmountInFiat && !recipient.sending)"
        class="max-button button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        @click.prevent="onInputFocus(index), setMaximumSendAmount()"
      >
        {{ $t('MAX') }}
      </a>
    </div>
  </div>
</template>

<script>
import DenominatorTextDropdown from 'src/components/DenominatorTextDropdown.vue'

import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
    selectedDenomination: {
      type: String,
      required: true
    },
    index: { type: Number },
    showQrScanner: { type: Boolean },
    computingMax: { type: Boolean },
    setAmountInFiat: { type: Boolean },
    sendAmountMarketValue: { type: Number },

    isNFT: { type: Function },
    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function },
    setMaximumSendAmount: { type: Function }
  },

  emits: [
    'on-qr-scanner-click',
    'read-only-state',
    'on-input-focus'
  ],

  data () {
    return {
      recipientAddress: '',
      amount: 0,
      amountFormatted: 0,
      sendAmountInFiat: 0,
      balanceExceeded: false
    }
  },

  mounted () {
    this.recipientAddress = this.recipient.recipientAddress
    this.amount = this.recipient.amount
    this.amountFormatted = this.inputExtras.amountFormatted
    this.sendAmountInFiat = this.inputExtras.sendAmountInFiat
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    }
  },

  methods: {
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    onQRScannerClick (value) {
      this.$emit('on-qr-scanner-click', value)
    },
    readonlyState (value) {
      this.$emit('read-only-state', value)
    },
    onInputFocus (value) {
      this.$emit('on-input-focus', value)
    }
  },

  watch: {
    amount: function (value) {
      // adjust balance from previously-entered amounts
      this.balanceExceeded = value > this.asset.balance
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
