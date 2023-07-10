<template>

  <!-- Add Payment Method -->
  <q-dialog full-width persistent v-model="addPaymentMethod">
    <q-card class="br-15" style="width: 70%;" :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
      <q-card-section>
        <div class="text-h5 text-center lg-font-size">Add Payment Method</div>
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
              v-model="paymentMethod.paymentType"
              :options="paymentTypes"
              option-label="name"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="paymentMethod.paymentType = ''"/>&nbsp;
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
              v-model="paymentMethod.accountNumber"
            >
              <template v-slot:append>
                <q-icon size="xs" name="close" @click="paymentMethod.accountNumber = ''"/>&nbsp;
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
              :disable="paymentMethod.accountNumber === '' || paymentMethod.paymentType === ''"
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
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: {},
      isNameValid: false,

      // Dialog Model
      addPaymentMethod: false,
      confirmPaymentMethod: false,
      editNickname: false,
      viewProfile: false,

      // Input Model
      nickname: '',
      paymentMethod: {
        paymentType: '',
        accountName: '',
        accountNumber: ''

      },
      paymentTypes: [
        {
          name: 'Gcash'
        },
        {
          name: 'Paymaya'
        },
        {
          name: 'Paypal'
        },
        {
          name: 'BPI'
        }
      ]
    }
  },
  emits: ['back', 'submit'],
  props: {
    type: String,
    data: {
      type: Object,
      default: null
    }
  },
  methods: {
    checkDialogType () {
      const vm = this

      switch (vm.type) {
        case 'addPaymentMethod':
          vm.addPaymentMethod = true
          break
        case 'confirmPaymentMethod':
          vm.confirmPaymentMethod = true
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
      switch (vm.type) {
        case 'addPaymentMethod':
          vm.info = vm.paymentMethod
          break
        case 'editNickname':
          vm.info = {
            nickname: vm.nickname
          }
          break
      }
    },
    submitData () {
      const vm = this
      vm.stageData()
      this.$emit('submit', vm.info)
      this.$emit('back') //check later
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
    }
  },
  async mounted () {
    this.checkDialogType()
  }
}
</script>
<style lang="scss" scoped>
.bold-text {
  font-weight: 500;
}
.sm-font-size {
  font-size: 12px;
}
.md-font-size {
  font-size: 13px
}
.lg-font-size {
  font-size: 18px;
}
.subtext {
  opacity: .5;
}
</style>
