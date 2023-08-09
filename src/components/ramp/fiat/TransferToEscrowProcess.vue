<template>
    <div class="q-pb-md">
      <div>
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div>
      <div class="text-center lg-font-size bold-text">ESCROW BCH</div>
      <q-separator :dark="darkMode" class="q-mx-lg"/>
      <div class="q-mx-lg">
        <div class="row q-mt-md">
            <q-select
                class="col"
                :dark="darkMode"
                filled
                v-model="selectedArbiter"
                label="Arbiter"
                :options="arbiterOptions"
                style="width: 250px;"
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
        </div>
        <div class="row q-mt-md">
            <q-input
                readonly
                class="col"
                :dark="darkMode"
                filled
                v-model="contractAddress"
                label="Contract Address"
                style="width: 250px;"
                :loading="!contractAddress || contractAddress === ' '">
            </q-input>
        </div>
        <div class="row q-mt-md">
            <q-input
                readonly
                class="col"
                :dark="darkMode"
                filled
                v-model="transferAmount"
                label="Transfer Amount"
                :error="balanceExceeded"
                :error-message="balanceExceeded? $t('Balance exceeded') : ''"
                style="width: 250px;">
                <template #append>
                    BCH
                </template>
            </q-input>
        </div>
        <div v-if="wallet && wallet.balance" class="row q-mt-sm md-font-size" style="color: grey">
          Balance: {{ wallet.balance }} BCH
        </div>
        <div class="row" v-if="sendErrors.length > 0">
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
        v-if="!loading && showDragSlide && contractAddress !== ' '"
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
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from 'src/wallet/ramp/signature'
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
      contractAddress: ' ',
      transferAmount: ' ',
      showDragSlide: true,
      sendErrors: []
    }
  },
  emits: ['back', 'submit'],
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
    fees: {
      type: Number,
      default: 0
    },
    wallet: {
      type: Object,
      default: null
    }
  },
  watch: {
    selectedArbiter () {
      this.contractAddress = ' '
      this.generateContractAddress()
    }
  },
  computed: {
    balanceExceeded () {
      if (this.transferAmount > parseFloat(this.wallet.balance)) {
        return true
      }
      return false
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.transferAmount = vm.amount
    vm.setupWebsocket()
    if (vm.order) {
      vm.selectedArbiter = vm.order.arbiter
    }
    await vm.fetchArbiters()
    await vm.generateContractAddress()
    if (vm.contractAddress !== ' ') {
      vm.loading = false
    }
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    async completePayment () {
      // Send crypto to smart contract
      const vm = this
      try {
        const result = await vm.wallet.wallet.BCH.sendBch(vm.transferAmount, vm.contractAddress)
        if (result.error.indexOf('not enough balance in sender') > -1) {
          vm.sendErrors.push('Not enough balance to cover the send amount and transaction fee')
        } else if (result.error.indexOf('has insufficient priority') > -1) {
          vm.sendErrors.push('Not enough balance to cover the transaction fee')
        } else {
          vm.sendErrors.push(result.error)
        }
      } catch (error) {
        console.error(error)
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
      const vm = this
      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'ORDER_LIST', timestamp)
      const headers = {
        'wallet-hash': wallet.walletHash,
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
          this.showDragSlide = false
        })
    },
    setupWebsocket () {
      const wsUrl = this.wsURL + this.order.id + '/'
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const contractAddress = data.result.contract_address
        if (contractAddress) {
          this.contractAddress = contractAddress
          console.log('Updated contract address to :', this.contractAddress)
        }
      }
      this.websocket.onclose = () => {
        console.log('WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    }
  }
}
</script>
