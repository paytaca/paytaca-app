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
          <div v-if="test.length === 0" class="relative text-center q-pt-sm">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
          </div>
          <div v-else>
            <div v-for="transaction in test">
              <div class="row q-my-sm text-h5" :class="darkMode ? 'text-white' : 'pp-text'">
                <div class="col-8 q-pl-md">
                  <div class="row">
                    <span style="font-size: 13px; overflow-wrap: break-word;">{{ parseFloat(transaction.depositAmount) }} {{ transaction.depositCoin }} to {{ parseFloat(transaction.settleAmount) }} BCH</span>
                  </div>
                  <div class="row">
                    <span style="color: gray; font-size: 11px;">{{ getDate(transaction.createdAt) }}</span>
                  </div>
                </div>
                <div class="col-4 q-pr-md" style="text-align: right;">
                  <div class="row">
                    <span style="font-size: 13px; color: gray;">Status: {{ transaction.status }}</span>
                  </div>
                  <div class="row">
                    <span style="color: gray; font-size: 10px; overflow-wrap: break-word;">{{ transaction.id }}</span>
                  </div>
                </div>
              </div>
              <q-separator class="q-my-md"  :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'"/>
            </div>
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
      test: [{
        createdAt: '2023-03-07T07:29:28.844Z',
        depositAddress: '3C1Lddx276BdxXfpA16p6Lb3LHV8iCHMGU',
        depositAmount: '1.00000000',
        depositCoin: 'BTC',
        depositNetwork: 'bitcoin',
        expiresAt: '2023-03-07T07:44:25.699Z',
        id: 'cf5e53fbddb5e14d0738',
        quoteId: 'd5a2c54d-9751-4687-ba03-79b23bc996ff',
        rate: '175.34632241',
        settleAddress: 'bitcoincash:qzvn7qemhd9m4sw333pke04me5v0uja2tgnvldj7l2',
        settleAmount: '175.34632241',
        settleCoin: 'BCH',
        settleNetwork: 'bitcoincash',
        status: 'waiting',
        type: 'fixed'
      },
      {
        createdAt: '2023-03-07T07:29:28.844Z',
        depositAddress: '3C1Lddx276BdxXfpA16p6Lb3LHV8iCHMGU',
        depositAmount: '1.00000000',
        depositCoin: 'BTC',
        depositNetwork: 'bitcoin',
        expiresAt: '2023-03-07T07:44:25.699Z',
        id: 'cf5e53fbddb5e14d0738',
        quoteId: 'd5a2c54d-9751-4687-ba03-79b23bc996ff',
        rate: '175.34632241',
        settleAddress: 'bitcoincash:qzvn7qemhd9m4sw333pke04me5v0uja2tgnvldj7l2',
        settleAmount: '175.34632241',
        settleCoin: 'BCH',
        settleNetwork: 'bitcoincash',
        status: 'waiting',
        type: 'fixed'
      }]
    }
  },
  methods: {
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
    async getTransactions () {
      const vm = this
      console.log('Getting Transactions')
      const mnemonic = await getMnemonic()
      const wallet = new Wallet(mnemonic)

      const baseUrl = 'https://twelve-guests-tan-49-145-106-154.loca.lt/api'
      const walletHash = wallet.BCH.getWalletHash()
      const url = baseUrl + '/ramp/history/' + walletHash

      console.log(url)
      // vm.$parent.getShiftHistory()
      // const response = await vm.$axios.post(baseUrl + '/ramp/shift', info)
      const response = await vm.$axios.get(url).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      if (response.status === 200 || response.status === 201) {
        console.log('history data')
        // console.log(response.data)

        vm.transactions = response.data
        console.log(vm.transactions)
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
