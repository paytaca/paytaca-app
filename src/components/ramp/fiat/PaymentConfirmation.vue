<template>
  <div
    v-if="isloaded"
    class="q-pt-sm q-mx-md q-mt-sm text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-md q-px-sm">
      <div class="sm-font-size q-pb-xs q-ml-xs">Contract Address</div>
      <q-input
        class="q-pb-xs"
        readonly
        dense
        filled
        :dark="darkMode"
        :label="data?.contract.address">
        <template v-slot:append>
          <div v-if="data?.contract.address" @click="$parent.copyToClipboard(data?.contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">Contract Balance</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        dense
        filled
        :loading="!contractBalance"
        :dark="darkMode"
        v-model="contractBalance">
        <template v-slot:append>
          <span>BCH</span>
        </template>
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ data?.type === 'buyer' ? 'Pay the seller' : 'Expect fiat payment of' }}</div>
      <div @click="$parent.copyToClipboard(fiatAmount)">
        <q-input
          class="q-pb-xs md-font-size"
          readonly
          dense
          filled
          :dark="darkMode"
          :rules="[$parent.isValidInputAmount]"
          v-model="fiatAmount">
          <template v-slot:append>
            <span>{{ order?.ad?.fiat_currency?.symbol }}</span>
          </template>
        </q-input>
      </div>
    </div>
    <div class="q-mx-md q-px-sm q-pt-sm">
      <!-- Buyer -->
      <div v-if="data?.type === 'buyer'" class="q-pb-xs">
        <div class="md-font-size q-pb-xs q-pl-sm text-center text-weight-bold">PAYMENT METHODS</div>
          <div class="text-center sm-font-size q-mx-md q-mb-sm">
          <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp;
          <span>Select the payment method(s) you used to pay the seller</span>
        </div>
        <div class="full-width">
          <div v-for="(method, index) in paymentMethods" :key="index">
            <div class="q-px-sm">
              <q-card flat bordered :dark="darkMode">
                <q-expansion-item
                  class="pt-card text-bow"
                  :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
                  :default-opened=true
                  :label="method.payment_type"
                  expand-separator >
                  <q-card>
                    <q-card-section class="pt-card" :class="getDarkModeClass(darkMode)">
                      <div class="row">
                        <div class="col">
                          <div>{{ method.account_name }}</div>
                          <div>{{ method.account_identifier }}</div>
                        </div>
                        <div>
                          <q-checkbox v-model="method.selected" @click="selectPaymentMethod(method)" :dark="darkMode"/>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
              </q-card>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="q-mb-sm">
      <div class="q-mx-md q-px-md">
        <div v-if="data?.type === 'seller'">
          <!-- Errors -->
          <div class="row q-mb-sm" v-if="sendErrors.length > 0">
            <div class="col">
              <ul style="margin-left: -40px; list-style: none;">
                <li v-for="(error, index) in sendErrors" :key="index" class="bg-red-1 text-red q-pa-lg pp-text">
                  <q-icon name="error" left/>
                  {{ error }}
                </li>
              </ul>
            </div>
          </div>
          <!-- Info messages -->
          <div v-if="sendingBch" class="sm-font-size">
            <q-spinner class="q-mr-sm"/>Sending BCH, please wait...
          </div>
          <div v-else class="row justify-center sm-font-size" style="overflow-wrap: break-word;">
            <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp;
            <span class="col text-left q-ml-sm">Please release the funds if you have received the fiat payment.</span>
          </div>
        </div>
      </div>
      <!-- Appeal Button -->
      <div class="row justify-center" v-if="countDown !== null">
        <q-btn
          v-if="!sendingBch"
          flat
          no-caps
          :disable="!data?.wsConnected || countDown !== ''"
          :label="appealBtnLabel"
          color="blue-6"
          @click="onOpenAppealForm"
        />
      </div>
    </div>
  </div>
  <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50px">
    <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
  </div>
  <RampDragSlide
  v-if="showDragSlide && data?.wsConnected"
  :key="dragSlideKey"
  :text="dragSlideTitle"
  :locked="lockDragSlide"
  :style="{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1500,
  }"
  @ok="onSecurityOk"
  @cancel="onSecurityCancel"/>
  <AppealForm
  v-if="showAppealForm"
  :order="order"
  @back="showAppealForm = false"
  />
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'
import { formatCurrency } from 'src/wallet/ramp'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import AppealForm from './dialogs/AppealForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      wallet: null,
      contractBalance: null,
      order: null,
      txid: null,
      lockedPrice: '',
      isloaded: false,
      countDown: null,
      timer: null,
      paymentMethods: [],
      selectedPaymentMethods: [],
      showDragSlide: true,
      showAppealForm: false,
      dragSlideKey: 0,
      sendingBch: false,
      sendErrors: [],
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  components: {
    RampDragSlide,
    AppealForm,
    ProgressLoader
  },
  emits: ['back', 'verify-release'],
  props: {
    data: Object
  },
  computed: {
    appealBtnLabel () {
      if (this.countDown) return `Appealable in ${this.countDown}`
      return 'Submit an appeal'
    },
    dragSlideTitle () {
      return this.data?.type === 'seller' ? 'Release Crypto' : 'Confirm Payment'
    },
    lockDragSlide () {
      const vm = this
      let lock = false
      if (vm.data?.type === 'buyer') {
        lock = vm.selectedPaymentMethods.length === 0
      }
      return lock
    },
    fiatAmount () {
      const amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      return this.formatCurrency(amount, this.data.order?.ad?.fiat_currency?.symbol)
    }
  },
  async mounted () {
    this.loadData()
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    formatCurrency,
    isNotDefaultTheme,
    getDarkModeClass,
    loadData () {
      const vm = this
      vm.wallet = loadRampWallet()
      vm.fetchOrderDetail().then(() => {
        vm.appealCountdown()
        vm.isloaded = true
      })
      vm.fetchContractBalance()
      vm.lockedPrice = this.formatCurrency(vm.data.order?.locked_price, vm.data.order?.ad?.fiat_currency?.symbol)
    },
    fetchContractBalance () {
      const vm = this
      if (vm.data?.escrow) {
        vm.data?.escrow.getBalance(vm.data?.contract.address)
          .then(balance => {
            vm.contractBalance = balance
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    completePayment () {
      const vm = this
      const status = vm.order.status.value
      vm.sendErrors = []
      if (status === 'ESCRW') {
        vm.sendConfirmPayment(vm.data?.type)
      }
      if (status === 'PD_PN') {
        vm.sendConfirmPayment(vm.data?.type)
          .then(data => {
            if (data && data.status.value === 'PD') {
              vm.releaseBch()
            }
          })
      }
      if (status === 'PD') {
        vm.releaseBch()
      }
    },
    sendConfirmPayment (type) {
      return new Promise((resolve, reject) => {
        const vm = this
        const body = {
          payment_methods: this.selectedPaymentMethods
        }
        backend.post(`/ramp-p2p/order/${vm.order.id}/confirm-payment/${type}`, body, { authorize: true })
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
    async releaseBch () {
      const vm = this
      vm.sendErrors = []
      const feContractAddr = await vm.data?.escrow.getAddress()
      const beContractAddr = vm.data?.contract.address
      if (feContractAddr !== beContractAddr) {
        vm.sendErrors.push('contract addresses mismatched')
      }
      const sellerMember = (vm.data?.contract?.members).find(member => { return member.member_type === 'SELLER' })
      const keypair = await this.wallet.keypair(sellerMember.address_path)
      vm.data?.escrow.release(keypair.privateKey, keypair.publicKey, vm.order.crypto_amount)
        .then(result => {
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
            vm.$emit('verify-release', txid)
          } else {
            vm.sendErrors = [result.reason]
            vm.sendingBch = false
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
        })
    },
    fetchOrderDetail () {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get(`/ramp-p2p/order/${vm.data.order.id}`, { authorize: true })
          .then(response => {
            vm.order = response.data
            vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'RELEASE')

            if (vm.order.trade_type === 'BUY') {
              vm.paymentMethods = vm.order.ad.payment_methods.map(method => {
                return { ...method, selected: false }
              })
            } else {
              vm.paymentMethods = vm.order.payment_methods.map(method => {
                return { ...method, selected: false }
              })
            }

            resolve(response)
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
    selectPaymentMethod (method) {
      if (method.selected) {
        this.selectedPaymentMethods.push(method.id)
      } else {
        const index = this.selectedPaymentMethods.indexOf(method.id)
        if (index > -1) {
          this.selectedPaymentMethods.splice(index, 1)
        }
      }
    },
    onSecurityOk () {
      this.showDragSlide = false
      this.dragSlideKey++
      this.sendingBch = true
      this.completePayment()
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    onOpenAppealForm () {
      this.showAppealForm = true
    },
    appealCountdown () {
      const vm = this
      if (vm.order?.appealable_at) {
        const appealableDate = new Date(vm.order?.appealable_at)
        vm.timer = setInterval(function () {
          const now = new Date().getTime()
          const distance = appealableDate - now

          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          if (hours > 0) vm.countDown = `${hours} hour(s)`
          else if (minutes > 0) vm.countDown = `${minutes} minute(s)`
          else if (seconds > 0) vm.countDown = `${seconds} second(s)`

          if (distance < 0) {
            clearInterval(vm.timer)
            vm.countDown = ''
          }
        }, 1000)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.xs-font-size {
  font-size: smaller;
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
.subtext {
  opacity: .5;
}
</style>
