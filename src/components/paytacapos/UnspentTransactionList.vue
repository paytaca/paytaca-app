<template>
    <q-list :dark="darkMode">
        <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="selectTransaction(transaction, index)">
          <q-item-section>
            <div class="q-px-sm q-mx-lg" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              <div class="sm-font-size text-grey-6 text-strike">
                {{ formatCurrency(getFiatValue('initial', transaction), currency) }} {{ currency }}
              </div>
              <div class="row">
                <div class="col ib-text">
                  <div class="md-font-size text-bold" :class="getFiatValueColor(transaction)">
                    {{ formatCurrency(getFiatValue('current', transaction), currency).replace(/[^\d.,-]/g, '') }} {{ currency }}
                    <q-icon :name="getFiatValueIcon(transaction)"/>
                  </div>
                  <div class="sm-font-size">
                    {{ transaction.amount }} BCH
                  </div>
                </div>
                <div class="col ib-text text-right q-pr-sm">
                  <div class="text-grey-8 text-bold">
                    <span>{{ transaction.txid.substring(0,8) }}</span>
                    <q-icon color="primary" size="sm" name="o_check_box" v-if="transaction.selected"/>
                  </div>
                  <div class="text-grey-6 sm-font-size">
                    <q-icon name="local_police" class="q-pa-xs"/>
                    <span>{{ calcLossProtectionTimeLeft(transaction) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </q-item-section>
        </q-item>
    </q-list>
</template>
<script>
import { formatCurrency } from 'src/exchange'

export default {
  props: {
    transactions: Array,
    currency: String
  },
  emit: ['select'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    console.log('TRANSACTIONS: ', this.transaction)
  },
  methods: {
    formatCurrency,
    calcLossProtectionTimeLeft (transaction) {
      const txTime = new Date(transaction.tx_timestamp)
      const expirationDate = new Date(txTime)
      expirationDate.setDate(txTime.getDate() + 30)

      const now = new Date()
      const timeLeft = expirationDate - now

      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000)

      if (daysLeft > 0) {
        return `${daysLeft} days left`
      }

      if (hoursLeft > 0) {
        return `${hoursLeft} hours left`
      }

      if (minutesLeft > 0) {
        return `${minutesLeft} minutes left`
      }

      if (secondsLeft > 0) {
        return `${secondsLeft} seconds left`
      }

      return 'Expired'
    },
    getMarketPrice (type, transaction, currency) {
      if (type === 'initial') return transaction?.fiat_price?.initial[currency]
      if (type === 'current') return transaction?.fiat_price?.current[currency]
      return null
    },
    getFiatValue (type, transaction) {
      const price = this.getMarketPrice(type, transaction, this.currency)
      return transaction.amount * price
    },
    getFiatValueColor (transaction) {
      const currentPrice = this.getMarketPrice('current', transaction, this.currency)
      const initialPrice = this.getMarketPrice('initial', transaction, this.currency)
      if (currentPrice < initialPrice) return 'text-red'
      if (currentPrice > initialPrice) return 'text-green'
      return 'text-blue'
    },
    getFiatValueIcon (transaction) {
      const currentPrice = this.getMarketPrice('current', transaction, this.currency)
      const initialPrice = this.getMarketPrice('initial', transaction, this.currency)
      if (currentPrice > initialPrice) return 'trending_up'
      if (currentPrice < initialPrice) return 'trending_down'
      return ''
    },
    isTxnSelected (transaction) {
      return this.selectedTransactions.some(txn => txn.txid === transaction.txid)
    },
    selectTransaction (transaction, index) {
      this.$emit('select', transaction, index)
    }
  }
}
</script>
<style scoped>
.sm-font-size {
font-size: small;
}
.md-font-size {
font-size: medium;
}
</style>
