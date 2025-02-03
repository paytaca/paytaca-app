<template>
  <q-dialog persistent>
    <q-card class="full-width q-py-lg">
      <div>
        <q-btn flat icon="close" color="red" v-close-popup/>
      </div>
      <div class="text-center text-primary q-pb-sm">
        Manage Payment Methods
      </div>

      <div v-if="isloading" class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
      <div v-else class="q-px-md">
        <q-select
          dense
          borderless
          filled
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

        <div class="q-my-md q-px-md q-mx-lg" v-if="paymentMethod.payment_type">
          <div class="row no-wrap q-gutter-md">
            <q-btn
              rounded
              :label="$t('Cancel')"
              class="col"
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
import ProgressLoader from '../ProgressLoader.vue';
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      theme: this.$store.getters['global/theme'],
      paymentTypeOpts: null,
      paymentMethod: {
        id: null,
        payment_type: null,
        account_name: null,
        account_identifier: null,
        identifier_format: null,
        fields: {}
      },
      disableSubmitBtn: true,
      errorMessage: null,
      isloading: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    currency: String,
    action: String
  },
  components: {
    ProgressLoader
  },
  async mounted () {
    this.isloading = true
    await this.fetchPaymentTypes()

    this.isloading = false
  },
  methods: {
    isNotDefaultTheme,
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
          } else {
            bus.emit('network-error')
          }
        })
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
    async onSubmit () {
      this.createPaymentMethod()
    //   this.errorMessage = null
    //   this.isloading = true
    //   switch (this.action) {
    //     case 'deletePaymentMethod':
    //       await this.deletePaymentMethod()
    //       break
    //     case 'addMethodFromAd':
    //     case 'editPaymentMethod':
    //     case 'createPaymentMethod':
    //       await this.savePaymentMethod()
    //       break
    //   }
    //   this.loading = false
    //   if (!this.errorMessage) {
    //     this.$emit('success')
    //     this.$emit('back')
    //   }
    },
    async createPaymentMethod () {
      const vm = this
      const url = '/paytacapos/payment-methods/'

      const body = {
        payment_type_id: vm.paymentMethod?.payment_type.id,
        payment_fields: this.paymentMethod?.fields
      }

      await backend.post(url, body, { authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.error(error.response)
        })
    }
  }
}
</script>
