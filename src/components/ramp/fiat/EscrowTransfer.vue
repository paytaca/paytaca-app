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
        v-model="transferAmount"
        :loading="!transferAmount"
        :dark="darkMode"
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
    <div v-if="!loading && !hasArbiters" class="warning-box q-mx-lg q-my-sm" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
      There’s currently no arbiter assigned for transactions related to this ad in its currency ({{ this.order?.ad?.fiat_currency?.symbol }}). Please try again later.
    </div>
    <div class="row q-mt-sm q-pt-xs q-mx-lg">
      <q-btn
        :loading="loadCancelButton"
        flat
        :disable="!showDragSlide"
        label="Cancel order"
        class="q-space text-white br-15"
        color="blue-6"
        @click="$emit('cancel')"
      />
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
import { wallet } from 'src/exchange/wallet'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import RampContract from 'src/exchange/contract'
import packageInfo from '../../../../package.json'
import { bchToFiat, satoshiToBch } from 'src/exchange'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      loadCancelButton: false
    }
  },
  emits: ['back', 'success', 'refresh', 'updateArbiterStatus', 'sending', 'cancel'],
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
      let amount = bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
      if (amount > 1) amount = amount.toFixed(2)
      return this.$parent.formattedCurrency(amount)
    }
  },
  async mounted () {
    await this.loadData()
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
      // fetches the contract fees
      await vm.fetchFees()
      // generates the contract object
      await vm.generateContract()
      // mark contract as pending for verification, if the contract is already funded
      vm.escrowBalance = await vm.escrowContract.getBalance(null, true)
      if (vm.escrowBalance > 0) {
        if (vm.order?.status?.value === 'CNF') {
          await vm.escrowPendingOrder()
        }
      }
    },
    async loadData () {
      this.loading = true
      this.order = this.data.order
      await this.loadContract()
      const transferAmount = this.data.transferAmount
      this.transferAmount = satoshiToBch(transferAmount + this.fees?.total)

      // if (this.order?.status?.value === 'CNF') {
      //   this.$emit('refresh')
      // }

      this.loading = false
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
        const utxos = await vm.escrowContract.getUtxos()
        if (vm.escrowBalance === 0 && utxos.length === 0) {
          vm.$store.commit('ramp/clearOrderTxids', vm.order?.id)
          console.log(`Sending ${vm.transferAmount} BCH to ${vm.contractAddress}`)
          const rawWallet = await wallet.getRawWallet()
          const result = await rawWallet.sendBch(vm.transferAmount, vm.contractAddress)
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
            vm.escrowBalance = await vm.escrowContract.getBalance(null, true)
            vm.$emit('success', vm.txid)
            if (vm.order?.status?.value === 'CNF') {
              await vm.escrowPendingOrder()
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
    async escrowPendingOrder () {
      const vm = this
      vm.loading = true
      await backend.post(`/ramp-p2p/order/${vm.order?.id}/pending-escrow/`, null, { authorize: true })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchArbiters () {
      const vm = this
      await backend.get('ramp-p2p/arbiter/', { params: { currency: vm.order.ad.fiat_currency.symbol }, authorize: true })
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
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    getPlatform () {
      let platform = null
      if (this.$q.platform.is.mobile) {
        platform = 'android'
      }
      if (this.$q.platform.is.ios) {
        platform = 'ios'
      }
      if (this.$q.platform.is.bex) {
        platform = 'web'
      }
      return platform
    },
    generateContractAddress (force = false) {
      return new Promise((resolve, reject) => {
        const vm = this
        const body = {
          order_id: vm.order?.id,
          arbiter_id: vm.selectedArbiter?.id,
          force: force
        }
        const headers = {
          version: packageInfo.version,
          platform: this.getPlatform()
        }
        backend.post('/ramp-p2p/order/contract/', body, { headers: headers, authorize: true })
          .then(response => {
            vm.contractAddress = response.data?.address
            vm.loading = false
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
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
      await vm.fetchContract(vm.order.id).then(contract => {
        if (vm.escrowContract || !contract) return
        const publicKeys = contract.pubkeys
        const addresses = contract.addresses
        const fees_ = {
          arbitrationFee: vm.fees?.breakdown?.arbitration_fee,
          serviceFee: vm.fees?.breakdown?.service_fee,
          contractFee: vm.fees?.breakdown?.contract_fee
        }
        const timestamp = contract.timestamp
        const isChipnet = vm.$store.getters['global/isChipnet']
        vm.escrowContract = new RampContract(publicKeys, fees_, addresses, timestamp, isChipnet)
      })
    },
    fetchContract (orderId) {
      return new Promise((resolve, reject) => {
        const url = `/ramp-p2p/order/${orderId}/contract/`
        backend.get(url, { authorize: true })
          .then(response => {
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    async fetchFees () {
      const url = `/ramp-p2p/order/${this.order?.id}/contract/fees/`
      await backend.get(url, { authorize: true })
        .then(response => {
          this.fees = response.data
        })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
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
