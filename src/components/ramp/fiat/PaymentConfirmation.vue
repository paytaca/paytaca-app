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
          <div v-if="data?.contract.address">
            <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink)"/>
            <q-icon size="sm" name='o_content_copy' color="blue-grey-6" @click="copyToClipboard(data?.contract.address)"/>
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
        <span v-if="data?.type === 'buyer'">{{ order.is_cash_in ? 'You selected this payment method' : $t('SelectPaymentMethod') }}</span>
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
                  <div class="col">
                    <div class="row">
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
                      <div v-if="data?.type !== 'seller'">
                        <q-checkbox v-model="method.selected" @click="order.is_cash_in ? '' : selectPaymentMethod(method, index)" :dark="darkMode" :disable="order.is_cash_in"/>
                      </div>
                    </div>
                    <div v-if="method.attachments?.length > 0" class="row">
                      <q-btn
                        flat dense no-caps
                        icon="image"
                        class="row button button-text-primary q-my-none q-py-none"
                        label="View Proof of Payment"
                        style="font-size: small;"
                        @click="viewPaymentAttachment(method.attachments[0].image?.url)"/>
                    </div>
                    <div v-else>
                      <span v-if="hasUploadingMsg" class="text-primary">Uploading Proof of Payment <q-icon name="refresh" color="primary" size="xs" @click="$emit('refresh')"/></span>
                    </div>
                    <div v-if="data?.type !== 'seller'" class="row">
                      <q-btn
                        v-if="!!method.attachment"
                        flat dense
                        icon="cancel"
                        size="sm"
                        color="red"
                        @click="cancelAttachment(method)"/>
                      <q-btn
                        flat dense no-caps no-wrap
                        class="row button button-text-primary q-my-none q-py-none"
                        style="font-size: small;"
                        :disable="!method.selected"
                        @click="onClickUpload(index)">
                        <!-- <template v-slot:prepend> -->
                          <q-icon v-if="!method.attachment" name="upload" class="q-mr-sm"/>
                          <span style="max-width: 200px; overflow-x: scroll; text-align: left;">
                            {{ method.attachment?.name || 'Upload Proof of Payment' }}
                          </span>
                        <!-- </template> -->
                      </q-btn>
                      <q-file
                        ref="filePickerRef"
                        :max-file-size="maxFileSize"
                        clearable
                        accept="image/jpg, image/png, image/jpeg"
                        dense
                        color="blue-12"
                        label="Upload Proof of Payment"
                        style="display: none"
                        v-model="method.attachment"
                        @update:model-value="onSelectAttachment(index, method.id)"
                        @rejected="onRejectedFilePick">
                        <template v-slot:prepend>
                          <q-icon name="upload" />
                        </template>
                      </q-file>
                    </div>
                  </div>
                </q-card>
              </q-expansion-item>
              <div v-if="data?.type === 'buyer'">
                <q-banner class="bg-primary text-white text-center" v-if="method.selected && !method.attachment">
                  <span class="sm-font-size">Please upload Proof of Payment first before you proceed</span>
                </q-banner>
              </div>
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
          :loading="loadAppealButton"
          flat
          no-caps
          :disable="countDown !== '' || loadAppealButton"
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
  v-touch-swipe.mouse="checkDragslideStatus"
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
  @click="checkDragslideStatus()"
  @ok="onSecurityOk"
  @cancel="onSecurityCancel"/>
  <AppealForm v-if="showAppealForm" :userType="this.data?.type" :order="order" @back="showAppealForm = false" @loadAppeal="loadAppealButton = true; showDragSlide = false"/>
  <AttachmentDialog :show="showAttachmentDialog" :url="attachmentUrl" @back="showAttachmentDialog=false"/>
  <NoticeBoardDialog v-if="showNoticeDialog" :type="'info'" action="'orders'" :message="noticeMessage" @hide="showNoticeDialog = false"/>
</template>
<script>
import { ref } from 'vue'
import { bus } from 'src/wallet/event-bus.js'
import { openURL } from 'quasar'
import { wallet } from 'src/exchange/wallet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/exchange/backend'
import { bchToFiat, formatCurrency, satoshiToBch } from 'src/exchange'
import RampDragSlide from './dialogs/RampDragSlide.vue'
import AppealForm from './dialogs/AppealForm.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import AttachmentDialog from 'src/components/ramp/fiat/dialogs/AttachmentDialog.vue'
import NoticeBoardDialog from './dialogs/NoticeBoardDialog.vue'

