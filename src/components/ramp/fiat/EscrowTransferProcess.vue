<template>
  <div class="q-pb-md">
    <q-scroll-area :style="`height: ${minHeight - minHeight*0.2}px`" style="overflow-y:auto;">
      <div class="text-center lg-font-size bold-text">ESCROW BCH</div>
      <div style="opacity: .5;" class="text-center q-pb-sm xs-font-size bold-text">( Order #{{ order.id }} )</div>
      <q-separator :dark="darkMode" class="q-mx-lg"/>
      <div class="q-mx-lg q-px-lg q-pt-md">
        <div class="sm-font-size q-pl-sm q-pb-xs">Arbiter</div>
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
                  <q-item-label :style="darkMode ? 'color: white;' : 'color: black;'">
                    {{ formattedAddress(scope.opt.address) }}
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

        <div class="sm-font-size q-pl-sm q-pb-xs">Contract Address</div>
        <q-input
          class="q-pb-sm"
          readonly
          :dark="darkMode"
          filled
          dense
          v-model="contractAddress"
          :loading="!contractAddress">
          <template v-slot:append v-if="contractAddress">
            <div @click="copyToClipboard(contractAddress)">
              <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
            </div>
          </template>
        </q-input>

        <div class="sm-font-size q-pl-sm q-pb-xs">Transfer Amount</div>
        <q-input
          readonly
          filled
          dense
          :dark="darkMode"
          v-model="transferAmount"
          :error="balanceExceeded"
          :error-message="balanceExceeded? $t('Insufficient balance') : ''">
          <template #append>
            <div class="sm-font-size">BCH</div>
          </template>
        </q-input>
        <!-- </div> -->
        <div v-if="sendingBch" class="sm-font-size">
          <q-spinner class="q-mr-sm"/>Sending BCH, please wait...
        </div>
        <div v-else class="sm-font-size q-mt-sm">
          <div v-if="fees" class="row q-ml-md">
            Fee: {{ fees.total / 100000000 }} BCH
          </div>
          <div class="row q-ml-md q-mt-xs">
            Balance: {{ balance }} BCH
          </div>
        </div>
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
      </div>
    </q-scroll-area>

    <RampDragSlide
      :key="dragSlideKey"
      v-if="showDragSlide && (!loading && contractAddress)"
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
  <!-- else progress loader -->
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import RampDragSlide from './dialogs/RampDragSlide.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      wallet: this.$store.getters['ramp/wallet'],
      adData: null,
      loading: false,
      selectedArbiter: null,
      arbiterOptions: [],
      contractAddress: null,
      transferAmount: ' ',
      txid: null,
      fees: null,
      showDragSlide: true,
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
    order: {
      type: Object,
      default: null
    },
    amount: {
      type: Number,
      default: 0
    },
    contract: Object
  },
  watch: {
    selectedArbiter (_, oldValue) {
      if (oldValue === null) return
      this.contractAddress = null
      this.generateContractAddress()
    },
    fees (value) {
      const totalFees = value.total / 100000000
      this.transferAmount += totalFees
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
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.transferAmount = vm.amount
    await vm.fetchOrderDetail()
    await vm.fetchArbiters()
    if (vm.contract) {
      vm.contractAddress = vm.contract.address
    } else {
      await vm.generateContractAddress()
    }
    if (vm.contractAddress) {
      vm.loading = false
    }
  },
  methods: {
    async completePayment () {
      // Send crypto to smart contract
      const vm = this
      await vm.escrowPendingOrder()
      try {
        vm.sendingBch = true
        const result = await vm.wallet.wallet.sendBch(vm.transferAmount, vm.contractAddress)
        console.log('sendBch:', result)
        if (result.success) {
          vm.txid = result.txid
          const txidData = {
            id: vm.order.id,
            txidInfo: {
              action: 'ESCROW',
              txid: this.txid
            }
          }
          vm.$store.commit('ramp/saveTxid', txidData)
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
        }
      } catch (err) {
        console.error(err.response)
        vm.showDragSlide = true
      }
      vm.sendingBch = false
    },
    async escrowPendingOrder () {
      const vm = this
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id + '/pending-escrow'
      try {
        const response = await vm.$axios.post(url, null, { headers: vm.authHeaders })
        console.log('response:', response)
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async fetchOrderDetail () {
      const vm = this
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        vm.fees = response.data.fees
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async fetchArbiters () {
      const vm = this
      const url = vm.apiURL + '/arbiter'
      try {
        const response = await vm.$axios.get(url, { headers: vm.authHeaders })
        console.log('response:', response)
        vm.arbiterOptions = response.data
        vm.selectedArbiter = vm.order.arbiter
        if (vm.arbiterOptions.length > 0) {
          if (!vm.selectedArbiter) {
            vm.selectedArbiter = vm.arbiterOptions[0]
          } else {
            vm.selectedArbiter = vm.arbiterOptions.find(function (obj) {
              return obj.id === vm.selectedArbiter.id
            })
          }
        }
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
    },
    async generateContractAddress () {
      // console.log('generateContractAddress')
      const vm = this
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id + '/generate-contract'
      const body = {
        arbiter: vm.selectedArbiter.id
      }
      try {
        const response = await vm.$axios.post(url, body, { headers: vm.authHeaders })
        if (response.data.data) {
          const data = response.data.data
          if (data.contract_address) {
            vm.contractAddress = data.contract_address
          }
        }
      } catch (error) {
        console.error(error.response)
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired')
        }
      }
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
