<template>
  <div class="q-pt-md q-px-md">
    <div>
      <q-btn
        flat
        padding="xs"
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
      <q-step
        :name="1"
        title="Create Order"
        prefix="1"
        :done="step > 1"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Create Order
        </div>
        <FiatStoreSellInit
          v-if="isloaded"
          :listing-data="sell"
          :crypto-amount="cryptoAmount"
          v-on:pymnt-methods="setPaymentMethods"
          v-on:confirmed="confirmedOrder"
        />
      </q-step>

      <q-step
        :name="2"
        title="Await Payment"
        prefix="2"
        :done="step > 2"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Pending Payment
        </div>
        <div class="q-pt-sm" style="font-size: 13px;">
          <div style="font-weight: 500;" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ fiatAmount}} PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">6871.41 PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ cryptoAmount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg" style="font-weight: 500;">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs" v-if="sellStatus !== 'Expired'" :class="sellStatus.toLowerCase().includes('pending') ? 'text-orange-6' : 'text-green-6'">{{ sellStatus }}</span>
            <span class="text-nowrap q-ml-xs text-red-6" v-if="sellStatus === 'Expired'">{{ sellStatus }}</span>
          </div>

          <div class="q-py-sm" v-if="!paid && sellStatus !== 'Expired'">
            <div class="text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              CONTRACT INFO
            </div>
            <div style="font-size: 13px">
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row q-pt-md justify-between no-wrap q-mx-lg">
                <span>Address:</span>
                <span class="text-nowrap q-ml-xs">bitcoincash:qzvn7q***tgnvldj7l2</span>
              </div>
              <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
                <span>Balance:</span>
                <span class="text-nowrap q-ml-xs">{{ cryptoAmount }} BCH</span>
              </div>
            </div>
          </div>

          <!-- <div v-if="sellStatus === 'Released'">
            Here
          </div> -->
          <div v-if="sellStatus !== 'Released'">
            <div v-if="sellStatus === 'Expired'">
              <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
              <div class="q-py-sm text-center" style="font-size: 18px; font-weight: 500; color: #ed5f59;">
                <q-icon size="xs" name="info" color="red-5"/>&nbsp;
                <span>Buyer Has Timed Out</span>
              </div>
            </div>
            <div class="text-center q-mt-sm" v-else>
              <q-separator :dark="darkMode" />
              <div class="q-pt-sm" style="font-size: 15px;">
                <span v-if="paid">Confirm payment within time limit to release the crypto...</span>
                <span v-else>Expect payment within...</span>
              </div>
              <div v-if="paid" class="text-center" style="font-size: 35px; color: rgb(60, 100, 246);">
                {{ countDown }}
              </div>
              <div v-else class="text-center" style="font-size: 40px; color: rgb(60, 100, 246);">
                {{ countDown }}
              </div>
            </div>
            <div class="q-mt-sm" v-if="paid || sellStatus === 'Expired'">
              <div class="row text-center q-gutter-sm q-mx-lg">
                <div :class="$q.platform.is.mobile? 'col-4' : 'col'">
                  <q-btn
                    rounded
                    no-caps
                    label='Appeal'
                    class="q-space text-white full-width"
                    style="background-color: #ed5f59;"
                    @click="appeal = true"
                  />
                </div>
                <div :class="$q.platform.is.mobile? 'col-7' : 'col'">
                  <q-btn
                    rounded
                    no-caps
                    label='Confirm Payment'
                    class="q-space text-white full-width"
                    color="blue-6"
                    @click="confirmPayment = true"
                  />
                </div>
              </div>
              <div class="q-px-xs q-pt-md q-pb-xs" style="font-size: 12px;">
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
          <div v-if="!paid">
            <div class="text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              MY PAYMENT METHODS
            </div>
            <div class="q-pt-md">
              <div class="q-gutter-sm" :class="$q.platform.is.mobile? '' : 'text-center'">
                <q-badge v-for="method in paymentMethods" rounded outline color="red" :label="method.type"/>
              </div>
            </div>
          </div>
          <!-- <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs">{{ buyStatus }}</span>
          </div> -->
        </div>
      </q-step>

      <q-step
        :name="3"
        title="Release Crypto"
        prefix="3"
      >
        <div class="q-mx-lg text-h5 text-center" style="font-size: 18px;">
          Release Crypto
        </div>
        <div class="q-pt-md" style="font-size: 13px;">
          <div style="font-weight: 500;" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Fiat Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ fiatAmount }} PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Price:</span>
            <span class="text-nowrap q-ml-xs">6871.41 PHP</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
            <span>Crypto Amount:</span>
            <span class="text-nowrap q-ml-xs">{{ cryptoAmount }} BCH</span>
          </div>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg" style="font-weight: 500;">
            <span>Status:</span>
            <span class="text-nowrap q-ml-xs" v-if="sellStatus !== 'Expired'" :class="sellStatus.toLowerCase().includes('pending') ? 'text-orange-6' : 'text-green-6'">{{ sellStatus }}</span>
            <span class="text-nowrap q-ml-xs text-red-6" v-if="sellStatus === 'Expired'">{{ sellStatus }}</span>
          </div>
        </div>
        <div class="text-center">
          <div class="text-h5" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            RELEASED
          </div>
          <div class="q-pt-sm" style="font-size: 18px;">
            {{ getDate() }}
          </div>
        </div>
        <div class="q-pt-sm">
          <div class="text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            TRADE INFO
          </div>
          <div class="q-pt-md">
            <div  class="row justify-between no-wrap q-mx-lg">
              <div>
                <span style="font-size: 13px;">Buyer</span><br>
                <span style="font-weight: 500; font-size: 15px;">{{ sell.name }}</span>
              </div>
              <div class="q-pt-sm text-right">
                <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
                <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
              </div>
            </div>
            <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
            <div  class="row justify-between no-wrap q-mx-lg q-pt-md">
              <div>
                <span style="font-size: 13px;">Arbiter</span><br>
                <span style="font-weight: 500; font-size: 15px;">Atty. Ruby Von Rails</span>
              </div>
              <div class="q-pt-sm text-right">
                <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
                <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
              </div>
            </div>
            <!-- <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/> -->
          </div>
          <div>
            <div class="text-h5 q-pt-md text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              PAYMENT METHOD
            </div>
            <div class="q-pt-md">
              <div class="q-gutter-sm" :class="$q.platform.is.mobile? '' : 'text-center'">
                <!-- <q-badge rounded outline color="red" :label="paymentMethods[0].type"/> -->
                <div class="q-mx-lg text-center">
                  <div class="text-h5" style="font-size: 15px;">
                    {{ paymentMethods[0].type.toUpperCase() }}
                  </div>
                  <div class="subtext" style="font-weight: 500;">
                    {{ paymentMethods[0].info }}
                  </div>
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
  <!-- Confirm Payment -->
  <q-dialog persistent v-model="confirmPayment">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Confirm Payment?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div>
          This will release the crypto held by the escrow account to the buyer.
        </div>
        <div class="q-pt-md">
          I confirm that I have received payment from the buyer.
        </div>

      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="confirmingPayment" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Appeal Dialog -->
  <q-dialog full-width persistent v-model="appeal">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Submitting an Appeal&nbsp;&nbsp;<q-icon size="xs" name="info" color="blue-grey-6"/></div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none q-px-md">
        <span>
          The BCH funds are held by the escrow smart contract until it is confirmed that all of the terms of agreement between the buyer and seller have been met.
        </span><br><br>
        <span class="q-pt-lg">
          Submitting an appeal will raise dispute on the funds which requires the intervention of the smart contract's assigned Arbiter.
        </span><br><br>
        <span class="q-pt-lg">
          The arbiter is a person or entity that is appointed or selected to act as a neutral and impartial third party in this dispute. The arbiter has the authority to release the funds to the buyer or refund to the seller.
        </span>
      </q-card-section>

      <q-card-actions class="q-pt-xs text-center" align="center">
        <q-btn flat label="Cancel" color="red" v-close-popup />
        <q-btn flat label="I understand, proceed" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'
