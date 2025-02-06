<template>
  <q-dialog persistent ref="dialog">
    <q-card class="full-width q-py-md br-15">
      <div class="text-right">
        <q-btn flat icon="close" color="red" v-close-popup/>
      </div>

      <!-- Selelct Payment Method -->
      <div v-if="status === 'payment-method-select'">
        <div class="text-center text-primary q-pb-sm text-bold md-font-size">
          Select Payment Methods
        </div>

        <div class="q-px-md">
          <div class="text-center text-grey-8" v-if="paymentMethodList.length === 0">
            No payment method available...
          </div>
          <q-list class="scroll-y" @touchstart="preventPull" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;" v-else>
            <div v-for="(method, index) in paymentMethodList" :key="index">
              <div class="q-py-xs">
                <q-card flat bordered :dark="darkMode">
                  <q-expansion-item
                    class="pt-card text-bow"
                    :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
                    :default-opened=true
                    :label="method.payment_type.full_name"
                    expand-separator
                  >
                    <q-card class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
                      <div class="col">
                        <div class="row">
                          <div class="col q-pr-sm q-py-xs">
                            <div v-for="(field, index) in method.values" :key="index">
                              <!-- <div v-if="field.value">{{ field.field_reference.fieldname }}:</div> -->
                              <div v-if="field.value" class="q-ml-sm text-weight-bold">
                                {{ field.value }}
                                <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(field.value)"/>
                              </div>
                            </div>
                            <div v-for="(field, index) in method.dynamic_values" :key="index">
                                {{ field.fieldname }}
                                <div class="q-ml-sm text-weight-bold">
                                  {{ dynamicVal(field) }}
                                  <q-icon size="1em" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(dynamicVal(field))"/>
                                </div>
                            </div>
                          </div>
                          <div>
                          <q-checkbox v-model="method.selected" @click="selectPaymentMethod(index)" :dark="darkMode"/>
                        </div>
                        </div>
                      </div>
                    </q-card>
                  </q-expansion-item>
                </q-card>
              </div>
            </div>
          </q-list>
        </div>

        <!-- Buttons -->
        <div class="text-center q-pt-xs q-px-lg">
          <q-btn v-if="paymentTypeOpts?.length !== 0" outline dense class="full-width q-my-xs" rounded unelevated label="Add Payment Method" color="primary" @click="status = 'add-payment-method'"/>
          <q-btn dense class="full-width" rounded unelevated :disable="!selectedPaymentMethod" label="Select Payment Method" color="primary" @click="onOKClick()"/>
        </div>
      </div>

      <div v-if="status === 'add-payment-method'">
        <div class="text-center text-primary q-pb-sm text-bold md-font-size">
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
                @click="status = 'payment-method-select'" />
              <q-btn
                rounded
                flat
                :label="$t('Submit')"
                class="col button"
                :disable="disableSubmitBtn"
                @click="onSubmit()"
                />
            </div>
          </div>

        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import ProgressLoader from '../ProgressLoader.vue';
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      theme: this.$store.getters['global/theme'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 160 : this.$q.screen.height - 130,
      state: 'payment-method-select', // add-payment-method, delete-payment-method
      paymentTypeOpts: null,
      paymentMethodList: [],
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
      isloading: false,
      selectedPaymentMethod: null,
      status: 'payment-method-select'
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    currency: String,
    // action: String,
    selectedPM: {
      type: Object,
      default: null
    }
  },
  components: {
    ProgressLoader
  },
  async mounted () {
    this.refetchData()
  },
  methods: {
    isNotDefaultTheme,
    getDarkModeClass,
    async refetchData () {
      this.isloading = true

      await this.fetchPaymentTypes()
      await this.fetchPaymentMethods()

      this.filterPaymentTypes()

      if (this.selectedPM) {
        this.selectedPaymentMethod = this.selectedPM

        // label selected
        this.paymentMethodList.map(method => {
          if (method.id === this.selectedPM.id) {
            method.selected = true
          }
        })
      }

      this.isloading = false
    },
    onOKClick () {
      this.$emit('ok', this.selectedPaymentMethod)
      this.$refs.dialog.hide()
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
    selectPaymentMethod (index) {
      const vm = this
      vm.paymentMethodList.map((method, i) => {
        if (index !== i) {
          method.selected = false
        } else {
          if (method.selected) {
            vm.selectedPaymentMethod = vm.paymentMethodList[index]
          } else {
            vm.selectedPaymentMethod = null
          }
        }
      })
    },
    async onSubmit () {
      this.createPaymentMethod()
    },
    async createPaymentMethod () {
      const vm = this
      const url = '/paytacapos/payment-method/'

      let body = {
        payment_type_id: vm.paymentMethod?.payment_type.id,
        // payment_fields: [...Object.values(this.paymentMethod?.fields)]
      }

      let value = []
      for (const field in this.paymentMethod?.fields) {
        value.push({
          field_reference: field,
          value: this.paymentMethod?.fields[field].value
        })
      }

      body.values = value

      // console.log('BODY: ', body)

      await backend.post(url, body, { authorize: true })
        .then(response => {
          this.refetchData()
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async fetchPaymentMethods () {
      const vm = this
      const url = 'paytacapos/payment-method/'

      await backend.get(url)
        .then(response => {
          const data = response.data

          vm.paymentMethodList = data.map(method => {
            return { ...method, selected: false }
          })
        })
        .catch(error => {
          console.error(error)
        })
    },
    filterPaymentTypes () {
      let currentMethods = null
      currentMethods = this.paymentMethodList.map(p => p.payment_type.full_name)
      const availablePaymentTypes = this.paymentTypeOpts.filter(function (method) {
        return !currentMethods.includes(method.full_name)
      })
      this.paymentTypeOpts = availablePaymentTypes
    },
    preventPull (e) {
      let parent = e.target
      // eslint-disable-next-line no-void
      while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
        parent = parent.parentNode
      }
      // eslint-disable-next-line no-void
      if (parent !== void 0 && parent.scrollTop > 0) {
        e.stopPropagation()
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
</style>
