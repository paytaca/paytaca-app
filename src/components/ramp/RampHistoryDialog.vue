<template>
  <q-dialog ref="dialog" persistent full-width>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-subtitle1 q-space q-mt-sm">
          Transaction History
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <div v-if="isloaded">
        <q-card-section>
          <div v-if="transactions.length === 0" class="relative text-center q-pt-sm">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
          </div>
          <div v-else>
            <q-card-section style="max-height:50vh;overflow-y:auto;" class="q-pt-none">
            <q-virtual-scroll :items="transactions">
              <template v-slot="{ item: transaction, index }">
                <q-item clickable>
                  <q-item-section>
                    <div class="row q-pt-sm text-h5" :class="darkMode ? 'text-white' : 'pp-text'">
                      <div class="col-6 ">
                        <div class="row">
                          <span style="font-size: 13px; overflow-wrap: break-word;">{{ transactionType(transaction.ramp_type)}}</span>
                        </div>
                        <div class="row">
                          <span style="color: gray; font-size: 11px;">{{ getDate(transaction.date_shift_created) }}</span>
                        </div>
                      </div>
                      <div class="col-6" style="text-align: right;">
                        <div class="row">
                          <span style="font-size: 13px; color: gray;">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</span>
                        </div>
                        <div class="row">
                          <span style="font-size: 11px; color: gray;">{{ transaction.shift_status.toUpperCase() }}</span>
                        </div>
                      </div>
                    </div>
                    <q-separator :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'"/>
                  </q-item-section>
                </q-item>
              </template>
            </q-virtual-scroll>
          </q-card-section>
          </div>
        </q-card-section>
      </div>
      <div class="row justify-center q-py-lg" style="margin-top: 50px" v-if="!isloaded">
        <ProgressLoader/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, Wallet } from '../../wallet'
import ProgressLoader from '../ProgressLoader.vue'

export default {
  components: {
    ProgressLoader
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      transactions: [],
      networkError: false,
      isloaded: false,
      page: 1,
      has_next: false,
      total_page: 1,
      test: []
    }
  },
  methods: {
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
    transactionType (ramp) {
      if (ramp === 'on') {
        return 'RECIEVED'
      } else {
        return 'SENT'
      }
    },
    getAmount (ramp, info) {
      if (ramp === 'on') {
        return parseFloat(info.settle.amount)
      } else {
        return parseFloat(info.deposit.amount)
      }
    },
    async getTransactions () {
      const vm = this
      console.log('Getting Transactions')
      const mnemonic = await getMnemonic()
      const wallet = new Wallet(mnemonic)

      const baseUrl = 'https://loose-peas-rest-49-145-106-154.loca.lt/api'
      const walletHash = wallet.BCH.getWalletHash()
      const url = baseUrl + '/ramp/history/' + walletHash + '/?page=' + vm.page

      const response = await vm.$axios.get(url).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      // console.log(response)
      if (response.status === 200 || response.status === 201) {
        const data = response.data

        vm.transactions = data.history
        vm.has_next = data.has_next
        vm.total_page = data.num_pages

        vm.isloaded = true
      } else {
        vm.networkError = true
        vm.isloaded = true
      }
    }
  },
  async mounted () {
    const vm = this

    await vm.getTransactions()
  }
}
</script>
<style lang="scss" scoped>
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
</style>
