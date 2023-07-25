<template>
  <div class="q-pt-md q-px-md" v-if="isloaded">
    <div>
      <q-btn
        flat
        padding="xs"
        icon="arrow_back"
        @click="returnList()"
      />
    </div>
    <q-stepper
      v-model="step"
      ref="stepper"
      color="primary"
      active-icon="none"
      done-color="blue-4"
      active-color="blue-9"
      :contracted="$q.platform.is.mobile"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :dark="darkMode"
      transition-duration="150"
      animated
      alternative-labels
      flat
    >
      <!-- STEP 1 -->
      <q-step
        :name="1"
        title="Escrow Fund"
        prefix="1"
        :done="step > 1"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Escrow Fund
        </div>

        <div class="q-pt-sm sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Contract Address:</span>
            <span class="text-nowrap q-ml-xs">contract addr</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ order.crypto_amount}} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Arbitration Fee:</span>
            <span class="text-nowrap q-ml-xs">{{ ad.fees.arbitration_fee }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Service Fee:</span>
            <span class="text-nowrap q-ml-xs">{{ ad.fees.service_fee }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg bold-text">
            <span>Total:</span>
            <span class="text-nowrap q-ml-xs">{{ totalAmount }} BCH</span>
          </div>
        </div>
        <div class="q-py-sm">
            <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              TRADE CONTRACT
            </div>
            <div class="q-pt-md sm-font-size">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
              <span>Seller Address:</span>
              <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
              <span>Buyer Address:</span>
              <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
              <span>Arbiter Address:</span>
              <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
            </div>
          </div>
        </div>

        <div class="row q-pt-md">
          <q-btn
            rounded
            no-caps
            label='Escrow Crypto'
            class="q-space text-white"
            color="blue-6"
            @click="escrowCrypto()"
          />
        </div>
      </q-step>

      <!-- STEP 2 -->
      <q-step
        :name="2"
        title="Await Payment"
        prefix="2"
        :done="step > 2"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Pending Payment
        </div>
        <div class="q-pt-sm sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row  bold-text subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ getFiatAmount }} PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">{{ ad.price }} PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ order.crypto_amount }} BCH</span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            <span>Status:</span>
            <span v-if="isExpired" class="text-red-6 text-nowrap q-ml-xs">Expired</span>
            <span v-else class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
          </div>

          <div class="q-py-sm" v-if="hasContractInfo">
            <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              CONTRACT INFO
            </div>
            <div class="sm-font-size">
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row q-pt-md justify-between no-wrap q-mx-lg">
                <span>Address:</span>
                <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
              </div>
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
                <span>Balance:</span>
                <span class="text-nowrap q-ml-xs">[balance amount] BCH</span>
              </div>
            </div>
          </div>

          <!-- <div v-if="order.status === 'Released'">
            Here
          </div> -->
          <div v-if="order.status !== 'Released'">
            <div v-if="isExpired">
              <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
              <div class="q-py-sm text-center lg-font-size bold-text" style="color: #ed5f59;">
                <q-icon size="xs" name="info" color="red-5"/>&nbsp;
                <span>Buyer Has Timed Out</span>
              </div>
            </div>
            <div v-else>
              <div class="text-center q-mt-sm" v-if="hasCountDown">
                <q-separator :dark="darkMode" />
                <div class="q-pt-sm md-font-size">
                  <div class="q-px-lg" v-if="order.status === 'Paid'">Confirm payment within time limit to release the crypto...</div>
                  <div v-if="order.status === 'Paid Pending'">Expect payment within...</div>
                </div>
                <div v-if="order.status === 'Paid'" class="text-center" style="font-size: 35px; color: rgb(60, 100, 246);">
                  {{ countDown }}
                </div>
                <div v-else class="text-center" style="font-size: 40px; color: rgb(60, 100, 246);">
                  {{ countDown }}
                </div>
              </div>
            </div>

            <div class="q-mt-sm" v-if="order.status === 'Paid' || order.status === 'Expired'">
              <div class="row text-center q-gutter-sm q-mx-lg">
                <div :class="$q.platform.is.mobile? 'col-4' : 'col'">
                  <q-btn
                    rounded
                    no-caps
                    label='Appeal'
                    class="q-space text-white full-width"
                    style="background-color: #ed5f59;"
                    @click="submitAppealConfirmation()"
                  />
                </div>
                <div :class="$q.platform.is.mobile? 'col-7' : 'col'">
                  <q-btn
                    rounded
                    no-caps
                    label='Confirm Payment'
                    class="q-space text-white full-width"
                    color="blue-6"
                    @click="paymentConfirmation()"
                  />
                </div>
              </div>
              <div class="q-px-xs q-pt-md q-pb-xs xs-font-size">
                <div>
                  <q-icon size="sm" name="info" color="blue-grey-6"/>
                  <span class="q-pl-xs subtext">
                    Click on "Appeal" to start the refund process if you have not received payment.
                  </span>
                </div>
                <div class="q-pt-xs">
                  <q-icon size="sm" name="info" color="blue-grey-6"/>
                  <span class="q-pl-xs subtext">
                    Click on "Confirm Payment" to release the funds.
                  </span>
                </div>
                <div class="q-pt-xs">
                  <q-icon size="sm" name="info" color="orange-6"/>
                  <span class="q-pl-xs subtext">
                    Do not click on "Confirm Payment" if you did not receive payment from the buyer to avoid financial loss.
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- <div class="row text-center q-gutter-sm q-pt-sm q-mx-lg">
            <div :class="$q.platform.is.mobile? 'col-4' : 'col'">
              <q-btn
                rounded
                no-caps
                label='Appeal'
                class="q-space text-white full-width"
                style="background-color: #ed5f59;"
              />
            </div>
            <div :class="$q.platform.is.mobile? 'col-7' : 'col'">
              <q-btn
                rounded
                no-caps
                label='Confirm Payment'
                class="q-space text-white full-width"
                color="blue-6"
              />
            </div>
          </div> -->
          <div v-if="!order.status === 'Paid'">
            <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              MY PAYMENT METHODS
            </div>
            <div class="q-pt-md">
              <div class="q-gutter-sm text-center">
                <q-badge v-for="method in paymentMethods" rounded outline color="red" :label="method.payment_type.name"/>
              </div>
            </div>
          </div>
        </div>
      </q-step>

      <!-- STEP 3 -->
      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Release Crypto
        </div>
        <div class="q-pt-md sm-f" style="font-size: 13px;">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row bold-text subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ getFiatAmount }} {{ order.fiat_currency .symbol }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">{{ ad.price }}</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ order.crypto_amount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg bold-text">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs" v-if="!isExpired" :class="order.status.toLowerCase().includes('pending') ? 'text-orange-6' : 'text-green-6'">{{ order.status }}</span>
            <span class="text-nowrap q-ml-xs text-red-6" v-if="isExpired">Expired</span>
          </div>
        </div>
        <div class="text-center">
          <div class="text-h5 md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            RELEASED
          </div>
          <div class="q-pt-sm md-font-size">
            [date here]
          </div>
        </div>
        <div class="q-pt-sm">
          <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            TRADE INFO
          </div>
          <div class="q-pt-md">
            <div  class="row justify-between no-wrap q-mx-lg">
              <div>
                <span class="sm-font-size">Buyer</span><br>
                <span class="bold-text md-font-size">{{ order.ad.owner.nickname }}</span>
              </div>
              <div class="q-pt-sm text-right">
                <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
                <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
              </div>
            </div>
            <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
            <div  class="row justify-between no-wrap q-mx-lg q-pt-md">
              <div>
                <span class="sm-font-size">Arbiter</span><br>
                <span class="md-font-size bold-text">Atty. Ruby Von Rails</span>
              </div>
              <div class="q-pt-sm text-right">
                <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
                <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
              </div>
            </div>
            <!-- <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/> -->
          </div>
          <div>
            <div class="text-h5 q-pt-md text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              PAYMENT METHOD
            </div>
            <div class="q-pt-md">
              <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                MY PAYMENT METHODS
              </div>
              <div class="q-pt-md">
                <div class="q-gutter-sm text-center">
                  <q-badge v-for="method in paymentMethods" rounded outline color="red" :label="method.payment_type.name"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-step>

      <!-- <template v-slot:navigation>
        <q-stepper-navigation>
          <q-btn @click="$refs.stepper.next()" color="primary" :label="step === 4 ? 'Finish' : 'Continue'" />
          <q-btn v-if="step > 1" flat color="primary" @click="$refs.stepper.previous()" label="Back" class="q-ml-sm" />
        </q-stepper-navigation>
      </template> -->
    </q-stepper>
  </div>

  <!-- Progress Loader -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>

  <!-- Successful Sell Notif -->
  <q-dialog
    v-model="receivedPayment"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="bg-blue-5 text-white">
      <div class="full-width full-height row items-center justify-center">
        <div class="col">
          <div class="row justify-center">
            <q-icon size="5em" flat name="task_alt"></q-icon>
          </div>
          <div class="row q-pt-md text-h5 justify-center">
            Successfully Sold {{ cryptoAmount }} BCH!
          </div>
          <div class="row q-mx-lg q-pt-lg">
            <q-btn
              rounded
              no-caps
              label='Ok'
              class="q-space text-white q-mx-lg"
              color="blue-8"
              v-close-popup
              @click="$refs.stepper.next()"
            />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
      :data="info"
      v-on:back="openDialog = false"
      v-on:submit="receiveDialogInfo"
    />
  </div>
</template>
<script>
import { ref } from 'vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      sell: {},
      order: null,
      ad: null,
      isloaded: false,
      countDown: '',
      timer: null,
      receivedPayment: false,
      paid: false,
      sellStatus: 'Pending Payment',
      paymentMethods: [],
      dialogType: '',
      openDialog: false,
      info: null
    }
  },
  props: {
    orderData: {
      type: Object,
      default: null
    },
    listingData: Object,
    cryptoAmount: Number,
    fiatAmount: String
  },
  components: {
    ProgressLoader,
    MiscDialogs
  },
  emits: ['back', 'hideBuyer'],
  computed: {
    totalAmount () {
      const total = parseFloat(this.order.crypto_amount) + parseFloat(this.ad.fees.arbitration_fee) + parseFloat(this.ad.fees.service_fee)
      return total.toFixed(8)
    },
    getFiatAmount () {
      return parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
    },
    hasCountDown () {
      const stat = ['Escrowed', 'Paid Pending', 'Paid', 'Release Pending']

      return stat.includes(this.order.status)
    },
    hasContractInfo () {
      const stat = ['Paid', 'Expired']
      return !stat.includes(this.order.status)
    },
    isExpired () {
      const vm = this
      console.log(vm.order.expiration_date)

      const now = new Date().getTime()
      const expiryDate = new Date(vm.order.expiration_date)

      if (expiryDate < now && vm.order.expiration_date) {
        return true
      } else {
        return false
      }
    }
  },
  methods: {
    async checkStep () {
      switch (this.order.status) {
        case 'Submitted':
          this.step = 1
          break
        case 'Escrow Pending': // no timer
          this.step = 2
          this.confirmed = true
          this.fetchPaymentMethod()
          break
        case 'Escrowed': // has timer
        case 'Paid Pending':
        case 'Paid':
          this.step = 2
          this.confirmed = true
          this.fetchPaymentMethod()
          await this.paymentCountdown()
          break
        case 'Release Pending':
          this.step = 3
          this.paymentCountdown()
          break
        case 'Released': // stopped timer
          this.step = 3
          this.status = 'released'
          break
        case 'Canceled':
        case 'Appealed for Release':
        case 'Appealed for Refund':
        case 'Refund Pending':
        case 'Refunded':
          this.status = 'cancelled'
          break
      }
    },
    async fetchPaymentMethod () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'PAYMENT_METHOD_LIST', timestamp)

      // console.log(wallet.walletHash)
      await vm.$axios.get(vm.apiURL + '/payment-method',
        {
          headers: {
            'wallet-hash': vm.wallet.walletHash,
            signature: signature,
            timestamp: timestamp
          }
        })
        .then(response => {
          this.paymentMethods = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchOrderData () {
      const vm = this

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.get(vm.apiURL + '/order/' + vm.orderData.id, {
        headers: {
          'wallet-hash': vm.wallet.walletHash,
          timestamp: timestamp,
          signature: signature
        }
      })
        .then(response => {
          vm.order = response.data.order
          vm.contract = response.data.contract
        })
        .catch(error => {
          console.log(error)
        })
    },
    async fetchAdData () {
      const vm = this

      const adId = vm.order.ad.id
      const url = `${vm.apiURL}/ad/${adId}`

      await vm.$axios.get(url)
        .then(response => {
          vm.ad = response.data
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
    },
    paymentCountdown () {
      const vm = this
      // const currentDate = new Date().getTime()
      const expiryDate = new Date(vm.order.expiration_date) // change later

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        // find distance
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }

        vm.countDown = hours + ':' + minutes + ':' + seconds
        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    },
    async escrowCrypto () {
      // Add escrow crypto process later
      const vm = this
      vm.isloaded = false
      vm.$refs.stepper.next()
      vm.order.status = 'Escrow Pending'
      vm.fetchPaymentMethod()
      await vm.paymentCountdown()

      vm.isloaded = true
    },
    confirmingPayment () {
      clearInterval(this.timer)
      this.timer = null
      this.paid = true
      this.receivedPayment = true
      this.sellStatus = 'Released'

      this.$emit('hideBuyer')
    },
    getDate () {
      const date = new Date()
      return date.toLocaleString('default', { month: 'long' }) + ' ' + date.getDate() + ', ' + date.getFullYear()
    },
    returnList () {
      this.$emit('back')
      clearInterval(this.timer)
    },
    // opening dialog
    submitAppealConfirmation () {
      this.dialogType = 'submitAppeal'
      this.openDialog = true
    },
    paymentConfirmation () {
      this.dialogType = 'confirmPayment'
      this.openDialog = true
    },

    // recieving dialog
    receiveDialogInfo () {
      this.openDialog = false
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    await vm.fetchOrderData()
    await vm.fetchAdData()
    vm.checkStep()
    console.log(vm.isExpired)

    vm.sell = vm.listingData
    vm.isloaded = true
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  }
}
</script>
<style lang="scss" scoped>
 .subtext {
    font-size: 13px;
    opacity: .5;
  }
</style>
