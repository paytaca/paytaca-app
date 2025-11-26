<template>
  <div v-if="type === 'Profile'" class="sticky-header" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="`P2P Exchange`" @click="onBack" />
  </div>
  <div v-if="type === 'Profile'" :style="{ height: headerOffset + 'px' }"></div>
  <div class="q-mx-md q-mx-none text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-md" v-if="isloaded">


      <div class="q-mx-sm text-h5 text-center text-weight-bold lg-font-size">
        {{ type === 'Profile' ? $t('YourPaymentMethods') : $t('SelectPaymentMethods') }}
      </div>

      <q-separator v-if="type !== 'Profile'" :dark="darkMode" class="q-mx-md"/>

      <div v-if="type != 'Profile'" class="subtext q-mx-lg q-mt-sm">{{ instructionMessage }}</div>
      <!-- Single Add Method button for Profile view -->
      <div v-if="type === 'Profile'" class="row q-mx-md q-mt-sm">
        <q-btn outline rounded no-caps :label="$t('AddMethod')" class="q-space button button-text-primary" :class="getDarkModeClass(darkMode)" @click="createMethod()"/>
      </div>
      <q-card-section class="q-mt-sm" :style="cardSectionStyle">
        <div v-if="type !== 'Profile' && paymentMethods.length === 0 && type !== 'General'" class="relative text-center" style="margin-top: 50px;">
          <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
          <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">{{ $t('NoPaymentMethodAdded') }}</p>
        </div>
        <!-- Non-profile listing (e.g., Ads/General flows) -->
        <q-item v-if="type !== 'Profile'" class="q-my-none q-py-none" v-for="(method, index) in paymentMethods" :key="index">
          <q-item-section>
            <div class="row no-wrap items-start">
              <div class="col">
                <div class="md-font-size">
                  {{ method.payment_type?.short_name || method.payment_type?.full_name }}
                </div>
                <div v-for="(field, index) in method.values" :key="index">
                  <div class="subtext">
                    {{ field.value }}
                  </div>
                </div>
                <div v-if="method.alien" class="xs-font-size" style="color: red">{{ currency }} does not support this payment type</div>
              </div>
              <div class="col-auto text-right self-start" v-if="type === 'Profile'">
                <q-btn
                  outline
                  rounded
                  padding="sm"
                  icon="edit"
                  size="sm"
                  class="button button-icon"
                  :class="getDarkModeClass(darkMode)"
                  @click="editMethod(method)"
                />
                <q-btn
                  outline
                  rounded
                  padding="sm"
                  size="sm"
                  icon="delete"
                  color="red-6"
                  class="q-ml-xs"
                  @click="deleteMethod(method)"
                  />
              </div>
              <div class="col-auto justify-end text-right self-start"  v-if="type === 'General'">
                <q-btn
                  :outline="!isPaymentSelected(method)"
                  rounded
                  padding="sm"
                  size="sm"
                  icon="done"
                  color="blue-6"
                  class="q-ml-xs"
                  @click="selectMethod(method)"
                  />
              </div>
            </div>
            <q-separator :dark="darkMode" class="q-my-sm"/>
          </q-item-section>
        </q-item>

        <!-- Profile view grouped by currency -->
        <div v-if="type === 'Profile' && groupedPaymentMethods.length > 0">
          <q-card
            v-for="(group, gi) in groupedPaymentMethods"
            :key="group.currency"
            class="q-mb-md group-card"
            flat
            bordered>
            <q-card-section class="q-pb-none">
              <div class="currency-header">
                {{ group.currency }}
              </div>
            </q-card-section>
            <q-separator :dark="darkMode" />
            <q-card-section class="q-pt-sm q-pb-sm">
              <div v-if="group.methods.length === 0" class="empty-state">
                <q-icon class="q-mr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="md" name="mdi-delete-empty"/>
                <span :class="{ 'text-black': !darkMode }">{{ $t('NoPaymentMethodAdded') }}</span>
              </div>
              <div v-else>
                <q-item v-for="(method, mi) in group.methods" :key="mi" class="q-px-none">
                  <q-item-section>
                    <div class="row no-wrap items-start">
                      <div class="col">
                        <div class="method-title">
                          <q-icon name="o_payments" size="18px" class="q-mr-sm" />
                          <span>{{ method.payment_type?.short_name || method.payment_type?.full_name }}</span>
                        </div>
                        <div v-for="(field, index) in method.values" :key="index" class="method-value">
                          {{ field.value }}
                        </div>
                      </div>
                      <div class="col-auto text-right self-start">
                        <q-btn dense flat round icon="edit" :class="getDarkModeClass(darkMode)" @click="editMethod(method, group.currency)" />
                        <q-btn dense flat round icon="delete" color="red-6" class="q-ml-xs" @click="deleteMethod(method, group.currency)" />
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </div>
            </q-card-section>
            <q-separator :dark="darkMode" />
          </q-card>
        </div>
        <!-- Fallback for Profile view if grouping has no data -->
        <div v-else-if="type === 'Profile'">
          <div class="q-ml-md text-h5" style="font-size: medium;">
            <span>{{ selectedCurrency.symbol }}</span>
          </div>
          <q-separator :dark="darkMode" class="q-mx-md"/>
          <div v-if="paymentMethods.length === 0" class="relative text-center" style="margin-top: 20px;">
            <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="md" name="mdi-delete-empty"/>
            <p class="q-pt-sm q-mb-none" :class="{ 'text-black': !darkMode }">{{ $t('NoPaymentMethodAdded') }}</p>
          </div>
          <q-item class="q-my-none q-py-none" v-for="(method, index) in paymentMethods" :key="index">
            <q-item-section>
              <div class="row no-wrap items-start">
                <div class="col">
                  <div class="md-font-size">
                    {{ method.payment_type?.short_name || method.payment_type?.full_name }}
                  </div>
                  <div v-for="(field, i) in method.values" :key="i">
                    <div class="subtext">
                      {{ field.value }}
                    </div>
                  </div>
                </div>
                <div class="col-auto text-right self-start">
                  <q-btn outline rounded padding="sm" icon="edit" size="sm" class="button button-icon" :class="getDarkModeClass(darkMode)" @click="editMethod(method, selectedCurrency.symbol)" />
                  <q-btn outline rounded padding="sm" size="sm" icon="delete" color="red-6" class="q-ml-xs" @click="deleteMethod(method, selectedCurrency.symbol)" />
                </div>
              </div>
              <q-separator :dark="darkMode" class="q-my-sm"/>
            </q-item-section>
          </q-item>
          <div class="row q-mx-md q-py-sm">
            <q-btn outline rounded no-caps :label="$t('AddMethod')" class="q-space button button-icon" :class="getDarkModeClass(darkMode)" @click="createMethod(selectedCurrency.symbol)"/>
          </div>
        </div>
        <div v-if="type === 'General' && emptyPaymentMethods.length !== 0">
          <q-item v-for="(method, index) in emptyPaymentMethods" :key="index">
            <q-item-section>
              <div class="row">
                <div class="col text-h5" style="font-size: 15px;">
                  {{ method }}
                </div>
                <q-btn outline rounded dense padding="xs" size="md" icon="add" class="col-auto" color="blue-6" @click="addMethodFromAd(method, index)"/>
              </div>
              <q-separator :dark="darkMode" class="q-my-md"/>
            </q-item-section>
          </q-item>
        </div>
      </q-card-section>
      <div class="q-mt-md">
        <div class="row q-mx-md" v-if="type === 'Ads'">
          <q-btn outline rounded no-caps :label="$t('SelectMethods')" class="q-space button button-text-primary" :class="getDarkModeClass(darkMode)" @click="addMethod"></q-btn>
        </div>
        <div class="row q-pt-xs q-mx-md" v-if="type !== 'Profile'">
          <q-btn :loading="loadSubmitButton" :disable="disableSubmit" rounded no-caps :label="confirmLabel" class="q-space text-white button" :class="getDarkModeClass(darkMode)" color="blue-6" @click="submitPaymentMethod()" />
        </div>
        <!-- In Profile view, Add Method buttons are per currency group -->
      </div>
    </div>
  </div>
  <MiscDialogs
    v-if="showMiscDialogs"
    :key="miscDialogsKey"
    :type="dialogType"
    :data="info"
    :current-payment-methods="paymentMethods"
    :title="title"
    :text="text"
    v-on:back="onPaymentMethodBack"
    v-on:submit="receiveDialogInfo"
  />
  <SelectPaymentMethods
    v-if="showSelectPaymentMethods"
    :selected-methods="paymentMethods"
    :currency="currency"
    @back="onPaymentMethodBack"/>
  <PaymentMethodForm
    v-if="showPaymentMethodForm"
    :action="dialogType"
    :payment-method-id="selectedMethodIndex"
    :payment-type="info"
    :currency="currencyContext || currency"
    @success="fetchPaymentMethods"
    @back="onPaymentMethodBack"/>
  <div v-if="!isloaded" class="q-mx-md">
    <!-- Title skeleton -->
    <div class="q-mx-sm q-mt-sm q-mb-sm">
      <q-skeleton type="text" class="q-mx-auto" style="width: 60%; height: 28px;" />
    </div>
    <!-- Add button skeleton -->
    <div class="q-mx-md q-mt-sm q-mb-md">
      <q-skeleton type="rect" style="height: 40px; border-radius: 24px;" />
    </div>
    <!-- Currency cards skeleton -->
    <div class="q-gutter-lg q-mt-sm">
      <q-card v-for="i in 3" :key="i" flat bordered class="group-card">
        <q-card-section class="q-pb-none">
          <q-skeleton type="text" style="width: 80px; height: 18px;" />
        </q-card-section>
        <q-separator :dark="darkMode" />
        <q-card-section>
          <div class="q-gutter-sm">
            <q-skeleton type="text" style="width: 50%; height: 16px;" />
            <q-skeleton type="text" style="width: 90%; height: 14px;" />
            <q-skeleton type="text" style="width: 70%; height: 14px;" />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import PaymentMethodForm from './dialogs/PaymentMethodForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import SelectPaymentMethods from './dialogs/SelectPaymentMethods.vue'
