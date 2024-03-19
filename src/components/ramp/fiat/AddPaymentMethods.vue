<template>
  <div
    class="q-mx-md q-mx-none text-bow"
    :class="getDarkModeClass(darkMode)"
    :style="`height: ${minHeight}px;`">
    <div class="q-mx-md" v-if="isloaded">
      <div class="q-mx-sm q-mb-sm text-h5 text-center text-weight-bold md-font-size">
        {{ type === 'Profile' ? 'Your' : 'Select' }} Payment Methods
      </div>
      <q-separator :dark="darkMode" class="q-mx-md q-mt-sm"/>
      <div v-if="type != 'Profile'" class="subtext q-mx-lg q-mt-sm"><i>{{ instructionMessage }}</i></div>
      <q-card-section :style="`max-height: ${minHeight - 190}px`" style="overflow-y:auto;">
        <div v-if="paymentMethods.length === 0 && type !== 'General'" class="relative text-center" style="margin-top: 50px;">
          <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
          <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">No Payment Method Added</p>
        </div>
        <q-item v-for="(method, index) in paymentMethods" :key="index">
          <q-item-section>
            <div class="row">
              <div class="col">
                <div class="md-font-size">
                  {{ method.payment_type.name }}
                </div>
                <div class="subtext">
                  {{ method.account_name }}
                </div>
                <div class="subtext">
                  {{ method.account_identifier }}
                </div>
              </div>
              <div class="text-right" v-if="type === 'Profile'">
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
              <div class="col justify-end text-right"  v-if="type === 'General'">
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
        <div v-if="type === 'General' && emptyPaymentMethods.length !== 0">
          <q-item v-for="(method, index) in emptyPaymentMethods" :key="index">
            <q-item-section>
              <div class="row">
                <div class="col text-h5" style="font-size: 15px;">
                  {{ method }}
                </div>
                <q-btn
                  outline
                  rounded
                  dense
                  padding="xs"
                  size="md"
                  icon="add"
                  class="col-auto"
                  color="blue-6"
                  @click="addMethodFromAd(method, index)"
                />
              </div>
              <q-separator :dark="darkMode" class="q-my-md"/>
            </q-item-section>
          </q-item>
        </div>
        <div class="row q-pt-lg q-mx-md" v-if="type === 'Ads'">
          <q-btn
            outline
            rounded
            no-caps
            label="Select Methods"
            class="q-space text-white"
            color="blue-6"
            @click="addMethod">
          </q-btn>
        </div>
        <div class="row q-pt-xs q-mx-md" v-if="type !== 'Profile'">
          <q-btn
            :disable="disableSubmit"
            rounded
            no-caps
            :label="confirmLabel"
            class="q-space text-white"
            color="blue-6"
            @click="submitPaymentMethod()"
          />
        </div>
        <div class="row q-mx-md q-py-md" v-if="type === 'Profile'">
          <q-btn
            v-if="paymentMethods.length - paymentTypes.length !== 0"
            outline
            rounded
            no-caps
            label='Add Method'
            class="q-space button button-icon"
            :class="getDarkModeClass(darkMode)"
            @click="createMethod"
          />
        </div>
      </q-card-section>
    </div>
  </div>
  <!-- <div v-if="openDialog"> -->
    <!-- Uses MiscDialogs to handle payment methods when NOT in profile page -->
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
    <!-- Uses PaymentMethodForm when in profile page only -->
    <!-- TODO: use PaymentMethodForm in other pages -->
    <SelectPaymentMethods v-if="showSelectPaymentMethods" @back="onPaymentMethodBack"/>
    <PaymentMethodForm v-if="showPaymentMethodForm" :action="dialogType" :payment-method-id="selectedMethodIndex" @success="fetchPaymentMethod" @back="onPaymentMethodBack"/>
  <!-- </div> -->
  <div v-if="!isloaded">
    <div class="row justify-center q-py-lg" style="margin-top: 50px">
      <ProgressLoader/>
    </div>
  </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import PaymentMethodForm from './dialogs/PaymentMethodForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import SelectPaymentMethods from './dialogs/SelectPaymentMethods.vue'
import { bus } from 'src/wallet/event-bus.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'

