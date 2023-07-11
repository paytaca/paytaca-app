<template>
  <div>
    <q-btn
      flat
      padding="md"
      icon="arrow_back"
      @click="$emit('back')"
    />
  </div>
  <div class="q-mx-lg" v-if="isloaded">
    <div class="q-mx-sm q-mb-sm text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
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
                    <div class="text-right q-pt-sm">
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
      <div class="row q-pt-lg q-mx-sm">
        <q-btn
          outline
          rounded
          no-caps
          label='Add'
          class="q-space text-white"
          color="blue-6"
          @click="addMethod"
          v-show="paymentMethods.length < 5"
        />
      </div>
    </div>
    <div class="row q-pt-lg q-mx-sm">
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
  </div>

  <div v-if="openDialog">
    <MiscDialogs
      :type="dialogType"
      :data="info"
      v-on:back="openDialog = false"
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
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      paymentMethods: [],
      openDialog: false,
      dialogType: 'addPaymentMethod',
      info: {},
      selectedMethodIndex: null,
      state: '',
      isloaded: false
    }
  },
  emits: ['submit', 'back'],
  components: {
    MiscDialogs,
    ProgressLoader
  },
  props: {
    confirmLabel: {
      type: String,
      default: 'Next'
    },
    currentPaymentMethods: {
      type: Array,
      default: []
    }
  },
  methods: {
    async fetchPaymentMethod () {
      const vm = this
      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'AD_LIST', timestamp)

      // console.log('fetching payment method')
      vm.$axios.get(vm.apiURL + '/payment-method',
        {
          headers: {
            'wallet-hash': wallet.walletHash,
            signature: signature,
            timestamp: timestamp
          }
        })
        .then(response => {
          this.paymentMethods = response.data
        })
        .catch(error => {
          console.log(error)
        })
    },
    receiveDialogInfo (data) {
      const vm = this

      switch (vm.dialogType) {
        case 'addPaymentMethod':
          vm.updatePayment(data)
          break
        case 'editPaymentMethod':
          vm.updatePayment(data)
          break
        case 'confirmDeletePaymentMethod':
          vm.deletePaymentMethod(this.selectedMethodIndex)
          break
        case 'confirmPaymentMethod':
          vm.$emit('submit', vm.paymentMethods)
          break
      }
    },
    async updatePayment (data) {
      const vm = this
      vm.isloaded = false

      await vm.savePaymentMethod(data)
      await vm.fetchPaymentMethod()

      vm.isloaded = true
    },
    // opening dialog
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
      // console.log('confirmDeletePaymentMethod')
      this.selectedMethodIndex = data.id
      this.dialogType = 'confirmDeletePaymentMethod'
      this.openDialog = true
    },
    // processes
    async deletePaymentMethod (index) {
      // console.log('deleting payment method')
      const vm = this

      vm.isloaded = false
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'AD_LIST', timestamp)

      await vm.$axios.delete(vm.apiURL + '/payment-method/' + index, {
        headers: {
          'wallet-hash': wallet.walletHash,
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
      // console.log('saving payment method')
      const vm = this

      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(wallet.privateKeyWif, 'AD_LIST', timestamp)

      switch (vm.dialogType) {
        case 'addPaymentMethod':
          // posting new payment method

          vm.$axios.post(vm.apiURL + '/payment-method/', {
            payment_type: info.payment_type.id,
            account_name: vm.$store.getters['ramp/getUser'].nickname,
            account_number: info.account_number
          },
          {
            headers: {
              'wallet-hash': wallet.walletHash,
              signature: signature,
              timestamp: timestamp
            }
          })
            // .then(response => {
            //   console.log(response.data)
            // })
            .catch(error => {
              console.error(error)
              console.error(error.response)
            })

          break
        case 'editPaymentMethod':
          // editing payment method

          vm.$axios.put(vm.apiURL + '/payment-method/' + vm.selectedMethodIndex, {
            account_name: vm.$store.getters['ramp/getUser'].nickname,
            account_number: info.account_number
          },
          {
            headers: {
              'wallet-hash': wallet.walletHash,
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
      // this.$emit('submit', this.paymentMethods)
    }
  },
  async mounted () {
    // get payment type list
    // this.paymentMethods = this.currentPaymentMethods
    await this.fetchPaymentMethod()

    this.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.subtext {
  opacity: .5;
}
</style>
