<template>
  <div class="q-px-md full-width" v-if="isloaded">
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
              @click="cancelOrderConfirmation()"
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
                @click="cancelOrderConfirmation()"
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
            Please pay  <span class="text-blue-6 text-h5 lg-font-size">{{ getFiatAmount.toFixed(2) }} {{ order.fiat_currency.symbol }}</span> within the time limit...
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
                v-for="(method, index) in order.ad.payment_methods"
                :key="index"
              >
                <q-expansion-item
                  group="somegroup"
                  :label="method.payment_type.toUpperCase()"
                >
                  <q-card flat  :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
                    <q-card-section class="text-center subtext">
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
                <span class="bold-text md-font-size">After</span> transfering funds, click on the <span class="bold-text md-font-size">"Confirm Payment"</span> button below to notify the the seller.
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
        <div class="row q-gutter-sm q-pt-md">
          <q-btn
            rounded
            no-caps
            dense
            label='Appeal'
            class="q-space text-white"
            color="red-6"
          />
          <q-btn
            rounded
            no-caps
            dense
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
          Crypto Release
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
            <div v-if="isExpired">
              <span class="text-nowrap q-ml-xs text-red-6">Expired</span>
            </div>
            <div v-else>
              <div v-if="!checkStatus">
                <span class="text-nowrap q-ml-xs" :class="order.status.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status }}</span>
              </div>
              <div v-else>
                <span class="text-nowrap q-ml-xs text-red-6">{{ order.status }}</span>
              </div>
            </div>
          </div>
          <div class="row q-pt-md" v-if="order.status === 'Canceled'">
            <q-btn
              rounded
              no-caps
              label='Appeal'
              class="q-space text-white"
              color="red-6"
              @click="appeal = true"
            />
          </div>
        </div>
        <div v-if="hasCountDown">
          <q-separator :dark="darkMode" class="q-mt-md"/>
          <div class="text-center q-px-md q-pt-md text-center">
            <div class="q-px-lg md-font-size">
              Your Crypto is pending for release by the seller
            </div>
            <div class="text-center text-h2" style="font-size: 35px; color: #ed5f59;">
              {{ countDown }}
            </div>
            <div>
              Please wait until...
            </div>
          </div>
        </div>
        <q-separator :dark="darkMode" class="q-mt-sm"/>
        <div>
          <div class="q-mx-sm q-mt-md">
            <div class="q-px-lg bold-text">
              Seller did not release crypto?
            </div>
            <div class="q-pt-xs q-mx-lg subtext">
              If the seller still has not release the crypto after the Payment Time Limit, please submit an appeal.
            </div>
          </div>
          <div class="row q-pt-md q-mx-md">
            <q-btn
              rounded
              no-caps
              dense
              label='Send an Appeal'
              class="q-space text-white"
              color="red-6"
              @click="appeal = true"
            />
          </div>
        </div>
        <div class="q-pt-sm" v-if="hasFeedback">
          <div class="text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            FEEDBACK
          </div>
          <div>
            <div  class="text-center q-mx-lg">
              <div>
                <div class="q-pt-sm">
                  <q-rating
                    v-model="ratingModel"
                    size="md"
                    color="amber-8"
                    icon="star"
                  />
                </div>
                <div class="q-mx-sm subtext" :class="{'pt-dark-label': darkMode}">
                  <span class="q-pl-md q-mb-none xs-font-size">
                    {{ ad.trade_count }} trades
                  </span>&nbsp;
                  <span class="q-pl-xs q-mb-none xs-font-size">
                    {{ ad.completion_rate }}% completion
                  </span>
                </div>
                <span class="bold-text q-mb-none md-font-size">{{ order.ad.owner.nickname }}</span><br>
                <span class="xs-font-size">Rate this Buyer</span><br>
              </div>
            </div>
            <!-- <div  class="text-center q-mx-lg">
              <div>
                <div class="q-pt-sm">
                  <q-rating
                    v-model="ratingModel"
                    size="md"
                    color="blue-8"
                    icon="star"
                  />
                </div>
                <span class="bold-text md-font-size">Atty. Ruby Von Rails</span><br>
                <span class="xs-font-size">Rate this Arbiter</span><br>
              </div>
            </div> -->
            <!-- <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/> -->
          </div>
          <div>
            <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
            <div class="q-pt-sm q-pl-lg">
              <span class="bold-text text-grey-7">Comment</span>
              <q-input class="q-pt-sm" dense rounded outlined v-model="comment" label="Add a comment" />
            </div>
            <div class="text-center q-pt-sm">
              <span class="text-blue"><u>Show comments</u></span>
            </div>
          </div>
        </div>
        <!-- <div class="q-my-lg">
          <div class="q-mx-md text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
            {{ transactionType === 'SELL' ? 'SELLER INFO' : 'BUYER INFO'}}
            SELLER INFO
          </div>
          <div class="row">
            <div class="col ib-text">
              <div class="q-mx-sm q-mt-md">
                <span
                  :class="{'pt-dark-label': darkMode}"
                  class="q-pl-md q-mb-none text-uppercase md-font-size bold-text"
                >
                  {{ ad.owner }}
                </span>
              </div>
              <div class="q-mx-sm subtext" :class="{'pt-dark-label': darkMode}">
                <span class="q-pl-md q-mb-none xs-font-size">
                  {{ ad.trade_count }} trades
                </span>&nbsp;
                <span class="q-pl-xs q-mb-none xs-font-size">
                  {{ ad.completion_rate }}% completion
                </span>
              </div>
            </div>
            <div class="text-right q-mr-lg q-mt-md" v-if="order.status === 'Released'">
              <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_up"/>
              <q-icon class="q-pr-lg" :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_thumb_down"/>
            </div>
            <div class="text-right q-mr-sm q-mt-md" v-else>
              <q-icon
                class="q-pr-lg"
                :color="darkMode? 'grey-5' : 'grey-7'" size="sm" name="o_chat"
              />
            </div>
          </div>
          <div class="q-mx-sm q-pt-sm" >
            <div class="q-ml-xs  q-gutter-sm">
              <q-badge v-for="method in ad.payment_methods" :key="method.id" rounded outline :color="order.trade_type === 'SELL' ? 'red' : 'blue'" :label="method.payment_type"/>
            </div>
          </div>
        </div> -->
      </q-step>
    </q-stepper>
  </div>

  <!-- Add Feedback UI  -->


  <!-- Progress Loader -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>

  <!-- Dialogs -->
  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
      v-on:back="openDialog = false"
      v-on:submit="cancelingOrder()"
    />
  </div>

  <!-- Move Dialog -->
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
import MiscDialogs from './dialogs/MiscDialogs.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      isloaded: false,
      openDialog: false,
      dialogType: '',
      status: 'prcessing', // 'view-order' 'released' 'cancelled'
      order: null,
      contract: null,
      ad: null, // ad fetch ad later
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
    ProgressLoader,
    MiscDialogs
  },
  computed: {
    getFiatAmount () {
      return parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
    },
    checkStatus () {
      const stat = this.order.status.toLowerCase()
      if (stat.includes('canceled') || this.isExpired) {
        return true
      } else {
        return false
      }
    },
    hasCountDown () {
      const stat = ['Escrowed', 'Paid Pending', 'Paid', 'Release Pending']
      return stat.includes(this.order.status) && !this.isExpired
    },
    hasFeedback () {
      const stat = ['Released', 'Canceled', 'Refunded']
      return stat.includes(this.order.status)
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
          this.step = 2
          this.confirmed = true
          this.paymentCountdown()
          console.log('2')
          break
        case 'Paid Pending':
        case 'Paid':
        case 'Release Pending':
          this.step = 3
          this.paymentCountdown()
          console.log('3')
          break
        case 'Released':
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
          console.log(vm.order)
        })
        .catch(error => {
          console.log(error)
        })
    },
    // updated this
    paymentCountdown () {
      const vm = this
      // const currentDate = new Date().getTime()
      const expiryDate = new Date(vm.order.expiration_date)

      vm.timer = setInterval(function () {
        const now = new Date().getTime()
        // find distance
        const distance = expiryDate - now

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }
        if (minutes.toString().length < 2) {
          minutes = '0' + minutes
        }

        vm.countDown = hours + ':' + minutes + ':' + seconds
        if (distance < 0) {
          clearInterval(vm.timer)
          vm.countDown = 'Expired'
          // vm.order.status = 'Expired'
          // vm.shiftExpired = true
        }
      }, 1000)
    },
    proceedToPayment () {
      // this.$emit('hideSeller')
      this.$refs.stepper.next()
    },
    cancelOrderConfirmation () {
      const vm = this
      vm.dialogType = 'confirmCancelOrder'
      vm.openDialog = true

      console.log('order', vm.order.id)
    },
    async cancelOrder () {
      console.log('cancelling order')
      const vm = this

      const url = this.apiURL + '/order/' + vm.order.id + '/cancel'
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp
      }

      await vm.$axios.post(url, {}, {
        headers: headers
      })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.log(error)
        })
    },
    cancelingOrder () {
      if (this.confirmed) {
        clearInterval(this.timer)
        this.timer = null
      }
      this.cancelOrder()
      // if (this.order.status === 'Released' || this.order.status === 'Release Pending') {
      //   this.$emit('pendingRelease')
      // }
      this.$emit('back')
    },
    async sendConfirmPayment () {
      const vm = this

      const url = this.apiURL + '/order/' + vm.order.id + '/confirm-payment/buyer'
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp) // update later

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        signature: signature,
        timestamp: timestamp,
        // pubkey: vm.wallet.publicKey
      }
      // console.log(headers)
      await vm.$axios.post(url, {}, {
        headers: headers
      })
        .then(response => {
          // console.log(response.data)
          this.fetchOrderData()
        })
        .catch(error => {
          console.log(error)
        })
    },
    async confirmPayment () {
      this.isloaded = false
      await this.sendConfirmPayment()

      this.checkStep()
      // this.$emit('hideSeller')
      // this.$emit('pendingRelease')
      this.isloaded = true
    }
  },
  setup () {
    return {
      step: ref(1)
    }
  },
  async mounted () {
    const vm = this
    const walletInfo = this.$store.getters['global/getWallet']('bch')
    this.wallet = await loadP2PWalletInfo(walletInfo)

    await this.fetchOrderData()
    await this.fetchAdData()
    await this.checkStep()

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
</style>
