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
        :loading="!contract">
        <template v-slot:append v-if="contract.address">
          <div @click="copyToClipboard(contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <!-- <div class="sm-font-size q-pb-xs">Contract</div>
      <q-input class="q-pb-xs q-pb-lg" disable dense filled :dark="darkMode" v-model="contract">
      </q-input> -->

      <div class="sm-font-size q-pb-xs">TXID</div>
      <div @click="copyToClipboard(transactionId)">
        <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="transactionId">
          <template v-slot:append>
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
            Verifying transaction, please wait... <span v-if="waitSeconds">({{ waitSeconds }}s)</span>
          </span>
          <span v-if="state === 'sending'">Sending bch, please wait...</span>
        </div>
      </div>
      <!-- <div class="q-py-md" :class="darkMode ? '' : 'text-grey-7'">Verifying transfer, please wait...</div> -->
    </div>
  </q-card>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
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
      errorMessages: [],
      state: ''
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
    txid: String,
    errors: Array
  },
  async mounted () {
    const vm = this
    vm.errorMessages.push(...vm.errors)
    if (vm.txid && vm.txid.length > 0) {
      vm.transactionId = vm.txid
    }
    if (!vm.transactionId) {
      vm.transactionId = this.$store.getters['ramp/getOrderTxid'](vm.orderId, vm.action)
    }
    await vm.fetchOrderDetail()
    vm.loading = false
  },
  methods: {
    async fetchOrderDetail () {
      const vm = this
      const headers = {
        'wallet-hash': vm.wallet.walletHash
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.orderId

      try {
        const response = await vm.$axios.get(url, { headers: headers })
        vm.contract.address = response.data.contract.address
        // vm.contract.balance = await getBalanceByAddress(vm.contract.address)
        if (this.rampContract) {
          vm.contract.balance = await this.rampContract.getBalance()
          console.log('balance:', vm.contract.balance)
        }
        // console.log('contract:', response.data.contract)
        const transactions = response.data.contract.transactions
        let valid = false
        let verifying = true
        // console.log('transactions:', transactions)
        if (transactions) {
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i]
            // console.log('action:', vm.action)
            // console.log('tx:', tx)
            verifying = tx.verifying
            if (tx.action === vm.action) {
              vm.txExists = true
              vm.transactionId = tx.txid
              valid = tx.valid
              break
            }
          }
        }
        // console.log('txExists:', vm.txExists, 'valid:', valid, 'verifying:', verifying)
        if (vm.txExists && !valid && !verifying) {
          vm.hideBtn = false
        }
        // if (!vm.txExists) {
        vm.waitSeconds = 5
        vm.timer = setInterval(function () {
          vm.waitSeconds--
          if (vm.waitSeconds === 0) {
            vm.hideBtn = false
            // vm.errorMessages.push('Server took too long to respond')
            clearInterval(vm.timer)
          }
        }, 1000)
        // }
      } catch (error) {
        console.error(error.response)
      }
    },
    // async verifyRelease () {
    //   const vm = this
    //   vm.state = 'verifying'
    //   console.log('Verifying Release: ', vm.transactionId)
    //   const url = `${vm.apiURL}/order/${vm.orderId}/verify-release`
    //   const timestamp = Date.now()
    //   const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_RELEASE', timestamp)
    //   const headers = {
    //     'wallet-hash': vm.wallet.walletHash,
    //     signature: signature,
    //     timestamp: timestamp
    //   }
    //   const body = {
    //     txid: this.transactionId
    //   }
    //   await vm.$axios.post(url, body, { headers: headers })
    //     .then(response => {
    //       // console.log('response:', response)
    //     })
    //     .catch(error => {
    //       console.error(error.response)
    //       const errorMsg = error.response.data.error
    //       vm.errorMessages.push(errorMsg)
    //       vm.hideBtn = false
    //     })
    //   // await this.fetchOrderData()
    // },
    onVerify () {
      const vm = this
      vm.hideBtn = true
      vm.errorMessages = []
      // switch (vm.action) {
      //   case 'ESCROW':
      //     vm.verifyEscrow()
      //     break
      //   case 'RELEASE':
      //     vm.verifyRelease()
      //     break
      // }
      vm.fetchOrderDetail()
    },
    copyToClipboard (value) {
      console.log('copying')
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