import CurrencyFilterDialog from './dialogs/CurrencyFilterDialog.vue'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'

export default {
  components: {
    MiscDialogs,
    ProgressLoader,
    PaymentMethodForm,
    SelectPaymentMethods,
    HeaderNav
  },
  props: {
    type: String,
    confirmLabel: {
      type: String,
      default: 'Next'
    },
    currentPaymentMethods: {
      type: Array,
      default: null
    },
    adPaymentMethods: {
      type: Array,
      default: null
    },
    currency: String
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      paymentMethods: [],
      groupedPaymentMethods: [],
      paymentTypeOpts: [],
      paymentMethodOpts: [],
      selectedMethods: [],
      emptyPaymentMethods: [],

      openDialog: false,
      dialogType: 'addPaymentMethod',
      title: '',
      text: '',
      info: {},

      selectedMethodIndex: null,
      state: '',
      isloaded: false,

      savingPaymentMethod: false,
      miscDialogsKey: 0,
      showSelectPaymentMethods: false,
      showPaymentMethodForm: false,
      showMiscDialogs: false,
      fiatOption: null,
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      loadSubmitButton: false,
      currencyContext: null
    }
  },
  emits: ['submit', 'back'],
  beforeUnmount () {
    if (this.type === 'Profile') {
      bus.emit('show-menu')
    }
  },
  async mounted () {
    const vm = this
    if (vm.type === 'Profile') {
      await vm.fetchFiatCurrency()
    }
    await vm.fetchPaymentTypes()
    if (vm.type === 'Profile') {
      await vm.fetchAllPaymentMethodsProfile()
    } else {
      await vm.fetchPaymentMethods()
    }
    switch (vm.type) {
      case 'General':
        vm.validatePaymentMethods()
        break
      case 'Ads':
        vm.paymentMethods = vm.currentPaymentMethods
        vm.selectedMethods = vm.currentPaymentMethods
        vm.validatePaymentMethods()
        break
      case 'Profile':
        bus.emit('hide-menu')
        break
    }
    this.isloaded = true
  },
  computed: {
    minHeight () {
      let height = this.$q.platform.is.ios ? this.$q.screen.height - 135 : this.$q.screen.height - 110
      if (this.type === 'Profile') {
        if (!(this.paymentMethods.length - this.paymentTypeOpts.length !== 0)) {
          height = height - 120
        } else {
          height = height - 130
        }
      }
      if (this.type === 'Ads') {
        height = height - 190
      }
      if (this.type === 'General') {
        height = height - 170
      }
      return height
    },
    cardSectionStyle () {
      if (this.type === 'Profile') {
        return {}
      }
      return { height: `${this.minHeight}px`, overflowY: 'auto' }
    },
    headerOffset () {
      // mirror header-nav default height values
      return this.$q.platform.is.ios ? 95 : 70
    },
    hasAlienPaymentsSelected () {
      const alienPaymentMethods = this.paymentMethods.filter(element => {
        return element.alien && element.selected
      })
      return alienPaymentMethods.length > 0
    },
    disableSubmit () {
      let isDisabled = false
      if (this.paymentMethods.length === 0) {
        isDisabled = true
      }
      if (this.loadSubmitButton) {
        isDisabled = true
      }
      if (this.selectedMethods.length === 0 && this.type === 'General') {
        isDisabled = true
      }
      if (this.hasAlienPaymentsSelected) {
        isDisabled = true
      }
      return isDisabled
    },
    instructionMessage () {
      switch (this.type) {
        case 'General':
          return this.$t('InstructionGeneral')
        case 'Ads':
          return this.$t('InstructionAds')
      }
      return ''
    }
  },
  watch: {
    selectedCurrency () {
      this.fetchPaymentMethods()
    },
    fiatOption (val) {
      if (this.type === 'Profile' && Array.isArray(val) && val.length > 0) {
        this.fetchAllPaymentMethodsProfile()
      }
    }
  },
  methods: {
    getDarkModeClass,
    onBack () {
      this.$emit('back')
    },
    showCurrencySelect () {
      this.$q.dialog({
        component: CurrencyFilterDialog,
        componentProps: {
          fiatList: this.fiatOption
        }
      })
        .onOk(currency => {
          this.selectedCurrency = currency
        })
    },
    onPaymentMethodBack (data) {
      if (data !== undefined) {
        this.paymentMethods = data
      }
      this.dialogType = ''
      this.showPaymentMethodForm = false
      this.showSelectPaymentMethods = false
      this.showMiscDialogs = false
    },
    receiveDialogInfo (data) {
      const vm = this
      switch (vm.dialogType) {
        case 'addMethodFromAd':
        case 'editPaymentMethod':
        case 'createPaymentMethod':
        case 'addPaymentMethod':
          vm.savePaymentMethod(data)
          break
        case 'deletePaymentMethod':
          vm.deletePaymentMethod(this.selectedMethodIndex)
          break
        case 'confirmRemovePaymentMethod':
          vm.removePaymentMethod(data)
          break
        case 'confirmPaymentMethod':

          if (vm.type === 'Ads') {
            vm.$emit('submit', vm.paymentMethods)
          }
          break
        case 'confirmOrderCreate':
          vm.$emit('submit', vm.selectedMethods)
          break
      }
      vm.text = ''
      vm.title = ''
    },
    orderConfirm () {
      this.dialogType = 'confirmOrderCreate'
      this.title = 'Create Order?'
      this.openDialog = true
    },
    createMethod (currency) {
      this.currencyContext = currency || null
      this.info = this.paymentMethods.map(p => p.payment_type)
      this.showPaymentMethodForm = true
      this.dialogType = 'createPaymentMethod'
      this.openDialog = true
    },
    addMethodFromAd (data) {
      const selectedType = this.paymentTypeOpts.filter(p => p?.short_name === data)[0]
      this.info = selectedType
      this.showPaymentMethodForm = true
      this.dialogType = 'addMethodFromAd'
    },
    async addMethod () {
      await this.fetchPaymentMethods()
      this.showSelectPaymentMethods = true
      this.dialogType = 'addPaymentMethod'
      this.openDialog = true
    },
    editMethod (data, currency) {
      this.currencyContext = currency || null
      this.info = { ...data }
      this.selectedMethodIndex = data.id
      this.showPaymentMethodForm = true
      this.dialogType = 'editPaymentMethod'
      this.openDialog = true
    },
    deleteMethod (data, currency) {
      this.currencyContext = currency || null
      this.info = data
      this.selectedMethodIndex = data.id
      this.showPaymentMethodForm = true
      this.dialogType = 'deletePaymentMethod'
      this.openDialog = true
    },
    removeMethod (index, data) {
      this.info = data
      // this.selectedMethodIndex = index // data.id
      this.dialogType = 'confirmRemovePaymentMethod'
      this.openDialog = true
    },
    selectMethod (data, index) {
      const temp = this.selectedMethods.map(p => p.payment_type?.id)
      if (temp.includes(data.payment_type?.id)) {
        this.selectedMethods = this.selectedMethods.filter(p => p.payment_type?.id !== data.payment_type?.id)
      } else {
        this.selectedMethods.push(data)
      }
    },
    isPaymentSelected (payment) {
      return (this.selectedMethods.map(p => p.payment_type?.id).includes(payment?.payment_type?.id))
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type?.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    },
    removePaymentMethod (method) {
      const vm = this
      vm.paymentMethods = vm.paymentMethods.filter((element) => element.id !== method.id)
      this.openDialog = false
    },
    filterPaymentMethod () {
      // filter ad payment methods to currency supported only
      const paymentTypeOptNames = this.paymentTypeOpts.map(element => element.short_name)
      const adCurrencyPaymentTypes = this.adPaymentMethods.filter(element => {
        return paymentTypeOptNames.includes(element)
      })
      // find matching and creatable ad payment methods
      const match = this.paymentMethods.filter(function (method) {
        return adCurrencyPaymentTypes.includes(method.payment_type.short_name)
      })
      const temp = match.map(p => p.payment_type?.short_name)
      this.emptyPaymentMethods = adCurrencyPaymentTypes.filter(method => !temp.includes(method))
      return match
    },
    async fetchFiatCurrency () {
      try {
        const response = await backend.get('/ramp-p2p/currency/fiat')
        this.fiatOption = response.data
      } catch (error) {
        console.error(error)
      }
    },
    async fetchPaymentTypes () {
      const vm = this
      await backend.get('/ramp-p2p/payment-type/', { params: { currency: this.currency ? this.currency : this.selectedCurrency.symbol } })
        .then(response => {
          vm.paymentTypeOpts = response.data
        })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
    },
    // processes
    async fetchPaymentMethods () {
      const vm = this
      await backend.get('/ramp-p2p/payment-method', { params: { currency: this.currency ? this.currency : this.selectedCurrency.symbol }, authorize: true })
        .then(response => {
          if (this.type === 'Ads') {
            this.info = response.data
            this.paymentMethodOpts = response.data
          } else {
            this.paymentMethods = response.data
            if (vm.adPaymentMethods) {
              this.paymentMethods = vm.filterPaymentMethod()
            }
          }
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
    async fetchAllPaymentMethodsProfile () {
      // Build grouped list of payment methods for each fiat currency
      if (!this.fiatOption || !Array.isArray(this.fiatOption)) {
        this.groupedPaymentMethods = []
        return
      }
      const symbols = this.fiatOption.map(c => c.symbol)
      const requests = symbols.map(symbol =>
        backend.get('/ramp-p2p/payment-method', { params: { currency: symbol }, authorize: true })
          .then(resp => ({ currency: symbol, methods: resp.data || [] }))
          .catch(() => ({ currency: symbol, methods: [] }))
      )
      const results = await Promise.all(requests)
      this.groupedPaymentMethods = results.filter(g => (g.methods && g.methods.length > 0))
    },
    validatePaymentMethods () {
      const vm = this
      vm.paymentMethods = vm.paymentMethods.map((element) => {
        element.selected = true
        element.alien = false
        return element
      })
      const paymentTypeOptIds = vm.paymentTypeOpts.map((element) => { return element.id })
      vm.paymentMethods = vm.paymentMethods.map(element => {
        if (!paymentTypeOptIds.includes(element.payment_type.id)) {
          element.alien = true
        }
        return element
      })
    },
    async deletePaymentMethod (index) {
      const vm = this
      vm.isloaded = false
      await backend.delete(`/ramp-p2p/payment-method/${index}/`, { authorize: true })
        .catch(error => {
          console.error(error.response || error)
          if (error.response) {
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            bus.emit('network-error')
          }
        })
      if (vm.type === 'Profile') {
        await vm.fetchAllPaymentMethodsProfile()
      } else {
        await vm.fetchPaymentMethods()
      }
      this.openDialog = false
      vm.isloaded = true
    },
    async savePaymentMethod (info) {
      console.log('saving Payment method here')
      const vm = this
      let url = '/ramp-p2p/payment-method/'
      const body = {
        account_name: info.account_name,
        account_identifier: info.account_identifier,
        identifier_format: info.identifier_format
      }
      if (vm.dialogType === 'editPaymentMethod') {
        url = `${url}${vm.selectedMethodIndex}/`
      } else {
        body.payment_type = info.payment_type.id
      }

      switch (vm.dialogType) {
        case 'addMethodFromAd':
        case 'createPaymentMethod':
        case 'addPaymentMethod': {
          // posting new payment method
          backend.post(url, body, { authorize: true })
            .then(response => {
              vm.openDialog = false
            })
            .catch(error => {
              console.error(error.response || error)
              vm.openDialog = false
              if (error.response) {
                if (error.response.status === 403) {
                  bus.emit('session-expired')
                }
              } else {
                bus.emit('network-error')
              }
            })

          break
        }
        case 'editPaymentMethod': {
          // editing payment method
          console.log('HEERRREEE:', url)
          backend.patch(url, body, { authorize: true })
            .then(() => {
              vm.dialogType = ''
              vm.openDialog = false
              vm.savingPaymentMethod = false
            })
            .catch(error => {
              console.error(error.response)
              vm.savingPaymentMethod = false
              if (error.response) {
                if (error.response.status === 403) {
                  bus.emit('session-expired')
                }
              } else {
                bus.emit('network-error')
              }
            })
          break
        }
      }

      if (this.type === 'Profile') {
        await this.fetchAllPaymentMethodsProfile()
      } else {
        this.fetchPaymentMethods()
      }

      // if (this.dialogType === 'addMethodFromAd') {
      //   this.fetchPaymentMethods()
      // }
    },
    submitPaymentMethod () {
      this.showMiscDialogs = true
      if (this.type === 'General') {
        this.dialogType = 'confirmOrderCreate'
        this.title = 'Create Order?'
        // this.openDialog = true
        // this.orderConfirm()
      } else {
        this.dialogType = 'confirmPaymentMethod'
        this.title = 'Confirm Payment Methods?'
        this.text = 'Please make sure the information provided are correct.'
        // this.openDialog = true
        // this.$emit('submit')
      }
      this.openDialog = true
    }
  }
}
</script>
<style lang="scss" scoped>
.md-font-size {
  font-size: medium;
}

.subtext {
  opacity: .5;
}

/* Ensure very long identifiers (e.g., IBAN, wallet addresses) wrap gracefully */
.md-font-size,
.subtext {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Grouped profile layout polish */
.group-card {
  border-radius: 14px;
}

.currency-header {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.5px;
}

.method-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
}

.method-value {
  opacity: .7;
  margin-top: 2px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0 10px;
}

.sticky-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}
</style>
