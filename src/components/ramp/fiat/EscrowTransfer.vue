<template>
  <div
    class="escrow-transfer-container q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div v-if="availabilityFailure || loadFailure" class="pt-card q-pa-md q-mb-md br-15 p2p-feature-notice" :class="darkMode ? 'dark' : 'light'" role="alert">
      <div class="row no-wrap items-start">
        <q-icon name="info" color="blue" size="md" class="col-auto q-mr-md q-mt-xs" />
        <div class="col text-weight-medium">
          {{ availabilityFailure ? availabilityMessage : $t('P2PLoadFailed', {}, 'Unable to load this order. Please retry.') }}
          {{ $t('RefreshToCheckAgain', {}, 'Refresh the page to check again.') }}
        </div>
      </div>
    </div>
    <div v-if="!availabilityFailure && !loadFailure" class="q-mx-sm q-px-md">
      
      <!-- Contract Information Section -->
      <div class="section-wrapper">
        <div class="section-header" @click="toggleContractInfo">
          <p class="section-title text-subtitle1 q-px-sm q-my-sm" :class="getDarkModeClass(darkMode)">
            {{ $t('ContractInformation', {}, 'Contract Information') }}
          </p>
          <q-icon 
            :name="showContractInfo ? 'expand_less' : 'expand_more'" 
            size="sm" 
            color="blue-grey-6"
            class="q-mr-sm" />
        </div>
        <q-list v-show="showContractInfo" class="pt-card payment-info-list" :class="getDarkModeClass(darkMode)">
          <!-- Arbiter -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('Arbiter') }}</q-item-label>
              <q-item-label class="payment-detail-text">
                <q-select
                  class="q-mt-xs"
                  :dark="darkMode"
                  filled
                  dense
                  hide-bottom-space
                  borderless
                  v-model="selectedArbiter"
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
              </q-item-label>
            </q-item-section>
          </q-item>

          <!-- Contract Address -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('ContractAddress') }}</q-item-label>
              <q-item-label class="payment-detail-text ellipsis">
                <span v-if="contractAddress">{{ contractAddress }}</span>
                <q-skeleton v-else type="text" width="200px" height="20px" />
              </q-item-label>
            </q-item-section>
            <q-item-section side v-if="contractAddress">
              <div class="row q-gutter-xs">
                <q-btn flat dense round size="sm" icon="content_copy" color="blue-grey-6" @click="copyToClipboard(contractAddress)"/>
                <q-btn flat dense round size="sm" icon="loop" color="blue-grey-6" @click="onReloadContractAddress()"/>
              </div>
            </q-item-section>
          </q-item>

          <!-- Contract Balance -->
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('ContractBalance') }}</q-item-label>
              <q-item-label class="payment-detail-text">
                <span v-if="escrowBalance !== null">{{ escrowBalance }} BCH</span>
                <q-skeleton v-else type="text" width="100px" height="20px" />
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Transfer Section -->
      <div class="section-wrapper q-mt-md">
        <p class="section-title text-subtitle1 q-px-sm q-my-sm" :class="getDarkModeClass(darkMode)">
          {{ $t('TransferDetails', {}, 'Transfer Details') }}
        </p>
        <q-list class="pt-card payment-info-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('TransferAmount') }}</q-item-label>
              <q-item-label class="payment-detail-text text-weight-bold text-primary">
                <span v-if="transferAmount">{{ transferAmount }} BCH</span>
                <q-skeleton v-else type="text" width="150px" height="24px" />
              </q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('Fee') }}</q-item-label>
              <q-item-label class="payment-detail-text">
                <span v-if="fees">{{ fees?.total / 100000000 }} BCH</span>
                <q-skeleton v-else type="text" width="80px" height="20px" />
              </q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item>
            <q-item-section>
              <q-item-label caption class="text-caption">{{ $t('YourBalance') }}</q-item-label>
              <q-item-label class="payment-detail-text">{{ balance }} BCH</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="row q-mb-md q-mt-md" v-if="sendErrors.length > 0">
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
    
    <!-- Warning message for when no currency arbiter is available for ad -->
    <div v-if="!loading && !hasArbiters" class="warning-box q-mx-lg q-my-md" :class="darkMode ? 'warning-box-dark' : 'warning-box-light'">
      There's currently no arbiter assigned for transactions related to this ad in its currency ({{ this.order?.ad?.fiat_currency?.symbol }}). Please try again later.
    </div>
    <div class="row q-mt-md q-pt-sm q-mx-lg">
      <q-btn
        :loading="loadCancelButton"
        flat
        :disable="sendingBch"
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
        zIndex: 9999,
      }"
      @ok="onSecurityOk"
      @cancel="onSecurityCancel"
      text="Swipe to Escrow"
    />
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { wallet } from 'src/exchange/wallet'
import { backend, assertP2PIdentity } from 'src/exchange/backend'
import { fetchP2PAvailability, isP2PAvailabilityError, p2pAvailabilityMessage } from 'src/exchange/availability'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import RampContract from 'src/exchange/contract'
import packageInfo from '../../../../package.json'
import { bchToFiat, satoshiToBch } from 'src/exchange'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { getChangeAddress } from 'src/utils/send-page-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      loading: false,
      disposed: false,
      availabilityFailure: null,
      loadFailure: false,
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
      loadCancelButton: false,
      showContractInfo: false
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
    availabilityMessage () {
      return p2pAvailabilityMessage(this.$t.bind(this), this.availabilityFailure)
    },
    contractAddressMatch () {
      const localContractAddress = this.escrowContract?.getAddress()
      return localContractAddress === this.contractAddress
    },
    hasArbiters () {
      return this.arbiterOptions?.length > 0
    },
    showDragSlide () {
      return (!this.loading && !this.loadFailure && !this.availabilityFailure && this.dragSlideOn && this.arbiterOptions?.length > 0 && !this.sendingBch && this.contractAddress)
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
      const amount = bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
      return parseFiatCurrency(amount, this.order?.ad?.fiat_currency?.symbol)
    }
  },
  async mounted () {
    await this.loadData()
  },
  beforeUnmount () {
    this.disposed = true
  },
  methods: {
    getDarkModeClass,
    toggleContractInfo () {
      this.showContractInfo = !this.showContractInfo
    },
    async onReloadContractAddress () {
      try {
        await this.generateContractAddress(true)
      } catch (error) {
        console.error('Contract generation failed:', error?.response?.status || error?.code || 'Request failed')
        return
      }
      this.$emit('refresh')
    },
    async selectArbiter () {
      this.contractAddress = null
      try {
        await this.generateContractAddress()
      } catch (error) {
        console.error('Contract generation failed:', error?.response?.status || error?.code || 'Request failed')
        return
      }
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
      vm.escrowBalance = vm.data?.contractBalance != null ? vm.data.contractBalance : await vm.escrowContract.getBalance(null, true)
      if (vm.escrowBalance > 0) {
        if (vm.order?.status?.value === 'CNF') {
          await vm.escrowPendingOrder()
        }
      }
    },
    async loadData () {
      if (this.loading || this.sendingBch) return
      this.loading = true
      this.loadFailure = false
      this.order = this.data.order
      try {
        const controls = await fetchP2PAvailability(backend, 'ORDER_ESCROW', { userType: 'peer' })
        this.$store.commit('ramp/updateFeatureToggles', controls)
        this.availabilityFailure = null
        await this.loadContract()
        this.transferAmount = satoshiToBch(this.data.transferAmount + this.fees?.total)
      } catch (error) {
        this.loadFailure = true
        if (isP2PAvailabilityError(error)) this.availabilityFailure = error
      } finally {
        this.loading = false
      }
    },
    async completePayment () {
      const vm = this
      vm.sendErrors = []
      await vm.escrowBch()
    },
    async escrowBch () {
      const vm = this
      if (vm.disposed || vm.sendingBch || vm.loading || vm.loadFailure) return
      if (!vm.contractAddressMatch) {
        vm.sendErrors.push('Contract address mismatch')
        vm.dragSlideOn = true
        vm.dragSlideKey++
        return
      }
      console.log('Contract address matched. Sending BCH...')
      vm.sendingBch = true
      const escrow = vm.escrowContract
      const orderId = vm.order?.id
      const address = vm.contractAddress
      const amount = vm.transferAmount
      const tradeAmount = Number(vm.order?.trade_amount)
      const check = () => {
        if (vm.disposed || vm.escrowContract !== escrow || vm.order?.id !== orderId ||
            vm.order?.status?.value !== 'CNF' || Number(vm.order?.trade_amount) !== tradeAmount ||
            vm.contractAddress !== address || vm.transferAmount !== amount || escrow.getAddress() !== address ||
            !Number.isFinite(amount) || amount <= 0) {
          throw new Error('The escrow details changed. Please reopen this order before funding.')
        }
        if (vm.txid || vm.$store.getters['ramp/getOrderTxid'](orderId, 'ESCROW')) {
          throw new Error('Escrow funding was already sent. Retry verification without sending funds again.')
        }
      }
      try {
        check()
        const utxos = await escrow.getUtxos()
        if (vm.escrowBalance === 0 && utxos.length === 0) {
          console.log(`Sending ${vm.transferAmount} BCH to ${vm.contractAddress}`)
          const fundingWallet = wallet
          const rawWallet = await fundingWallet.getRawWallet()
          const changeAddress = await getChangeAddress('bch', { isChipnet: rawWallet.isChipnet })
          await fetchP2PAvailability(backend, 'ORDER_ESCROW', { userType: 'peer' })
          const orderResponse = await backend.get(`/ramp-p2p/order/${orderId}/`, {
            authorize: 'peer', cache: false, params: { _fresh: Date.now() }, timeout: 10000
          })
          const currentOrder = orderResponse.data
          if (orderResponse.status !== 200 || orderResponse.cached === true ||
              String(currentOrder?.id) !== String(orderId) || currentOrder?.status?.value !== 'CNF' ||
              Number(currentOrder?.trade_amount) !== tradeAmount) {
            throw new Error('This order is no longer ready for escrow funding. Please refresh the order.')
          }
          const registered = await assertP2PIdentity({
            public_key: escrow.publicKeys.seller,
            address: escrow.addresses.seller,
            address_path: wallet.addressPath()
          }, 'peer')
          fundingWallet.assertIdentity(registered)
          check()
          const result = await rawWallet.sendBch(amount, address, changeAddress)
          console.debug('Escrow funding broadcast:', result?.success === true)
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
            try {
              vm.escrowBalance = await vm.escrowContract.getBalance(null, true)
            } catch {
              vm.escrowBalance = null
            }
            if (vm.order?.status?.value === 'CNF') {
              await vm.escrowPendingOrder()
            }
            vm.$emit('success', vm.txid)
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
        if (isP2PAvailabilityError(error)) {
          vm.availabilityFailure = error
          vm.sendErrors.push(vm.availabilityMessage)
        } else {
          vm.sendErrors.push(error?.message || String(error))
        }
        vm.dragSlideOn = true
        vm.dragSlideKey++
      } finally {
        vm.sendingBch = false
        vm.loading = false
      }
    },
    async escrowPendingOrder () {
      const vm = this
      await backend.post(`/ramp-p2p/order/${vm.order?.id}/pending-escrow/`, null, { authorize: true })
        .catch(error => {
          this.handleRequestError(error)
        })
    },
    async fetchArbiters () {
      const vm = this
      await backend.get('/ramp-p2p/arbiter/', { params: { currency: vm.order.ad.fiat_currency.symbol }, authorize: true })
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
          throw error
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
            resolve(response.data)
          })
          .catch(error => {
            this.handleRequestError(error)
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
      return this.completePayment()
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
          throw error
        })
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
<style scoped lang="scss">
.escrow-transfer-container {
  padding-bottom: 160px;
  
  /* iOS specific - add more padding for safe area and drag slide button */
  @supports (-webkit-touch-callout: none) {
    padding-bottom: calc(180px + env(safe-area-inset-bottom, 0px));
  }
}

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

// Section Title (matching PaymentConfirmation.vue)
.section-title {
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
  opacity: 0.85;
  
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

// Section Header (clickable to toggle contract info)
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 0 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.dark:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

// Card Styling (matching PaymentConfirmation.vue)
.pt-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

// Payment Info List
.payment-info-list {
  .q-item {
    padding: 16px 20px;
    min-height: 60px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
  }
  
  &.dark .q-item:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.payment-detail-text {
  font-size: 15px;
  font-weight: 500;
  margin-top: 4px;
}
</style>
