<template>
  <!-- Generic Dialog -->
  <q-dialog v-model="genericDialog" @before-hide="$emit('back')">
    <q-card class="br-15 pt-card-2 text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">{{ title }}</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        {{ text }}
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          label="Confirm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="submitData()"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Create/Edit Payment Method -->
  <q-dialog full-width v-model="createPaymentMethod" @before-hide="$emit('back')">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
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
              borderless
              filled
              :dark="darkMode"
              v-model="paymentMethod.payment_type"
              :options="paymentTypes"
              option-label="name">
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
                      {{ scope.opt.name }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
        </div>
        <div v-if="paymentMethod.payment_type">
          <div class="q-mx-lg q-pt-sm">
            <span class="md-font-size">
              Account Name
            </span>
            <div class="text-center q-pt-sm">
              <q-input
                dense
                filled
                :dark="darkMode"
                v-model="paymentMethod.account_name">
                <template v-slot:append>
                  <q-icon size="xs" name="close" @click="paymentMethod.account_name = ''"/>&nbsp;
                </template>
              </q-input>
            </div>
          </div>
          <div class="q-mx-lg q-pt-sm">
            <div v-if="paymentMethod.payment_type?.formats?.length > 1">
              <div class="md-font-size q-pb-sm">
                Identifier Type
              </div>
              <q-select
                dense
                borderless
                filled
                v-model="paymentMethod.format"
                :dark="darkMode"
                :options="paymentMethod.payment_type?.formats">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
                        {{ scope.opt }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div v-for="(type, index) in paymentMethod.payment_type?.formats" :key="index">
              <span class="md-font-size">
                {{ paymentTypeFormat(type) }}
              </span>
              <!-- <div class="text-center q-pt-sm"> -->
                <q-input
                  dense
                  filled
                  :dark="darkMode"
                  :rules="[paymentTypeRules]"
                  v-model="paymentMethod.account_identifier"
                  class="q-py-sm">
                  <template v-slot:append>
                    <q-icon size="xs" name="close" @click="paymentMethod.account_identifier = ''"/>&nbsp;
                  </template>
                </q-input>
              <!-- </div> -->
            </div>
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
              :disable="paymentConfirm"
              rounded
              label="Confirm"
              class="q-space text-white full-width button"
              @click="submitData()"
              v-close-popup />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <!-- Add Payment Method Dialog -->
  <q-dialog persistent v-model="addPaymentMethod">
    <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-mx-sm">
        <div class="text-weight-bold text-center">Select Payment Methods</div>
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
                        class="q-mb-none pt-label"
                        :class="getDarkModeClass(darkMode)"
                        style="font-size: 10px;"
                      >
                        {{ option.payment_type.name }}
                      </span><br>
                      <span
                        class="q-mb-none text-uppercase text-caption pt-label"
                        :class="getDarkModeClass(darkMode)"
                      >
                        {{ option.account_name }}
                      </span><br>
                      <span
                        class="q-mb-none text-uppercase text-caption pt-label"
                        :class="getDarkModeClass(darkMode)"
                      >
                        {{ option.account_identifier }}
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
              class="button button-icon"
              :class="getDarkModeClass(darkMode)"
              @click="addNewPaymentMethod()"
              style="font-size: 12px;"
              v-close-popup>
            </q-btn>
            <q-btn
              rounded
              class="button"
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
  <q-dialog v-model="confirmDeletePaymentMethod" @before-hide="$emit('back')">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="xm-font-size q-mx-lg">
        <div class="text-center">Delete this Payment Method?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="lg-font-size text-weight-bold">
          {{ info.payment_type.name}}:
        </span><br>
        <span>
          {{ info.account_identifier }}
        </span>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          label="Confirm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="submitData()"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Payment Removal Confirmation -->
  <q-dialog persistent v-model="confirmRemovePaymentMethod">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="xm-font-size q-mx-lg">
        <div class="text-center">Remove this Payment Method?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="lg-font-size text-weight-bold">
          {{ info.payment_type.name}}:
        </span><br>
        <span>
          {{ info.account_identifier }}
        </span>
      </q-card-section>

      <q-card-section class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          label="Confirm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="submitData()"
          v-close-popup
        />
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Add Nickname -->
  <q-dialog persistent v-model="editNickname">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center q-my-sm">Set Nickname</div>
        <div class="text-center">
          <q-input
            dense
            filled
            :dark="darkMode"
            v-model="nickname"
          >
            <!-- <template v-slot:append>
              <q-icon size="xs" name="close" @click="nickname = ''"/>&nbsp;
            </template> -->
          </q-input>
        </div>
        <div v-if="!isNameValid" class="xs-font-size q-pt-sm q-pl-xs text-red-6">Please enter nickname</div>
        <q-card-actions class="text-center" align="center">
          <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
          <q-btn
            :disable="!isNameValid"
            flat
            label="Confirm"
            @click="submitData()"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            v-close-popup
          />
        </q-card-actions>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Profile View -->
  <q-dialog persistent v-model="viewProfile">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-center">
        <q-icon size="lg" color="blue-grey-9" name='o_account_circle'/>

        <div class="q-pt-none lg-font-size text-weight-bold">
          {{ $store.getters['global/getRampNickName'].toUpperCase() }}&nbsp; <q-icon size="xs" color="blue-grey-5" name='o_edit'/>
        </div>

        <div class="row q-pt-sm text-center subtext sm-font-size">
          <div class="col">1000 trades</div>
          <div class="col">99% completion</div>
        </div>
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" @click="$emit('back')" color="red-6" v-close-popup />
        <q-btn
          flat
          label="Confirm"
          @click="submitData()"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Appeal Dialog -->
  <q-dialog full-width persistent v-model="submitAppeal">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
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
        <q-btn
          flat
          label="I understand, proceed"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="submitData()"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Sending Appeal Confirmation Todo-->
  <q-dialog full-width v-model="appeal" @before-hide="$emit('back')">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">Submitting an Appeal</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <span>
          The BCH funds are held by the escrow smart contract until it is confirmed that all of the terms of agreement between the buyer and seller have been met.
        </span><br><br>
        <span class="q-pt-lg">
          Submitting an appeal will raise a dispute on the funds which requires the intervention of the smart contract's assigned <span class="text-weight-bold">Arbiter</span>.
        </span><br><br>
        <span class="q-pt-lg">
          The arbiter is a person or entity that is appointed or selected to act as a neutral and impartial third party in this dispute. The arbiter has the authority to release the funds to the buyer or refund to the seller.
        </span>
      </q-card-section>

      <q-card-actions class="q-pt-lg text-center" align="center">
        <q-btn flat label="Cancel" color="red" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          label="I understand, proceed"
          class="button"
          @click="onProceedAppeal()"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog full-width persistent v-model="appealForm">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">Appeal Form</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="q-mx-md">
          <div class="sm-font-size text-weight-bold">Type</div>
          <div class="q-gutter-sm q-pt-sm">
            <q-badge
              class="q-pa-sm"
              rounded :outline="!(selectedAppealType && appealType.value === selectedAppealType.value)" color="blue-grey-6"
              @click="selectedAppealType = appealType"
              v-for="appealType in appealTypeOpts" :key="appealType.value" >
              {{ appealType.label }}
            </q-badge>
          </div>
          <div class="sm-font-size text-weight-bold q-mt-sm">Reasons</div>
          <div class="q-gutter-sm q-pt-sm">
            <q-badge
              class="q-pa-sm"
              rounded
              color="blue-grey-6"
              :outline="!(selectedReasons.includes(reason))"
              @click="updateAppealReasons(reason)"
              v-for="reason in reasonOpts" :key="reason" >
              {{ reason }}
            </q-badge>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="q-pt-lg text-center" align="center">
        <q-btn flat label="Cancel" color="red" @click="$emit('back')" v-close-popup />
        <q-btn
          flat
          label="Submit"
          class="button"
          :disable="!selectedAppealType || selectedReasons.length === 0"
          @click="submitData()"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- WIP instruction dialog fot ad form -->
  <q-dialog v-model="instructionDialog" @before-hide="$emit('back')" full-width position="bottom">
    <q-card class="br-15 pt-card-2 text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">{{ title }}</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        {{ text }}
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn
          flat
          label="Confirm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="$emit('back')"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getAppealCooldown } from 'src/wallet/ramp'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

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
    currentPaymentMethods: Array,
    filters: {}
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: {},
      loading: false,
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
      filterOrder: false,
      appeal: false,
      appealForm: false,
      instructionDialog: false,

      // Input Model
      nickname: '',
      paymentMethod: {
        payment_type: '',
        account_name: '',
        account_identifier: '',
        format: ''
      },
      ptl: [5, 15, 30, 60, 300, 720, 1440],
      paymentTypes: this.$store.getters['ramp/paymentTypes'],
      paymentMethodOpts: [],
      selectedPaymentMethods: [],

      priceTypeOpts: ['FIXED', 'FLOATING'],
      storeFilters: {
        selectedPaymentTypes: [],
        selectedPTL: [5, 15, 30, 60, 300, 720, 1440],
        priceOrder: null,
        priceTypes: ['FIXED', 'FLOATING']
      },
      orderFilters: {
        sort_type: 'ascending',
        sort_by: 'created_at',
        status: [],
        payment_types: [],
        time_limits: [5, 15, 30, 60, 300, 720, 1440],
        ownership: {
          owned: true,
          notOwned: true
        },
        trade_type: {
          buy: true,
          sell: true
        }
      },

      appealTypeOpts: [
        {
          label: 'Release',
          value: 'RLS'
        },
        {
          label: 'Refund',
          value: 'RFN'
        }
      ],
      selectedAppealType: null,
      reasonOpts: [
        'Unresponsive seller/buyer',
        'Payment failed',
        'I changed my mind'
      ],
      selectedReasons: [],
      ongoingStatuses: [
        { value: 'SBM', label: 'Submitted' },
        { value: 'CNF', label: 'Confirmed' },
        { value: 'ESCRW_PN', label: 'Escrow Pending' },
        { value: 'ESCRW', label: 'Escrowed' },
        { value: 'PD_PN', label: 'Paid Pending' },
        { value: 'PD', label: 'Paid' },
        { value: 'RLS_PN', label: 'Release Pending' },
        { value: 'RFN_PN', label: 'Refund Pending' }
      ],
      completedStatuses: ['CNCL', 'RLS', 'RFN'],
      // paymentTypeFormat: {
      //   email: 'Email Address',
      //   number: 'Account Number',
      //   bank: 'Bank Account Number',
      //   phone: 'Mobile Number'
      // }
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
  computed: {
    isNameValid () {
      return this.nickname && this.nickname.length > 0
    },
    paymentConfirm () {
      if (this.paymentMethod.account_identifier === '' || this.paymentMethod.payment_type === '' || typeof this.paymentTypeRules(this.paymentMethod.account_identifier) === 'string') {
        return true
      } else {
        return false
      }
    }
  },
  async mounted () {
    const vm = this
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
    getDarkModeClass,
    paymentTypeFormat (format) {
      return 'Test'
    },
    paymentTypeRules (val) {
      const format = this.paymentMethod.payment_type.format

      switch (format) {
        case 'email':
          if (/^[\w\\.~!$%^&*=+}{'?-]+@([\w-]+\.)+[\w-]{2,4}$/.test(val)) {
            return true
          } else {
            return 'Invalid Email Address'
          }
        case 'phone':
          if (/^(\d{9,15})$/.test(val)) {
            return true
          } else {
            return 'Invalid Phone Number'
          }
        case 'bank':
          if (/^(\d{9,35})$/.test(val)) {
            return true
          } else {
            return 'Invalid Account Number'
          }
        default:
          return true
      }
    },
    filterSelectAll (type) {
      const vm = this
      switch (type) {
        case 'ownership':
          vm.orderFilters.ownership.owned = true
          vm.orderFilters.ownership.notOwned = true
          break
        case 'status':
          vm.orderFilters.status = vm.ongoingStatuses.map(e => e.value)
          break
        case 'payment-type':
          vm.orderFilters.payment_types = vm.paymentTypes.map(e => e.id)
          break
        case 'time-limit':
          vm.orderFilters.time_limits = vm.ptl
          break
      }
    },
    isFilterAllSelected (type) {
      const vm = this
      switch (type) {
        case 'ownership':
          return vm.orderFilters.ownership.owned && vm.orderFilters.ownership.notOwned
        case 'status':
          return vm.orderFilters.status.length === vm.ongoingStatuses.length
        case 'payment-type':
          return vm.orderFilters.payment_types.length === vm.paymentTypes.length
        case 'time-limit':
          return vm.orderFilters.time_limits.length === vm.ptl.length
      }
    },
    setOrderFilter (type, value) {
      const vm = this
      switch (type) {
        case 'owned':
          vm.orderFilters.ownership.owned = value
          break
        case 'notOwned':
          vm.orderFilters.ownership.notOwned = value
          break
        case 'status':
          if (vm.orderFilters.status.includes(value)) {
            this.orderFilters.status = this.orderFilters.status.filter(e => e !== value)
          } else {
            this.orderFilters.status.push(value)
          }
          break
        case 'payment-type': {
          const paymentTypes = vm.orderFilters.payment_types
          if (paymentTypes.includes(value)) {
            if (paymentTypes?.length > 1) {
              vm.orderFilters.payment_types = paymentTypes.filter(e => e !== value)
            }
          } else {
            vm.orderFilters.payment_types.push(value)
          }
          break
        }
        case 'time-limit': {
          const timeLimits = vm.orderFilters.time_limits
          if (timeLimits.includes(value)) {
            if (timeLimits?.length > 1) {
              vm.orderFilters.time_limits = timeLimits.filter(e => e !== value)
            }
          } else {
            vm.orderFilters.time_limits.push(value)
          }
          break
        }
      }
    },
    updateStoreFilters (filters) {
      if (!filters) return
      this.storeFilters.priceOrder = filters.price_order
      this.storeFilters.priceTypes = filters.price_types
      this.storeFilters.selectedPaymentTypes = filters.payment_types
      this.storeFilters.selectedPTL = filters.time_limits
    },
    updateOrderFilters (filters) {
      if (!filters) return
      console.log('fileters:', filters)
      this.orderFilters = filters
    },
    addFilterInfo (data, type = '') {
      let temp = null
      if (data === 'all') {
        if (type === 'all-payment-type') {
          this.storeFilters.selectedPaymentTypes = this.paymentTypes.map(p => p.id)
        }
        if (type === 'all-time-limits') {
          this.storeFilters.selectedPTL = this.ptl
        }
      } else {
        if (type === 'payment-types') {
          temp = this.storeFilters.selectedPaymentTypes
          if (temp.includes(data.id)) {
            if (temp.length > 1) {
              this.storeFilters.selectedPaymentTypes = this.storeFilters.selectedPaymentTypes.filter(p => p !== data.id)
            }
          } else {
            this.storeFilters.selectedPaymentTypes.push(data.id)
          }
        }
        if (type === 'time-limits') {
          temp = this.storeFilters.selectedPTL
          if (temp.includes(data)) {
            this.storeFilters.selectedPTL = this.storeFilters.selectedPTL.filter(p => p !== data)
          } else {
            this.storeFilters.selectedPTL.push(data)
          }
        }
        if (type === 'price-types') {
          temp = this.storeFilters.priceTypes
          if (temp.includes(data)) {
            if (temp.length > 1) {
              this.storeFilters.priceTypes = this.storeFilters.priceTypes.filter(p => p !== data)
            }
          } else {
            this.storeFilters.priceTypes.push(data)
          }
        }
      }
    },
    isOutlined (data, type = '') {
      if (type === 'payment-types') {
        const temp = this.storeFilters.selectedPaymentTypes
        return !temp.includes(data.id)
      }
      if (type === 'time-limits') {
        return !this.storeFilters.selectedPTL.includes(data)
      }
      if (type === 'price-types') {
        return !this.storeFilters.priceTypes.includes(data)
      }
    },
    paymentTimeLimit (timeValue) {
      return getAppealCooldown(timeValue).label
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
      backend.get('/ramp-p2p/payment-method', { authorize: true })
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
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
          vm.loading = false
        })
    },
    updateSelectedPaymentMethods (paymentMethod) {
      const vm = this

      if (paymentMethod.selected) {
        if (vm.selectedPaymentMethods?.length >= 5) {
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
            vm.nickname = user.name
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
          vm.updateStoreFilters(JSON.parse(JSON.stringify(vm.filters)))
          break
        case 'filterOrder':
          vm.filterOrder = true
          vm.updateOrderFilters(JSON.parse(JSON.stringify(vm.filters)))
          break
        case 'appeal':
          vm.appealForm = true
          break
        case 'instructionDialog':
          vm.instructionDialog = true
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
            price_order: vm.storeFilters.priceOrder
          }
          if (vm.storeFilters.selectedPaymentTypes) {
            vm.info.payment_types = vm.storeFilters.selectedPaymentTypes
          }
          if (vm.storeFilters.selectedPTL) {
            vm.info.time_limits = vm.storeFilters.selectedPTL
          }
          if (vm.storeFilters.priceTypes) {
            vm.info.price_types = vm.storeFilters.priceTypes
          }
          return 'submit'
        case 'filterOrder':
          vm.info = vm.orderFilters
          return 'submit'
        case 'confirmCancelOrder':
        case 'confirmOrderCreate':
          return 'submit'
        case 'appeal':
          vm.info = {
            type: vm.selectedAppealType.value,
            reasons: vm.selectedReasons
          }
          return 'submit'
        default:
          vm.info = vm.selectedPaymentMethods
          return 'submit'
        // TODO: Add case for 'filterAd'
      }
    },
    resetFilters (type) {
      let filters = null
      if (type === 'store') {
        if (this.$parent.transactionType === 'SELL') {
          this.$store.commit('ramp/resetStoreSellFilters')
          filters = this.$store.getters['ramp/storeSellFilters']
        }
        if (this.$parent.transactionType === 'BUY') {
          this.$store.commit('ramp/resetStoreBuyFilters')
          filters = this.$store.getters['ramp/storeBuyFilters']
        }
        this.updateStoreFilters(filters)
      }

      if (type === 'orders') {
        if (this.$parent.statusType === 'ONGOING') {
          this.$store.commit('ramp/resetOngoingOrderFilters')
          filters = this.$store.getters['ramp/ongoingOrderFilters']
        }
        if (this.$parent.statusType === 'COMPLETED') {
          this.$store.commit('ramp/resetCompletedFilters')
          filters = this.$store.getters['ramp/completedOrderFilters']
        }
        this.updateOrderFilters(filters)
      }
    },
    submitData () {
      const vm = this
      const emitName = vm.stageData()
      this.$emit(emitName, vm.info)
    },
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
    onProceedAppeal () {
      this.appeal = false
      this.appealForm = true
    },
    updateAppealReasons (reason) {
      if (this.selectedReasons.includes(reason)) {
        const index = this.selectedReasons.indexOf(reason)
        if (index > -1) {
          this.selectedReasons.splice(index, 1)
        }
      } else {
        this.selectedReasons.push(reason)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
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
