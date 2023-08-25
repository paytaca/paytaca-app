<template>
    <div class="q-pb-md">
      <!-- <div>
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div> -->
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
          :options="arbiterOptions"
          :disable="!contractAddress"
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
              {{ selectedArbiter.name }}
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
        </q-input>

        <div class="sm-font-size q-pl-sm q-pb-xs">Transfer Amount</div>
        <q-input
          readonly
          :dark="darkMode"
          filled
          dense
          v-model="transferAmount"
          :error="balanceExceeded"
          :error-message="balanceExceeded? $t('Insufficient balance') : ''">
          <template #append>
            <div class="sm-font-size">BCH</div>
          </template>
        </q-input>
        <!-- </div> -->
        <div class="sm-font-size q-mt-sm" style="color: grey;">
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

      <DragSlide
        v-if="!loading && showDragSlide && contractAddress"
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
        @swiped="onSwipe"
        text="Swipe To Escrow"
      />
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { signMessage } from 'src/wallet/ramp/signature'
import { makeid } from 'src/wallet/ramp'
import DragSlide from '../../drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { Dialog } from 'quasar'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      adData: null,
      loading: false,
      selectedArbiter: null,
      arbiterOptions: [],
      contractAddress: null,
      transferAmount: ' ',
      txid: null,
      fees: null,
      showDragSlide: true,
      sendErrors: []
    }
  },
  emits: ['back', 'success'],
  components: {
    DragSlide
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
    wallet: {
      type: Object,
      default: null
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
      console.log('fees.total:', value)
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
    console.log('!!!contract:', vm.contract)
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
      try {
        console.log('transferAmount:', vm.transferAmount)
        const result = await vm.wallet.wallet.sendBch(vm.transferAmount, vm.contractAddress)
        console.log('result:', result)
        if (result.success) {
          vm.txid = result.txid
          // vm.txid = makeid(64)
          const txidData = {
            id: vm.order.id,
            txidInfo: {
              action: 'ESCROW',
              txid: this.txid
            }
          }
          console.log('txidData:', txidData)
          vm.$store.dispatch('ramp/saveTxid', txidData)
          // console.log('txid:', vm.txid)
          await vm.escrowPendingOrder()
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
        console.error(err)
      }
      // await vm.escrowPendingOrder()
    },
    async escrowPendingOrder () {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'ORDER_ESCROW_PENDING', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      // console.log('headers:', headers)
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id + '/pending-escrow'
      const body = { txid: vm.txid }
      try {
        const response = await vm.$axios.post(url, body, { headers: headers })
        console.log('response:', response)
        const result = {
          txid: vm.txid,
          status: response.data.status
        }
        console.log('Emitting:', result)
        vm.$emit('success', result)
      } catch (error) {
        console.error(error.response)
      }
    },
    async fetchOrderDetail () {
      const vm = this
      const headers = {
        'wallet-hash': vm.wallet.walletHash
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id
      try {
        const response = await vm.$axios.get(url, { headers: headers })
        console.log('response:', response.data)
        vm.fees = response.data.fees
        vm.selectedArbiter = response.data.order.arbiter
      } catch (error) {
        console.error(error.response)
      }
    },
    async fetchArbiters () {
      const vm = this
      const url = vm.apiURL + '/arbiter'
      try {
        const response = await vm.$axios.get(url)
        vm.arbiterOptions = response.data
        if (!vm.selectedArbiter && vm.arbiterOptions.length > 0) {
          vm.selectedArbiter = vm.arbiterOptions[0]
        }
      } catch (error) {
        console.error(error.response)
      }
    },
    async generateContractAddress () {
      console.log('generateContractAddress')
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'CONTRACT_CREATE', timestamp)
      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      vm.loading = true
      const url = vm.apiURL + '/order/' + vm.order.id + '/generate-contract'
      const body = {
        arbiter: vm.selectedArbiter.id
      }
      try {
        const response = await vm.$axios.post(url, body, { headers: headers })
        if (response.data.data) {
          const data = response.data.data
          console.log('>>data:', data)
          if (data.contract_address) {
            vm.contractAddress = data.contract_address
          }
        }
      } catch (error) {
        console.error(error.response)
      }
    },
    checkSufficientBalance () {
      if (this.transferAmount > parseFloat(this.balance)) {
        this.balanceExceeded = true
      } else {
        this.balanceExceeded = false
      }
    },
    onSwipe () {
      this.showDragSlide = false
      this.showSecurityDialog()
    },
    showSecurityDialog () {
      Dialog.create({
        component: SecurityCheckDialog
      })
        .onOk(() => this.completePayment())
        .onDismiss(() => {
          this.showDragSlide = true
        })
    }
  }
}
</script>
