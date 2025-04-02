<template>
    <div class="text-center md-font-size text-bold">Cash Out Transactions</div>
    <q-list class="scroll-y" :dark="darkMode" @touchstart="preventPull">
        <div v-if="transactions?.length === 0" class="text-center q-mt-lg">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 50px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('No transactions selected') }}</p>
        </div>
        <q-item v-for="(tx, index) in transactions" :key="index" clickable @click="selectTransaction(index)">
          <q-item-section>
            <div class="q-mx-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              <div v-if="getFiatValue('initial', tx).toFixed(2) !== getFiatValue('current', tx).toFixed(2)"
                class="sm-font-size text-grey-6 text-strike">
                {{ formatCurrency(getFiatValue('initial', tx), currency) }} {{ currency }}
              </div>
              <div class="row">
                <div class="col ib-text">
                  <div class="md-font-size text-bold" :class="getFiatValueColor(tx)">
                    {{ formatCurrency(getFiatValue('current', tx), currency).replace(/[^\d.,-]/g, '') }} {{ currency }}
                    <q-icon :name="getFiatValueIcon(tx)"/>
                  </div>
                  <div class="sm-font-size">
                    {{ tx.amount }} BCH
                  </div>
                </div>
                <div class="col ib-text text-right q-pr-sm">
                  <div class="text-bold" :class="darkMode ? 'text-grey-' : 'text-grey-8'">
                    <span>{{ tx.transaction?.txid?.substring(0,8) }}</span>
                    <q-icon color="primary" size="sm" name="o_check_box" v-if="tx.selected"/>
                  </div>
                  <div class="text-grey-6 sm-font-size">
                    <q-icon name="local_police" class="q-pa-xs"/>
                    <span>{{ calcLossProtectionTimeLeft(tx) }}</span>
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
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus']
        }
    },
    props: {
        transactions: Array,
        currency: String
    },
    emits: ['select', 'unselect'],
    methods: {
        formatCurrency,
        selectTransaction (index) {
            this.transactions[index].selected = !this.transactions[index].selected

            if (this.transactions[index].selected) {
                this.$emit('select', this.transactions[index])
                // this.transactions.push(this.transactionList[index])
            } else {
                this.$emit('unselect', this.transactions[index])
                // this.transactions = this.transactions.filter(tx => tx?.transaction?.txid !== this.transactionList[index]?.transaction?.txid)
            }

            // this.calculateCashOutTotal(this.transactions)
        },
        preventPull (e) {
            let parent = e.target
            // eslint-disable-next-line no-void
            while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
                parent = parent.parentNode
            }
            // eslint-disable-next-line no-void
            if (parent !== void 0 && parent.scrollTop > 0) {
                e.stopPropagation()
            }
        },
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
            const initialVal = (this.getFiatValue ('initial', transaction)).toFixed(2)
            const currentVal = (this.getFiatValue ('current', transaction)).toFixed(2)
            if (currentVal < initialVal) return 'text-red'
            if (currentVal > initialVal) return 'text-green'
            return 'text-blue'
        },
        getFiatValueIcon (transaction) {
            const initialVal = (this.getFiatValue ('initial', transaction)).toFixed(2)
            const currentVal = (this.getFiatValue ('current', transaction)).toFixed(2)
            if (currentVal > initialVal) return 'trending_up'
            if (currentVal < initialVal) return 'trending_down'
            return ''
        },
        isTxnSelected (tx) {
            return this.selectedTransactions.some(txn => txn.transaction?.txid === tx.transaction?.txid)
        },
    }
}
</script>
<style lang="scss" scoped>
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
</style>