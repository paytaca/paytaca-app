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
        :loading="!selectedArbiter"
        :label="selectedArbiter ? selectedArbiter.address : ''"
        :options="arbiterOptions"
        :disable="!contractAddress || sendingBch"
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
        :error="contractAddressMatch(contractAddress) !== true"
        :dark="darkMode"
        :loading="!contractAddress"
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

      <div class="sm-font-size q-pl-xs q-pb-xs">Transfer Amount</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        filled
        dense
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
        <div v-if="sendingBch" class="sm-font-size">
          <q-spinner class="q-mr-sm"/>Sending BCH, please wait...
        </div>
        <div v-else class="sm-font-size q-mt-sm">
          <div class="row q-ml-xs">
            Fee: <q-spinner-facebook v-if="!fees" class="q-mx-sm q-mt-xs"/><span v-if="fees" class="q-ml-sm"> {{ fees?.total / 100000000 }} BCH</span>
          </div>
          <div class="row q-ml-xs">
            Balance: {{ balance }} BCH
          </div>
        </div>
      </div>
    </div>
    <RampDragSlide
      :key="dragSlideKey"
      :locked="!contractAddressMatch(contractAddress)"
      v-if="showDragSlide && data?.wsConnected && !sendingBch && contractAddress"
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
      showDragSlide: false,
      sendErrors: [],
      sendingBch: false,
      dragSlideKey: 0,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  emits: ['back', 'success', 'refresh'],
  components: {
    RampDragSlide
  },
  props: {
    data: Object
  },
  watch: {
    fees (value) {
      if (value) this.showDragSlide = true
    }
  },
  computed: {
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
    contractAddressMatch (contractAddress) {
      const localContractAddress = this.data.escrow?.getAddress()
      return localContractAddress === contractAddress
    },
    selectArbiter () {
      this.contractAddress = null
      this.generateContractAddress()
    },
    loadContract () {
      const vm = this
      vm.fetchArbiters().then(() => {
        if (!vm.contractAddress) {
          vm.generateContractAddress()
        }
      })
    },
    loadData () {
      const vm = this
      vm.order = vm.data.order
      vm.selectedArbiter = vm.data.arbiter
      vm.contractAddress = vm.data.contractAddress
      vm.fees = vm.data.fees
      vm.updateTransferAmount(vm.data.transferAmount)
    },
    updateTransferAmount (transferAmount) {
      this.transferAmount = transferAmount
      if (this.fees) {
        this.transferAmount += this.fees.total / 100000000
      }
    },
    async completePayment () {
      const vm = this
      vm.sendErrors = []
      vm.escrowBch()
    },
    escrowBch () {
      const vm = this
      if (!vm.contractAddressMatch(this.contractAddress)) {
        vm.sendErrors = ['Contract address mismatch']
        vm.showDragSlide = true
        vm.dragSlideKey++
        return
      }
      console.log('Contract address matched. Sending BCH...')
      return new Promise((resolve, reject) => {
        vm.$store.commit('ramp/clearOrderTxids', vm.order?.id)
        vm.sendingBch = true
        this.wallet.raw().then(wallet =>
          wallet.sendBch(vm.transferAmount, vm.contractAddress).then(result => {
            console.log('sendBch:', result)
            if (result.success) {
              vm.txid = result.txid
              const txidData = {
                id: vm.order?.id,
                txidInfo: {
                  action: 'ESCROW',
                  txid: this.txid
                }
              }
              vm.$store.commit('ramp/saveTxid', txidData)
              vm.$emit('success', vm.txid)
              vm.sendingBch = false
              if (vm.order?.status?.value === 'CNF') {
                vm.escrowPendingOrder()
              }
              resolve(result)
            } else {
              vm.sendErrors = []
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.sendErrors.push('Not enough balance to cover the send amount and transaction fee')
              } else if (result.error.indexOf('has insufficient priority') > -1) {
                vm.sendErrors.push('Not enough balance to cover the transaction fee')
              } else {
                vm.sendErrors.push(result.error)
              }
              vm.showDragSlide = true
              vm.dragSlideKey++
              reject(result)
            }
          })
        ).catch(error => {
          vm.sendErrors.push(error)
          vm.showDragSlide = true
          vm.dragSlideKey++
          vm.sendingBch = false
          reject(error)
        })
      })
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
            }
            reject(error)
          })
      })
    },
    fetchArbiters () {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get('ramp-p2p/arbiter', { authorize: true })
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
            }
            resolve(response.data)
            vm.loading = false
          })
          .catch(error => {
            console.error(error.response)
            if (error.response && error.response.status === 403) {
              bus.emit('session-expired')
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
          arbiter_id: vm.selectedArbiter.id,
          force: force
        }
        backend.post('/ramp-p2p/order/contract/create', body, { authorize: true })
          .then(response => {
            if (response.data) {
              if (response.data.address) {
                vm.contractAddress = response.data.address
              }
            }
            resolve(response.data)
          })
          .catch(error => {
            console.error(error.response)
            if (error.response && error.response.status === 403) {
              bus.emit('session-expired')
            }
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
      this.showDragSlide = false
      this.dragSlideKey++
      this.completePayment()
    },
    onSecurityCancel () {
      this.showDragSlide = true
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
</style>
