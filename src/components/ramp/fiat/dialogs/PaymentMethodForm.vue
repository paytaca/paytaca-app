<template>
  <q-dialog full-width v-model=showDialog @before-hide="$emit('back')">
    <!-- Payment Deletion Confirmation -->
    <q-card v-if="action === 'deletePaymentMethod'" class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section class="xm-font-size q-mx-lg text-center">
        <div v-if="!errorMessage">{{ $t('DeleteThisPaymentMethod') }}</div>
      </q-card-section>
      <div v-if="loading" class="row justify-center">
        <ProgressLoader/>
      </div>
      <div v-else>
        <q-card-section v-if="!errorMessage" class="text-center q-pt-none">
          <span class="lg-font-size text-weight-bold">
            {{ paymentMethod.payment_type?.full_name}}
          </span>
        </q-card-section>
        <q-card-section v-else class="text-center q-pt-none q-mx-md">
          {{ errorMessage }}
        </q-card-section>
        <q-card-actions class="text-center" align="center">
          <q-btn flat :label="!errorMessage ? this.$t('Cancel') : this.$t('OK')" color="red-6" @click="$emit('back')" v-close-popup />
          <q-btn
            v-if="!errorMessage"
            flat
            :label="$t('Confirm')"
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
        <div class="q-mt-sm text-h6 text-center">
          <template v-if="action === 'createPaymentMethod' || action === 'addMethodFromAd'">
            {{ $t('AddPaymentMethod') }}
          </template>
          <template v-else>
            {{ $t('EditPaymentMethod') }}
          </template>
        </div>
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
            :label="$t('PaymentType')"
            option-label="full_name"
            class="q-py-xs"
            :dark="darkMode"
            :options="paymentTypeOpts"
            @update:model-value="onUpdatePaymentType">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
                    {{ scope.opt.full_name }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div v-if="paymentMethod.payment_type">
            <div v-for="(field, index) in paymentMethod?.payment_type?.fields" :key="index">
              <q-input
                dense
                filled
                hide-bottom-space
                :label="paymentMethod?.fields[field.id]?.fieldname"
                :dark="darkMode"
                :rules="[
                  val => isValidIdentifier(val, field.fieldname, field.required)
                ]"
                v-model="paymentMethod.fields[field.id].value"
                @update:model-value="onUpdateFieldValue"
                class="q-py-xs">
              </q-input>
            </div>
          </div>
        </div>
        <div class="q-my-md q-px-md q-mx-lg" v-if="paymentMethod.payment_type">
          <div class="row no-wrap q-gutter-md">
            <q-btn
              rounded
              :label="$t('Cancel')"
              class="col"
              @click="$emit('back')"
              v-close-popup />
            <q-btn
              rounded
              flat
              :label="$t('Submit')"
              class="col button"
              :disable="disableSubmitBtn"
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
import { backend } from 'src/exchange/backend'
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
        identifier_format: null,
        fields: {}
      },
      errorMessage: null,
      actionType: this.action,
      disableSubmitBtn: true
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
        this.onUpdateFieldValue(this.paymentMethod.payment_type)
        break
      case 'addMethodFromAd':
        this.paymentMethod.payment_type = this.paymentType
        this.onUpdatePaymentType(this.paymentType)
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
    onUpdateFieldValue () {
      // Checks if value is valid
      let hasEmptyValue = false
      const fields = this.paymentMethod?.fields
      for (const [, field] of Object.entries(fields)) {
        if (field.required && !field.value) {
          hasEmptyValue = true
          break
        }
      }
      this.disableSubmitBtn = hasEmptyValue
    },
    isValidIdentifier (val, format, required = false) {
      if (required && !val) return this.$t('FieldRequired')
      switch (format) {
        case 'Email Address':
          if (/^[\w\\.~!$%^&*=+}{'?-]+@([\w-]+\.)+[\w-]{2,4}$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidEmailAddress')
          }
        case 'Mobile Number':
          if (/^(\d{9,15})$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidPhoneNumber')
          }
        case 'Bank Account Number':
          if (/^(\d{9,35})$/.test(val)) {
            return true
          } else {
            return this.$t('InvalidAccountNumber')
          }
        default:
          return true
      }
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    onUpdateIdentifierType () {
      if (this.paymentMethod.account_identifier) {
        this.$refs.accIdentifierRef.validate()
      }
      this.paymentMethod.account_identifier = ''
    },
    onUpdatePaymentType (data) {
      const paymentFields = {}
      data.fields.forEach(field => {
        paymentFields[field.id] = {
          fieldname: field.fieldname,
          required: field.required,
          value: null
        }
      })
      this.paymentMethod.fields = paymentFields
    },
    filterPaymentTypes () {
      let currentMethods = null
      currentMethods = this.currentPaymentMethods.map(p => p.payment_type.full_name)
      const availablePaymentTypes = this.paymentTypeOpts.filter(function (method) {
        return !currentMethods.includes(method.full_name)
      })
      this.paymentTypeOpts = availablePaymentTypes
    },
    async fetchPaymentTypes () {
      const vm = this
      await backend.get('/ramp-p2p/payment-type', { params: { currency: this.currency } })
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
          } else {
            bus.emit('network-error')
          }
        })
    },
    async fetchPaymentMethod (id) {
      const vm = this
      await backend.get(`/ramp-p2p/payment-method/${id}/`, { authorize: true })
        .then(response => {
          const data = response.data
          const fields = {}
          // map payment method fields
          data.values.forEach(field => {
            fields[field.field_reference.id] = {
              id: field.id,
              fieldname: field.field_reference.fieldname,
              required: field.field_reference.required,
              value: field.value
            }
          })
          // include missing required payment type fields
          if (data.values.length < data.payment_type?.fields?.length) {
            const methodFieldIds = data?.values?.map(item => { return item.field_reference.id })
            const typeFieldIds = data?.payment_type?.fields?.map(item => { return item.id })
            const missingFieldIds = typeFieldIds.filter(field => !methodFieldIds.includes(field))

            const missingFields = data?.payment_type?.fields?.filter(item => missingFieldIds.includes(item.id))
            missingFields.forEach(field => {
              fields[field.id] = {
                fieldname: field.fieldname,
                required: field.required,
                value: null
              }
            })
          }
          const paymentMethod = {
            id: data.id,
            owner: data.owner,
            payment_type: data.payment_type,
            fields: fields
          }
          vm.paymentMethod = paymentMethod
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
        })
    },
    async fetchPaymentMethods () {
      const vm = this
      await backend.get('/ramp-p2p/payment-method/', { params: { currency: this.currency }, authorize: true })
        .then(response => {
          vm.currentPaymentMethods = response.data
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
      const fields = []
      const body = {}
      let url = '/ramp-p2p/payment-method/'
      if (vm.action === 'editPaymentMethod') {
        url = `${url}${vm.paymentMethodId}/`
        // construct payment type fields for edit request payload
        for (const [key, field] of Object.entries(vm.paymentMethod.fields)) {
          const data = {
            id: field.id,
            value: field.value
          }
          if (field.value && !field.required) {
            data.field_reference = key
          }
          fields.push(data)
        }
      } else {
        // construct payment type fields for create request payload
        for (const [key, field] of Object.entries(vm.paymentMethod.fields)) {
          fields.push({
            field_reference: key,
            value: field.value
          })
        }
        body.payment_type = vm.paymentMethod.payment_type.id
      }
      body.fields = fields
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
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    async editPaymentMethod (url, body) {
      await backend.patch(url, body, { authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    async deletePaymentMethod () {
      await backend.delete(`/ramp-p2p/payment-method/${this.paymentMethod.id}/`, { authorize: true })
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
          } else {
            bus.emit('network-error')
          }
        })
    }
  }
}
</script>