export default {
  components: {
    MiscDialogs,
    ProgressLoader,
    PaymentMethodForm,
    SelectPaymentMethods
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
    adPaymentMethod: {
      type: Array,
      default: null
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 135 : this.$q.screen.height - 110,
      paymentMethods: [],
      paymentTypes: [],
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
      showMiscDialogs: false
    }
  },
  emits: ['submit', 'back'],
  async mounted () {
    const vm = this
    switch (vm.type) {
      case 'General':
        await vm.fetchPaymentMethod()
        await vm.fetchPaymentTypes()
        break
      case 'Ads':
        vm.paymentMethods = this.currentPaymentMethods
        break
      case 'Profile':
        await vm.fetchPaymentMethod()
        await this.fetchPaymentTypes()
        bus.emit('hide-menu')
        break
    }

    this.isloaded = true
  },
  computed: {
    disableSubmit () {
      let isDisabled = false
      if (this.paymentMethods.length === 0) {
        isDisabled = true
      }
      if (this.selectedMethods.length === 0 && this.type === 'General') {
        isDisabled = true
      }
      return isDisabled
    },
    instructionMessage () {
      switch (this.type) {
        case 'General':
          return 'This ad accepts the following payment types'
        case 'Ads':
          return 'Your ad will accept the following payment types'
      }
      return ''
    }
  },
  methods: {
    getDarkModeClass,
    onBack () {
      if (this.type === 'Profile') {
        bus.emit('show-menu')
      }
      this.$emit('back')
    },
    onPaymentMethodBack (data) {
      if (data !== undefined) {
        this.paymentMethods = data
      }
      this.dialogType = ''
      this.showPaymentMethodForm = false
      this.showSelectPaymentMethods = false
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
    createMethod () {
      this.info = this.paymentMethods.map(p => p.payment_type)
      this.showPaymentMethodForm = true
      this.dialogType = 'createPaymentMethod'
      this.openDialog = true
    },
    addMethodFromAd (data) {
      const selectedType = this.paymentTypes.filter(p => p.name === data)[0]
      this.info = selectedType

      this.dialogType = 'addMethodFromAd'
      this.openDialog = true
    },
    async addMethod () {
      await this.fetchPaymentMethod()
      this.showSelectPaymentMethods = true
      this.dialogType = 'addPaymentMethod'
      this.openDialog = true
    },
    editMethod (data) {
      this.info = { ...data }
      this.selectedMethodIndex = data.id
      this.showPaymentMethodForm = true
      this.dialogType = 'editPaymentMethod'
      this.openDialog = true
    },
    deleteMethod (data) {
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
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      if (temp.includes(data.payment_type.name)) {
        this.selectedMethods = this.selectedMethods.filter(p => p.payment_type.name !== data.payment_type.name)
      } else {
        this.selectedMethods.push(data)
      }
    },
    isPaymentSelected (payment) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return (temp.includes(payment?.payment_type?.name))
    },
    selectButtonColor (type) {
      const temp = this.selectedMethods.map(p => p.payment_type.name)
      return temp.includes(type) ? 'blue-6' : 'grey-6'
    },
    removePaymentMethod (method) {
      const vm = this
      vm.paymentMethods = vm.paymentMethods.filter((element) => element.id !== method.id)
      this.openDialog = false
    },
    filterPaymentMethod () {
      const adMethod = this.adPaymentMethod
      let adPaymentTypes = []

      try {
        adPaymentTypes = adMethod.map(p => p.payment_type)
      } catch {
        console.log('empty')
      }

      const match = this.paymentMethods.filter(function (method) {
        return adPaymentTypes.includes(method.payment_type.name)
      })

      const temp = match.map(p => p.payment_type.name)
      this.emptyPaymentMethods = adPaymentTypes.filter(method => !temp.includes(method))

      return match
    },
    async fetchPaymentTypes () {
      const vm = this
      await backend.get('/ramp-p2p/payment-type', { authorize: true })
        .then(response => {
          vm.paymentTypes = response.data
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    // processes
    async fetchPaymentMethod () {
      const vm = this
      await backend.get('/ramp-p2p/payment-method', { authorize: true })
        .then(response => {
          if (this.type === 'Ads') {
            this.info = response.data
          } else {
            this.paymentMethods = response.data
            if (vm.adPaymentMethod) {
              this.paymentMethods = vm.filterPaymentMethod()
            }
          }
        })
        .catch(error => {
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
    },
    async deletePaymentMethod (index) {
      const vm = this
      vm.isloaded = false
      await backend.delete(`/ramp-p2p/payment-method/${index}`, { authorize: true })
        .catch(error => {
          console.error(error)
          console.error(error.response)
          if (error.response && error.response.status === 403) {
            bus.emit('session-expired')
          }
        })
      await vm.fetchPaymentMethod()
      this.openDialog = false
      vm.isloaded = true
    },
    async savePaymentMethod (info) {
      const vm = this
      let url = '/ramp-p2p/payment-method/'
      const body = {
        account_name: info.account_name,
        account_identifier: info.account_identifier,
        identifier_format: info.identifier_format
      }
      if (vm.dialogType === 'editPaymentMethod') {
        url = url + vm.selectedMethodIndex
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
              if (vm.paymentMethods.length < 5) {
                vm.paymentMethods.push(response.data)
              }
              vm.openDialog = false
            })
            .catch(error => {
              console.error(error)
              console.error(error.response)
              vm.openDialog = false
              if (error.response && error.response.status === 403) {
                bus.emit('session-expired')
              }
            })

          break
        }
        case 'editPaymentMethod': {
          // editing payment method
          backend.put(url, body, { authorize: true })
            .then(() => {
              vm.dialogType = ''
              vm.openDialog = false
              vm.savingPaymentMethod = false
            })
            .catch(error => {
              console.error(error.response)
              vm.savingPaymentMethod = false
              if (error.response && error.response.status === 403) {
                bus.emit('session-expired')
              }
            })
          break
        }
      }

      this.fetchPaymentMethod()

      // if (this.dialogType === 'addMethodFromAd') {
      //   this.fetchPaymentMethod()
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
</style>
