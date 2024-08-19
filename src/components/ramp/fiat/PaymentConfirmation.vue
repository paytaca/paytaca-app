<template>
  <div
    v-if="isloaded"
    class="q-pt-sm q-mx-md text-bow"
    :class="getDarkModeClass(darkMode)">
    <div class="q-mx-md q-px-sm">
      <div class="sm-font-size q-pb-xs q-ml-xs">{{ $t('Arbiter') }}</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        dense
        filled
        :dark="darkMode"
        :label="data?.arbiter?.address"
        v-model="data.arbiter.name">
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractAddress') }}</div>
      <q-input
        class="q-pb-xs"
        readonly
        dense
        filled
        :dark="darkMode"
        :label="data?.contract.address">
        <template v-slot:append>
          <div v-if="data?.contract.address" @click="copyToClipboard(data?.contract.address)">
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6"/>
          </div>
        </template>
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ $t('ContractBalance') }}</div>
      <q-input
        class="q-pb-xs md-font-size"
        readonly
        dense
        filled
        :loading="!contractBalance"
        :dark="darkMode"
        v-model="contractBalance">
        <template v-slot:append>
          <span>BCH</span>
        </template>
      </q-input>
      <div class="sm-font-size q-py-xs q-ml-xs">{{ data?.type === 'buyer' ? $t('PayTheSeller') : $t('ExpectFiatPaymentOf') }}</div>
      <div @click="copyToClipboard(fiatAmount)">
        <q-input
          class="q-pb-xs md-font-size"
          readonly
          dense
          filled
          :dark="darkMode"
          :rules="[$parent.isValidInputAmount]"
          v-model="fiatAmount">
          <template v-slot:append>
            <span>{{ order?.ad?.fiat_currency?.symbol }}</span>
          </template>
        </q-input>
      </div>
    </div>
    <div class="q-mx-md q-px-xs q-pt-sm">
      <div class="md-font-size q-pb-xs q-pl-sm text-center text-weight-bold">{{ $t('PAYMENTMETHODS') }}</div>
        <div class="text-center sm-font-size q-mx-md q-mb-sm">
        <!-- <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp; -->
        <span v-if="data?.type === 'buyer'">{{ $t('SelectPaymentMethod') }}</span>
        <span v-if="data?.type === 'seller'">The buyer selected the following payment methods.</span>
      </div>
      <div class="full-width">
        <div v-for="(method, index) in paymentMethods" :key="index">
          <div class="q-py-xs">
            <q-card flat bordered :dark="darkMode">
              <q-expansion-item
                class="pt-card text-bow"
                :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
                :default-opened=true
                :label="method.payment_type"
                expand-separator >
                <q-card class="row q-py-sm q-px-md pt-card" :class="getDarkModeClass(darkMode)">
                  <div class="col q-pr-sm q-py-xs">
                    <div v-for="(field, index) in method.values" :key="index">
                      <div v-if="field.value">{{ field.field_reference.fieldname }}:</div>
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
                  <div v-if="method.attachments?.length > 0" class="col q-py-xs">
                    <div class="row justify-end q-mr-md">
                      <q-img
                        :src="method.attachments[0].image?.url"
                        style="max-height: 80px; max-width: 150px;"
                        @click="viewPaymentAttachment(method.attachments[0].image?.url)">
                        <div class="absolute-full text-subtitle2 flex flex-center text-bow" style="font-style: italic">
                          {{ method.attachments?.length }} attachment(s)
                        </div>
                      </q-img>
                    </div>
                  </div>
                  <div v-if="data?.type !== 'seller'">
                    <q-checkbox v-model="method.selected" @click="selectPaymentMethod(method)" :dark="darkMode"/>
                  </div>
                </q-card>
              </q-expansion-item>
            </q-card>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="data?.type === 'seller' && !sendingBch"
      class="row q-mx-md q-px-md q-pt-sm text-center sm-font-size"
      style="overflow-wrap: break-word;">
        <span> Please release the funds if you have received fiat payment. </span>
    </div>
    <div class="q-mb-sm q-mt-sm">
      <div class="q-mx-md q-px-md">
        <div v-if="data?.type === 'seller'">
          <!-- Errors -->
          <div class="row q-mb-sm" v-if="sendErrors.length > 0">
            <div class="col bg-red-1 text-red q-pa-lg pp-text" style="overflow-x: auto; max-width: 275px">
              <ul style="margin-left: -40px; list-style: none;">
                <li v-for="(error, index) in sendErrors" :key="index">
                  <q-icon name="error" left/>
                  {{ error }}
                </li>
              </ul>
            </div>
          </div>
          <!-- Info messages -->
          <!-- <div v-if="sendingBch" class="sm-font-size">
            <q-spinner class="q-mr-sm"/>{{ $t('SendingBchPleaseWait') }}
          </div> -->
          <!-- <div v-else class="row justify-center sm-font-size" style="overflow-wrap: break-word;">
            <q-icon class="col-auto" size="sm" name="mdi-information-outline" color="blue-6"/>&nbsp;
            <span class="col text-left q-ml-sm">{{ $t('PaymentConfirmationReleaseFundsMsg') }}</span>
          </div> -->
        </div>
      </div>
      <!-- Appeal Button -->
      <div class="row justify-center" v-if="countDown !== null">
        <q-btn
          v-if="!sendingBch"
          flat
          no-caps
          :disable="countDown !== ''"
          :label="appealBtnLabel"
          color="blue-6"
          @click="onOpenAppealForm"
        />
      </div>
    </div>
  </div>
  <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50px">
    <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
  </div>
  <RampDragSlide
  v-if="showDragSlide"
  :key="dragSlideKey"
  :text="dragSlideTitle"
  :locked="lockDragSlide"
  :style="{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1500,
  }"
  @ok="onSecurityOk"
  @cancel="onSecurityCancel"/>
  <AppealForm v-if="showAppealForm" :type="this.data?.type" :order="order" @back="showAppealForm = false"/>
  <AttachmentDialog :show="showAttachmentDialog" :url="attachmentUrl" @back="showAttachmentDialog=false"/>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { loadRampWallet } from 'src/exchange/wallet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { formatCurrency } from 'src/exchange'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import AppealForm from './dialogs/AppealForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AttachmentDialog from 'src/components/ramp/fiat/dialogs/AttachmentDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      wallet: null,
      contractBalance: null,
      order: null,
      txid: null,
      lockedPrice: '',
      isloaded: false,
      countDown: null,
      timer: null,
      paymentMethods: [],
      selectedPaymentMethods: [],
      showDragSlide: true,
      showAppealForm: false,
      dragSlideKey: 0,
      sendingBch: false,
      sendErrors: [],
      showAdSnapshot: false,
      showPeerProfile: false,
      openChat: false,
      peerInfo: {},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      showAttachmentDialog: false,
      attachmentUrl: null
    }
  },
  components: {
    RampDragSlide,
    AppealForm,
    ProgressLoader,
    AttachmentDialog
  },
  emits: ['back', 'verify-release', 'sending'],
  props: {
    data: Object
  },
  watch: {
    sendingBch (val) {
      this.$emit('sending', val)
    }
  },
  computed: {
    appealBtnLabel () {
      if (this.countDown) return this.$t('AppealableInSeconds', { countdown: this.countDown }, `Appealable in ${this.countDown}`)
      return this.$t('SubmitAnAppeal')
    },
    dragSlideTitle () {
      return this.data?.type === 'seller' ? this.$t('ReleaseCrypto') : this.$t('ConfirmPayment')
    },
    lockDragSlide () {
      const vm = this
      let lock = false
      if (vm.data?.type === 'buyer') {
        lock = vm.selectedPaymentMethods.length === 0
      }
      return lock
    },
    fiatAmount () {
      const amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      return this.formatCurrency(amount, this.data.order?.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '')
    }
  },
  async mounted () {
    this.loadData()
  },
  beforeUnmount () {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    formatCurrency,
    isNotDefaultTheme,
    getDarkModeClass,
    loadData () {
      const vm = this
      vm.wallet = loadRampWallet()
      vm.fetchOrderDetail().then((response) => {
        vm.appealCountdown()
        vm.isloaded = true
      })
      vm.fetchContractBalance()
      vm.lockedPrice = this.formatCurrency(vm.data.order?.locked_price, vm.data.order?.ad?.fiat_currency?.symbol)
    },
    dynamicVal (field) {
      if (field.model_ref === 'order') {
        if (field.field_ref === 'id') {
          return this.order.id
        }
        if (field.field_ref === 'tracking_id') {
          return this.order.tracking_id
        }
      }
    },
    viewPaymentAttachment (url) {
      this.showAttachmentDialog = true
      this.attachmentUrl = url
    },
    fetchContractBalance () {
      const vm = this
      if (vm.data?.escrow) {
        vm.data?.escrow.getBalance(vm.data?.contract.address)
          .then(async balance => {
            vm.contractBalance = balance
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    completePayment () {
      const vm = this
      const status = vm.order.status.value
      vm.sendErrors = []
      if (status === 'ESCRW') {
        vm.sendConfirmPayment(vm.data?.type)
      }
      if (status === 'PD_PN') {
        vm.sendConfirmPayment(vm.data?.type)
          .then(data => {
            if (data && data.status.value === 'PD') {
              vm.releaseBch()
            }
          })
      }
      if (status === 'PD') {
        vm.releaseBch()
      }
    },
    sendConfirmPayment (type) {
      return new Promise((resolve, reject) => {
        const vm = this
        const body = {
          payment_methods: this.selectedPaymentMethods
        }
        backend.post(`/ramp-p2p/order/${vm.order.id}/confirm-payment/${type}`, body, { authorize: true })
          .then(response => {
            resolve(response.data)
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
            reject(error)
          })
      })
    },
    async releaseBch () {
      const vm = this
      vm.sendErrors = []
      vm.sendingBch = true
      const feContractAddr = vm.data?.escrow.getAddress()
      const beContractAddr = vm.data?.contract.address
      if (feContractAddr !== beContractAddr) {
        vm.sendErrors.push('contract addresses mismatched')
      }
      const sellerMember = (vm.data?.contract?.members).find(member => { return member.member_type === 'SELLER' })
      const keypair = await this.wallet.keypair(sellerMember.address_path)
      await vm.data?.escrow.release(keypair.privateKey, keypair.publicKey, vm.order.crypto_amount)
        .then(result => {
          if (result.success) {
            const txid = result.txInfo.txid
            const txidData = {
              id: vm.order.id,
              txidInfo: {
                action: 'RELEASE',
                txid: txid
              }
            }
            vm.$store.commit('ramp/saveTxid', txidData)
            vm.$emit('verify-release', txid)
          } else {
            let errorMessage = result.reason
            if (vm.contractBalance > 0 && result.reason.toLowerCase().includes('insufficient funds: available (0)')) {
              errorMessage = 'Possible pending contract UTXO, please try again later.'
            }
            vm.sendErrors = [errorMessage]
            vm.showDragSlide = true
          }
        })
        .catch(error => {
          console.error(error)
        })
      vm.sendingBch = false
    },
    fetchOrderDetail () {
      return new Promise((resolve, reject) => {
        const vm = this
        backend.get(`/ramp-p2p/order/${vm.data.order.id}`, { authorize: true })
          .then(response => {
            vm.order = response.data
            vm.txid = vm.$store.getters['ramp/getOrderTxid'](vm.order.id, 'RELEASE')
            // Find the payment methods of seller
            let orderPaymentTypes = []
            if (vm.order?.payment_methods_selected?.length > 0) {
              orderPaymentTypes = vm.order.payment_methods_selected.map(method => {
                const selected = vm.order.ad.payment_methods.map(admethod => { return admethod.id }).includes(method.id)
                return { ...method, selected: selected }
              })
            } else {
              orderPaymentTypes = vm.order.payment_method_opts.map(method => {
                const selected = vm.order.ad.payment_methods.map(admethod => { return admethod.id }).includes(method.id)
                return { ...method, selected: selected }
              })
            }
            const adPaymentTypes = vm.order.ad.payment_methods.map(method => {
              return { ...method, selected: false }
            })

            if (vm.data.type === 'buyer') {
              if (vm.data?.order?.is_ad_owner) {
                vm.paymentMethods = orderPaymentTypes
              } else {
                vm.paymentMethods = adPaymentTypes
              }
            } else {
              vm.paymentMethods = orderPaymentTypes
            }
            resolve(response)
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
            reject(error)
          })
      })
    },
    selectPaymentMethod (method) {
      if (method.selected) {
        this.selectedPaymentMethods.push(method.id)
      } else {
        const index = this.selectedPaymentMethods.indexOf(method.id)
        if (index > -1) {
          this.selectedPaymentMethods.splice(index, 1)
        }
      }
    },
    onSecurityOk () {
      this.showDragSlide = false
      this.dragSlideKey++
      this.completePayment()
    },
    onSecurityCancel () {
      this.showDragSlide = true
      this.dragSlideKey++
    },
    onOpenAppealForm () {
      this.showAppealForm = true
    },
    appealCountdown () {
      const vm = this
      if (vm.order?.appealable_at) {
        const appealableDate = new Date(vm.order?.appealable_at)
        vm.timer = setInterval(function () {
          const now = new Date().getTime()
          const distance = appealableDate - now

          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          if (hours > 0) vm.countDown = `${hours} hour(s)`
          else if (minutes > 0) vm.countDown = `${minutes} minute(s)`
          else if (seconds > 0) vm.countDown = `${seconds} second(s)`

          if (distance < 0) {
            clearInterval(vm.timer)
            vm.countDown = ''
          }
        }, 1000)
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
  }
}
</script>
<style lang="scss" scoped>
.xs-font-size {
  font-size: smaller;
}
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}

.lg-font-size {
  font-size: large;
}
.subtext {
  opacity: .5;
}
</style>
