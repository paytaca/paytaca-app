<template>
  <q-dialog persistent ref="dialog">
    <q-card class="full-width q-py-md br-15">
      <div class="text-right">
        <q-btn flat icon="close" color="red" @click="backBtn()"/>
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
                  <div class="pt-card text-bow q-py-sm q-pl-md" :class="getDarkModeClass(darkMode, '', 'bg-grey-2')">
                    <div class="row">
                      <div class="col-8 text-bold q-pt-xs md-font-size">
                        {{ method.payment_type.full_name }}
                      </div>
                      <div class="col">
                        <div class="row">
                          <q-btn round outline icon="edit" color="primary" size="sm" class="q-mr-sm" @click="btnHandler('edit-payment-method', index)"/>
                          <q-btn round outline icon="delete" color="primary" size="sm" @click="btnHandler('delete-payment-method', index)"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <q-separator class="full-width"/>

                  <!-- <div> -->
                    <div class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
                      <div class="col">
                        <div class="row">
                          <div class="col q-pr-sm q-py-xs">
                            <div v-for="(field, index) in method.values" :key="index">
                              <!-- <div v-if="field.value">{{ field.field_reference.fieldname }}:</div> -->
                              <div v-if="field.value" class="q-ml-sm text-weight-bold text-grey-7">
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
                    </div>
                </q-card>
              </div>
            </div>
          </q-list>
        </div>

        <!-- Buttons -->
        <div class="text-center q-pt-xs q-px-lg">
          <q-btn v-if="paymentTypeOpts?.length !== 0" outline dense class="full-width q-my-xs" rounded unelevated label="Add Payment Method" color="primary" @click="status = 'payment-method-form'"/>
          <q-btn dense class="full-width" rounded unelevated :disable="!selectedPaymentMethod" label="Select Payment Method" color="primary" @click="onOKClick()"/>
        </div>
      </div>

      <div v-if="status === 'payment-method-form'">
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
import { connectWebsocket } from 'src/wallet/transaction-listener';

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
      status: 'payment-method-select',
      paymentMethodURL: '/paytacapos/payment-method/',
      editPaymentMethodIndex: null
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
    btnHandler (type, index = null) {
      switch (type) {
        case 'edit-payment-method':
          console.log('editing PM')
          this.editPaymentMethod(index)
          break
        case 'delete-payment-method':
          console.log('deleting PM: ', this.paymentMethodList[index].id)
          this.deletePaymentMethod(index)
          // this.deletePaymentMethod(this.paymentMethodList[index].id)
          break
      }
    },
    backBtn () {
      if (this.status === 'payment-method-form') {
        this.status = 'payment-method-select'
      } else {
        this.$refs.dialog.hide()
      }
    },
    onOKClick () {
      this.$emit('ok', this.selectedPaymentMethod)
      this.$refs.dialog.hide()
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
    openPaymentMethodForm (type, index = null) {
      if (type === 'edit') {
        this.status = 'payment-method-form'
        this.editPaymentMethodIndex = this.paymentMethodList[index].id

        // set data
        // this.paymentMethod.id =
        // {
        //   id: null,
        //   payment_type: null,
        //   account_name: null,
        //   account_identifier: null,
        //   identifier_format: null,
        //   fields: {}
        // },

        console.log('index: ', this.editPaymentMethodIndex)
        console.log('pm: ', this.paymentMethod)
      }
      // if (type === 'add') {

      // }
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
    async createPaymentMethod () {
      const vm = this
      // const url = '/paytacapos/payment-method/'

      let body = {
        payment_type_id: vm.paymentMethod?.payment_type.id,
      }

      let value = []
      for (const field in this.paymentMethod?.fields) {
        value.push({
          field_reference: field,
          value: this.paymentMethod?.fields[field].value
        })
      }

      body.values = value

      await backend.post(this.paymentMethodURL, body, { authorize: true })
        .then(response => {
          this.refetchData()
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async deletePaymentMethod (index) {
      console.log(this.paymentMethodList[index])
      const info = this.paymentMethodList[index]
      const body = {
        payment_type_id: info.payment_type.id,
        payment_fields: info.values
      }

      await backend.delete(this.paymentMethodURL + `${info.id}/`, body, { authorize: true })
        .then(response => {
          console.log('success')
          this.refetchData()
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async editPaymentMethod (index) {
      // set value
      const PM = this.paymentMethodList[index]

      this.paymentMethod.id = PM.id
      this.paymentMethod.payment_type = PM.payment_type
      this.paymentMethod.fields = PM.values

      console.log('PM: ', this.paymentMethod)

      this.status = 'payment-method-form'
      // {
        //   id: null,
        //   payment_type: null,
        //   account_name: null,
        //   account_identifier: null,
        //   identifier_format: null,
        //   fields: {}
        // },
    },
    async fetchPaymentMethods () {
      const vm = this
      // const url = 'paytacapos/payment-method/'

      await backend.get(this.paymentMethodURL)
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
