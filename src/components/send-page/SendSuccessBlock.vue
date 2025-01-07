<template>
  <div class="q-px-md text-center sent-success-container">
    <q-icon size="70px" name="check_circle" color="green-5" />
    <div
      class="text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '20px'}"
    >
      <p style="font-size: 22px;">{{ $t('SuccessfullySent') }}</p>
      <template v-if="isNFT">
        <p class="amount-label">{{ name }}</p>
      </template>
      <template v-else>
        <p class="amount-label">
          {{
            isCashToken
              ? totalAmountSent.toLocaleString('en-us', {maximumFractionDigits: asset.decimals})
              : customNumberFormatting(getAssetDenomination(denomination, totalAmountSent))
          }} {{ isCashToken ? asset.symbol : denomination }}
        </p>
        <template v-if="!isCashToken">
          <p v-if="totalFiatAmountSent > 0 && asset.id === 'bch'" class="amount-fiat-label">
            ({{ parseFiatCurrency(totalFiatAmountSent, currentSendPageCurrency()) }})
          </p>
          <p v-else class="amount-fiat-label">
            ({{ parseFiatCurrency(convertToFiatAmount(totalAmountSent), currentSendPageCurrency()) }})
          </p>
        </template>
      </template>

      <p class="to-label">{{ $t('To') }}</p>
      <template v-for="(recipient, index) in recipientAddresses.slice(0, 10)" v-bind:key="index">
        <div class="q-px-xs recipient-address">
          {{ recipient }}
        </div>
      </template>
      <strong v-if="recipientAddresses.length > 10">
        {{
          $t(
            "AndMoreAddresses",
            { addressCount: recipientAddresses.length - 10 },
            `and ${recipientAddresses.length - 10} more addresses`
          )
        }}
      </strong>
      <div class="text-center q-mt-lg">
        <div class="text-grey">{{ $t('ReferenceId')}}</div>
        <div class="text-h4" style="letter-spacing: 6px;">{{ txid.substring(0, 6).toUpperCase() }}</div>
        <q-separator color="grey"/>
      </div>
      <div class="q-px-xs tx-id">
        txid: {{ txid.slice(0, 8) }}<span style="font-size: 18px;">***</span>{{ txid.substr(txid.length - 8) }}<br>
        <a
          class="button button-text-primary view-explorer-button"
          :class="getDarkModeClass(darkMode)"
          :href="getExplorerLink(txid)" target="_blank"
        >
          {{ $t('ViewInExplorer') }}
        </a>
      </div>
      <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-sm">
        {{ formattedTxTimestamp }}
      </div>

      <div v-if="jpp && sendDataMultiple[0]?.paymentAckMemo !== undefined" class="row justify-center">
        <div
          class="text-left q-my-sm rounded-borders q-px-md q-py-sm text-subtitle1 memo-container"
          :class="getDarkModeClass(darkMode, 'text-white', '')"
        >
          <span :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')">Memo:</span>
          {{ sendDataMultiple[0].paymentAckMemo }}
        </div>
      </div>
      <q-item
        v-if="jpp?.paymentManuallyVerified"
        class="text-left bg-warning rounded-borders text-black text-subtitle1 q-mt-sm"
      >
        <q-item-section avatar style="min-width: unset;">
          <q-icon name="warning" size="1.5em"/>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('PaymentNotYetAcknowledged') }}</q-item-label>
        </q-item-section>
      </q-item>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import {
  customNumberFormatting,
  parseFiatCurrency,
  getAssetDenomination
} from 'src/utils/denomination-utils'

export default {
  name: 'SendSuccessBlock',

  props: {
    isNFT: { type: Boolean, default: false },
    isCashToken: { type: Boolean, default: false },

    name: { type: String, default: '' },
    txid: { type: String, default: '' },
    denomination: { type: String, default: 'BCH' },

    totalFiatAmountSent: { type: [String, Number] },
    totalAmountSent: { type: Number, default: 0 },
    txTimestamp: { type: Number, default: 0 },

    asset: { type: Object, default: Object },
    jpp: { type: Object, default: Object },
    sendDataMultiple: { type: Object, default: Object },

    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    recipientAddresses () {
      if (this.jpp?.parsed?.outputs !== undefined) {
        return this.jpp.parsed.outputs.map(value => value.address)
      } else {
        return this.sendDataMultiple.map(value => value.recipientAddress)
      }
    },
    formattedTxTimestamp () {
      const dateObj = new Date(this.txTimestamp)
      if (!dateObj.getTime()) return ''

      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        dateStyle: 'medium',
        timeStyle: 'full'
      }).format(dateObj)
    }
  },

  methods: {
    getDarkModeClass,
    customNumberFormatting,
    parseFiatCurrency,
    getAssetDenomination,

    getExplorerLink (txid) {
      return getExplorerLink(txid, this.isCashToken)
    }
  }
}
</script>
