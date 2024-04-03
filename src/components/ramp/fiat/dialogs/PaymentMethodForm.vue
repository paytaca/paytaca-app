<template>
  <q-dialog full-width v-model=showDialog @before-hide="$emit('back')">
    <!-- Payment Deletion Confirmation -->
    <q-card v-if="action === 'deletePaymentMethod'" class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="xm-font-size q-mx-lg text-center">
        <div v-if="!errorMessage">Delete this Payment Method?</div>
      </q-card-section>
      <div v-if="loading" class="row justify-center">
        <ProgressLoader/>
      </div>
      <div v-else>
        <q-card-section v-if="!errorMessage" class="text-center q-pt-none">
          <span class="lg-font-size text-weight-bold">
            {{ paymentMethod.payment_type?.name}}:
          </span><br>
          <span>
            {{ paymentMethod.account_identifier }}
          </span>
        </q-card-section>
        <q-card-section v-else class="text-center q-pt-none q-mx-md">
          {{ errorMessage }}
        </q-card-section>
        <q-card-actions class="text-center" align="center">
          <q-btn flat :label="!errorMessage ? 'Cancel' : 'OK'" color="red-6" @click="$emit('back')" v-close-popup />
          <q-btn
            v-if="!errorMessage"
            flat
            label="Confirm"
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            @click="onSubmit()"
          />
        </q-card-actions>
      </div>
    </q-card>
    <!-- Create/Edit Payment Method -->
    <q-card v-else class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="q-mt-sm text-h6 text-center">{{action === 'createPaymentMethod' ? 'Add' : 'Edit'}} Payment Method</div>
      </q-card-section>
      <div v-if="loading" class="row justify-center">
        <ProgressLoader/>
      </div>
      <div v-else>
        <div class="q-mx-lg q-mb-md">
          <!-- Payment Type -->
          <q-select
            dense
            borderless
            filled
            :disable="action !== 'createPaymentMethod'"
            v-model="paymentMethod.payment_type"
            label="Payment Type"
            option-label="name"
            class="q-py-xs"
            :dark="darkMode"
            :options="paymentTypeOpts"
            @update:model-value="onUpdatePaymentType">
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
          <div v-if="paymentMethod.payment_type">
            <!-- Identifier Type -->
            <q-select
              v-if="paymentMethod.payment_type?.formats?.length > 1"
              dense
              borderless
              filled
              v-model="paymentMethod.identifier_format"
              label="Identifier Type"
              :dark="darkMode"
              :options="paymentMethod.payment_type?.formats"
              @update:model-value="onUpdateIdentifierType"
              class="q-py-xs">
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
            <div v-if="paymentMethod.identifier_format">
              <!-- Account Identifier -->
              <q-input
                ref="accIdentifierRef"
                dense
                filled
                hide-bottom-space
                :label="paymentMethod.identifier_format"
                :dark="darkMode"
                :rules="[isValidIdentifier]"
                v-model="paymentMethod.account_identifier"
                class="q-py-xs">
              </q-input>
            </div>
            <!-- Account Name -->
            <q-input
              dense
              filled
              label="Account Name (optional)"
              :dark="darkMode"
              v-model="paymentMethod.account_name"
              class="q-py-xs">
            </q-input>
          </div>
        </div>
        <div class="q-my-md q-px-md q-mx-lg" v-if="paymentMethod.payment_type">
          <div class="row no-wrap q-gutter-md">
            <q-btn
              rounded
              label="Cancel"
              class="col"
              @click="$emit('back')"
              v-close-popup />
            <q-btn
              rounded
              flat
              label="Submit"
              class="col button"
              :disable="isValidIdentifier(paymentMethod.account_identifier) !== true"
              @click="onSubmit()"
              v-close-popup />
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  components: {
    ProgressLoader
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      loading: true,
      showDialog: true,
      paymentTypeOpts: [],
      currentPaymentMethods: [],
      paymentMethod: {
        id: null,
        payment_type: null,
        account_name: null,
        account_identifier: null,
        identifier_format: null
      },
      errorMessage: null,
      actionType: this.action
    }
  },
  emits: ['back', 'success'],
  props: {
    action: String,
    paymentMethodId: Number,
    paymentType: Object,
    currency: String
  },
  async mounted () {
    switch (this.action) {
      case 'deletePaymentMethod':
      case 'editPaymentMethod':
        await this.fetchPaymentMethod(this.paymentMethodId)
        break
      case 'addMethodFromAd':
        this.paymentMethod.payment_type = this.paymentType
        this.paymentMethod.identifier_format = this.paymentType.formats[0]
        break
      case 'createPaymentMethod':
        await this.fetchPaymentTypes()
        break
    }
    await this.fetchPaymentMethods()
    this.filterPaymentTypes()
    this.loading = false
  },
  methods: {
    getDarkModeClass,
    isValidIdentifier (val) {
      if (!val) return 'This field is required'
      const format = this.paymentMethod.identifier_format
      switch (format) {
        case 'Email Address':
          if (/^[\w\\.~!$%^&*=+}{'?-]+@([\w-]+\.)+[\w-]{2,4}$/.test(val)) {
            return true
          } else {
            return 'Invalid Email Address'
          }
        case 'Mobile Number':
          if (/^(\d{9,15})$/.test(val)) {
            return true
          } else {
            return 'Invalid Phone Number'
          }
        case 'Bank':
          if (/^(\d{9,35})$/.test(val)) {
            return true
          } else {
            return 'Invalid Account Number'
          }
        default:
          return true
      }
    },
    onUpdateIdentifierType () {
      if (this.paymentMethod.account_identifier) {
        this.$refs.accIdentifierRef.validate()
      }
      this.paymentMethod.account_identifier = ''
    },
    onUpdatePaymentType (data) {
      if (typeof data === 'string') {
        this.paymentMethod.identifier_format = data
      } else {
        this.paymentMethod.identifier_format = data.formats[0]
      }
      this.paymentMethod.account_identifier = ''
    },
    filterPaymentTypes () {
      let currentMethods = null
      currentMethods = this.currentPaymentMethods.map(p => p.payment_type.name)
      const availablePaymentTypes = this.paymentTypeOpts.filter(function (method) {
        return !currentMethods.includes(method.name)
      })
      this.paymentTypeOpts = availablePaymentTypes
    },
    async fetchPaymentTypes () {
      const vm = this
      await backend.get('/ramp-p2p/payment-type', { params: { currency: this.currency }, authorize: true })
        .then(response => {
          vm.paymentTypeOpts = response.data
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    async fetchPaymentMethod (id) {
      const vm = this
      await backend.get(`/ramp-p2p/payment-method/${id}`, { authorize: true })
        .then(response => {
          vm.paymentMethod = response.data
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    async fetchPaymentMethods () {
      const vm = this
      await backend.get('/ramp-p2p/payment-method/', { params: { currency: this.currency }, authorize: true })
        .then(response => {
          vm.currentPaymentMethods = response.data
          // console.log('currentPaymentMethods:', vm.currentPaymentMethods)
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    },
    async onSubmit () {
      this.errorMessage = null
      this.loading = true
      switch (this.action) {
        case 'deletePaymentMethod':
          await this.deletePaymentMethod()
          break
        case 'addMethodFromAd':
        case 'editPaymentMethod':
        case 'createPaymentMethod':
          await this.savePaymentMethod()
          break
      }
      this.loading = false
      if (!this.errorMessage) {
        this.$emit('success')
        this.$emit('back')
      }
    },
    async savePaymentMethod () {
      const vm = this
      let url = '/ramp-p2p/payment-method/'
      const body = {
        account_name: vm.paymentMethod.account_name,
        account_identifier: vm.paymentMethod.account_identifier,
        identifier_format: vm.paymentMethod.identifier_format
      }
      if (vm.action === 'editPaymentMethod') {
        url = url + vm.paymentMethodId
      } else {
        body.payment_type = vm.paymentMethod.payment_type.id
      }
      switch (vm.action) {
        case 'editPaymentMethod':
          await this.editPaymentMethod(url, body)
          break
        case 'addMethodFromAd':
        case 'createPaymentMethod':
          await this.createPaymentMethod(url, body)
          break
      }
    },
    async createPaymentMethod (url, body) {
      await backend.post(url, body, { authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async editPaymentMethod (url, body) {
      await backend.put(url, body, { authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async deletePaymentMethod () {
      await backend.delete(`/ramp-p2p/payment-method/${this.paymentMethod.id}`, { authorize: true })
        .catch(error => {
          console.error(error)
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
            if (error.response.status === 400) {
              this.errorMessage = error.response.data.error
            }
          }
        })
    }
  }
}
</script>
