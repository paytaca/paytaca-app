<template>

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
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section class="xm-font-size q-mx-lg">
        <div class="bold-text text-center">Select Payment Methods</div>
      </q-card-section>

      <q-card-section class="text-left q-pt-sm q-mx-md">
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
        <div v-if="!loading" class="row justify-center q-mx-md">
          <div class="q-mx-sm q-px-md">
            <q-btn
              outline
              rounded
              label='Add new'
              color="blue-6"
              class="q-space text-white full-width"
              @click="addNewPaymentMethod()"
              v-close-popup>
            </q-btn>
          </div>
          <div class="q-mx-sm q-px-md">
            <q-btn
              rounded
              color="blue-6"
              class="q-space text-white full-width"
              @click="submitUpdatedPaymentMethods()"
              v-close-popup>
              <template v-slot:default>
                Select ({{ selectedPaymentMethods.length }})
              </template>
            </q-btn>
          </div>
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
        <div class="subtext bold-text text-center">Delete this Payment Method?</div>
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
        <div class="subtext bold-text text-center">Remove this Payment Method?</div>
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

  <!-- Payment Method Confirmation -->
  <q-dialog persistent v-model="confirmPaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h6 text-center">Confirm Payment Methods?</div>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        Please make sure the information provided are correct.
      </q-card-section>

      <q-card-actions class="text-center" align="center">
        <q-btn flat label="Cancel" color="red-6" @click="$emit('back')" v-close-popup />
        <q-btn flat label="Confirm" color="blue-6" @click="submitData()" v-close-popup />
      </q-card-actions>
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
              <q-icon size="xs" name="close"/>&nbsp;
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
</template>

<script>
import { debounce } from 'quasar'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../../wallet/ramp/signature.js'

export default {
  emits: ['back', 'submit'],
  props: {
    type: String,
    data: {
      type: Object,
      default: null
    },
    currentPaymentMethods: Array
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      info: {},
      loading: false,
      isNameValid: false,
      dialogType: '',

      // Dialog Model
      createPaymentMethod: false,
      addPaymentMethod: false,
      editPaymentMethod: false,
      confirmPaymentMethod: false,
      confirmDeletePaymentMethod: false,
      confirmRemovePaymentMethod: false,
      editNickname: false,
      viewProfile: false,

      // Input Model
      nickname: '',
      paymentMethod: {
        payment_type: '',
        account_name: '',
        account_number: ''

      },
      paymentTypes: [],
      paymentMethodOpts: [],
      selectedPaymentMethods: []
    }
  },
  async mounted () {
    const vm = this
    vm.checkDialogType()
    vm.fetchPaymentTypes()
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
    vm.fetchPaymentMethod()
  },
  methods: {
    addNewPaymentMethod () {
      const vm = this
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
      const wallet = await loadP2PWalletInfo(walletInfo)
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
          console.log(error)
          vm.loading = false
        })
    },
    updateSelectedPaymentMethods (paymentMethod) {
      console.log('updateSelectedPaymentMethods:', paymentMethod)
      const vm = this

      if (paymentMethod.selected) {
        if (vm.selectedPaymentMethods.length >= 5) {
          paymentMethod.selected = !paymentMethod.selected
          return
        }
        if (!vm.selectedPaymentMethods.includes(paymentMethod)) {
          vm.selectedPaymentMethods.push(paymentMethod)
        }
      } else {
        vm.selectedPaymentMethods = vm.selectedPaymentMethods.filter((element) => element.id !== paymentMethod.id)
      }
      console.log('selectedPaymentMethods:', vm.selectedPaymentMethods)
    },
    checkDialogType () {
      const vm = this
      vm.dialogType = vm.type
      switch (vm.dialogType) {
        case 'createPaymentMethod':
          vm.createPaymentMethod = true
          break
        case 'addPaymentMethod':
          vm.addPaymentMethod = true
          break
        case 'editPaymentMethod':
          this.paymentMethod = this.data
          vm.editPaymentMethod = true
          break
        case 'confirmPaymentMethod':
          vm.confirmPaymentMethod = true
          break
        case 'confirmDeletePaymentMethod':
          this.info = this.data
          vm.confirmDeletePaymentMethod = true
          break
        case 'confirmRemovePaymentMethod':
          vm.info = vm.data
          vm.confirmRemovePaymentMethod = true
          break
        case 'editNickname':
          vm.editNickname = true
          break
        case 'viewProfile':
          vm.viewProfile = true
          break
      }
    },
    stageData () {
      const vm = this
      console.log('dialogType:', vm.dialogType)
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
        case 'editNickname':
          vm.info = {
            nickname: vm.nickname
          }
          return 'submit'
        case 'confirmRemovePaymentMethod':
          vm.info = vm.data
          return 'submit'
        default:
          vm.info = vm.selectedPaymentMethods
          return 'submit'
      }
    },
    submitData () {
      const vm = this
      const emitName = vm.stageData()
      console.log('vm.info:', vm.info)
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
    switchDialog (type) {
      // switching from one dialog to another
    },
    fetchPaymentTypes () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/payment-type')
        .then(response => {
          vm.paymentTypes = response.data
          // console.log(vm.paymentTypes)
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
