<template>
  <div id="transaction">
    <q-dialog ref="dialog" @hide="hide" persistent seamless>
      <q-card
        ref="card"
        v-if="transaction && transaction.asset"
        class="pp-text br-15 pt-card"
        :class="getDarkModeClass(darkMode)"
      >
        <div style="right: 10px; top: 10px; position: absolute; z-index: 100;">
          <q-btn icon="close" flat round dense v-close-popup class="close-button" :color="darkMode ? 'grey' : ''" />
        </div>
        <div class="text-h6 text-uppercase" :class="darkMode ? 'text-white' : 'pp-text'" style="text-align: center !important;">
          {{ actionMap[transaction.record_type] }}
        </div>
        <div class="text-h6" style="text-align: center !important; margin: 10px 0;">
          <q-icon v-if="transaction.record_type === 'incoming'" name="arrow_downward" class="button record-type-icon"></q-icon>
          <q-icon v-if="transaction.record_type === 'outgoing'" name="arrow_upward" class="button record-type-icon"></q-icon>
        </div>
        <q-card-section class="amount q-pb-none">
          <q-item class="q-px-none">
            <q-item-section side top>
              <img :src="transaction.asset.logo || fallbackAssetLogo" height="30" />
            </q-item-section>
            <q-item-section :class="darkMode ? 'text-white' : 'pp-text'">
              <q-item-label>
                <template v-if="transaction.record_type === 'outgoing'">
                  {{ `-${parseAssetDenomination(denomination, transaction.asset)}` }}
                </template>
                <template v-else>
                  {{ `${parseAssetDenomination(denomination, transaction.asset)}` }}
                </template>
              </q-item-label>
              <q-item-label v-if="transactionAmountMarketValue" class="row items-center text-caption">
                <template v-if="transaction.record_type === 'outgoing'">
                  {{ `-${parseFiatCurrency(transactionAmountMarketValue, selectedMarketCurrency)}` }}
                </template>
                <template v-else>
                  {{ `${parseFiatCurrency(transactionAmountMarketValue, selectedMarketCurrency)}` }}
                </template>
                <q-icon v-if="historicalMarketPrice" name="info" class="q-ml-sm" size="1.5em">
                  <q-popup-proxy v-if="historicalMarketPrice" :breakpoint="0">
                    <div class="q-px-md q-py-sm pt-label text-caption" :class="getDarkModeClass(darkMode, '', 'text-black')">
                      {{ $t('AssetValueNote') }}
                    </div>
                  </q-popup-proxy>
                </q-icon>
              </q-item-label>
              <div v-if="!transaction.asset.id.startsWith('bch')">
                <TokenTypeBadge :assetId="transaction.asset.id" abbreviate />
              </div>
            </q-item-section>
          </q-item>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-list class="list">
            <q-item clickable v-ripple @click="copyToClipboard(formatDate(transaction.tx_timestamp || transaction.date_created))">
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('Date') }}</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">
                  <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
                  <template v-else>{{ formatDate(transaction.date_created) }}</template>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="cachedPaymentOTP" clickable v-ripple @click="copyToClipboard(cachedPaymentOTP)">
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('PaymentOTP', {}, 'Payment OTP') }}</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">
                  {{ cachedPaymentOTP }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="copyToClipboard(isSep20Tx ? transaction.hash : transaction.txid)" style="overflow-wrap: anywhere;">
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('TransactionId') }}</q-item-label>
                <q-item-label v-if="isSep20Tx" :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.hash }}</q-item-label>
                <q-item-label v-else :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.txid }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'incoming'" style="overflow-wrap: anywhere;">
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>
                  <span>{{ $t('Sender') }}</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.from }}</q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>
                  <span v-if="transaction.senders.length === 1">{{ $t('Sender') }}</span>
                  <span v-if="transaction.senders.length > 1">{{ $t('Senders') }}</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ concatenate(transaction.senders) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'outgoing'" style="overflow-wrap: anywhere;">
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>
                  <span>{{ $t('Recipient') }}</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.to }}</q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>
                  <span v-if="transaction.recipients.length === 1">{{ $t('Recipient') }}</span>
                  <span v-if="transaction.recipients.length > 1">{{ $t('Recipients') }}</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ concatenate(transaction.recipients) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>{{ $t('GasFee') }}</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">
                  {{ getAssetDenomination(denomination, transaction.gas) }}
                </q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ parseFiatCurrency(txFeeMarketValue, selectedMarketCurrency) }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('MinerFee') }}</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">
                  {{ getAssetDenomination(denomination, transaction.tx_fee / (10**8)) }}
                </q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ parseFiatCurrency(txFeeMarketValue, selectedMarketCurrency) }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="anyhedgeContracts?.length">
              <q-item-section>
                <q-item-label class="text-gray" caption>AnyHedge</q-item-label>
                <q-item-label
                  v-for="(contractInfo, index) in anyhedgeContracts"
                  :key="index"
                  :class="darkMode ? 'text-white' : 'pp-text'"
                >
                  <q-popup-proxy :breakpoint="0">
                    <div
                      class="q-px-sm q-py-xs text-caption pt-label"
                      :class="getDarkModeClass(darkMode, '', 'text-black')"
                    >
                      {{ contractInfo.label }}
                    </div>
                  </q-popup-proxy>
                  <div class="row items-center">
                    <div class="q-space">
                      {{ ellipsisText(contractInfo.address, { end: 5 }) }}
                    </div>
                    <q-btn
                      flat icon="content_copy"
                      size="sm" padding="xs sm"
                      @click.stop="copyToClipboard(contractInfo.address)"
                    />
                    <q-separator vertical :dark="darkMode"/>
                    <q-btn
                      flat icon="open_in_new"
                      size="sm" padding="xs sm"
                      @click.stop="displayAnyhedgeContract(contractInfo.address)"
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
                <q-item-label>
                  <a
                    style="text-decoration: none;"
                    class="button button-text-primary"
                    :href="'https://sonar.cash/tx/' + transaction.hash"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
                <q-item-label>
                  <a
                    style="text-decoration: none;"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :href="explorerLink"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import TokenTypeBadge from './TokenTypeBadge'
