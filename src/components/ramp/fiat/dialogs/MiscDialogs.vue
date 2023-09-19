<template>
  <!-- Generic Dialog -->
  <q-dialog persistent v-model="genericDialog">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">{{ title }}</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        {{ text }}
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="submitData()" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Create Payment Method -->
  <q-dialog full-width persistent v-model="createPaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h5 text-center lg-font-size">Create Payment Method</div>
      </q-card-section>

      <div>
        <div class="q-mx-lg">
          <span class="md-font-size">
            Payment Method
          </span>
          <div class="text-center q-pt-sm">
            <q-select
              :disable="dialogType === 'addMethodFromAd' || dialogType === 'editPaymentMethod' || paymentTypes.length === 0"
              dense
              filled
              :dark="darkMode"
              v-model="paymentMethod.payment_type"
              :options="paymentTypes"
              option-label="name"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="paymentMethod.payment_type = null"/>&nbsp;
              </template>
            </q-select>
          </div>
        </div>
        <div class="q-mx-lg q-pt-sm">
          <span class="md-font-size">
            Information
          </span>
          <div class="text-center q-pt-sm=">
            <q-input
              dense
              filled
              :dark="darkMode"
              v-model="paymentMethod.account_number"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click="paymentMethod.account_number = ''"/>&nbsp;
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
              @click="$emit('back')"
              v-close-popup />
          </div>
          <div class="col">
            <q-btn
              :disable="paymentMethod.account_number === '' || paymentMethod.payment_type === ''"
              rounded
              label="Confirm"
              color="blue-6"
              class="q-space text-white full-width"
              @click="submitData()"
              v-close-popup />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <q-dialog persistent v-model="addPaymentMethod">
    <q-card class="br-15" style="width: 90%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section class="q-mx-sm">
        <div class="bold-text text-center">Select Payment Methods</div>
        <div v-if="maxMethodReached" class="subtext text-center" style="font-size: 13px;"><i>Select only up to 5 methods</i></div>
      </q-card-section>

      <q-card-section class="text-left q-pt-sm q-mx-xs">
        <q-list style="max-height:60vh; overflow:auto;">
          <div v-if="loading" class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
          <div v-else v-for="(option, index) in paymentMethodOpts" :key="index">
            <q-item rounded :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              <q-item-section>
                <div class="q-py-none row">
                  <!-- <div class="row"> -->
                    <div class="col ib-text">
                      <span
                        :class="{'pt-dark-label': darkMode}"
                        class="q-mb-none"
                        style="font-size: 10px;">
                        {{ option.payment_type.name }}
                      </span><br>
                      <span
                        :class="{'pt-dark-label': darkMode}"
                        class="q-mb-none text-uppercase"
                        style="font-size: 12px;">
                        {{ option.account_name }}
                      </span><br>
                      <span
                        :class="{'pt-dark-label': darkMode}"
                        class="q-mb-none text-uppercase"
                        style="font-size: 12px;">
                        {{ option.account_number }}
                      </span>
                    </div>
                    <div>
                      <q-checkbox
                        v-model:model-value="option.selected"
                        @update:model-value="updateSelectedPaymentMethods(option)"
                        color="cyan"
                        keep-color
                      />
                    </div>
                  <!-- </div> -->
                </div>
              </q-item-section>
            </q-item>
          </div>
        </q-list>
      </q-card-section>
      <q-card-section>
        <div v-if="!loading" class="row q-gutter-sm justify-center">
            <!-- Hide this button  -->
            <q-btn
              v-if="paymentTypes.length !== 0"
              outline
              rounded
              label='Add new'
              color="blue-6"
              @click="addNewPaymentMethod()"
              style="font-size: 12px;"
              v-close-popup>
            </q-btn>
            <q-btn
              rounded
              color="blue-6"
              @click="submitUpdatedPaymentMethods()"
              style="font-size: 12px;"
              v-close-popup>
              <template v-slot:default>
                Select ({{ selectedPaymentMethods.length }})
              </template>
            </q-btn>
        </div>
      </q-card-section>

      <!-- <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="submitData()" v-close-popup />
      </q-card-actions> -->
    </q-card>
  </q-dialog>

  <!-- Payment Deletion Confirmation -->
  <q-dialog persistent v-model="confirmDeletePaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section class="xm-font-size q-mx-lg">
        <div class="text-center">Delete this Payment Method?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="lg-font-size bold-text">
          {{ info.payment_type.name}}:
        </span><br>
        <span>
          {{ info.account_number }}
        </span>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="submitData()" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Payment Removal Confirmation -->
  <q-dialog persistent v-model="confirmRemovePaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section class="xm-font-size q-mx-lg">
        <div class="text-center">Remove this Payment Method?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="lg-font-size bold-text">
          {{ info.payment_type.name}}:
        </span><br>
        <span>
          {{ info.account_number }}
        </span>
      </q-card-section>

      <q-card-section class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="submitData()" v-close-popup />
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Add Nickname -->
  <q-dialog persistent v-model="editNickname">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Set Nickname</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="text-center q-pt-sm=">
          <q-input
            dense
            filled
            :dark="darkMode"
            v-model="nickname"
            @update:model-value="checkName()"
          >
            <template v-slot:append>
              <q-icon size="xs" name="close" @click="nickname = ''"/>&nbsp;
            </template>
          </q-input>
        </div>
        <div v-if="!isNameValid" class="xs-font-size q-pt-sm q-pl-xs text-red-6">* Please enter nickname</div>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn :disable="!isNameValid" flat label="Confirm" @click="submitData()" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Profile View -->
  <q-dialog persistent v-model="viewProfile">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section class="text-center">
        <q-icon size="lg" color="blue-grey-9" name='o_account_circle'/>

        <div class="q-pt-none lg-font-size bold-text">
          {{ $store.getters['global/getRampNickName'].toUpperCase() }}&nbsp; <q-icon size="xs" color="blue-grey-5" name='o_edit'/>
        </div>

        <div class="row q-pt-sm text-center subtext sm-font-size">
          <div class="col">1000 trades</div>
          <div class="col">99% completion</div>
        </div>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" @click="$emit('back')" color="red-6" v-close-popup />
        <q-btn flat label="Confirm" @click="submitData()" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Appeal Dialog -->
  <q-dialog full-width persistent v-model="submitAppeal">
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
        <q-btn flat label="Cancel" @click="$emit('back')" color="red" v-close-popup />
        <q-btn flat label="I understand, proceed" @click="submitData()" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Filter Ads -->
  <q-dialog v-model="filterAd" persistent>
    <q-card class="br-15" style="width: 90%;">
      <div class="q-mt-md q-pl-md">
        <q-icon size="sm" name="close" v-close-popup @click="$emit('back')"/>&nbsp;
      </div>
      <div class="text-center bold-text lg-font-size">Filter Ads</div>
      <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>

      <div class="q-px-lg q-mx-sm">
        <div class="q-pt-md">
          <div class="sm-font-size bold-text">Price Setting</div>
          <div @click="isFixed = !isFixed" class="q-gutter-sm q-pt-sm">
            <q-badge rounded outline color="blue-grey-6">
              <span>{{ isFixed ? 'Fixed': 'Floating' }}</span><q-icon size="sm" :name="isFixed ? 'mdi-menu-up':'mdi-menu-down'"/>
            </q-badge>
          </div>
        </div>
        <div class="q-pt-md">
          <div class="sm-font-size bold-text">Payment Types</div>
          <div class="q-gutter-sm q-pt-sm">
            <q-badge class="q-pa-sm" @click="addFilterInfo(method, 'payment-type')"
              v-for="method in paymentTypes" :key="method.id" rounded :outline="isOutlined(method,'payment-type')" color="blue-grey-6">
              {{ method.name }}
            </q-badge>

            <q-badge class="q-pa-sm" @click="addFilterInfo('all', 'all-payment-type')"
              rounded outline color="blue-grey-6">
              {{ selectedPaymentTypes.length === paymentTypes.length ? 'Clear' : 'All' }}
            </q-badge>
          </div>
        </div>

        <div class="q-pt-md">
          <div class="sm-font-size bold-text">Payment Time Limits</div>
          <div class="q-gutter-sm q-pt-sm">
            <q-badge class="q-pa-sm"
              v-for="(method, index) in ptl" @click="addFilterInfo(method)" :key="index" rounded :outline="isOutlined(method)" color="blue-grey-6">
              {{ paymentTimeLimit(method) }}
            </q-badge>
            <q-badge class="q-pa-sm" @click="addFilterInfo('all')"
              rounded outline color="blue-grey-6">
              {{ selectedPTL.length === ptl.length ? 'Clear' : 'All' }}
            </q-badge>
          </div>
        </div>

        <div class="q-pt-md">
          <div class="sm-font-size bold-text">Price Order</div>
          <div @click="isAscending = !isAscending" class="q-pt-xs">
            <q-badge rounded outline color="blue-grey-6">
              <span>{{ isAscending ? 'Ascending ': 'Descending' }}</span><q-icon size="sm" :name="isAscending ? 'mdi-menu-up':'mdi-menu-down'"/>
            </q-badge>
          </div>
        </div>

        <div class="text-center q-pt-sm q-px-sm q-pb-lg">
          <div class="row q-pt-md">
            <q-btn
              rounded
              no-caps
              label='Filter'
              class="q-space text-white"
              color="blue-6"
              @click="submitData()"
              v-close-popup
            />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <!-- Sending Appeal Confirmation Todo-->
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
        <q-btn flat label="Cancel" color="red" @click="$emit('back')" v-close-popup />
        <q-btn flat label="I understand, proceed" @click="submitData()" color="blue-6" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { debounce } from 'quasar'
