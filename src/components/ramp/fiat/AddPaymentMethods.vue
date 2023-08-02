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
    <div v-if="adPaymentMethod">
      <div class="q-mx-sm q-mb-sm text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        SELLER PAYMENT METHOD
      </div>
      <div class="q-gutter-sm q-py-sm text-center">
        <q-badge v-for="method in adPaymentMethod" :key="method.id"
          rounded outline color="blue">
          {{ method.payment_type }}
        </q-badge>
      </div>
    </div>
    <div class="q-mx-sm q-mb-sm text-h5 text-center md-font-size bold-text" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      PAYMENT METHODS
    </div>
    <div class="subtext q-pt-xs q-pl-lg"><i>Add up to 5 methods</i></div>
    <div>
      <div v-if="paymentMethods.length === 0" class="relative text-center" style="margin-top: 50px;">
        <q-icon class="q-pr-sm" :color="darkMode? 'grey-5' : 'grey-7'" size="lg" name="mdi-delete-empty"/>
        <p class="q-pt-sm" :class="{ 'text-black': !darkMode }">No Payment Method Added</p>
      </div>
      <div v-else>
        <q-card-section style="max-height:38vh;overflow-y:auto;">
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
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
        </q-card-section>
      </div>
    </div>
    <div>
      <div class="row q-pt-lg q-mx-sm" v-if="paymentMethods.length < 6">
        <q-btn
          v-if="type === 'Ads'"
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
    <div class="row q-pt-lg q-mx-sm" v-if="type !== 'Profile'">
      <q-btn
        :disable="paymentMethods.length === 0"
        rounded
        no-caps
        :label="confirmLabel"
        class="q-space text-white"
        color="blue-6"
        @click="submitPaymentMethod"
      />
    </div>
    <div>
      <div class="row q-pt-lg q-mx-sm" v-if="type === 'Profile'">
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
      :type="dialogType"
      :data="info"
      :current-payment-methods="paymentMethods"
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
      paymentMethods: [],
      paymentTypes: [],
      openDialog: false,
      dialogType: 'addPaymentMethod',
      info: {},
      selectedMethodIndex: null,
      state: '',
      isloaded: false,
      wallet: null
    }
  },
  emits: ['submit', 'back'],
  async mounted () {
    const vm = this
    // get payment type list
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)

    switch (vm.type) {
      case 'General':
        console.log('General')
        await vm.fetchPaymentMethod()
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
        case 'createPaymentMethod':
        case 'addPaymentMethod':
          vm.updatePayment(data)
          break
        case 'editPaymentMethod':
          vm.updatePayment(data)
          break
        case 'confirmDeletePaymentMethod':
          vm.deletePaymentMethod(this.selectedMethodIndex)
          break
        case 'confirmRemovePaymentMethod':
          vm.removePaymentMethod(data)
          break
        case 'confirmPaymentMethod':
          vm.$emit('submit', vm.paymentMethods)
          break
      }
    },
    async updatePayment (data) {
      const vm = this
      vm.loading = true
      await vm.savePaymentMethod(data)
      vm.loading = false
    },
    // opening dialog
    createMethod () {
      this.info = this.paymentMethods.map(p => p.payment_type)
      this.dialogType = 'createPaymentMethod'
      this.openDialog = true
    },
    addMethod () {
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
    removePaymentMethod (method) {
      const vm = this
      vm.paymentMethods = vm.paymentMethods.filter((element) => element.id !== method.id)
      this.openDialog = false
    },
    filterPaymentMethod () {
      // console.log(this.paymentMethods)

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
      console.log('matched:', match)
      return match
    },
    async fetchPaymentTypes () {
      const vm = this
      await vm.$axios.get(vm.apiURL + '/payment-type')
        .then(response => {
          vm.paymentTypes = response.data
          console.log(response.data)
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
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.get(url, {
        headers: {
          'wallet-hash': vm.wallet.walletHash,
          signature: signature,
          timestamp: timestamp
        }
      })
        .then(response => {
          // console.log(response.data)
          this.paymentMethods = response.data

          if (vm.adPaymentMethod) {
            this.paymentMethods = vm.filterPaymentMethod()
            // console.log('diff', vm.response.data.length - this.paymentMethods.length)
          }
        })
        .catch(error => {
          console.log(error)
        })


      // console.log('types', this.paymentTypes.length)
      // console.log(this.paymentMethods.length)
    },
    async deletePaymentMethod (index) {
      const vm = this

      vm.isloaded = false

      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.delete(vm.apiURL + '/payment-method/' + index, {
        headers: {
          'wallet-hash': vm.wallet.walletHash,
          signature: signature,
          timestamp: timestamp
        }
      })
        .catch(error => {
          console.error(error)
          console.error(error.response)
        })

      await vm.fetchPaymentMethod()
      vm.isloaded = true
    },
    async savePaymentMethod (info) {
      const vm = this

      const timestamp = Date.now()
      let signature = ''

      switch (vm.dialogType) {
        case 'createPaymentMethod':
        case 'addPaymentMethod':
          // posting new payment method

          signature = await signMessage(vm.wallet.privateKeyWif, 'PAYMENT_METHOD_CREATE', timestamp)
          vm.$axios.post(vm.apiURL + '/payment-method/', {
            payment_type: info.payment_type.id,
            account_name: vm.$store.getters['ramp/getUser'].nickname,
            account_number: info.account_number
          },
          {
            headers: {
              'wallet-hash': vm.wallet.walletHash,
              signature: signature,
              timestamp: timestamp
            }
          })
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
        case 'editPaymentMethod':
          // editing payment method

          signature = await signMessage(vm.wallet.privateKeyWif, 'PAYMENT_METHOD_UPDATE', timestamp)
          vm.$axios.put(vm.apiURL + '/payment-method/' + vm.selectedMethodIndex, {
            account_name: vm.$store.getters['ramp/getUser'].nickname,
            account_number: info.account_number
          },
          {
            headers: {
              'wallet-hash': vm.wallet.walletHash,
              signature: signature,
              timestamp: timestamp
            }
          })
          break
      }
    },
    submitPaymentMethod () {
      this.dialogType = 'confirmPaymentMethod'
      this.openDialog = true
      // this.$emit('submit')
    }
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
