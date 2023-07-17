<template>
  <div class="q-px-md full-width" v-if="isloaded" >
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
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
      <!-- Step 1 : Confirmation, Cick to pay  -->
      <q-step
        :name="1"
        title="Create Order"
        :done="step > 1"
        prefix="1"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Order Created
        </div>
        <div class="q-pt-md sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ order.crypto_amount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ getFiatAmount }} {{ order.fiat_currency.symbol }}</span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mt-sm"/>

        <!-- Pending Confirmation -->
        <div class="q-mt-md q-px-md" v-if="!confirmed">
          <div>
            <q-icon size="sm" name="info" color="blue-6"/>
            <span class="q-pl-xs">
              Wait for the seller to confirm your order.
            </span>
          </div>
          <div class="q-pt-xs">
            <q-icon size="sm" name="info" color="blue-6"/>
            <span class="q-pl-xs">
              The crypto asset will be escrowed once the seller confirms your order. You will be notified of this event.
            </span>
          </div>
          <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Cancel'
              class="q-space text-white"
              style="background-color: #ed5f59;"
              @click="confirmCancel = true"
            />
          </div>
        </div>

        <!-- Pending Payment -->
        <div class="text-center q-mt-sm" v-if="confirmed">
          <div class="text-h5 md-font-size">
            The seller has confirmed your order!
          </div>
          <div class="text-center" style="font-size: 40px; color: #ed5f59;">
            {{ countDown }}
          </div>
          <div>
            Please pay within the time limit...
          </div>
          <div class="row text-center q-gutter-sm q-pt-md q-mx-lg">
            <div class="col">
              <q-btn
                rounded
                no-caps
                label='Cancel'
                class="q-space text-white full-width"
                style="background-color: #ed5f59;"
                @click="confirmCancel = true"
              />
            </div>
            <div class="col">
              <q-btn
                rounded
                no-caps
                label='Pay'
                class="q-space text-white full-width"
                color="blue-6"
                @click="proceedToPayment"
              />
            </div>
          </div>
        </div>
        <div class="q-pt-md" v-if="confirmed">
          <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            CONTRACT INFO
          </div>
          <div class="sm-font-size">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row q-pt-sm justify-between no-wrap q-mx-lg">
              <span>Address:</span>
              <!-- Check later -->
              <span class="text-nowrap q-ml-xs">{{ contract.contract_address }}</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
              <span>Balance:</span>
              <span class="text-nowrap q-ml-xs">temp BCH</span>
            </div>
          </div>
        </div>
      </q-step>

      <!-- Step 2 : Awaiting Payment -->
      <q-step
        :name="2"
        title="Pay the Seller"
        :done="step > 2"
        prefix="2"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Pay the Seller
        </div>
        <div class="q-pt-md text-center">
          <div class="xm-font-size">
            The seller has confirmed your order!
          </div>
          <!-- <div class="text-blue-6" style="font-size: 30px;">
            {{ fiatAmount }}
          </div> -->
          <div class="text-center text-h2" style="font-size: 40px; color: #ed5f59;">
            {{ countDown }}
          </div>
          <div>
            Please pay  <span class="text-blue-6 text-h5 lg-font-size">{{ getFiatAmount }} {{ order.fiat_currency.symbol }}</span> within the time limit...
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mt-md"/>
        <div class="q-mt-lg full-width">
          <q-scroll-area style="height:30vh;overflow-y:auto;">
            <div class="q-px-md q-pb-sm">
              <span class="text-h5 text-blue-8 bold-text md-font-size">
                STEP 1:
              </span>
              <span class="q-px-sm">Pay the amount using the methods below</span>
            </div>
            <q-list bordered class="q-mx-lg" :dark="darkMode">
              <!-- Add ad payment methods later -->
              <div
                v-for="(method, index) in ad.payment_methods"
                :key="index"
              >
                <q-expansion-item
                  group="somegroup"
                  :label="method.payment_type.toUpperCase()"
                >
                  <q-card flat  :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
                    <q-card-section>
                      <span>{{ method.account_name }}</span><br>
                      <span>{{ method.account_number }}</span>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
                <q-separator :dark="darkMode" />
              </div>
            </q-list>
            <div class="q-px-md q-pt-md">
              <span class="text-h5 text-blue-8 bold-text md-font-size">
                STEP 2:
              </span>
              <span class="q-px-sm">
                <span class="hl-text">After</span> transfering funds, click on the <span class="hl-text">"Confirm Payment"</span> button below to notify the the seller.
              </span>
              <div class="q-px-md q-pt-sm">
                <div>
                  <q-icon size="sm" name="info" color="orange-6"/>
                  <span class="q-pl-xs subtext">
                    Make sure to click "Confirm Payment" button after transferring funds to avoid financial loss.
                  </span>
                </div>
                <div class="q-pt-xs">
                  <q-icon size="sm" name="info" color="orange-6"/>
                  <span class="q-pl-xs subtext">
                    Do not click on the "Confirm Payment" button without transferring the funds
                  </span>
                </div>
              </div>
            </div>
          </q-scroll-area>
        </div>
        <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Confirm Payment'
              class="q-space text-white"
              color="blue-6"
              @click="confirmPayment"
            />
          </div>
      </q-step>

      <!-- Step 3 : Awaiting Release-->
      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        <div class="q-mx-lg text-h5 text-center lg-font-size">
          Release Crypto
        </div>
        <div class="text-center q-pt-md sm-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="subtext row justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ order.crypto_amount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="subtext row justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ getFiatAmount }} {{ order.fiat_currency.symbol }}</span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs" v-if="order.status !== 'Canceled'" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
            <span class="text-nowrap q-ml-xs text-red-6" v-if="order.status === 'Canceled'">{{ order.status }}</span>
          </div>
          <div class="row q-pt-md" v-if="order.status === 'Canceled'">
            <q-btn
              rounded
              no-caps
              label='Appeal'
              class="q-space text-white"
              color="blue-6"
              @click="appeal = true"
            />
          </div>
        </div>
        <div v-if="order.status === 'Release Pending'">
          <q-separator :dark="darkMode" class="q-mt-md"/>
          <div class="text-center q-px-md q-pt-md text-center">
            <div class="q-px-lg md-font-size">
              Your Crypto is pending for release by the seller
            </div>
            <div class="text-center text-h2" style="font-size: 40px; color: #ed5f59;">
              {{ countDown }}
            </div>
            <div>
              Please wait until...
            </div>
          </div>
        </div>
      </q-step>
    </q-stepper>
  </div>

  <!-- Progress Loader -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>

  <!-- Move Dialog -->
  <q-dialog persistent v-model="confirmCancel">
    <q-card style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Cancel Trade?</div>
      </q-card-section>

      <q-card-actions class="q-pt-lg text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="cancelingOrder" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog full-width persistent v-model="appeal">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Submitting an Appeal</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <span>
          The BCH funds are held by the escrow smart contract until it is confirmed that all of the terms of agreement between the buyer and seller have been met.
        </span><br><br>
        <span class="q-pt-lg">
          Submitting an appeal will raise a dispute on the funds which requires the intervention of the smart contract's assigned <span class="bold-text">Arbiter</span>.
        </span><br><br>
        <span class="q-pt-lg">
          The arbiter is a person or entity that is appointed or selected to act as a neutral and impartial third party in this dispute. The arbiter has the authority to release the funds to the buyer or refund to the seller.
        </span>
      </q-card-section>

      <q-card-actions class="q-pt-lg text-center" align="center">
        <q-btn flat label="Cancel" color="red" v-close-popup />
        <q-btn flat label="I understand, proceed" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { sign } from 'openpgp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      isloaded: false,
      status: 'prcessing', // 'view-order' 'released' 'cancelled'
      // buy: {},
      order: null,
      contract: null,
      ad: null, // ad fetch ad later
      // buyStatus: 'Pending Confirmation',
      confirmed: false,
      countDown: '',
      timer: null,
      confirmCancel: false,
      appeal: false,
      wallet: null
    }
  },
  props: {
    orderData: Object
  },
  emits: ['back', 'hideSeller', 'pendingRelease', 'released'],
  components: {
    ProgressLoader
  },
  computed: {
    getFiatAmount () {
      return parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
    }
  },
  methods: {
    // CHECK WHICH STEP ORDER IN // check this first
    checkStep () {
      console.log('checking status')

      switch (this.order.status) {
        case 'Submitted':
        case 'Escrow Pending':
          this.step = 1
          console.log('1')
          break
        case 'Escrowed':
          this.step = 1
          this.confirmed = true
          this.paymentCountdown()
          console.log('1')
          break
        case 'Paid Pending':
        case 'Paid':
          this.step = 2
          console.log('2')
          break
        case 'Release Pending':
          this.step = 3
          console.log('3')
          break
        case 'Released':
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
    async fetchOrderData () {
      const vm = this
      console.log('fetching data')
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
          console.log(response.data)
        })
        .catch(error => {
          console.log(error)
        })
    },
    // updated this
    paymentCountdown () {
      const vm = this
      const currentDate = new Date().getTime()
      const expiryDate = new Date(currentDate + 15 * 60 * 60 * 1000) // update later

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
        // console.log(vm.countDown)
        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    },
    proceedToPayment () {
      // this.$emit('hideSeller')
      this.$refs.stepper.next()
    },
    cancelingOrder () {
      // console.log(this.confirmed)
      if (this.confirmed) {
        clearInterval(this.timer)
        this.timer = null
      }
      if (this.order.status === 'Released' || this.order.status === 'Release Pending') {
        this.$emit('pendingRelease')
      }
      this.$emit('back')
    },
    releaseCntDwnSim () {
      const vm = this

      const expire = 10
      let now = 0

      const x = setInterval(function () {
        now++
        if (now === expire) {
          clearInterval(x)
          // vm.$refs.stepper.next()
          vm.order.status = 'Released'
          vm.$emit('released')
          // vm.buyStatus = 'Expired'
          clearInterval(vm.timer)
          vm.timer = null
        }
      }, 1000)
    },
    pendingCntDwnSim () {
      const vm = this

      const expire = 5
      let now = 0

      const x = setInterval(function () {
        now++
        if (now === expire) {
          clearInterval(x)
          // vm.$refs.stepper.next()
          vm.buyStatus = 'Pending Payment'
          vm.confirmed = true
          vm.paymentCountdown()
        }
      }, 1000)
    },
    confirmPayment () {
      this.$refs.stepper.next()
      this.$emit('hideSeller')
      this.$emit('pendingRelease')
      this.order.status = 'Release Pending'
      // this.releaseCntDwnSim()
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this
    console.log('Processing')
    const walletInfo = this.$store.getters['global/getWallet']('bch')
    this.wallet = await loadP2PWalletInfo(walletInfo)

    // vm.buy = vm.orderData // remove later

    await this.fetchOrderData()
    this.checkStep()

    vm.isloaded = true
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  }
}
</script>
<style lang="scss" scoped>
  .pp-text {
    color: #000 !important;
  }
  .subtext {
    font-size: 13px;
    opacity: .5;
  }
  .ib-text {
  display: inline-block;
}
.hl-text {
  font-size: 15px;
  font-weight: 500;
}
</style>
