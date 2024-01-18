<template>
  <div>
    <div class="text-center lg-font-size bold-text">ESCROW BCH</div>
    <div style="opacity: .5;" class="text-center q-pb-sm xs-font-size bold-text">(ORDER #{{ order?.id }})</div>
    <q-separator :dark="darkMode" class="q-mx-lg"/>
    <q-scroll-area :style="`height: ${minHeight - 225}px`" style="overflow-y:auto;">
      <div class="q-mx-lg q-px-lg q-pt-md">
        <div class="sm-font-size q-pl-xs q-pb-xs">Arbiter</div>
        <q-select
          class="q-pb-sm"
          :dark="darkMode"
          filled
          dense
          v-model="selectedArbiter"
          :loading="!selectedArbiter"
          :label="selectedArbiter ? selectedArbiter.address : ''"
          :options="arbiterOptions"
          :disable="!contractAddress || sendingBch"
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
        <!-- </div> -->
        <!-- <div class="row q-mt-md"> -->

        <div class="sm-font-size q-pl-xs q-pb-xs">Contract Address</div>
        <q-input
          class="q-pb-sm"
          readonly
          :dark="darkMode"
          filled
          dense
          :label="contractAddress"
          :loading="!contractAddress">
          <template v-slot:append v-if="contractAddress">
            <div @click="copyToClipboard(contractAddress)">
              <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
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
        <div class="col text-right sm-font-size q-pl-sm">
          = {{ fiatAmount }} {{ order?.fiat_currency.symbol }}
        </div>
        <!-- </div> -->
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
    </q-scroll-area>
    <RampDragSlide
      :key="dragSlideKey"
      v-if="showDragSlide && data?.wsConnected"
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
import RampDragSlide from './dialogs/RampDragSlide.vue'
import { rampWallet } from 'src/wallet/ramp/wallet'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      wallet: this.$store.getters['ramp/wallet'],
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
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      dragSlideKey: 0
    }
  },
  emits: ['back', 'success'],
  components: {
    RampDragSlide
  },
  props: {
    data: Object
  },
  watch: {
    selectedArbiter (newValue, oldValue) {
      if (!oldValue || oldValue?.id === newValue?.id) return
      this.contractAddress = null
      this.generateContractAddress()
    },
    fees (value) {
      if (value) this.showDragSlide = true
    }
  },
  computed: {
    balance () {
      return this.$parent.bchBalance
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
  },
  methods: {
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
      const status = vm.order?.status?.value
      vm.sendErrors = []
      if (status === 'CNF') {
        vm.escrowPendingOrder()
          .then(data => {
            if (data && data.success) {
              vm.escrowBch()
            }
          })
      }
      if (status === 'ESCRW_PN') {
        vm.escrowBch()
      }
    },
    async escrowBch () {
      const vm = this
      vm.sendingBch = true
      try {
        const wallet = await rampWallet.raw()
        const result = await wallet.sendBch(vm.transferAmount, vm.contractAddress)
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
        }
      } catch (error) {
        vm.sendErrors.push(error)
        vm.showDragSlide = true
        vm.dragSlideKey++
      }
      vm.sendingBch = false
    },
    escrowPendingOrder () {
      return new Promise((resolve, reject) => {
        const vm = this
        const url = vm.apiURL + '/order/' + vm.order?.id + '/pending-escrow'
        vm.loading = true
        vm.$axios.post(url, null, { headers: vm.authHeaders })
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
                  return obj.id === vm.selectedArbiter.id
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
    generateContractAddress () {
      return new Promise((resolve, reject) => {
        const vm = this
        const body = {
          order_id: vm.order?.id,
          arbiter_id: vm.selectedArbiter.id
        }
        backend.post('/ramp-p2p/order/contract/create', body, { authorize: true })
          .then(response => {
            if (response.data.data) {
              const data = response.data.data
              if (data.contract_address) {
                vm.contractAddress = data.contract_address
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

.bold-text {
  font-weight: bold;
}
</style>
