<template>
  <div id="transaction">
    <q-dialog ref="dialog" @hide="hide" persistent seamless>
      <q-card ref="card" v-if="transaction && transaction.asset" style="padding: 20px 10px 5px 0;" :class="{'pt-dark-card': darkMode}" class="pp-text br-15">
        <div style="right: 10px; top: 10px; position: absolute; z-index: 100;">
          <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : ''" />
        </div>
        <div class="text-h6" :class="darkMode ? 'text-white' : 'pp-text'" style="text-align: center !important;">
          {{ actionMap[transaction.record_type] }}
        </div>
        <div class="text-h6" style="text-align: center !important; margin: 10px 0;">
          <q-icon v-if="transaction.record_type === 'incoming'" name="arrow_downward" class="record-type-icon"></q-icon>
          <q-icon v-if="transaction.record_type === 'outgoing'" name="arrow_upward" class="record-type-icon"></q-icon>
        </div>
        <q-card-section class="amount">
          <img :src="transaction.asset.logo || fallbackAssetLogo" height="30" /> &nbsp;
          <div class="amount-label q-pl-sm" :class="darkMode ? 'text-white' : 'pp-text'">
            <template v-if="transaction.record_type === 'outgoing'">
              {{ transaction.amount * -1 }} {{ transaction.asset.symbol }}
            </template>
            <template v-else>
              {{ transaction.amount }} {{ transaction.asset.symbol }}
            </template>
            <div v-if="transactionAmountMarketValue" class="text-caption">
              <template v-if="transaction.record_type === 'outgoing'">
                {{ transactionAmountMarketValue * -1 }} {{ String(selectedMarketCurrency).toUpperCase() }}
              </template>
              <template v-else>
                {{ transactionAmountMarketValue }} {{ String(selectedMarketCurrency).toUpperCase() }}
              </template>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-mt-xs">
          <q-list class="list">
            <q-item clickable v-ripple @click="copyToClipboard(formatDate(transaction.date_created))">
              <q-item-section>
                <q-item-label class="text-gray" caption>Date</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ formatDate(transaction.date_created) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="copyToClipboard(isSep20Tx ? transaction.hash : transaction.txid)" style="overflow-wrap: anywhere;">
              <q-item-section>
                <q-item-label class="text-gray" caption>Transaction ID</q-item-label>
                <q-item-label v-if="isSep20Tx" :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.hash }}</q-item-label>
                <q-item-label v-else :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.txid }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'incoming'" style="overflow-wrap: anywhere;">
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>
                  <span>Sender</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.from }}</q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>
                  <span v-if="transaction.senders.length === 1">Sender</span>
                  <span v-if="transaction.senders.length > 1">Senders</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.senders | concatenate }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'outgoing'" style="overflow-wrap: anywhere;">
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>
                  <span>Recipient</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.to }}</q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>
                  <span v-if="transaction.recipients.length === 1">Recipient</span>
                  <span v-if="transaction.recipients.length > 1">Recipients</span>
                </q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.recipients | concatenate }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>Gas fee</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.gas }} BCH</q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ txFeeMarketValue }}
                  {{ String(selectedMarketCurrency).toUpperCase() }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>Miner fee</q-item-label>
                <q-item-label :class="darkMode ? 'text-white' : 'pp-text'">{{ transaction.tx_fee / (10**8) }} BCH</q-item-label>
                <q-item-label v-if="txFeeMarketValue" :class="darkMode ? 'text-white' : 'pp-text'" caption>
                  {{ txFeeMarketValue }}
                  {{ String(selectedMarketCurrency).toUpperCase() }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>Explorer Link</q-item-label>
                <q-item-label>
                  <a :href="'https://smartscan.cash/transaction/' + transaction.hash" :class="darkMode ? 'text-blue-5' : 'text-blue-9'" style="text-decoration: none;">
                    View in SmartScan
                  </a>
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>Explorer Link</q-item-label>
                <q-item-label>
                  <a :href="'https://blockchair.com/bitcoin-cash/transaction/' + transaction.txid" :class="darkMode ? 'text-blue-5' : 'text-blue-9'" style="text-decoration: none;">
                    View in block explorer
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
export default {
  name: 'transaction',
  props: {
    hideCallback: {
      type: Function
    }
  },
  data () {
    return {
      actionMap: {
        incoming: 'RECEIVED',
        outgoing: 'SENT'
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
    marketAssetPrice () {
      return this.$store.getters['market/getAssetPrice'](this.transaction.asset.id, this.selectedMarketCurrency)
    },
    transactionAmountMarketValue() {
      if (!this.transaction) return ''
      if (!this.marketAssetPrice) return ''
      return (Number(this.transaction.amount) * Number(this.marketAssetPrice)).toFixed(5)
    },
    txFeeMarketValue () {
      const bchMarketValue = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchMarketValue)  return ''
      const gas = this.transaction && ( this.isSep20Tx ? this.transaction.gas : this.transaction.tx_fee / (10**8) )
      if (!gas) return ''
      return (Number(gas) * Number(bchMarketValue)).toFixed(8)
    }
  },
  filters: {
    truncateTxid (str) {
      return str.substring(0, 30)
    },
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
    }
  },
  methods: {
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
        message: 'Copied to clipboard',
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    }
  }
}
</script>

<style scoped>
  .amount {
    height: 50px;
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
