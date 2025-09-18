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
        <p class="amount-label">{{ amountSent }}</p>
        <template v-if="!isCashToken">
          <p class="amount-fiat-label">({{ fiatAmountSent }})</p>
        </template>
      </template>

      <div class="text-center q-mt-lg">
        <div class="text-grey">{{ $t('ReferenceId')}}</div>
        <div class="text-h4" style="letter-spacing: 6px;">{{ txid.substring(0, 6).toUpperCase() }}</div>
        <q-separator color="grey"/>
      </div>
      <div class="q-px-xs q-mt-sm text-subtitle1">
        <q-btn
          label="View details"
          class="q-my-sm button"
          @click="openSendSuccessDetailsDialog"
        /><br /><br />
        <div class="text-grey">{{ $t('TransactionId')}}</div>
        <p style="font-family: monospace;" :class="getDarkModeClass(darkMode)">{{ txid.slice(0, 8) }}...{{ txid.slice(-8) }}</p>
        <a
          class="button button-text-primary view-explorer-button"
          style="text-decoration: none;"
          :class="getDarkModeClass(darkMode)"
          :href="getExplorerLink(txid)"
          target="_blank"
        >
          {{ $t('ViewInExplorer') }}
        </a>
      </div>
      <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-lg">
        {{ formattedTxTimestamp }}
      </div>

      <div v-if="jpp && sendDataMultiple[0]?.paymentAckMemo !== undefined" class="row justify-center">
        <div
          class="text-left q-my-sm rounded-borders q-px-md q-py-sm text-subtitle1 memo-container"
          :class="getDarkModeClass(darkMode, 'text-white', '')"
        >
          <span :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')">{{ $t('Memo') }}:</span>
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
  parseFiatCurrency,
  parseAssetDenomination
} from 'src/utils/denomination-utils'

import SendSuccessDetailsDialog from 'src/components/send-page/SendSuccessDetailsDialog.vue'

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

  data () {
    return {
      amountSent: '',
      fiatAmountSent: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    transactionBreakdownData () {
      if (this.jpp?.parsed?.outputs !== undefined) {
        return this.jpp.parsed.outputs.map(value => {
          const amount = parseAssetDenomination(this.denomination, { ...this.asset, balance: value.amount })
          const fiatAmount = this.parseFiatAmount(0, value.amount)

          return {
            address: value.address,
            amount: `${amount} (${fiatAmount})`
          }
        })
      } else {
        return this.sendDataMultiple.map(value => {
          const amount = parseAssetDenomination(this.denomination, { ...this.asset, balance: value.amount })
          const fiatAmount = this.parseFiatAmount(0, value.amount)
          const tokenAmount = this.isCashToken ? '' : ` (${fiatAmount})`

          return {
            address: value.recipientAddress,
            amount: this.isNFT ? this.name : `${amount}${tokenAmount}`
          }
        })
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

  mounted () {
    this.amountSent = parseAssetDenomination(this.denomination, { ...this.asset, balance: this.totalAmountSent })
    this.fiatAmountSent = this.parseFiatAmount(this.totalFiatAmountSent, this.totalAmountSent)
  },

  methods: {
    getDarkModeClass,

    getExplorerLink (txid) {
      return getExplorerLink(txid, this.isCashToken)
    },
    openSendSuccessDetailsDialog () {
      this.$q.dialog({
        component: SendSuccessDetailsDialog,
        componentProps: {
          isNFT: this.isNFT,
          isCashToken: this.isCashToken,
          totalSent: this.amountSent,
          totalFiatSent: this.fiatAmountSent,
          txid: this.txid,
          timestamp: this.formattedTxTimestamp,
          name: this.name,
          breakdownList: this.transactionBreakdownData
        }
      })
    },
    parseFiatAmount (origFiatAmount, origAmount) {
      let fiatAmount
      if (origFiatAmount > 0 && this.asset.id === 'bch') {
        fiatAmount = parseFiatCurrency(
          origFiatAmount, this.currentSendPageCurrency()
        )
      } else {
        fiatAmount = parseFiatCurrency(
          this.convertToFiatAmount(origAmount), this.currentSendPageCurrency()
        )
      }
      return fiatAmount
    }
  }
}
</script>

<style lang="scss">
  .sent-success-container {
    margin-top: -70px;

    .amount-label {
      font-size: 25px;
      margin-top: -10px;
    }
    .amount-fiat-label {
      font-size: 25px;
      margin-top: -15px;
    }
    .memo-container {
      min-width: 50vw;
      border: 1px solid grey;
      background-color: inherit;
    }
  }
</style>
