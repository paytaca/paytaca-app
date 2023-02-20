<template>
  <q-dialog ref="dialog" full-width>
    <q-card class="q-mx-sm br-15" :class="darkMode ? 'pt-dark' : 'text-black'">
      <q-card-section>
        <div class="col text-h5" :class="darkMode ? 'text-white' : 'pp-text'">
          <span style="font-size:15px">Deposit History</span>
        </div>
        <q-separator class="q-my-md" :color="darkMode ? 'white' : 'grey-7'"/>
        <div>
          <div v-for="deposit in depositList">
            <div class="row q-my-sm text-h5" :class="darkMode ? 'text-white' : 'pp-text'" @click="$event => $emit('testing', 'hello world')">
              <div class="col-6 q-pl-md">
                <div class="row">
                  <span style="font-size: 13px">{{ deposit.depositCoin }} to BCH</span>
                </div>
                <div class="row">
                  <span style="color: gray; font-size: 11px;">{{ getDate(deposit.createdAt) }}</span>
                </div>
              </div>
              <div class="col-6 q-pr-md" style="text-align: right;">
                <div class="row">
                  <span style="font-size: 13px;">Status: {{ deposit.status }}</span>
                </div>
                <div class="row">
                  <span style="color: gray; font-size: 11px;">{{ deposit.id }}</span>
                </div>
              </div>
            </div>
            <q-separator class="q-my-md"/>
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
      depositList: [],
      darkMode: c
    }
  },
  methods: {
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    }
  },
  props: {
    transactionList: Array
  },
  async mounted () {
    const vm = this

    vm.depositList = vm.transactionList
  }
}
</script>
