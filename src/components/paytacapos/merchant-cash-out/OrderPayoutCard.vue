<template>
    <div class="q-mx-lg q-pt-xs">
        <q-card class="full-width q-px-lg br-15 q-py-sm">
        <div class="text-bold sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
            {{ transactions?.length }} Transactions
        </div>
        <div class="row q-pt-sm sm-font-size q-pb-sm">
            <div class="col-8 text-bold">
            <span>Initial Total</span><br>
            <span>Market Volatility Loss/Gain</span><br>
            <span>Loss Covered</span>
            </div>
            <div class="col text-right">
            <span>{{ cashOutTotal?.initialTotal }} {{ currency }}</span><br>
            <span :class="cashOutTotal?.lossGain < 0 ? 'text-red' : 'text-green'">
                {{ cashOutTotal?.lossGain }} {{ currency }}
            </span><br>
            <span>{{ cashOutTotal?.lossCovered }} {{ currency }}</span>
            </div>
        </div>

        <div v-if="cashOutTotal?.currentTotal > 0 && cashOutTotal?.initialTotal !== cashOutTotal?.currentTotal"
            class="text-strike text-right sm-font-size"
            :class="darkMode ? 'text-white' : 'text-grey-6'">
            {{ cashOutTotal?.initialTotal }} {{ currency }}
        </div>
        <div class="row q-pb-sm md-font-size text-bold">
            <div class="col">
            <span>TOTAL</span>
            </div>
            <div class="text-right" >
            <span>{{ cashOutTotal?.currentTotal }} {{ currency }}</span>
            </div>
        </div>
        <q-separator class="q-mb-sm"/>
        <div class="text-right sm-font-size" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
            {{ cashOutTotal?.totalBchAmount }} BCH
        </div>
        </q-card>
    </div>
</template>
<script>
import { formatNumber } from 'src/exchange'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            cashOutTotal: null
        }
    },
    props: {
        transactions: Array,
        currency: String
    },
    mounted () {
        this.calculateCashOutTotal(this.transactions)
    },
    methods: {
        calculateCashOutTotal (transactions) {
            let initialTotal = 0
            let currentTotal = 0
            let lossGain = 0
            let lossCovered = 0
            let totalBchAmount = 0
            transactions.forEach(tx => {

                const initMarketPrice = tx.fiat_price?.initial[this.currency]
                const initFiatAmount = tx.amount * initMarketPrice
                initialTotal += initFiatAmount

                const currMarketPrice = tx.fiat_price?.current[this.currency]
                const currFiatAmount = tx.amount * currMarketPrice
                currentTotal += currFiatAmount

                const isLossProtected = this.lossProtection(tx) !== 'Expired'
                if (currentTotal < initialTotal && isLossProtected) {
                    const gap = initFiatAmount - currFiatAmount
                    lossCovered += gap
                }
                totalBchAmount += tx.amount
            })
            lossCovered = lossCovered.toFixed(2)
            lossGain = (currentTotal - initialTotal).toFixed(2)
            currentTotal += lossCovered

            this.cashOutTotal = {
                initialTotal: formatNumber(initialTotal) || initialTotal,
                currentTotal: formatNumber(currentTotal) || currentTotal,
                lossGain: formatNumber(lossGain) || lossGain,
                lossCovered: formatNumber(lossCovered) || lossCovered,
                totalBchAmount: formatNumber(totalBchAmount) || totalBchAmount
            }
        },
        lossProtection (transaction) {
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
        }
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
  .lg-font-size {
    font-size: large;
  }
  .footer-card-btn {
    position: fixed;
    bottom: 10px;
    width: 100%;
  }
</style>