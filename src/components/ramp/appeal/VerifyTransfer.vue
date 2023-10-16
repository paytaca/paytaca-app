<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">
    <div>
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
    </div>
    <div class="text-center lg-font-size bold-text text-uppercase q-py-sm">Verifying Transfer</div>

    <q-separator class="q-my-sm q-mx-lg" :dark="darkMode"/>
    <div class="q-py-md q-mx-lg q-px-sm">
      <div class="sm-font-size q-pb-xs">Contract Address</div>
      <q-input
        class="q-pb-sm"
        readonly
        :dark="darkMode"
        filled
        dense
        v-model="contract.address"
        :loading="!contract.address">
        <template v-slot:append>
          <div v-if="contract.address" @click="copyToClipboard(contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <!-- <div class="sm-font-size q-pb-xs">Contract</div>
      <q-input class="q-pb-xs q-pb-lg" disable dense filled :dark="darkMode" v-model="contract">
      </q-input> -->

      <div class="sm-font-size q-pb-xs">TXID</div>
      <div @click="copyToClipboard(transactionId)">
        <q-input
          class="q-pb-xs"
          disable
          dense
          filled
          :dark="darkMode"
          :loading="!transactionId"
          v-model="transactionId">
            <template v-slot:append v-if="transactionId">
              <q-icon size="sm" name="content_copy"/>
            </template>
        </q-input>
      </div>
      <div class="row q-mt-sm sm-font-size" style="color: grey">
        Contract balance: {{ contract.balance ? contract.balance : 0 }} BCH
      </div>
      <div class="row q-mb-md">
          <q-btn
            v-if="!loading && !hideBtn"
            rounded
            :disable="hideBtn"
            label="Verify"
            color="blue-6"
            class="col q-mx-lg q-mb-md q-py-sm q-my-md"
            @click="onVerify">
          </q-btn>
        <div v-if="hideBtn" class="q-mt-md">
          <span v-if="state === 'verifying'">
            <q-spinner class="q-mr-sm"/>Verifying transaction, please wait <span v-if="waitSeconds">({{ waitSeconds }}s)</span>
          </span>
          <span v-if="state === 'sending'">
            <q-spinner class="q-mr-sm"/>Sending bch, please wait.
          </span>
        </div>
      </div>
    </div>
  </q-card>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      loading: true,
      contract: {
        balance: null,
        address: ' '
      },
      transactionId: '',
      txExists: false,
      timer: null,
      waitSeconds: null,
      hideBtn: true,
      state: '',
      errorMessages: []
    }
  },
  emits: ['back'],
  props: {
    orderId: {
      type: Number,
      default: null
    },
    wallet: {
      type: Object,
      default: null
    },
    rampContract: Object,
    action: String,
    initState: String,
    txid: String,
    errors: Array
  },
  async mounted () {
    const vm = this
    vm.state = vm.initState
    vm.errorMessages.push(...vm.errors)
    if (vm.txid && vm.txid.length > 0) {
      vm.transactionId = vm.txid
    }
    if (!vm.transactionId) {
      vm.transactionId = this.$store.getters['ramp/getOrderTxid'](vm.orderId, vm.action)
    }
    await vm.fetchContractDetail()
    vm.loading = false
  },
  methods: {
    async fetchContractDetail () {
      const vm = this
      vm.loading = true
      const url = `${vm.apiURL}/order/${vm.orderId}/contract`
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        console.log('response:', response)
        vm.contract.address = response.data.contract.address

        if (this.rampContract) {
          vm.contract.balance = await this.rampContract.getBalance()
        }
        const transactions = response.data.transactions
        let valid = false
        let verifying = true

        if (transactions) {
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i].txn
            verifying = tx.verifying
            if (tx.action === vm.action) {
              vm.txExists = true
              vm.transactionId = tx.txid
              verifying = tx.verifying
              valid = tx.valid
              break
            }
          }
        }
        if (vm.txExists && !valid && !verifying) {
          vm.hideBtn = false
        }
        vm.waitSeconds = 60
        vm.timer = setInterval(function () {
          vm.waitSeconds--
          if (vm.waitSeconds === 0) {
            vm.hideBtn = false
            clearInterval(vm.timer)
          }
        }, 1000)
      } catch (error) {
        console.error(error.response)
      }
    },
    async verifyTxn () {
      const vm = this
      vm.state = 'verifying'
      let url = `${vm.apiURL}/order/${vm.orderId}/`
      if (vm.action === 'RELEASE') {
        url = `${url}verify-release`
      } else {
        url = `${url}verify-refund`
      }
      await vm.$axios.post(url, { txid: this.transactionId }, { headers: vm.authHeaders })
        .then(response => {
          console.log('response:', response)
        })
        .catch(error => {
          console.error(error.response)
          const errorMsg = error.response.data.error
          vm.errorMessages.push(errorMsg)
          vm.hideBtn = false
        })
    },
    onVerify () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessages = []
      vm.verifyTxn()
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>
