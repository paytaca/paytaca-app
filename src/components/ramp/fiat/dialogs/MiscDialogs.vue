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

</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: {},

      // Dialog Model
      addPaymentMethod: false,
      confirmPaymentMethod: false,

      // Input Model
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
      }
    },
    stageData () {
      const vm = this
      switch (vm.type) {
        case 'addPaymentMethod':
          vm.info = vm.paymentMethod
          break
      }
    },
    submitData () {
      const vm = this
      vm.stageData()

      // console.log(this.paymentMethod)
      this.$emit('submit', vm.info)
      this.$emit('back')
    }
  },
  async mounted () {
    // console.log('payment methods')
    // console.log(this.type)

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
</style>
