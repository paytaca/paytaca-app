<template>
  <div
    class="q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-sm q-px-md">
      <div class="sm-font-size q-pl-xs q-pb-xs">Arbiter</div>
      <q-select
        class="q-mb-sm"
        :dark="darkMode"
        filled
        dense
        v-model="selectedArbiter"
        hide-bottom-space
        :loading="arbiterOptions?.length > 0 && !selectedArbiter"
        :label="selectedArbiter ? selectedArbiter.address : ''"
        :options="arbiterOptions"
        :disable="!contractAddress || sendingBch || !hasArbiters"
        @update:model-value="selectArbiter"
        behavior="dialog">
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label :style="darkMode ? 'color: white;' : 'color: black;'">
                  {{ scope.opt.name }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
          <template v-slot:selected v-if="selectedArbiter">
            <span :style="darkMode ? 'color: white;' : 'color: black;'">
              {{ selectedArbiter.name }}
            </span>
          </template>
      </q-select>
      <div class="sm-font-size q-pl-xs q-pb-xs">Contract Address</div>
      <q-input
        class="q-pb-sm"
        readonly
        filled
        dense
        hide-bottom-space
        bottom-slots
        error-message="Contract address mismatch"
        :error="contractAddress && escrowContract?.getAddress() && !contractAddressMatch"
        :dark="darkMode"
        :loading="hasArbiters && !contractAddress"
        :disable="!hasArbiters"
        v-model="contractAddress">
        <template v-slot:append v-if="contractAddress">
          <div @click="copyToClipboard(contractAddress)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
          <div @click="onReloadContractAddress()">
            <q-icon size="sm" name='loop' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>

      <!-- Display contract balance -->
      <div class="sm-font-size q-pl-xs q-pb-xs">Contract Balance</div>
      <q-input
        class="q-pb-sm"
        readonly
        filled
        dense
        :dark="darkMode"
        :loading="escrowBalance === null"
        v-model:model-value="escrowBalance">
      </q-input>
      <div class="sm-font-size q-pl-xs q-pb-xs">Transfer Amount</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        filled
        dense
        hide-bottom-space
        :dark="darkMode"
        v-model="transferAmount"
        :error="balanceExceeded"
        :error-message="balanceExceeded? $t('Insufficient balance') : ''">
        <template #append>
          <div class="md-font-size">BCH</div>
        </template>
      </q-input>
      <div class="row q-mb-md" v-if="sendErrors.length > 0">
        <div class="col">
          <ul style="margin-left: -40px; list-style: none;">
            <li v-for="(error, index) in sendErrors" :key="index" class="bg-red-1 text-red q-pa-lg pp-text">
              <q-icon name="error" left/>
              {{ error }}
            </li>
          </ul>
        </div>
      </div>
      <div v-else>
        <!-- <div v-if="sendingBch" class="sm-font-size">
          <q-spinner class="q-mr-sm"/>{{ $t('SendingBchPleaseWait') }}
        </div> -->
        <div class="sm-font-size q-mt-sm">
          <div class="row q-ml-xs">
            Fee: <q-spinner-facebook v-if="!fees" class="q-mx-sm q-mt-xs"/><span v-if="fees" class="q-ml-sm"> {{ fees?.total / 100000000 }} BCH</span>
          </div>
          <div class="row q-ml-xs">
            Balance: {{ balance }} BCH
          </div>
        </div>
      </div>
    </div>
    <!-- Warning message for when no currency arbiter is available for ad -->
    <div v-if="!hasArbiters" class="warning-box q-mx-lg q-my-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
      There’s currently no arbiter assigned for transactions related to this ad in its currency ({{ this.order?.ad?.fiat_currency?.symbol }}). Please try again later.
    </div>
    <RampDragSlide
      :key="dragSlideKey"
      :locked="!contractAddressMatch"
      v-if="showDragSlide"
      :style="{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1500,
      }"
      @ok="onSecurityOk"
      @cancel="onSecurityCancel"
      text="Swipe To Escrow"
    />
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { backend } from 'src/wallet/ramp/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import RampContract from 'src/wallet/ramp/contract'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      wallet: null,
      loading: false,
      order: null,
      adData: null,
      selectedArbiter: null,
      arbiterOptions: [],
      contractAddress: null,
      fees: null,
      transferAmount: null,
      txid: null,
      dragSlideOn: false,
      sendErrors: [],
      sendingBch: false,
      dragSlideKey: 0,
      escrowContract: null,
      escrowBalance: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  emits: ['back', 'success', 'refresh', 'updateArbiterStatus', 'sending'],
  components: {
    RampDragSlide
  },
  props: {
    data: Object
  },
  watch: {
    sendingBch (val) {
      this.$emit('sending', val)
    },
    fees (value) {
      if (value) this.dragSlideOn = true
    },
    arbiterOptions (value) {
      this.$emit('updateArbiterStatus', value?.length > 0)
    }
  },
  computed: {
    contractAddressMatch () {
      const localContractAddress = this.escrowContract?.getAddress()
      return localContractAddress === this.contractAddress
    },
    hasArbiters () {
      return this.arbiterOptions?.length > 0
    },
    showDragSlide () {
      return (this.dragSlideOn && this.arbiterOptions?.length > 0 && !this.sendingBch && this.contractAddress)
    },
    arbiterOptionsMessage () {
      return `No available arbiter found for currency ${this.order?.ad?.fiat_currency?.symbol}`
    },
    balance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    balanceExceeded () {
      if (this.transferAmount > parseFloat(this.balance)) {
        return true
      }
      return false
    },
    fiatAmount () {
      let amount = Number(parseFloat(this.order?.crypto_amount) * parseFloat(this.order?.locked_price))
      if (amount > 1) amount = amount.toFixed(2)
      return this.$parent.formattedCurrency(amount)
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.loadData()
    vm.loadContract()
    vm.wallet = loadRampWallet()
  },
  methods: {
    getDarkModeClass,
    onReloadContractAddress () {
      this.generateContractAddress(true)
      this.$emit('refresh')
    },
    selectArbiter () {
      this.contractAddress = null
      this.generateContractAddress()
    },
    async loadContract () {
      const vm = this
      await vm.fetchArbiters()
      // init arbiter and contract address if already existing
      if (vm.data.arbiter) vm.selectedArbiter = vm.data.arbiter
      if (vm.data.contractAddress) vm.contractAddress = vm.data.contractAddress

      // if arbiters are available, generate contract address
      if (vm.hasArbiters) {
        // generate contract address if not existing yet
        if (!vm.contractAddress) {
          // generates the contract address
          await vm.generateContractAddress()
        }
      }
      // generates the contract object
      await vm.generateContract()
      // mark contract as pending for verification, if the contract is already funded
      vm.escrowBalance = await vm.escrowContract.getBalance()
      if (vm.escrowBalance > 0) {
        if (vm.order?.status?.value === 'CNF') {
          vm.escrowPendingOrder()
        }
      }
    },
    loadData () {
      const vm = this
      vm.order = vm.data.order
      vm.fees = vm.data.fees
      vm.updateTransferAmount(vm.data.transferAmount)
      if (vm.contractAddress) {
        vm.$emit('refresh')
      }
    },
    updateTransferAmount (transferAmount) {
      this.transferAmount = transferAmount
      if (this.fees) {
        this.transferAmount += this.fees.total / 100000000
      }
      this.transferAmount = parseFloat(this.transferAmount.toFixed(8))
    },
    async completePayment () {
      const vm = this
      vm.sendErrors = []
      vm.escrowBch()
    },
    async escrowBch () {
      const vm = this
      if (!vm.contractAddressMatch) {
        vm.sendErrors.push('Contract address mismatch')
        vm.dragSlideOn = true
        vm.dragSlideKey++
        return
      }
      console.log('Contract address matched. Sending BCH...')
      vm.sendingBch = true
      try {
        const wallet = await vm.wallet.raw()
        const utxos = await vm.escrowContract.getUtxos()
        if (vm.escrowBalance === 0 && utxos.length === 0) {
          vm.$store.commit('ramp/clearOrderTxids', vm.order?.id)
          console.log(`Sending ${vm.transferAmount} BCH to ${vm.contractAddress}`)
          const result = await wallet.sendBch(vm.transferAmount, vm.contractAddress)
          console.log('sendBch:', result)
          if (result?.success) {
            vm.txid = result.txid
            const txidData = {
              id: vm.order?.id,
              txidInfo: {
                action: 'ESCROW',
                txid: this.txid
              }
            }
            vm.$store.commit('ramp/saveTxid', txidData)
            vm.escrowBalance = await vm.escrowContract.getBalance()
            vm.$emit('success', vm.txid)
            if (vm.order?.status?.value === 'CNF') {
              vm.escrowPendingOrder()
            }
          } else {
            vm.sendErrors = []
            if (result) {
              if (result?.error?.indexOf('not enough balance in sender') > -1) {
                vm.sendErrors.push('Not enough balance to cover the send amount and transaction fee')
              } else if (result?.error?.indexOf('has insufficient priority') > -1) {
                vm.sendErrors.push('Not enough balance to cover the transaction fee')
              } else {
                vm.sendErrors.push(result?.error)
              }
            } else {
              vm.sendErrors.push('An unexpected error has occurred')
            }
            vm.dragSlideOn = true
            vm.dragSlideKey++
          }
        } else {
          console.error('Contract already funded/multiple UTXOs found when contract only requires 1.')
          vm.sendErrors.push('Contract already funded/multiple UTXOs found when contract only requires 1')
        }
      } catch (error) {
        vm.sendErrors.push(error)
        vm.dragSlideOn = true
        vm.dragSlideKey++
      }
      vm.sendingBch = false
    },
    escrowPendingOrder () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.loading = true
        backend.post(`/ramp-p2p/order/${vm.order?.id}/pending-escrow`, null, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            console.error(error)
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    fetchArbiters () {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get('ramp-p2p/arbiter', { params: { currency: vm.order.ad.fiat_currency.symbol }, authorize: true })
          .then(response => {
            vm.arbiterOptions = response.data
            if (vm.arbiterOptions.length > 0) {
              if (!vm.selectedArbiter) {
                vm.selectedArbiter = vm.arbiterOptions[0]
              } else {
                vm.selectedArbiter = vm.arbiterOptions.find(function (obj) {
                  return Number(obj.id) === vm.selectedArbiter.id
                })
              }
            } else {
              vm.selectedArbiter = null
              vm.contractAddress = null
            }
            resolve(response.data)
            vm.loading = false
          })
          .catch(error => {
            console.error(error.response)
            if (error.response) {
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              bus.emit('network-error')
            }
            vm.loading = false
            reject(error)
          })
      })
    },
    generateContractAddress (force = false) {
      return new Promise((resolve, reject) => {
        const vm = this
        const body = {
          order_id: vm.order?.id,
          arbiter_id: vm.selectedArbiter?.id,
          force: force
        }
        backend.post('/ramp-p2p/order/contract/create', body, { authorize: true })
          .then(response => {
            vm.contractAddress = response.data?.address
            vm.loading = false
            resolve(response.data)
          })
          .catch(error => {
            console.error(error.response)
            if (error.response) {
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              bus.emit('network-error')
            }
            vm.loading = false
            reject(error)
          })
      })
    },
    checkSufficientBalance () {
      if (this.transferAmount > parseFloat(this.balance)) {
        this.balanceExceeded = true
      } else {
        this.balanceExceeded = false
      }
    },
    onSecurityOk () {
      this.dragSlideOn = false
      this.dragSlideKey++
      this.completePayment()
    },
    onSecurityCancel () {
      this.dragSlideOn = true
      this.dragSlideKey++
    },
    formattedAddress (address) {
      const startLength = 35
      const endLength = 5
      if (address.length <= startLength + endLength) {
        return address
      }
      return address.slice(0, startLength) + '...' + address.slice(-endLength)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    async generateContract () {
      const vm = this
      const fees = await vm.fetchFees()
      await vm.fetchContract(vm.order.id).then(contract => {
        if (vm.escrowContract || !contract) return
        const publicKeys = contract.pubkeys
        const addresses = contract.addresses
        const fees_ = {
          arbitrationFee: fees.breakdown?.arbitration_fee,
          serviceFee: fees.breakdown?.service_fee,
          contractFee: fees.breakdown?.hardcoded_fee
        }
        const timestamp = contract.timestamp
        const isChipnet = vm.$store.getters['global/isChipnet']
        vm.escrowContract = new RampContract(publicKeys, fees_, addresses, timestamp, isChipnet)
      })
    },
    fetchContract (orderId) {
      return new Promise((resolve, reject) => {
        const url = '/ramp-p2p/order/contract'
        backend.get(url, { params: { order_id: orderId }, authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    },
    fetchFees () {
      return new Promise((resolve, reject) => {
        const url = '/ramp-p2p/order/contract/fees'
        backend.get(url, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            if (error.response) {
              console.error(error.response)
              if (error.response.status === 403) {
                bus.emit('session-expired')
              }
            } else {
              console.error(error)
              bus.emit('network-error')
            }
            reject(error)
          })
      })
    }
  }
}
</script>
<style scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}

.warning-box {
  padding: 10px;
  border-radius: 5px;
}
.warning-box-light {
  background-color: #fff9c4; /* Light yellow background */
  border: 1px solid #fbc02d; /* Border color */
}
.warning-box-dark {
  background-color: #333; /* Dark mode background color */
  color: #fff; /* Text color for dark mode */
  border: 1px solid #fbc02d; /* Border color */
}
</style>
