<template>
  <div id="transaction">
    <q-dialog ref="dialog" full-width>
      <q-card ref="card" v-if="transaction && transaction.asset" style="padding: 20px 10px 5px 0;">
        <div class="text-h6" style="text-align: center !important;">
          {{ actionMap[transaction.record_type] }}
        </div>
        <q-card-section class="amount">
          <img :src="transaction.asset.logo" height="30" /> &nbsp;
          <div class="amount-label">
            {{ transaction.amount }} {{ transaction.asset.symbol }}
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
            <q-item clickable v-ripple @click="copyToClipboard(transaction.txid)">
              <q-item-section>
                <q-item-label caption>Transction ID (first 30 characters)</q-item-label>
                <q-item-label>{{ transaction.txid | truncateTxid }}</q-item-label>
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
    }
  },
  methods: {
    show (transaction) {
      try {
        this.transaction = transaction
        this.$refs.dialog.show()
        // const width = window.innerWidth
        // console.log(width)
        // this.$refs.dialog.$el.setAttribute('style', `width: ${width}px !important;`)
      } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
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
</style>
