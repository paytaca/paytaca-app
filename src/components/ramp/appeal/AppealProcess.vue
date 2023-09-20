<template>
  <div v-if="isloaded">
    <div v-if="state === 'release-form'">
      <ReleaseForm
        :appealInfo="appeal"
        @back="$emit('back')"
        @submit="onSubmit"
      />
    </div>

    <div v-if="state === 'verify-transfer'">
      <VerifyTransfer
        @back="$emit('back')"
      />
    </div>

    <div v-if="state === 'completed-appeal'">
      <CompletedAppeal
        :appealInfo="appeal"
        @back="$emit('back')"
      />
    </div>
  </div>
</template>
<script>
import { loadP2PWalletInfo, formatCurrency } from 'src/wallet/ramp'
import RampContract from 'src/wallet/ramp/contract'
import { signMessage } from '../../../wallet/ramp/signature.js'
import CompletedAppeal from './CompletedAppeal.vue'
import ReleaseForm from './ReleaseForm.vue'
import VerifyTransfer from './VerifyTransfer.vue'

export default {
  data () {
    return {
      walletIndex: this.$store.getters['global/getWalletIndex'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      state: 'release-form',
      appeal: null,
      isloaded: false
    }
  },
  props: {
    selectedAppeal: Object,
    initWallet: Object
  },
  emits: ['back'],
  components: {
    ReleaseForm,
    VerifyTransfer,
    CompletedAppeal
  },
  async mounted () {
    const vm = this
    vm.appeal = vm.selectedAppeal
    console.log('appeal:', vm.appeal)
    if (vm.initWallet) {
      vm.wallet = vm.initWallet
    } else {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
    }
    vm.isloaded = true
  },
  methods: {
    async onSubmit (action) {
      const vm = this
      const timestamp = Date.now()
      let signMessage = null
      let url = `${vm.apiURL}/order/${vm.appeal.order.id}/appeal/`
      switch (action) {
        case 'release':
          signMessage = 'APPEAL_PENDING_RELEASE'
          url = url + 'pending-release'
          break
        case 'refund':
          signMessage = 'APPEAL_PENDING_REFUND'
          url = url + 'pending-refund'
          break
        default:
          return
      }
      const signature = await signMessage(vm.wallet.privateKeyWif, signMessage, timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }
      vm.$axios.post(url, {}, { headers: headers })
        .then(response => {
          console.log(response)
          vm.generateContract()
            .then(contract => {
              switch (action) {
                case 'release':
                  vm.releaseBch(contract)
                  break
                case 'refund':
                  vm.refundBch(contract)
                  break
              }
            })
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async releaseBch (contract) {
      // contract.release(this.wallet.privateKeyWif, amount)
    },
    async refundBch (contract) {
      // contract.refund(this.wallet.privateKeyWif, amount)
    },
    async refund (contract) {
      this.state = 'verify-transfer'
      console.log('contract balance:', await contract.getBalance())
    },
    async generateContract () {
      if (!this.contract || !this.fees) return
      const publicKeys = {
        arbiter: this.contract.arbiter.public_key,
        seller: this.contract.seller.public_key,
        buyer: this.contract.buyer.public_key,
        servicer: this.contract.servicer.public_key
      }
      const addresses = {
        arbiter: this.contract.arbiter.address,
        seller: this.contract.seller.address,
        buyer: this.contract.buyer.address,
        servicer: this.contract.servicer.address
      }
      const fees = {
        arbitrationFee: this.fees.fees.arbitration_fee,
        serviceFee: this.fees.fees.service_fee,
        contractFee: this.fees.fees.hardcoded_fee
      }
      const timestamp = this.contract.timestamp
      const rampContract = new RampContract(publicKeys, fees, addresses, timestamp, false)
      await rampContract.initialize()
      return rampContract
    }
  }
}
</script>
