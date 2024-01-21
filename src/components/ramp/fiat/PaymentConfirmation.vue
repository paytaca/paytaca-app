<template>
  <div v-if="isloaded">
    <q-pull-to-refresh @refresh="$emit('refresh')">
      <div class="q-mx-lg text-h5 text-center lg-font-size text-weight-bold">
        <span v-if="data?.type === 'buyer'">PAY BY FIAT</span>
        <span v-else>RECEIVE FIAT</span>
      </div>
      <div style="opacity: .5;" class="text-center q-pb-sm md-font-size text-weight-bold">ORDER #{{ order.id }}</div>
      <q-scroll-area :style="`height: ${minHeight - 175}px`" style="overflow-y:auto;">
        <div class="q-mt-sm q-mx-md q-px-md">
          <div class="q-my-sm">
            <div class="sm-font-size q-pb-xs q-ml-xs">Contract Address</div>
            <q-input
              class="q-pb-xs"
              readonly
              dense
              filled
              :dark="darkMode"
              :label="data?.contractAddress">
              <template v-slot:append>
                <div v-if="data?.contractAddress" @click="$parent.copyToClipboard(data?.contractAddress)">
                  <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
                </div>
              </template>
            </q-input>
            <div class="sm-font-size q-py-xs q-ml-xs">Balance</div>
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
          </div>
          <div v-if="data?.type === 'buyer'" class="sm-font-size q-pb-xs q-ml-xs">Pay the seller</div>
          <div v-else class="sm-font-size q-pb-xs q-ml-xs">Expect fiat payment of</div>
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
                <span>{{ order.fiat_currency.symbol }}</span>
              </template>
            </q-input>
          </div>
        </div>
        <div class="q-pt-sm text-center" v-if="!sendingBch && sendErrors.length === 0">
          <span class="sm-font-size" v-if="countDown !== 'Expired'">order expires in</span>
          <div style="font-size: 30px; color: #ed5f59;"> {{ countDown }}</div>
        </div>
        <div class="q-mx-md q-px-md q-pt-sm">
          <!-- Buyer -->
          <div v-if="data?.type === 'buyer'" class="q-pb-xs">
            <q-separator :dark="darkMode" class="q-mx-sm q-mb-md"/>
            <div class="md-font-size q-pb-xs q-pl-sm text-center">PAYMENT METHODS</div>
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
                                <div>{{ method.account_number }}</div>
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
        <!-- Checkbox -->
        <div class="q-mb-sm" v-if="countDown !== 'Expired'">
          <div class="q-mx-lg q-px-md">
            <div v-if="data?.type === 'seller'">
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
              <div v-if="sendingBch" class="sm-font-size">
                <q-spinner class="q-mx-sm"/>Sending BCH, please wait...
              </div>
              <div v-else>
                <q-checkbox :disable="!data?.wsConnected" size="sm" v-model="confirmRelease" :dark="darkMode"/>
                <span :style="!data?.wsConnected ? 'color: grey': ''" class="sm-font-size text-center">I confirm that I have received payment</span>
              </div>
            </div>
            <div v-if="data?.type === 'buyer'">
              <q-checkbox :disable="!data?.wsConnected" size="sm" v-model="confirmPayment" :dark="darkMode"/>
              <span :style="!data?.wsConnected ? 'color: grey': ''" class="sm-font-size text-left"> I confirm that I already sent payment</span>
            </div>
          </div>

          <!-- Confirm  -->
          <!-- <div v-if="data?.type !== 'seller'" class="row q-pt-sm q-mx-lg q-px-md">
            <q-btn
              :disable="!confirmPayment || selectedPaymentMethods.length === 0"
              rounded
              label='Confirm Payment'
              class="q-space text-white"
              color="blue-6"
              @click="onConfirm"
            />
          </div> -->
        </div>
      </q-scroll-area>
    </q-pull-to-refresh>
  </div>
  <RampDragSlide
    v-if="showDragSlide && countDown !== 'Expired' && data?.wsConnected"
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
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { rampWallet } from 'src/wallet/ramp/wallet'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      contractBalance: null,
      order: null,
      txid: null,
      isloaded: false,
      countDown: '',
      timer: null,
      confirmPayment: false,
      confirmRelease: false,
      paymentMethods: [],
      selectedPaymentMethods: [],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
      showDragSlide: true,
      dragSlideKey: 0,
      sendingBch: false,
      sendErrors: []
    }
  },
  components: {
    RampDragSlide
  },
  emits: ['expired', 'verify-release', 'refresh'],
  props: {
    data: Object
  },
  computed: {
    dragSlideTitle () {
      return this.data?.type === 'seller' ? 'Release Crypto' : 'Confirm Payment'
    },
    lockDragSlide () {
      const vm = this
      let lock = true
      if (vm.data?.type === 'seller') {
        lock = !vm.confirmRelease
      }
      if (vm.data?.type === 'buyer') {
        lock = !vm.confirmPayment || vm.selectedPaymentMethods.length === 0
      }
      return lock
    },
    fiatAmount () {
      let amount = Number(parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price))
      if (amount > 1) amount = amount.toFixed(2)
      return this.$parent.formattedCurrency(amount)
    }
  },
  watch: {
    countDown (value) {
      if (value === 'Expired') this.$emit('expired')
    }
  },
  async mounted () {
    const vm = this
    if (vm.data?.errors) {
      vm.sendErrors = vm.data?.errors
    }
    vm.fetchOrderDetail().then(() => {
      vm.paymentCountdown()
      vm.isloaded = true
    })
    vm.fetchContractBalance()
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    getDarkModeClass,
    fetchContractBalance () {
      const vm = this
      if (vm.data?.escrow) {
        vm.data?.escrow.getBalance()
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
        const url = `${this.apiURL}/order/${vm.order.id}/confirm-payment/${type}`
        const body = {
          payment_methods: this.selectedPaymentMethods
        }
        vm.$axios.post(url, body, { headers: vm.authHeaders })
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
      const beContractAddr = vm.data?.contractAddress
      if (feContractAddr !== beContractAddr) {
        vm.sendErrors.push('contract addresses mismatched')
      }
      const privateKeyWif = await rampWallet.privkey()
      vm.data?.escrow.release(privateKeyWif, vm.order.crypto_amount)
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
        const url = vm.apiURL + '/order/' + vm.data?.orderId
        vm.$axios.get(url, { headers: vm.authHeaders })
          .then(response => {
            vm.order = response.data
            vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'RELEASE')
            vm.paymentMethods = vm.order.ad.payment_methods.map(method => {
              return { ...method, selected: false }
            })
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
    // onConfirm () {
    //   this.$emit('confirm', this.selectedPaymentMethods)
    // },
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
    paymentCountdown () {
      const vm = this
      const expiryDate = new Date(vm.order.expires_at)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }
        if (minutes.toString().length < 2) {
          minutes = '0' + minutes
        }

        vm.countDown = `${hours}:${minutes}:${seconds}`

        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.order.status = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    }
  }
}
</script>
<style lang="scss" scoped>
.xs-font-size {
  font-size: x-small;
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