import { loadP2PWalletInfo, getPaymentTimeLimit } from 'src/wallet/ramp'
import { signMessage } from '../../../../wallet/ramp/signature.js'

export default {
  emits: ['back', 'submit'],
  props: {
    type: String,
    data: {
      type: Object,
      default: null
    },
    title: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: ''
    },
    currentPaymentMethods: Array
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      walletIndex: this.$store.getters['global/getWalletIndex'],
      info: {},
      loading: false,
      isNameValid: false,
      dialogType: '',

      // Data

      // Dialog Model
      genericDialog: false,

      createPaymentMethod: false,
      addPaymentMethod: false,
      editPaymentMethod: false,
      confirmPaymentMethod: false,
      confirmDeletePaymentMethod: false,
      confirmRemovePaymentMethod: false,
      editNickname: false,
      viewProfile: false,
      submitAppeal: false,
      maxMethodReached: false,
      filterAd: false,
      appeal: false,

      // Input Model
      nickname: '',
      paymentMethod: {
        payment_type: '',
        account_name: '',
        account_number: ''

      },
      ptl: [5, 15, 30, 60, 300, 720, 1440],
      paymentTypes: [],
      paymentMethodOpts: [],
      selectedPaymentMethods: [],
      selectedPaymentTypes: [],
      selectedPTL: [],
      isAscending: false,
      isFixed: true
    }
  },
  watch: {
    selectedPaymentMethods (value) {
      const vm = this
      if (value.length >= 5) {
        vm.maxMethodReached = true
      } else {
        vm.maxMethodReached = false
      }
    }
  },
  async mounted () {
    const vm = this

    await vm.fetchPaymentTypes()

    vm.checkDialogType()
    if (vm.addPaymentMethod) {
      vm.selectedPaymentMethods = vm.currentPaymentMethods.map((element) => {
        element.selected = false
        if (vm.selectedPaymentMethods.includes(element)) {
          element.selected = true
          return element
        }
        return element
      })
    }
    vm.maxMethodReached = vm.selectedPaymentMethods.length >= 5
    vm.fetchPaymentMethod()
  },
  methods: {
    addFilterInfo (data, type = '') {
      let temp = null

      if (data === 'all') {
        if (type === 'all-payment-type') {
          if (this.selectedPaymentTypes.length === this.paymentTypes.length) {
            this.selectedPaymentTypes = []
          } else {
            this.selectedPaymentTypes = this.paymentTypes
          }
        } else {
          if (this.selectedPTL.length === this.ptl.length) {
            this.selectedPTL = []
          } else{
            this.selectedPTL = []

            for (const p in this.ptl) {
              this.selectedPTL.push(getPaymentTimeLimit(this.ptl[p]))
            }
          }
        }
      } else {
        if (type === 'payment-type') {
          temp = this.selectedPaymentTypes.map(p => p.name)
          if (temp.includes(data.name)) {
            this.selectedPaymentTypes = this.selectedPaymentTypes.filter(p => p.name !== data.name)
          } else {
            this.selectedPaymentTypes.push(data)
          }
        } else {
          temp = this.selectedPTL.map(p => p.value)
          if (temp.includes(data)) {
            this.selectedPTL = this.selectedPTL.filter(p => p.value !== data)
          } else {
            this.selectedPTL.push(getPaymentTimeLimit(data))
          }
        }
      }
    },
    isOutlined (data, type = '') {
      let temp = null

      if (type === 'payment-type') {
        temp = this.selectedPaymentTypes.map(p => p.name)
        return !temp.includes(data.name)
      } else {
        temp = this.selectedPTL.map(p => p.value)
        return !temp.includes(data)
      }
    },
    paymentTimeLimit (timeValue) {
      return getPaymentTimeLimit(timeValue).label
    },
    addNewPaymentMethod () {
      const vm = this
      this.filterPaymentTypes('ads')
      vm.dialogType = 'createPaymentMethod'
      vm.createPaymentMethod = true
    },
    submitUpdatedPaymentMethods () {
      this.$emit('back', this.selectedPaymentMethods)
    },
    async fetchPaymentMethod () {
      const vm = this
      vm.loading = true
      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'PAYMENT_METHOD_LIST', timestamp)
      vm.$axios.get(vm.apiURL + '/payment-method',
        {
          headers: {
            'wallet-hash': wallet.walletHash,
            signature: signature,
            timestamp: timestamp
          }
        })
        .then(response => {
          const data = response.data
          if (vm.addPaymentMethod) {
            vm.paymentMethodOpts = data.map((element) => {
              const selected = vm.selectedPaymentMethods.some((item) => {
                return item.id === element.id
              })
              element.selected = selected
              return element
            })
          }
          vm.loading = false
        })
        .catch(error => {
          console.log(error.response)
          vm.loading = false
        })
    },
    updateSelectedPaymentMethods (paymentMethod) {
      const vm = this

      if (paymentMethod.selected) {
        if (vm.selectedPaymentMethods.length >= 5) {
          paymentMethod.selected = !paymentMethod.selected
          vm.maxMethodReached = true
          return
        }
        if (!vm.selectedPaymentMethods.includes(paymentMethod)) {
          vm.selectedPaymentMethods.push(paymentMethod)
        }
      } else {
        vm.selectedPaymentMethods = vm.selectedPaymentMethods.filter((element) => element.id !== paymentMethod.id)
      }
      // console.log('selectedPaymentMethods:', vm.selectedPaymentMethods)
    },
    checkDialogType () {
      const vm = this
      vm.dialogType = vm.type
      switch (vm.dialogType) {
        case 'createPaymentMethod':
          vm.filterPaymentTypes()
          vm.createPaymentMethod = true
          break
        case 'addPaymentMethod':
          this.filterPaymentTypes('ads')
          vm.addPaymentMethod = true
          break
        case 'editPaymentMethod':
          this.paymentMethod = this.data
          vm.createPaymentMethod = true
          break
        case 'addMethodFromAd':
          this.paymentMethod.payment_type = this.data
          vm.createPaymentMethod = true
          break
        // case 'confirmPaymentMethod':
        //   vm.confirmPaymentMethod = true
        //   break
        case 'confirmDeletePaymentMethod':
          this.info = this.data
          vm.confirmDeletePaymentMethod = true
          break
        case 'confirmRemovePaymentMethod':
          vm.info = vm.data
          vm.confirmRemovePaymentMethod = true
          break
        case 'editNickname': {
          const user = vm.$store.getters['ramp/getUser']
          if (user) {
            vm.nickname = user.nickname
          }
          vm.editNickname = true
          break
        }
        case 'viewProfile':
          vm.viewProfile = true
          break
        case 'submitAppeal':
          vm.submitAppeal = true
          break
        case 'confirmPaymentBuyer':
          vm.confirmPaymentBuyer = true
          break
        case 'confirmPaymentSeller':
          vm.confirmPaymentSeller = true
          break
        case 'filterAd':
          vm.filterAd = true
          break
        case 'appeal':
          vm.appeal = true
          break
        case 'genericDialog':
        case 'confirmPayment':
        case 'confirmPaymentMethod':
        case 'confirmCancelOrder':
        case 'confirmOrderCreate':
          vm.genericDialog = true
          break
        case 'confirmReleaseCrypto':
          vm.genericDialog = true
          break
      }
      // case 'confirmOrderCreate':
    },
    stageData () {
      const vm = this
      switch (vm.dialogType) {
        case 'createPaymentMethod':
          vm.info = vm.paymentMethod
          return 'submit'
        case 'addPaymentMethod':
          vm.info = vm.selectedPaymentMethods
          return 'back'
        case 'editPaymentMethod':
          vm.info = vm.paymentMethod
          return 'submit'
        case 'addMethodFromAd':
          vm.info = vm.paymentMethod
          return 'submit'
        case 'editNickname':
          vm.info = {
            nickname: vm.nickname
          }
          return 'submit'
        case 'confirmDeletePaymentMethod':
          vm.confirmDeletePaymentMethod = false
          return 'submit'
        case 'confirmRemovePaymentMethod':
          vm.info = vm.data
          return 'submit'
        case 'filterAd':
          vm.info = {
            paymentTypes: vm.selectedPaymentTypes,
            paymentTimeLimit: vm.selectedPTL,
            sortOrder: vm.isAscending ? 'Ascending' : 'Descending'
          }
          return 'submit'
        case 'confirmCancelOrder':
        case 'confirmOrderCreate':
          return 'submit'
        default:
          vm.info = vm.selectedPaymentMethods
          return 'submit'
        // TODO: Add case for 'filterAd'
      }
    },
    submitData () {
      const vm = this
      const emitName = vm.stageData()
      // console.log('emitName:', emitName)
      // console.log('vm.info:', vm.info)
      this.$emit(emitName, vm.info)
      // this.$emit('back', vm.info)
    },
    checkName: debounce(async function () {
      const vm = this
      this.isNameValid = false

      if (vm.nickname !== '') {
        this.isNameValid = true
      }
    }, 500),
    filterPaymentTypes (type = '') {
      let currentMethods = null
      if (type === 'ads') {
        currentMethods = this.data.map(p => p.payment_type.name)
      } else {
        currentMethods = this.data.map(p => p.name)
      }
      const match = this.paymentTypes.filter(function (method) {
        return !currentMethods.includes(method.name)
      })

      this.paymentTypes = match
    },
    async fetchPaymentTypes () {
      const vm = this
      await vm.$axios.get(vm.apiURL + '/payment-type')
        .then(response => {
          vm.paymentTypes = response.data
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
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