import { ellipsisText, parseHedgePositionData } from 'src/wallet/anyhedge/formatters'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'
import { convertTokenAmount } from 'src/wallet/chipnet'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'transaction',
  props: {
    wallet: Object,
    hideCallback: {
      type: Function
    }
  },
  components: {
    TokenTypeBadge,
  },
  data () {
    return {
      actionMap: {
        incoming: this.$t('Received'),
        outgoing: this.$t('Sent')
      },
      transaction: {},
      denomination: this.$store.getters['global/denomination']
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    explorerLink () {
      const txid = this.transaction.txid
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      if (this.transaction.asset.id.split('/')[0] === 'ct')
        url = 'https://explorer.bitcoinunlimited.info/tx/'

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/tx/'
      }

      return `${url}${txid}`
    },
    isSep20Tx () {
      const hash = String(this.transaction && this.transaction.hash)
      return /^0x[0-9a-f]{64}/i.test(hash)
    },
    fallbackAssetLogo () {
      if (!this.transaction || !this.transaction.asset) return ''
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.transaction.asset.id))
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    historicalMarketPrice() {
      if (this.selectedMarketCurrency === 'USD' && this.transaction.usd_price) return this.transaction.usd_price
      if (this.transaction?.market_prices?.[this.selectedMarketCurrency]) return this.transaction?.market_prices?.[this.selectedMarketCurrency]
      return null
    },
    marketAssetPrice () {
      if (this.historicalMarketPrice) return this.historicalMarketPrice
      return this.$store.getters['market/getAssetPrice'](this.transaction.asset.id, this.selectedMarketCurrency)
    },
    transactionAmountMarketValue () {
      if (!this.transaction) return ''
      if (!this.marketAssetPrice) return ''
      return (Number(this.transaction.amount) * Number(this.marketAssetPrice)).toFixed(5)
    },
    txFeeMarketValue () {
      const bchMarketValue = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchMarketValue) return ''
      const gas = this.transaction && (this.isSep20Tx ? this.transaction.gas : this.transaction.tx_fee / (10 ** 8))
      if (!gas) return ''
      return (Number(gas) * Number(bchMarketValue)).toFixed(8)
    },
    cachedPaymentOTP() {
      return this.$store.getters['paytacapos/paymentOTPCache'](this.transaction?.txid)?.otp || ''
    },
    anyhedgeContracts() {
      if (!Array.isArray(this.transaction.attributes)) return
      const contracts = this.transaction.attributes
        .map(attribute => {
          switch(attribute?.key) {
            case('anyhedge_funding_tx'):
              return { label: 'Funding transaction', address: attribute?.value }
            case('anyhedge_hedge_funding_utxo'):
              return { label: 'Hedge funding UTXO', address: attribute?.value }
            case('anyhedge_long_funding_utxo'):
              return { label: 'Long funding UTXO', address: attribute?.value }
            case('anyhedge_settlement_tx'):
              return { label: 'Settlement transaction', address: attribute?.value }
          }
        })
        .filter(Boolean)
      return contracts
    }
  },
  methods: {
    ellipsisText,
    convertTokenAmount,
    getAssetDenomination,
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    concatenate (array) {
      let addresses = array.map(function (item) {
        return item[0]
      })
      addresses = [...new Set(addresses)]
      if (addresses.length === 1) {
        return addresses[0]
      } else {
        return addresses.join(', ')
      }
    },
    show (transaction) {
      try {
        this.transaction = transaction
        this.$refs.dialog.show()
      } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
      this.$parent.toggleHideBalances()
    },
    formatDate (date) {
      const dateObj = new Date(date)
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },
    displayAnyhedgeContract(contractAddress) {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
      const dialog = this.$q.dialog({
        title: 'AnyHedge Contract',
        message: 'Fetching contract',
        ok: false,
        seamless: true,
        progress: true,
        class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
      })
      anyhedgeBackend.get(`anyhedge/hedge-positions/${contractAddress}/`)
        .then(async (response) => {
          if (!response?.data?.address) return Promise.reject({ response }) 
          const parsedContractData = await parseHedgePositionData(response?.data)
          dialog.hide()

          let viewAs
          if (parsedContractData?.hedgeWalletHash === walletHash) viewAs = 'hedge'
          if (parsedContractData?.longWalletHash === walletHash) viewAs = 'long'
          this.$q.dialog({
            component: HedgeContractDetailDialog,
            componentProps: {
              contract: parsedContractData,
              wallet: this.wallet,
              viewAs: viewAs,
              viewPositionInTitle: true,
            },
          })
          return Promise.resolve(response)
        })
        .catch(error => {
          console.error(error)
          dialog.update({ message: 'Unable to fetch contract data' })
        })
    }
  }
}
</script>

<style scoped>
  .pt-card{
    padding: 20px 10px 5px 0;
  }
  .amount {
    /* height: 50px; */
    font-size: 20px;
    margin-left: 16px;
  }
  .text-gray {
    color: gray;
  }
  .amount-label {
    position: relative;
    margin-top: -38px;
    margin-left: 35px;
  }
  .q-dialog__backdrop {
    background: black;
  }
  .record-type-icon {
    font-size: 30px;
    border-radius: 20px;
  }
</style>