import FiatStoreSellInit from './FiatStoreSellInit.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      sell: {},
      isloaded: false,
      countDown: '',
      timer: null,
      receivedPayment: false,
      confirmPayment: false,
      appeal: false,
      paid: false,
      sellStatus: 'Pending Payment',
      paymentMethods: []
    }
  },
  props: {
    listingData: Object,
    cryptoAmount: Number,
    fiatAmount: String
  },
  components: {
    FiatStoreSellInit
  },
  emits: ['back', 'hideBuyer'],
  methods: {
    paymentCountdown () {
      const vm = this
      const currentDate = new Date().getTime()
      const expiryDate = new Date(currentDate + 24 * 60 * 60 * 1000)

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
    releaseCntDwnSim () {
      const vm = this

      const expire = 10
      let now = 0

      const x = setInterval(function () {
        now++
        if (now === expire) {
          clearInterval(x)
          // vm.$refs.stepper.next()
          // vm.buyStatus = 'Released'
          // vm.$emit('released')
          // vm.buyStatus = 'Expired'
          clearInterval(vm.timer)
          vm.timer = null
          // vm.receivedPayment = true

          // vm.paid = true
          // vm.sellStatus = 'Pending Release'
          vm.sellStatus = 'Expired'
          console.log(vm.receivedPayment)
        }
      }, 1000)
    },
    confirmedOrder () {
      this.paymentCountdown()
      this.releaseCntDwnSim()
      this.$refs.stepper.next()
      this.$emit('hideBuyer')
    },
    confirmingPayment () {
      clearInterval(this.timer)
      this.timer = null
      this.paid = true
      this.receivedPayment = true
      this.sellStatus = 'Released'

      this.$emit('hideBuyer')
      // console.log(this.receivedPayment)
    },
    getDate () {
      const date = new Date()
      return date.toLocaleString('default', { month: 'long' }) + ' ' + date.getDate() + ', ' + date.getFullYear()
    },
    setPaymentMethods (data) {
      console.log('setting payment methods')
      console.log(data)
      this.paymentMethods = data
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this

    console.log(vm.fiatAmount)
    vm.sell = vm.listingData
    this.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
 .subtext {
    font-size: 13px;
    opacity: .5;
  }
</style>
