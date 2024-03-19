<template>
    <!-- Add Payment Method Dialog -->
    <q-dialog v-model="showDialog" @before-hide="$emit('back')">
        <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-mx-sm">
            <div class="text-weight-bold text-center lg-font-size">Select Payment Methods</div>
            <div class="subtext text-center" style="font-size: 13px;">Select only up to 5 methods</div>
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
                        <div class="col ib-text">
                            <div class="md-font-size q-mb-none pt-label text-weight-bold" :class="getDarkModeClass(darkMode)">
                                {{ option.payment_type.name }}
                            </div>
                            <div v-if="option.account_name" class="q-mb-none text-uppercase text-caption pt-label" :class="getDarkModeClass(darkMode)">
                                {{ option.account_name }}
                            </div>
                            <div class="q-mb-none text-caption pt-label" :class="getDarkModeClass(darkMode)">
                                {{ option.account_identifier }}
                            </div>
                        </div>
                        <q-checkbox v-model:model-value="option.selected" @update:model-value="updateSelectedPaymentMethods(option)" color="cyan" keep-color/>
                    </div>
                </q-item-section>
                </q-item>
            </div>
            </q-list>
        </q-card-section>
        <q-card-section>
            <div v-if="!loading" class="row q-gutter-sm justify-center">
                <q-btn v-if="paymentTypeOpts.length !== 0" outline rounded label='Add new' class="button button-icon" :class="getDarkModeClass(darkMode)" @click="addNewPaymentMethod()"/>
                <q-btn rounded class="button" @click="submitUpdatedPaymentMethods()" v-close-popup>
                    <template v-slot:default>
                        Select ({{ selectedPaymentMethods.length }})
                    </template>
                </q-btn>
            </div>
        </q-card-section>
        </q-card>
    </q-dialog>
    <PaymentMethodForm v-if="showPaymentMethodForm" action="createPaymentMethod" @back="showPaymentMethodForm=false" @success="fetchPaymentMethods"/>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'
import { bus } from 'src/wallet/event-bus'
import PaymentMethodForm from './PaymentMethodForm.vue'

export default {
  emits: ['back'],
  components: {
    PaymentMethodForm
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
  async mounted () {
    await this.fetchPaymentTypes()
    await this.fetchPaymentMethods()
  },
  methods: {
    getDarkModeClass,
    async fetchPaymentTypes () {
      const vm = this
      vm.loading = true
      await backend.get('/ramp-p2p/payment-type', { authorize: true })
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
          }
          vm.loading = false
        })
    },
    async fetchPaymentMethods () {
      const vm = this
      vm.loading = true
      await backend.get('/ramp-p2p/payment-method/', { authorize: true })
        .then(response => {
          vm.paymentMethodOpts = response.data.map((element) => {
            const selected = vm.selectedPaymentMethods.some((item) => {
              return item.id === element.id
            })
            element.selected = selected
            return element
          })
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
.subtext {
    opacity: .5;
}
</style>
