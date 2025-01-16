<template>
  <div class="text-center md-font-size text-grey-9 text-bold">Cash Out Transactions</div>
  <!-- Transaction List -->
  <div>
    <q-pull-to-refresh @refresh="refreshData">
      <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
        <!-- Cashout Order -->
        <!-- <q-card flat class="q-mx-lg q-mt-sm"> -->
          <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
            <q-item-section>
              <div class="q-px-sm q-mx-lg" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <div class="sm-font-size text-grey-6 text-strike">{{ transaction.initAmount }}</div>
                <div class="row">
                  <div class="col ib-text">
                    <div class="md-font-size text-bold">
                      {{ formatCurrency(transaction.fiatAmount, currency.symbol).replace(/[^\d.,-]/g, '') }} {{ currency.symbol }}
                    </div>
                    <div class="sm-font-size">
                      {{ transaction.amount }} BCH
                    </div>
                  </div>
                  <div class="col ib-text text-right q-pr-sm">
                    <div class="text-grey-8 text-bold">
                      <span>{{ transaction.txid }}</span> <q-icon color="primary" size="sm" name="o_check_box" v-if="transaction.selected"/>
                    </div>
                    <div class="text-grey-6 sm-font-size">{{ transaction.lossProtection }}</div>
                  </div>
                </div>
              </div>
            </q-item-section>
          </q-item>
        <!-- </q-card> -->
      </q-list>
    </q-pull-to-refresh>
    <div class="footer-card-btn">
      <div class="q-mx-lg q-pt-md">
        <q-card class="full-width q-px-lg br-15 q-py-md">
          <div class="md-font-size text-grey-8">
            {{ transactions.length }} Transactions
          </div>
          <div class="row q-pt-sm sm-font-size q-pb-md">
            <div class="col-8 text-bold">
              <span>Total on Market Price</span><br>
              <span>Market Volatility Loss/Gain</span><br>
              <span>Loss Protection Coverage</span>
            </div>
            <div class="col text-right">
              <span>14,587.50 PHP</span><br>
              <span class="text-red">-4,319.7 PHP</span><br>
              <span>3,979.7 PHP</span>
            </div>
          </div>

          <div class="text-strike text-grey-6 text-right sm-font-size">
            14,587.50
          </div>
          <div class="row q-pb-sm">
            <div class="col-8 md-font-size">
              <span class="text-grey-8">TOTAL</span>
            </div>
            <div>
              <span>14,247.50 PHP</span>
            </div>
          </div>
          <q-separator class="q-mb-sm"/>
          <div class="text-right text-grey-8 sm-font-size">
            0.57 BCH
          </div>
        </q-card>
      </div>
      <div class="full-width text-center q-px-lg q-py-sm">
        <q-btn label="Proceed" class="full-width q-mx-lg" rounded color="primary"/>
      </div>
    </div>
  </div>
</template>
<script>
import { formatCurrency } from 'src/exchange'

export default {
  data () {
    return {
      transactions: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 320 : this.$q.screen.height - 290,
      currency: { name: 'PHP', symbol: 'PHP'},
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    data: Array
  },
  mounted () {
    this.transactions = this.data
    console.log('transactions: ', this.data)
  },
  methods: {
    formatCurrency,
    async refreshData (done) {
      done()
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
    bottom: 0;
    width: 100%;
  }
</style>