export default {
  setup () {
    const filePickerRef = ref(null)
    return {
      filePickerRef
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      contractBalance: null,
      order: null,
      txid: null,
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
      attachmentUrl: null,
      loadAppealButton: false,
      errorDialogActive: false,
      showNoticeDialog: false
    }
  },
  components: {
    RampDragSlide,
    AppealForm,
    ProgressLoader,
    AttachmentDialog,
    NoticeBoardDialog
  },
  emits: ['back', 'verify-release', 'sending', 'refresh'],
  props: {
    data: Object
  },
  watch: {
    sendingBch (val) {
      this.$emit('sending', val)
    }
  },
  computed: {
    maxFileSize () {
      return 5 * 1024 * 1024
    },
    hasUploadingMsg () {
      const status = this.order.status.value
      return status !== 'ESCRW' && status !== 'PD_PN'
    },
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
        if (!lock) {
          for (let i = 0; i < vm.selectedPaymentMethods.length; i++) {
            if (!vm.selectedPaymentMethods[i].attachment) {
              lock = true
              break
            }
          }
        }
      }
      return lock
    },
    fiatAmount () {
      const amount = bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
      return this.formatCurrency(amount, this.data.order?.ad?.fiat_currency?.symbol).replace(/[^\d.,-]/g, '')
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    explorerLink () {
      let url = ''

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/address/'
      } else {
        url = 'https://blockchair.com/bitcoin-cash/address/'
      }
      return `${url}${this.data?.contract.address}`
    },
    noticeMessage () {
      return 'Please select Payment Method and upload your Proof of Payment first to proceed with the transaction'
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
    openURL,
    async loadData () {
      const vm = this
      await vm.fetchOrderDetail()
      vm.appealCountdown()
      vm.isloaded = true
      vm.fetchContractBalance()
    },
    checkDragslideStatus () {
      if (this.lockDragSlide) {
        this.showNoticeDialog = true
      }
    },
    cancelAttachment (method) {
      method.attachment = null
      const index = this.selectedPaymentMethods.map(e => e.id).indexOf(method.id)
      if (index > -1) {
        this.selectedPaymentMethods[index].attachment = null
      }
    },
    onClickUpload (index) {
      this.$refs.filePickerRef[index].pickFiles()
    },
    onRejectedFilePick (rejectedEntries) {
      let message = 'File did not pass validation constraints'
      if (rejectedEntries.length > 0 && rejectedEntries[0]?.failedPropValidation === 'max-file-size') {
        message = 'File size should not exceed 5MB'
      }
      this.$q.notify({
        type: 'negative',
        message: message
      })
    },
    onSelectAttachment (methodIndex, methodId) {
      const index = this.selectedPaymentMethods.map(e => e.id).indexOf(methodId)
      this.selectedPaymentMethods[index].attachment = this.paymentMethods[methodIndex].attachment
    },
    async uploadAttachments (orderPaymentMethods) {
      this.selectedPaymentMethods.forEach(async paymentMethod => {
        const index = orderPaymentMethods.map(e => e.payment_method).indexOf(paymentMethod.id)
        console.log(`Uploading ${orderPaymentMethods[index].id}: ${paymentMethod.attachment.name}`)
        const formData = new FormData()
        formData.append('image', paymentMethod.attachment)
        await this.uploadAttachment(formData, orderPaymentMethods[index].id)
      })
      await this.fetchOrderDetail()
    },
    async uploadAttachment (formdata, orderPaymentId) {
      await backend.post(
        `/ramp-p2p/order/payment/${orderPaymentId}/attachment/`,
        formdata, { headers: { 'Content-Type': 'multipart/form-data' }, authorize: true })
        .then(response => {
          console.log(response.data)
        })
        .catch(error => {
          console.error(error.response || error)
        })
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
        vm.data?.escrow.getBalance(vm.data?.contract.address, true)
          .then(balance => {
            vm.contractBalance = balance
          })
          .catch(error => {
            console.error(error)
          })
      }
    },
    async completePayment () {
      const vm = this
      const status = vm.order.status.value
      vm.sendErrors = []
      try {
        switch (status) {
          case 'ESCRW': {
            const resp = await vm.sendConfirmPayment(vm.data?.type)
            vm.uploadAttachments(resp.order_payment_methods)
            break
          }
          case 'PD_PN': {
            const resp = await vm.sendConfirmPayment(vm.data?.type)
            if (resp?.status?.value === 'PD') {
              vm.releaseBch()
            }
            break
          }
          case 'PD':
            vm.releaseBch()
            break
        }
      } catch (error) {
        console.error(error)
        vm.sendErrors.push(error)
      }
    },
    async sendConfirmPayment (type) {
      const vm = this
      const selectedPaymentMethodIds = vm.selectedPaymentMethods.map(e => e.id)
      const body = {
        payment_methods: selectedPaymentMethodIds
      }
      const response = await backend.post(`/ramp-p2p/order/${vm.order.id}/confirm-payment/${type}/`, body, { authorize: true })
        .catch(error => {
          this.showErrorDialog(error)
        })
      return response.data
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
      const keypair = wallet.keypair(sellerMember.address_path)
      await vm.data?.escrow.release(keypair.privateKey, keypair.publicKey, vm.order.trade_amount)
        .then(result => {
          console.log(result)
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
            if (vm.contractBalance > 0 && result?.reason?.toLowerCase()?.includes('insufficient funds: available (0)')) {
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
    async fetchOrderDetail () {
      const vm = this
      await backend.get(`/ramp-p2p/order/${vm.data.order.id}/`, { authorize: true })
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

            if (vm.data?.order?.is_cash_in) {
              vm.paymentMethods = orderPaymentTypes
              vm.selectedPaymentMethods = orderPaymentTypes
            }
          } else {
            vm.paymentMethods = orderPaymentTypes
          }
        })
        .catch(error => {
          this.showErrorDialog(error)
        })
    },
    selectPaymentMethod (method, methodIndex) {
      if (method.selected) {
        this.selectedPaymentMethods.push({ id: method.id })
      } else {
        const index = this.selectedPaymentMethods.map(e => e.id).indexOf(method.id)
        if (index > -1) {
          this.selectedPaymentMethods.splice(index, 1)
          this.paymentMethods[methodIndex].attachment = null
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
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    },
    showErrorDialog (error) {
      console.error(error)
      const message = 'An unexpected error has occured'
      if (!this.errorDialogActive) {
        this.errorDialogActive = false
        this.$q.notify({
          type: 'warning',
          message: message,
          position: 'bottom',
          timeout: 5000,
          onDismiss: () => {
            this.errorDialogActive = false
          }
        })
      }
    }
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
.tooltipcard {
  background: grey;
  opacity: 10%;
}
</style>
