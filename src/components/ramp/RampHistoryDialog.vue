<template>
  <q-dialog ref="dialog" full-width>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'" class="br-15">
      <div class="q-py-lg q-pl-md text-subtitle1">
        Transaction History
      </div>
    </q-card>
  </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
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
      }]
    }
  }
}
</script>
