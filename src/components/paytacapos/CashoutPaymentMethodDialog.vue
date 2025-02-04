<template>
  <q-dialog persistent>
    <q-card class="full-width q-py-md br-15">
      <div class="text-right">
        <q-btn flat icon="close" color="red" v-close-popup/>
      </div>
      <div class="text-center text-primary q-pb-sm text-bold md-font-size">
        Select Payment Methods
      </div>

      <!-- Selelct Payment Method -->
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
                        <q-checkbox v-model="method.selected" @click="SelectPaymentMethod(index)" :dark="darkMode"/>
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
        <q-btn outline dense class="full-width q-my-xs" rounded unelevated label="Add Payment Method" color="primary"/>
        <q-btn dense class="full-width" rounded unelevated label="Proceed" color="primary"/>
      </div>

      <!-- Selecting Payment Type: Move to separate component -->
      <!-- <div v-if="isloading" class="row justify-center q-py-lg" style="margin-top: 50px">
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

      </div> -->
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
      selectedPaymentMethod: null
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
    await this.fetchPaymentMethods()

    this.isloading = false
  },
  methods: {
    isNotDefaultTheme,
    getDarkModeClass,
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
    SelectPaymentMethod (index) {
      const vm = this
      vm.paymentMethodList.map((method, i) => {
        if (index !== i) {
          method.selected = false
        }
      })

      vm.selectedPaymentMethod = vm.paymentMethodList[index]
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
      const url = '/paytacapos/payment-method/'

      const body = {
        payment_type_id: vm.paymentMethod?.payment_type.id,
        values: [...Object.values(this.paymentMethod?.fields)]
      }

      console.log('BODY: ', body)

      await backend.post(url, body, { authorize: true })
        .then(response => {
          console.log(response)
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    async fetchPaymentMethods () {
      console.log('fetching payment methods')
      const vm = this
      const url = 'paytacapos/payment-method/'

      await backend.get(url, { authorize: true})
        .then(response => {
          const data = response.data

          vm.paymentMethodList = data.map(method => {
            return { ...method, selected: false }
          })

          console.log('payment method list: ', vm.paymentMethodList)
        })
        .catch(error => {
          console.error(error)
        })
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
