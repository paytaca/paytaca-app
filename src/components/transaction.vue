<template>
  <div id="transaction">
    <q-dialog ref="dialog" @hide="hide" persistent seamless>
      <q-card ref="card" v-if="transaction && transaction.asset" style="padding: 20px 10px 5px 0;" :class="{'pt-dark-card': darkMode}" class="pp-text br-15">
        <div style="right: 10px; top: 10px; position: absolute; z-index: 100;">
          <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : ''" />
        </div>
        <div class="text-h6 text-uppercase" :class="darkMode ? 'text-white' : 'pp-text'" style="text-align: center !important;">
          {{ actionMap[transaction.record_type] }}
        </div>
        <div class="text-h6" style="text-align: center !important; margin: 10px 0;">
          <q-icon v-if="transaction.record_type === 'incoming'" name="arrow_downward" class="record-type-icon"></q-icon>
          <q-icon v-if="transaction.record_type === 'outgoing'" name="arrow_upward" class="record-type-icon"></q-icon>
        </div>
        <q-card-section class="amount q-pb-none">
          <q-item class="q-px-none">
            <q-item-section side top>
              <img :src="transaction.asset.logo || fallbackAssetLogo" height="30" />
            </q-item-section>
            <q-item-section :class="darkMode ? 'text-white' : 'pp-text'">
              <q-item-label>
                <template v-if="transaction.record_type === 'outgoing'">
                  {{ transaction.amount * -1 }} {{ transaction.asset.symbol }}
                </template>
                <template v-else>
                  {{ transaction.amount }} {{ transaction.asset.symbol }}
                </template>
              </q-item-label>
              <q-item-label v-if="transactionAmountMarketValue" class="row items-center text-caption">
                <template v-if="transaction.record_type === 'outgoing'">
                  {{ transactionAmountMarketValue * -1 }} {{ String(selectedMarketCurrency).toUpperCase() }}
                </template>
                <template v-else>
                  {{ transactionAmountMarketValue }} {{ String(selectedMarketCurrency).toUpperCase() }}
                </template>
                <q-icon v-if="historicalMarketPrice" name="info" class="q-ml-sm" size="1.5em">
                  <q-popup-proxy v-if="historicalMarketPrice" :breakpoint="0">
                    <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']" class="text-caption">
                      Asset value is based on prices at the time of transaction
                    </div>
                  </q-popup-proxy>
                </q-icon>
              </q-item-label>
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
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.gas }} BCH</q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ txFeeMarketValue }}
                  {{ String(selectedMarketCurrency).toUpperCase() }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('MinerFee') }}</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.tx_fee / (10**8) }} BCH</q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ txFeeMarketValue }}
                  {{ String(selectedMarketCurrency).toUpperCase() }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="anyhedgeContracts?.length">
              <q-item-section>
                <q-item-label class="text-gray" caption>Anyhedge</q-item-label>
                <q-item-label
                  v-for="(contractInfo, index) in anyhedgeContracts"
                  :key="index"
                  :class="darkMode ? 'text-white' : 'pp-text'"
                >
                  <q-popup-proxy :breakpoint="0">
                    <div
                      :class="['q-px-sm q-py-xs', darkMode ? 'pt-dark-label pt-dark' : 'text-black']"
                      class="text-caption"
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
                  <a :href="'https://sonar.cash/tx/' + transaction.hash" :class="darkMode ? 'text-blue-5' : 'text-blue-9'" style="text-decoration: none;">
                    {{ $t('ViewInExplorer') }}
                  </a>
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
                <q-item-label>
                  <a :href="'https://blockchair.com/bitcoin-cash/transaction/' + transaction.txid" :class="darkMode ? 'text-blue-5' : 'text-blue-9'" style="text-decoration: none;">
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
import { ellipsisText, parseHedgePositionData } from 'src/wallet/anyhedge/formatters'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'

export default {
  name: 'transaction',
  props: {
    wallet: Object,
    hideCallback: {
      type: Function
    }
  },
  data () {
    return {
      actionMap: {
        incoming: this.$t('Received'),
        outgoing: this.$t('Sent')
      },
      transaction: {},
      darkMode: false
    }
  },
  computed: {
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
    show (transaction, darkMode) {
      this.darkMode = darkMode
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
    /* color: #3b7bf6; */
    color: #fff;
    font-size: 30px;
    background: #3b7bf6;
    border-radius: 20px;
  }
</style>
