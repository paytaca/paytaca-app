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
        @click="onQRScannerClick(true)"
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
          @focus="readonlyState(true)"
          @blur="readonlyState(false)"
          :label="$t('Amount')"
          :dark="darkMode"
          :loading="computingMax"
        >
          <template v-slot:append>
            {{ asset.symbol === 'BCH' ? selectedDenomination : asset.symbol }}
            <DenominatorTextDropdown
              @on-selected-denomination="onSelectedDenomination"
              :selectedNetwork="asset.symbol"
              :darkMode="darkMode"
              :theme="theme"
              :currentCountry="currentCountry"
            />
          </template>
        </q-input>
        <div class="text-body2 text-grey q-mt-sm q-px-sm">
          ~
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col q-mt-md">
        <q-input
          type="text"
          inputmode="none"
          filled
          v-model="sendAmountInFiat"
          @focus="readonlyState(true)"
          @blur="readonlyState(false)"
          :label="$t('Amount')"
          :dark="darkMode"
        >
          <template v-slot:append>
            {{ String(currentSendPageCurrency()).toUpperCase() }}
          </template>
        </q-input>
        <div class="text-body2 text-grey q-mt-sm q-px-sm">
          ~
        </div>
      </div>
    </div>
  </template>

  <div class="row" style="padding-bottom: 15px">
    <div class="col q-mt-md balance-max-container">
      {{ parseAssetDenomination(selectedDenomination, asset) }}
      <template v-if="asset.id === 'bch'">
        {{ `= ${parseFiatCurrency(convertToFiatAmount(asset.balance), currentSendPageCurrency())}` }}
      </template>
      <a
        href="#"
        class="max-button button button-text-primary"
        :class="getDarkModeClass(darkMode)"
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

    isNFT: { type: Function },
    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function }
  },

  emits: [
    'on-qr-scanner-click',
    'read-only-state'
  ],

  data () {
    return {
      recipientAddress: this.recipient.recipientAddress,
      amountFormatted: this.inputExtras.amountFormatted,
      sendAmountInFiat: this.inputExtras.sendAmountInFiat
    }
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
