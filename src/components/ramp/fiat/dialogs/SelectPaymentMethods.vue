<template>
    <!-- Add Payment Method Dialog -->
    <q-dialog v-model="showDialog" @before-hide="$emit('back')">
        <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-mx-sm">
          <div class="text-weight-bold text-center lg-font-size">{{ $t('SelectPaymentMethods') }}</div>
          <div v-if="hasAlienPaymentsSelected" style="color:red" class="text-center q-mx-md sm-font-size">{{ $t('PleaseUnselectUnsupportedPaymentMethods') }}</div>
          <div v-else class="subtext text-center" style="font-size: 13px;">{{ $t('SelectOnlyUpTo5methods') }}</div>
        </q-card-section>
        <q-card-section v-if="paymentMethodOpts.length > 0" class="text-left q-pt-sm q-mx-xs">
          <q-list style="max-height:60vh; overflow:auto;">
          <div v-if="loading" class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
          </div>
          <div v-else v-for="(option, index) in paymentMethodOpts" :key="index">
              <q-item rounded :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              <q-item-section>
                  <div class="q-py-none row">
                      <div class="col ib-text">
                          <div class="md-font-size q-mb-none pt-label text-weight-bold" :class="getDarkModeClass(darkMode)">
                              {{ option.payment_type.short_name || option.payment_type.full_name }}
                          </div>
                          <div v-for="(field, index) in option.values" :key="index" class="q-mb-none text-uppercase text-caption pt-label" :class="getDarkModeClass(darkMode)">
                              {{ field.value }}
                          </div>
                      </div>
                      <q-checkbox v-model:model-value="option.selected" @update:model-value="updateSelectedPaymentMethods(option)" :color="option.alien ? 'red': 'cyan'" keep-color/>
                  </div>
                  <div v-if="option.alien" class="subtext xs-font-size text-weight-bold" style="color:red">
                    {{
                      $t(
                        'PaymentTypeUnsupported',
                        { currency },
                        `${ currency } does not support this payment type`
                      )
                    }}
                  </div>
              </q-item-section>
              </q-item>
          </div>
          </q-list>
        </q-card-section>
        <q-card-section v-if="!loading" class="row q-gutter-sm justify-center">
          <!-- <q-btn v-if="paymentMethodOpts.length === 0" outline rounded label='Ok' class="button button-icon q-mt-none" :class="getDarkModeClass(darkMode)" @click="$emit('back')"/> -->
          <!-- <div v-else> -->
          <q-btn v-if="paymentTypeOpts.length > 0" outline rounded label='Add new' class="button button-icon q-mr-sm" :class="getDarkModeClass(darkMode)" @click="addNewPaymentMethod()"/>
          <q-btn rounded class="button q-ml-sm" @click="submitUpdatedPaymentMethods()" :disable="hasAlienPaymentsSelected" v-close-popup>
            <template v-slot:default>
              {{
                $t(
                  'SelectValue',
                  { value: selectedPaymentMethods.length },
                  `Select ${ selectedPaymentMethods.length }`
                )
              }}
            </template>
          </q-btn>
          <!-- </div> -->
        </q-card-section>
        </q-card>
    </q-dialog>
    <PaymentMethodForm v-if="showPaymentMethodForm" action="createPaymentMethod" :currency="currency" @back="showPaymentMethodForm=false" @success="onSuccessAddPaymentMethod"/>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'
import PaymentMethodForm from './PaymentMethodForm.vue'

export default {
  emits: ['back'],
  components: {
    PaymentMethodForm
  },
  props: {
    selectedMethods: Array,
    currency: String
  },
  data () {
    return {
      showDialog: true,
      darkMode: this.$store.getters['darkmode/getStatus'],
      maxMethodReached: false,
      loading: false,
      paymentTypeOpts: [],
      paymentMethodOpts: [],
      selectedPaymentMethods: [],
      showPaymentMethodForm: false
    }
  },
  computed: {
    hasAlienPaymentsSelected () {
      const alienPaymentMethods = this.paymentMethodOpts.filter(element => {
        return element.alien && element.selected
      })
      return alienPaymentMethods.length > 0
    }
  },
  async mounted () {
    this.selectedPaymentMethods = this.selectedMethods
    await this.fetchPaymentTypes()
    await this.fetchPaymentMethods()
    if (this.paymentMethodOpts.length > 0) {
      this.filterPaymentTypes()
    }
  },
  methods: {
    getDarkModeClass,
    filterPaymentTypes () {
      let currentMethods = null
      currentMethods = this.paymentMethodOpts.map(p => p.payment_type)
      const availablePaymentTypes = this.paymentTypeOpts.filter(function (method) {
        return !currentMethods.map(p => p.id).includes(method.id)
      })
      this.paymentTypeOpts = availablePaymentTypes
    },
    async onSuccessAddPaymentMethod () {
      await this.fetchPaymentTypes()
      await this.fetchPaymentMethods()
    },
    async fetchPaymentTypes () {
      const vm = this
      vm.loading = true
      await backend.get('/ramp-p2p/payment-type', { params: { currency: vm.currency } })
        .then(response => {
          vm.paymentTypeOpts = response.data
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
          vm.loading = false
        })
    },
    async fetchPaymentMethods () {
      const vm = this
      vm.loading = true
      await backend.get('/ramp-p2p/payment-method/', { params: { currency: vm.currency }, authorize: true })
        .then(response => {
          // filters the payment method options to currency supported only
          vm.paymentMethodOpts = response.data
          vm.paymentMethodOpts.forEach((element) => {
            // checks & adds a field to mark if supported payment method is currently selected
            const selected = vm.selectedPaymentMethods.some((item) => {
              return item.id === element.id
            })
            element.selected = selected
            element.alien = false
            return element
          })
          const paymentTypeOptIds = vm.paymentTypeOpts.map((element) => { return element.id })
          // finds the currency unsupported payment methods that were previously selected for this ad
          const alienPaymentMethods = (vm.selectedPaymentMethods.filter((element) => {
            return !paymentTypeOptIds.includes(element.payment_type.id)
          }))
            .map(element => {
              // mark these payment methods alien
              element.alien = true
              element.selected = true
              return element
            })
          vm.paymentMethodOpts.push(...alienPaymentMethods)
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
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
    submitUpdatedPaymentMethods () {
      this.$emit('back', this.selectedPaymentMethods)
    },
    addNewPaymentMethod () {
      this.showPaymentMethodForm = true
    }
  }
}
</script>
<style>
.lg-font-size {
    font-size: large;
}
.md-font-size {
    font-size: medium;
}
.sm-font-size {
    font-size: small;
}
.xs-font-size {
  font-size: x-small;
}
.subtext {
    opacity: .5;
}
</style>
