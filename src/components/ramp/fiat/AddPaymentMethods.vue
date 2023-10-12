<template>
  <div>
    <q-btn
      flat
      padding="md"
      icon="arrow_back"
      @click="$emit('back')"
      v-if="type !== 'Ads'"
    />
  </div>
  <div class="q-mx-lg" v-if="isloaded">
    <div class="q-mx-sm q-mb-sm text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      PAYMENT METHODS
    </div>
    <!-- <div class="subtext q-pt-xs q-pl-lg"><i>Add up to 5 methods</i></div> -->
    <div>
      <div v-if="paymentMethods.length === 0 && type !== 'General'" class="relative text-center" style="margin-top: 50px;">
        <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
        <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">No Payment Method Added</p>
      </div>
      <div v-else>
        <q-card-section :style="`max-height: ${minHeight - 230}px`" style="overflow-y:auto;">
          <q-virtual-scroll :items="paymentMethods">
            <template v-slot="{ item: method, index }">
              <q-item clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <q-item-section>
                  <div class="row">
                    <div class="col">
                      <div class="text-h5" style="font-size: 15px;">
                        {{ method.payment_type.name.toUpperCase() }}
                      </div>
                      <div class="subtext bold-text">
                        {{ method.account_name }}
                      </div>
                      <div class="subtext bold-text">
                        {{ method.account_number }}
                      </div>
                    </div>
                    <div class="text-right q-pt-sm" v-if="type === 'Profile'">
                      <q-btn
                        outline
                        rounded
                        padding="sm"
                        icon="edit"
                        size="sm"
                        color="grey-6"
                        @click="editMethod(method)"
                      />
                      <q-btn
                        outline
                        rounded
                        padding="sm"
                        size="sm"
                        icon="delete"
                        color="grey-6"
                        class="q-ml-xs"
                        @click="deleteMethod(method)"
                        />
                    </div>
                    <div class="text-right q-pt-sm"  v-if="type === 'General'">
                      <q-btn
                        outline
                        rounded
                        padding="sm"
                        size="sm"
                        icon="done"
                        :color="selectButtonColor(method.payment_type.name)"
                        class="q-ml-xs"
                        @click="selectMethod(method)"
                        />
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
          <div v-if="type === 'General' && emptyPaymentMethods.length !== 0">
            <q-virtual-scroll :items="emptyPaymentMethods">
            <template v-slot="{ item: method, index }">
              <q-item clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                <q-item-section>
                  <div class="row">
                    <div class="col">
                      <div class="text-h5" style="font-size: 15px;">
                        {{ method }}
                      </div>
                      <div class="subtext bold-text">
                        <div class="row q-pt-sm">
                          <q-btn
                            outline
                            rounded
                            no-caps
                            icon="add"
                            class="q-space text-white"
                            color="blue-6"
                            @click="addMethodFromAd(method, index)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
          </div>
        </q-card-section>
      </div>
    </div>
    <div>
      <div class="row q-pt-lg q-mx-sm" v-if="type === 'Ads'">
        <q-btn
          outline
          rounded
          no-caps
          label='Select Methods'
          class="q-space text-white"
          color="blue-6"
          @click="addMethod"
        />
      </div>
    </div>
    <div class="row q-pt-xs q-mx-sm" v-if="type !== 'Profile'">
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
    <div>
      <div class="row q-mx-sm" v-if="type === 'Profile'">
        <q-btn
          v-if="paymentMethods.length - paymentTypes.length !== 0"
          outline
          rounded
          no-caps
          label='Add Method'
          class="q-space text-white"
          color="blue-6"
          @click="createMethod"
        />
      </div>
    </div>
  </div>

  <div v-if="openDialog">
    <MiscDialogs
      :key="miscDialogsKey"
      :type="dialogType"
      :data="info"
      :current-payment-methods="paymentMethods"
      :title="title"
      :text="text"
      v-on:back="onBack"
      v-on:submit="receiveDialogInfo"
    />
  </div>

  <div v-if="!isloaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'
import ProgressLoader from '../../ProgressLoader.vue'

export default {
  components: {
    MiscDialogs,
    ProgressLoader
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
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - (95 + 120) : this.$q.screen.height - (70 + 100),
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
      miscDialogsKey: 0
    }
  },
  emits: ['submit', 'back'],
  // watch: {
  //   paymentMethods (value) {
  //     console.log('paymentMethods:', value)
  //   }
  // },
  async mounted () {
    const vm = this
    // get payment type list
    // const walletInfo = vm.$store.getters['global/getWallet']('bch')
    // vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)

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
    }
  },
  methods: {
    onBack (data) {
      if (data !== undefined) {
        this.paymentMethods = data
      }
      this.openDialog = false
    },
    receiveDialogInfo (data) {
      const vm = this
      switch (vm.dialogType) {
        case 'addMethodFromAd':
        case 'editPaymentMethod':
        case 'createPaymentMethod':
        case 'addPaymentMethod':
          // vm.updatePayment(data)
          // vm.loading = true
          vm.savePaymentMethod(data)
          // vm.loading = false
          break
        case 'confirmDeletePaymentMethod':
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
      this.dialogType = 'addPaymentMethod'
      this.openDialog = true
    },
    editMethod (data) {
      this.info = data
      this.selectedMethodIndex = data.id

      this.dialogType = 'editPaymentMethod'
      this.openDialog = true
    },
    deleteMethod (data) {
      this.info = data
      this.selectedMethodIndex = data.id
      this.dialogType = 'confirmDeletePaymentMethod'
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
      // console.log(this.selectedMethods)
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
      await vm.$axios.get(vm.apiURL + '/payment-type', { headers: vm.authHeaders })
        .then(response => {
          vm.paymentTypes = response.data
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
    },
    // processes
    async fetchPaymentMethod () {
      const vm = this
      const url = `${vm.apiURL}/payment-method`
      await vm.$axios.get(url, { headers: vm.authHeaders })
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
        })
    },
    async deletePaymentMethod (index) {
      const vm = this
      vm.isloaded = false
      await vm.$axios.delete(vm.apiURL + '/payment-method/' + index, { headers: vm.authHeaders })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })
      await vm.fetchPaymentMethod()
      this.openDialog = false
      vm.isloaded = true
    },
    async savePaymentMethod (info) {
      const vm = this
      let url = vm.apiURL + '/payment-method/'
      const body = {
        account_name: info.account_name,
        account_number: info.account_number
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
          vm.$axios.post(url, body, { headers: vm.authHeaders })
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
            })

          break
        }
        case 'editPaymentMethod': {
          // editing payment method
          vm.$axios.put(url, body, { headers: vm.authHeaders })
            .then(() => {
              vm.dialogType = ''
              vm.openDialog = false
              vm.savingPaymentMethod = false
            })
            .catch(error => {
              console.error(error.response)
              vm.savingPaymentMethod = false
            })
          break
        }
      }

      if (this.dialogType === 'addMethodFromAd') {
        this.fetchPaymentMethod()
      }
    },
    submitPaymentMethod () {
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
.subtext {
  opacity: .5;
}
</style>
