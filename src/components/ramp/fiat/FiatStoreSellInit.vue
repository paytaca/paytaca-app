<template>
  <!-- <div>
    <q-btn
      flat
      padding="md"
      icon="arrow_back"
      @click="backStep"
    />
  </div> -->
  <div v-if="step === 1">
    <div class="q-mx-sm q-mb-sm text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      PAYMENT METHODS
    </div>
    <div>
      <div v-if="paymentMethods.length === 0" class="relative text-center" style="margin-top: 50px;">
        <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
        <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">No Payment Method Added</p>
      </div>
      <div v-else>
        <q-card-section style="max-height:38vh;overflow-y:auto;">
          <q-virtual-scroll :items="paymentMethods">
            <template v-slot="{ item: method, index }">
              <q-item clickable @click="selectPaymentMethod(index)" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <q-item-section>
                  <div class="text-h5" style="font-size: 15px;">
                    {{ method.type.toUpperCase() }}
                  </div>
                  <div class="subtext" style="font-weight: 500;">
                    {{ method.info }}
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
        </q-card-section>
      </div>
    </div>
    <div>
      <div class="row q-pt-lg q-mx-sm">
        <q-btn
          outline
          rounded
          no-caps
          label='Add'
          class="q-space text-white"
          color="blue-6"
          @click="addMethod = true"
        />
      </div>
    </div>
    <div class="row q-pt-lg q-mx-sm">
      <q-btn
        :disable="paymentMethods.length === 0"
        rounded
        no-caps
        label='Next'
        class="q-space text-white"
        color="blue-6"
        @click="confirmPaymentMethod = true"
      />
    </div>
  </div>

  <!-- Step 2 -->
  <div v-if="step === 2">
    <div class="q-mx-sm  q-mb-sm text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      TRADE CONTRACT
    </div>
    <div class="q-pt-sm q-px-sm" style="font-size: 13px;">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-xs">
        <span>Seller Address:</span>
        <span class="text-nowrap q-ml-xs subtext">bitcoincash:qz3d***ctsj</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-xs">
        <span>Buyer Address:</span>
        <span class="text-nowrap q-ml-xs subtext">bitcoincash:qz0y***7kxu</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-xs">
        <span>Arbiter Address:</span>
        <span class="text-nowrap q-ml-xs subtext">bitcoincash:qzkd***w9jg</span>
      </div>
    </div>
    <div class="q-mt-md">
      <div class="row" @click="arbiterInfo = true">
        <span class="q-pl-xs text-h5" style="font-size: 15px; font-weight: 500; margin-left: 25px;">Arbiter</span>&nbsp;
        <q-icon class="q-pt-sm" size="xs" name="o_info"/>
      </div>
      <div class="row q-pb-lg q-px-sm q-pt-xs">
        <q-btn
          outline
          rounded
          no-caps
          label='Paytaca'
          class="q-space text-white"
          color="blue-grey-6"
          icon-right="swap_horiz"
        />
      </div>
    </div>
    <div class="row q-mx-sm">
      <q-btn
        rounded
        no-caps
        label='Submit Seller Order'
        class="q-space text-white"
        color="blue-6"
        @click="nextStep"
      />
    </div>
  </div>

  <div v-if="step === 3">
    <div class="q-mx-sm  q-mb-sm text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      ESCROW FUNDS
    </div>
    <div class="q-pt-md q-px-sm" style="font-size: 13px;">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-sm">
        <span>Contract Address:</span>
        <span class="text-nowrap q-ml-xs subtext">bitcoincash:qz3d***ctsj</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-sm">
        <span>Crypto Amount:</span>
        <span class="text-nowrap q-ml-xs subtext">{{ cryptoAmount }} BCH</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-sm">
        <span>Arbitration Fee:</span>
        <span class="text-nowrap q-ml-xs subtext">{{ arbitrationFee }} BCH</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-sm">
        <span>Service Fee:</span>
        <span class="text-nowrap q-ml-xs subtext">{{ serviceFee }} BCH</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-sm"  style="font-weight: 500;">
        <span>Total:</span>
        <span class="text-nowrap q-ml-xs subtext">{{ totalAmount() }} BCH</span>
      </div>
    </div>
    <div class="row q-mx-sm q-pt-lg">
      <q-btn
        rounded
        no-caps
        label='Escrow Crypto'
        class="q-space text-white"
        color="blue-6"
        icon-right="o_info"
        @click="confirmOrder = true"
      />
    </div>
  </div>
  <!-- Dialogs  -->
  <!-- Add Payment Method -->
  <q-dialog full-width persistent v-model="addMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h5 text-center" style="font-size: 18px;">Add Payment Method</div>
      </q-card-section>

      <div>
        <div class="q-mx-lg">
          <span style="font-size: 13px;">
            Payment Method
          </span>
          <div class="text-center q-pt-sm">
            <q-select
              dense
              filled
              :dark="darkMode"
              v-model="method.type"
              :options="sellData.paymentMethods"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="method.type = ''"/>&nbsp;
              </template>
            </q-select>
          </div>
        </div>
        <div class="q-mx-lg q-pt-sm">
          <span style="font-size: 13px;">
            Information
          </span>
          <div class="text-center q-pt-sm=">
            <q-input
              dense
              filled
              :dark="darkMode"
              v-model="method.info"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click="method.info = ''"/>&nbsp;
              </template>
            </q-input>
          </div>
        </div>
      </div>

      <div class="q-my-lg q-mx-lg text-center" align="center">
        <div class="row q-gutter-md">
          <div class="col">
            <q-btn
              rounded
              label="Cancel"
              style="background-color: #ed5f59;"
              class="q-space text-white full-width"
              v-close-popup />
          </div>
          <div class="col">
            <q-btn
              :disable="method.type === '' || method.info === ''"
              rounded
              label="Confirm"
              color="blue-6"
              class="q-space text-white full-width"
              @click="addPaymentMethod"
              v-close-popup />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <!-- Edit Payment Method -->
  <q-dialog full-width persistent v-model="editMethod">
    <q-card
      class="br-15"
      style="width: 70%;"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']"
    >
      <q-card-section>
        <div class="text-h5 text-center" style="font-size: 18px;">Edit Payment Method</div>
      </q-card-section>

      <div>
        <div class="q-mx-lg">
          <span style="font-size: 13px;">
            Payment Method
          </span>
          <div class="text-center q-pt-sm">
            <q-select
              dense
              filled
              :dark="darkMode"
              v-model="paymentMethods[selectedIndex].type"
              :options="sellData.paymentMethods"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="paymentMethods[selectedIndex].type = ''"/>&nbsp;
              </template>
            </q-select>
          </div>
        </div>
        <div class="q-mx-lg q-pt-sm">
          <span style="font-size: 13px;">
            Information
          </span>
          <div class="text-center q-pt-sm=">
            <q-input
              dense
              filled
              :dark="darkMode"
              v-model="paymentMethods[selectedIndex].info"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="paymentMethods[selectedIndex].info = ''"/>&nbsp;
              </template>
            </q-input>
          </div>
        </div>
      </div>
      <div class="q-my-lg q-mx-lg text-center" align="center">
        <div class="row q-gutter-md">
          <div class="col">
            <q-btn
              rounded
              label="Cancel"
              style="background-color: #ed5f59;"
              class="q-space text-white full-width"
              v-close-popup />
          </div>
          <div class="col">
            <q-btn
              :disable="paymentMethods[selectedIndex].info === '' || paymentMethods[selectedIndex].type === ''"
              rounded
              label="Confirm"
              color="blue-6"
              class="q-space text-white full-width"
              @click="addPaymentMethod"
              v-close-popup />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <!-- Arbiter Info Dialog -->
  <q-dialog full-width persistent v-model="arbiterInfo">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">What is an Escrow Arbiter</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none q-px-md">
        <span>
          An Escrow Arbiter is a neutral third-party who is appointed to facilitate an escrow transaction between two parties.
        </span><br><br>
        <span class="q-pt-lg">
          The role of an Escrow Arbiter is to act as mediator and ensure that the terms of the agreement are met by both parties before the funds are released from the Escrow Account.
        </span><br><br>
        <span class="q-pt-lg">
          If there is a dispute between the buyer and the seller, the escrow arbiter will act as a mediator and attempt to resolve the issue. If the dispute cannot be resolved, the Escrow Arbiter may be required to make a decision based on the term of the agreement.
        </span>
      </q-card-section>

      <q-card-actions class="q-pt-xs text-center" align="center">
        <q-btn flat label="Cancel" color="red" v-close-popup />
        <q-btn flat label="I understand, proceed" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Confirm Order Notice -->
  <q-dialog persistent v-model="confirmOrder">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Confirm Order?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        Your <span style="font-weight: 500;">{{ cryptoAmount }} BCH</span>  will be sent to the escrow contract.
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="finalConf = true" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Final Confirmation -->
  <q-dialog persistent v-model="finalConf">
    <q-card class="br-15 q-py -md" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center" style="font-size: 18px;"><span style="font-weight: 500;">{{ cryptoAmount }} BCH</span> sent to escrow contract!</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span>
          bitcoincash:xxxxxxxxxxxxxxxxx
        </span><br>
        <span>
          txid: xxxxxxxxxxxxxxxxxxxxxxxxxx
        </span>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="continueSteps" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Confirm Payment Method -->
  <q-dialog persistent v-model="confirmPaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Confirm Payment Methods?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        Please make sure the information provided are correct.
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="nextStep" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      step: 1,
      paymentMethods: [],
      sellData: {},
      method: {
        type: '',
        info: ''
      },
      addMethod: false,
      editMethod: false,
      arbiterInfo: false,
      confirmOrder: false,
      finalConf: false,
      confirmPaymentMethod: false,
      selectedIndex: null,
      arbitrationFee: 0.00001,
      serviceFee: 0.00001
    }
  },
  emits: ['back', 'confirmed', 'pymntMethods'],
  props: {
    listingData: Object,
    cryptoAmount: Number
  },
  methods: {
    backStep () {
      const vm = this
      if (vm.step === 1) {
        vm.$emit('back')
      } else {
        vm.step--
      }
    },
    nextStep () {
      this.step++
    },
    addPaymentMethod () {
      const vm = this

      vm.paymentMethods.push(vm.method)

      vm.method = {
        type: '',
        info: ''
      }
      console.log(vm.paymentMethods)
    },
    editPaymentMethod (index) {
      console.log('editing')
    },
    selectPaymentMethod (index) {
      const vm = this

      vm.selectedIndex = index
      vm.editMethod = true
    },
    totalAmount () {
      const vm = this
      return vm.cryptoAmount + vm.arbitrationFee + vm.serviceFee
    },
    continueSteps () {
      const vm = this

      vm.$emit('pymntMethods', vm.paymentMethods)
      vm.$emit('confirmed')
    }
  },
  async mounted () {
    const vm = this

    vm.sellData = vm.listingData
    console.log(vm.listingData)
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
