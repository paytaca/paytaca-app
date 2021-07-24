<template>
  <div id="transaction">
    <q-dialog ref="dialog" full-width @hide="hide">
      <q-card ref="card" v-if="transaction && transaction.asset" style="padding: 20px 10px 5px 0;">
        <div class="text-h6" style="text-align: center !important; margin-bottom: 10px;">
          <q-icon v-if="transaction.record_type === 'incoming'" name="arrow_downward" class="record-type-icon"></q-icon>
          <q-icon v-if="transaction.record_type === 'outgoing'" name="arrow_upward" class="record-type-icon"></q-icon>
        </div>
        <div class="text-h6" style="text-align: center !important;">
          {{ actionMap[transaction.record_type] }}
        </div>
        <q-card-section class="amount">
          <img :src="transaction.asset.logo" height="30" /> &nbsp;
          <div class="amount-label">
            <template v-if="transaction.record_type === 'outgoing'">
              {{ transaction.amount * -1 }} {{ transaction.asset.symbol }}
            </template>
            <template v-else>
              {{ transaction.amount }} {{ transaction.asset.symbol }}
            </template>
          </div>
        </q-card-section>
        <q-card-section>
          <q-list class="list">
            <q-item clickable v-ripple @click="copyToClipboard(formatDate(transaction.date_created))">
              <q-item-section>
                <q-item-label caption>Date</q-item-label>
                <q-item-label>{{ formatDate(transaction.date_created) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="copyToClipboard(transaction.txid)" style="overflow-wrap: anywhere;">
              <q-item-section>
                <q-item-label caption>Transction ID</q-item-label>
                <q-item-label>{{ transaction.txid }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'incoming'" style="overflow-wrap: anywhere;">
              <q-item-section>
                <q-item-label caption>
                  <span v-if="transaction.senders.length === 1">Sender</span>
                  <span v-if="transaction.senders.length > 1">Senders</span>
                </q-item-label>
                <q-item-label>{{ transaction.senders | concatenate }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="transaction.record_type === 'outgoing'" style="overflow-wrap: anywhere;">
              <q-item-section>
                <q-item-label caption>
                  <span v-if="transaction.recipients.length === 1">Recipient</span>
                  <span v-if="transaction.recipients.length > 1">Recipients</span>
                </q-item-label>
                <q-item-label>{{ transaction.recipients | concatenate }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>Transction fee</q-item-label>
                <q-item-label>{{ transaction.tx_fee / (10**8) }} BCH</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="copyToClipboard('https://explorer.bitcoin.com/bch/tx/' + transaction.txid)">
              <q-item-section>
                <q-item-label caption>Explorer Link</q-item-label>
                <q-item-label>
                  <a :href="'https://explorer.bitcoin.com/bch/tx/' + transaction.txid" style="color: #3b7bf6; text-decoration: none;">
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
      transaction: {}
    }
  },
  filters: {
    truncateTxid (str) {
      return str.substring(0, 30)
    },
    concatenate (array) {
      const addresses = array.map(function (item) {
        return item[0]
      })
      if (addresses.lenght === 1) {
        return addresses[0]
      } else {
        return addresses.join(', ')
      }
    }
  },
  methods: {
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
        message: 'Copied to clipboard',
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
