<template>
  <div class="text-bow"
    :class="getDarkModeClass(darkMode)">
    <q-pull-to-refresh class="q-mb-md" @refresh="$emit('refresh')">
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else>
        <q-card class="br-15 q-pa-md q-ma-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
          <div class="sm-font-size q-pb-xs text-italic">{{ $t('ContractAddress') }}</div>
          <q-input
            class="q-pb-xs"
            readonly
            dense
            filled
            :dark="darkMode"
            v-model="contractAddress">
            <template v-slot:append>
              <div v-if="contractAddress" @click="copyToClipboard(contractAddress)">
                <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
              </div>
            </template>
          </q-input>
          <div class="sm-font-size q-pb-xs text-italic">{{ $t('ContractBalance') }}</div>
          <q-input
            class="q-pb-xs"
            readonly
            dense
            filled
            :dark="darkMode"
            :loading="contractBalance === null"
            v-model="contractBalance">
            <template v-slot:append>
              <span class="sm-font-size">BCH</span>
            </template>
          </q-input>
        </q-card>
        <!-- <div class="q-mx-md q-my-sm"> -->
          <q-card class="br-15 q-pa-md q-ma-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <q-tabs
              v-model="tab"
              dense
              class=""
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator>
              <q-tab name="status" :label="$t('Status')" />
              <q-tab name="transaction" :label="$t('Transactions')" />
            </q-tabs>
            <q-separator class="q-mb-sm" :dark="darkMode"/>
            <div v-if="tab === 'status'">
              <div v-for="(status, index) in statusHistory" :key="index" class="sm-font-size q-pb-sm">
                <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                <div class="row justify-between no-wrap q-mx-lg">
                  <span class="col">{{ formattedOrderStatus(status.status) }}</span>
                  <span class="col text-nowrap q-ml-xs">
                    {{ formattedDate(status.created_at) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="tab === 'transaction'">
              <div class="row text-weight-bold sm-font-size">
                <div class="col text-center">{{ $t('Action') }}</div>
                <div class="col text-center">{{ $t('Txid') }}</div>
                <div class="col text-center">{{ $t('Status') }}</div>
                <div class="col text-center">{{ $t('Date') }}</div>
              </div>
              <q-separator class="q-my-sm" :dark="darkMode"/>
              <div>
                <div v-for="(transaction, index) in transactionHistory" :key=index>
                  <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                  <div class="row sm-font-size" :class="darkMode ? '' : 'text-grey-7'">
                    <div class="col text-center">{{ transaction.action }}</div>
                    <span class="col text-blue text-center" @click="viewTxid(transaction.txid)"><u>{{ formattedTxid(transaction.txid) }}</u></span>
                    <div class="col text-center">{{ transaction.valid ? 'Validated' : 'Not Validated'}}</div>
                    <div class="col xs-font-size">{{ formattedDate(transaction.created_at, true)}}</div>
                  </div>
                </div>
              </div>
            </div>
          </q-card>
        <!-- </div> -->
        <div v-if="state === 'form' || state === 'form-sending'" class="q-my-sm">
          <q-card v-if="appeal?.resolved_at === null" class="br-15 q-pa-md q-ma-sm" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <div class="text-center q-py-xs text-weight-bold text-uppercase">
              {{ $t('SelectAction') }}
            </div>
            <q-separator class="q-my-sm" :dark="darkMode"/>
              <div class="row justify-between no-wrap q-mx-lg">
                <span class="sm-font-size">{{ $t('Release') }}</span>
                <span class="text-nowrap q-ml-xs">
                  <q-btn
                    rounded
                    size="sm"
                    icon="done"
                    :disable="sendingBch"
                    :outline="selectedAction !== 'release'"
                    :color="selectedAction === 'release' ? 'blue-6' : 'grey-6'"
                    class="q-ml-xs"
                    @click="selectReleaseType('release')"
                  />
                </span>
              </div>
              <q-separator class="q-my-sm" :dark="darkMode"/>
              <div class="row justify-between no-wrap q-mx-lg">
                <span class="sm-font-size">{{ $t('Refund') }}</span>
                <span class="text-nowrap q-ml-xs">
                  <q-btn
                    rounded
                    size="sm"
                    icon="done"
                    :disable="sendingBch"
                    :outline="selectedAction !== 'refund'"
                    :color="selectedAction === 'refund' ? 'blue-6' : 'grey-6'"
                    class="q-ml-xs"
                    @click="selectReleaseType('refund')"
                  />
                </span>
              </div>
          </q-card>
        </div>
        <div class="q-mx-lg q-mt-md" v-if="sendingBch">
          <!--TODO:-->
          <q-spinner class="q-mr-xs"/>{{ selectedAction === 'release' ? 'Releasing' : 'Refunding'}} BCH, please wait.
        </div>
        <div v-if="sendError" class="q-mx-lg q-px-lg q-my-sm">
          <q-card flat class="col q-pa-md pt-card-2 text-bow bg-red-1" :class="getDarkModeClass(darkMode)">
            <q-icon name="error" left/>
            {{ sendError }}
          </q-card>
        </div>
      </div>
    </q-pull-to-refresh>
  </div>

  <!-- Add DragSlide -->
  <RampDragSlide
    :key="dragSlideKey"
    v-if="showDragSlide && state === 'form'"
    :locked="!selectedAction"
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @ok="onSubmit"
    @cancel="onSecurityCancel"
    :text="$t('SwipeToConfirmLower')"
  />
</template>
<script>
import ProgressLoader from '../../ProgressLoader.vue'
import RampDragSlide from '../fiat/dialogs/RampDragSlide.vue'
import { formatCurrency, formatDate, formatOrderStatus, formatAddress } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      isChipnet: this.$store.getters['global/isChipnet'],
      darkMode: this.$store.getters['darkmode/getStatus'],
      wallet: null,
      tab: 'status',
      order: null,
      ad_snapshot: null,
      contract: null,
      contractBalance: null,
      fees: null,
      statusHistory: [],
      transactionHistory: [],
      loading: true,
      amount: {
        buyer: 1,
        seller: 105500
      },
      selectedAction: null,
      showDragSlide: false,
      dragSlideKey: 0,
      sendingBch: false,
      sendError: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 110 : this.$q.screen.height - 85
    }
  },
  props: {
    data: Object,
    escrowContract: Object,
    state: String
  },
  emits: ['back', 'refresh', 'success', 'updatePageName', 'form-sending'],
  components: {
    RampDragSlide,
    ProgressLoader
  },
  watch: {
    sendError (value) {
      console.log('sendError:', value)
    },
    sendingBch (value) {
      if (value) {
        this.$emit('form-sending')
      }
    }
  },
  computed: {
    completedOrder () {
      return ['CNCL', 'RLS', 'RFN'].includes(this.order?.status?.value)
    },
    contractAddress () {
      return this.contract.address
    }
  },
  async mounted () {
    this.loadData()
    this.fetchContractBalance().then((balance) => {
      if (balance === 0 && this.order.status.value === 'APL') {
        const result = this.loadTransactionId(this.order.id)
        if (result.txid) this.setOrderPending(result.txid, result.action)
      }
    })
    this.wallet = loadRampWallet()
  },
  methods: {
    getDarkModeClass,
    loadTransactionId (orderId) {
      const rlsTxid = this.$store.getters['ramp/getOrderTxid'](orderId, 'RELEASE')
      const rfnTxid = this.$store.getters['ramp/getOrderTxid'](orderId, 'REFUND')
      return {
        action: rlsTxid ? 'release' : 'refund',
        txid: rlsTxid || rfnTxid
      }
    },
    loadData () {
      const vm = this
      vm.appeal = vm.data?.appeal
      vm.order = vm.data?.order
      vm.ad_snapshot = vm.data?.ad_snapshot
      vm.statusHistory = vm.data?.statuses
      vm.transactionHistory = vm.data?.transactions
      vm.contract = vm.data?.contract
      vm.fees = vm.data?.fees
      if (vm.state === 'form') {
        vm.showDragSlide = true
      } else {
        vm.showDragSlide = false
      }
      vm.loading = false
    },
    fetchContractBalance () {
      return new Promise((resolve, reject) => {
        if (!this.escrowContract) return 0
        this.escrowContract?.getBalance()
          .then(balance => {
            this.contractBalance = balance
            resolve(balance)
          })
          .catch(error => reject(error))
      })
    },
    async onSubmit () {
      const vm = this
      vm.showDragSlide = false
      vm.sendingBch = true
      let txid = null
      if (vm.selectedAction === 'release') {
        txid = await vm.releaseBch()
      }
      if (vm.selectedAction === 'refund') {
        txid = await vm.refundBch()
      }
      vm.setOrderPending(txid, vm.selectedAction)
    },
    async setOrderPending (txid, action) {
      const vm = this
      const url = `/ramp-p2p/order/${vm.appeal.order.id}/appeal/pending-${action}`
      await backend.post(url, {}, { authorize: true })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
      vm.sendingBch = true
    },
    releaseBch () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.sendError = null
        if (!vm.escrowContract) reject('escrow contract is null')
        const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
        this.wallet.keypair(arbiterMember.address_path).then(keypair => {
          vm.escrowContract.release(keypair.privateKey, keypair.publicKey, this.order.crypto_amount)
            .then(result => {
              console.log(result)
              if (result.success) {
                const txid = result.txInfo.txid
                const txidData = {
                  id: vm.order.id,
                  txidInfo: {
                    action: 'RELEASE',
                    txid: txid
                  }
                }
                vm.$store.commit('ramp/saveTxid', txidData)
                resolve(txid)
              } else {
                vm.sendError = result.reason
                vm.sendingBch = false
                vm.showDragSlide = true
                reject(vm.sendError)
              }
            })
            .catch(error => {
              console.error(error)
              reject(error)
            })
        })
      })
    },
    refundBch () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.sendError = null
        if (!vm.escrowContract) reject('escrow contract is null')
        const arbiterMember = (vm.contract?.members).find(member => { return member.member_type === 'ARBITER' })
        this.wallet.privkey(null, arbiterMember.address_path).then(privateKeyWif => {
          vm.escrowContract.refund(privateKeyWif, this.order.crypto_amount)
            .then(result => {
              console.log(result)
              if (result.success) {
                const txid = result.txInfo.txid
                const txidData = {
                  id: vm.order.id,
                  txidInfo: {
                    action: 'REFUND',
                    txid: txid
                  }
                }
                vm.$store.commit('ramp/saveTxid', txidData)
                resolve(txid)
              } else {
                vm.sendError = result.reason
                vm.sendingBch = false
                vm.showDragSlide = true
                reject(vm.sendError)
              }
              resolve(result)
            })
            .catch(error => {
              console.error(error)
              reject(error)
            })
        })
      })
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    selectReleaseType (type) {
      if (this.selectedAction === type) {
        this.selectedAction = null
      } else {
        this.selectedAction = type
      }
    },
    refreshData () {
      this.$emit('refresh')
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    },
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    formattedAddress (address) {
      return formatAddress(address, 20, 5)
    },
    formattedDate (value, numeric = false) {
      if (numeric) {
        const options = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        }
        return formatDate(value, false, options)
      }
      return formatDate(value, false)
    },
    formattedOrderStatus (value) {
      return formatOrderStatus(value)
    },
    viewTxid (txid) {
      console.log('txid:', txid)
    },
    formattedTxid (txid) {
      if (txid && txid.length > 6) {
        return `${txid.substring(0, 3)}...${txid.slice(-3)}`
      }
      return ''
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
