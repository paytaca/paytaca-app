<template>
  <q-dialog ref="dialog" full-width>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'" class="br-15">
      <div class="q-pt-lg q-pl-md text-subtitle1">
        Transaction History
      </div>
      <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
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
                  <span style="font-size: 13px;">Status: {{ transaction.status }}</span>
                </div>
                <div class="row">
                  <span style="color: gray; font-size: 10px; overflow-wrap: break-word;">{{ transaction.id }}</span>
                </div>
              </div>
            </div>
            <q-separator class="q-my-md" :color="darkMode ? 'white' : 'gray'"/>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      transactions: [],
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
    }
  }
}
</script>
<style lang="scss" scoped>
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
</style>
