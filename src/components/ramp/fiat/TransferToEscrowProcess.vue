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
      <div :dark="darkMode">
        <div class="row q-mt-md">
            <q-select
                class="col q-mx-lg"
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
                class="col q-mx-lg"
                filled
                v-model="contractAddress"
                label="Contract Address"
                style="width: 250px;">
            </q-input>
        </div>
        <div class="row q-mt-md">
            <q-input
                readonly
                class="col q-mx-lg"
                filled
                v-model="transferAmount"
                label="Transfer Amount"
                style="width: 250px;">
                <template #append>
                    BCH
                </template>
            </q-input>
        </div>
      </div>
      <DragSlide
        v-if="showDragSlide"
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
      <SecurityCheckDialog
        v-if="showSecurityDialog"
        :show-dialog="showSecurityDialog"
        :dark-mode="darkMode"
      />
    </div>
    <!-- else progress loader -->
  </template>
<script>
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from 'src/wallet/ramp/signature'
import DragSlide from '../../drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wsURL: process.env.RAMP_WS_URL + 'order/',
      adData: null,
      loading: false,
      wallet: null,
      swipeStatus: false,
      selectedArbiter: null,
      arbiterOptions: [],
      contractAddress: ' ',
      transferAmount: ' ',
      showDragSlide: true,
      showSecurityDialog: false
    }
  },
  emits: ['back', 'submit'],
  components: {
    DragSlide,
    SecurityCheckDialog
  },
  props: {
    orderId: {
      type: Number,
      default: null
    },
    amount: {
      type: Number,
      default: 0
    },
    fees: {
      type: Number,
      default: 0
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    vm.transferAmount = vm.amount
    vm.setupWebsocket()
    await vm.fetchArbiters()
    await vm.generateContractAddress()
    vm.loading = false
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    onSwipe () {
      console.log('onSwipe')
      this.showDragSlide = false
      this.showSecurityDialog = true
    },
    completePayment () {
      console.log('completing payment')
    },
    async fetchArbiters () {
      const vm = this
      const url = vm.apiURL + '/arbiter'
      try {
        const response = await vm.$axios.get(url)
        console.log('response:', response.data)
        vm.arbiterOptions = response.data
        if (vm.arbiterOptions.length > 0) {
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
      const url = vm.apiURL + '/order/' + vm.orderId + '/generate-contract'
      const body = {
        arbiter: vm.selectedArbiter.id
      }
      console.log('url:', url)
      console.log('body:', body)
      try {
        const response = await vm.$axios.post(url, body, { headers: headers })
        console.log('response:', response.data)
        const data = response.data.data
        console.log('contract_address:', data.contract_address)
        if (data.contract_address) {
          vm.contractAddress = data.contract_address
        }
      } catch (error) {
        console.error(error.response)
      }
    },
    setupWebsocket () {
      const wsUrl = this.wsURL + this.orderId + '/'
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('data:', data)
        const price = parseFloat(data.price)
        if (price) {
          this.marketPrice = price.toFixed(2)
          console.log('Updated market price to :', this.marketPrice)
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
