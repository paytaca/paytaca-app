<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;"
    :class="{'pt-dark': $store.getters['darkmode/getStatus']}"
  >
    <header-nav
      title="Connecta"
      backnavpath="/apps"
      style="position: fixed; top: 0; width: 100%; z-index: 150 !important;"
    />
    <div class="q-my-xl q-py-lg q-px-md">
      <div v-if="!rawPaymentRequest">
        <div v-if="paymentRequestStatus.fetching" class="text-center q-my-lg">
          <q-spinner size="md" color="blue-9"/>
          <div class="pp-text">
            Fetching payment data ...
          </div>
        </div>
        <q-form
          v-else
          ref="orderNumberForm"
          class="q-my-lg q-mx-md"
          @submit="getPaymentRequestFromOrderNumber"
        >
          <div
            v-if="Array.isArray(orderNameForm.errors) && orderNameForm.errors.length"
            class="q-mb-sm q-pa-sm rounded-borders bg-red-2 text-red"
          >
            Unable to get payment details
            <ul class="q-my-sm q-pl-lg">
              <li v-for="(error, index) in orderNameForm.errors" :key="index">
                {{ error }}
              </li>
            </ul>
          </div>
          <q-input
            outlined
            v-model="orderNameForm.orderName"
            label="Order number"
            placeholder="1234"
            mask="####"
            prefix="#"
            hint="Input order number from Connecta"
            class="full-width pp-text"
            :rules="[
              val => Boolean(val) || 'Required',
            ]"
          >
            <template v-slot:append>
              <q-btn
                flat
                padding="xs"
                icon="arrow_forward_ios"
                style="color: #3b7bf6;"
                @click="$refs.orderNumberForm.submit()"
              />
            </template>
          </q-input>
        </q-form>
      </div>

      <div v-else>
        <div v-if="!paymentRequest || !paymentRequest._isValid" class="text-center pp-text">
          Unable to read payment request
        </div>
        <q-card v-else class="q-pa-md" style="background:none">
          <div class="text-h5 pp-text">
            Payment Details
          </div>
          <q-separator class="q-mb-sm"/>

          <div
            v-if="Array.isArray(paymentRequestStatus.errors) && paymentRequestStatus.errors.length"
            class="q-mb-sm q-pa-sm rounded-borders bg-red-2 text-red"
          >
            Failed to execute payment request
            <ul class="q-my-sm q-pl-lg">
              <li v-for="(error, index) in paymentRequestStatus.errors" :key="index">
                {{ error }}
              </li>
            </ul>
          </div>
          <div
            v-else-if="paymentRequest.paymentDetails.isExpired()"
            class="row items-center q-mb-sm q-pa-sm rounded-borders bg-red-2 text-red"
          >
            <span>Payment request is expired</span>
            <q-space/>
            <q-btn
              v-if="merchantData.order.id"
              flat
              no-caps
              :disable="paymentRequestStatus.fetching"
              :loading="paymentRequestStatus.fetching"
              size="sm"
              variant="link"
              class="pp-text"
              label="Refetch"
              @click="fetchPaymentRequest({ orderId: merchantData.order.id })"
            />
          </div>

          <div class="flex q-gutter-sm">
            <div v-if="merchantData.order.name">
              <div class="text-caption pp-text">Order number</div>
              <div class="text-subtitle1 pp-text">{{ merchantData.order.name }}</div>
            </div>
            <div v-if="merchantData.shop.name">
              <div class="text-caption pp-text">Shop name</div>
              <div class="text-subtitle1 pp-text">{{ merchantData.shop.name }} </div>
            </div>
          </div>

          <div v-if="paymentRequest.paymentDetails.memo">
            <div class="text-caption pp-text">Memo</div>
            <div class="text-subtitle1 pp-text">{{ paymentRequest.paymentDetails.memo }}</div>
          </div>

          <q-separator spaced />

          <q-list>
            <q-item-label header class="q-pa-xs pp-text">
              Recipient/s
            </q-item-label>
            <template v-for="(output, index) in paymentRequest.paymentDetails.outputs">
              <q-item :key="index">
                <q-item-section>
                  <q-item-label class="pp-text" caption>Address</q-item-label>
                  <q-item-label class="pp-text" style="word-break:break-word">{{ output.toCashAddress() }}</q-item-label>
                  <q-item-label class="pp-text" caption>Amount</q-item-label>
                  <q-item-label class="pp-text">{{ output.toBCHString() }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator
                v-if="index < paymentRequest.paymentDetails.outputs.length-1"
                :key="`separator-${index}`"
              />
            </template>
          </q-list>
          <q-separator spaced/>
          <div class="text-body1 pp-text">
            <span>Total:</span>
            {{ paymentRequest.paymentDetails.getTotalAmountBCHString() }}
          </div>
          <div v-if="paymentRequestStatus.executing" class="q-mt-md row justify-center">
            <ProgressLoader/>
          </div>
          <div v-else class="q-mt-md row justify-end">
            <q-btn
              v-if="paymentRequestStatus.success"
              no-caps
              disable
              color="green"
              label="Sent"
              icon-right="done"
            />
            <q-btn
              v-else
              no-caps
              :disable="!paymentRequest ||
                !paymentRequest._isValid ||
                !paymentRequest.paymentDetails ||
                paymentRequest.paymentDetails.isExpired() ||
                paymentRequestStatus.fetching
                "
              :loading="paymentRequestStatus.executing || paymentRequestStatus.fetching"
              class="pp-text"
              label="Send"
              @click="showDragSlide = true"
            />
          </div>
        </q-card>

        <DragSlide
          v-if="showDragSlide"
          :style="{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1500,
          }"
          @swiped="swiped"
        />

        <Pin
          :pin-dialog-action="verification.type"
          @nextAction="actionType => {
            verification.type = ''
            actionType === 'send' ? executePaymentRequest(): null
          }"
        />

        <BiometricWarningAttempt
          :warning-attempts="verification.warningAttemptsStatus"
          @closeBiometricWarningAttempts="verifyBiometric()"
        />
      </div>
    </div>

    <q-dialog v-model="paymentRequestStatus.showSuccessDialog">
      <q-card
        flat
        bordered
        class="text-center"
        style="width:90vw;max-width:300px;"
      >
        <q-card-section>
          <div class="q-my-sm text-subtitle1 row justify-center items-center q-gutter-xs">
            <q-icon name="done" color="positive" size="sm"/>
            <span class="pp-text">Transaction Sent!</span>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <footer-menu v-if="!showDragSlide"/>
  </div>
</template>
<script>
import createHmac from 'create-hmac'
import { getMnemonic, Wallet } from '../../../wallet'
import HeaderNav from 'components/header-nav'
import DragSlide from 'components/drag-slide'
import Pin from 'components/pin'
import BiometricWarningAttempt from 'components/authOption/biometric-warning-attempt.vue'
import ProgressLoader from 'components/ProgressLoader'

import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

import { PaymentRequest } from './payment-request'

export default {
  name: 'connecta',
  components: {
    HeaderNav,
    DragSlide,
    Pin,
    BiometricWarningAttempt,
    ProgressLoader
  },
  props: {
    orderId: {},
    paymentRequestData: {
      // test info
      // default: 'eyI0IjogIntcIjJcIjoge1wiMUdTRDVYY2JORXVYdUJlNFRtUEtKVEdGcFJjYTh0SzdWelwiOiBcIjAuMDIxMzMyNzI5NjY1Nzk1MzY5MDg3NjA3MDY5NjlcIn0sIFwiM1wiOiAxNjQyNzQ2MTk0LCBcIjRcIjogMTY0Mjc0NjMxNCwgXCI1XCI6IFwiUmFuZG9tIHN0cmluZ1wiLCBcIjdcIjoge1wicGF5bWVudF9pbnZvaWNlX2lkXCI6IDEsIFwib3JkZXJcIjoge1wiaWRcIjogMzk0NjI1NzcxMTIzNiwgXCJuYW1lXCI6IFwiIzEzNTJcIiwgXCJzaG9wXCI6IHtcImlkXCI6IDIsIFwibmFtZVwiOiBcIlNvbWUgUGFnZVwifX19fSJ9'
      default: ''
    }
  },
  data () {
    return {
      wallet: null,
      rawPaymentRequest: this.paymentRequestData,
      paymentRequestStatus: {
        fetching: false,
        executing: false,
        success: false,
        showSuccessDialog: false,

        errors: [],
      },

      showDragSlide: false,

      verification: {
        type: '',
        warningAttemptsStatus: 'dismiss',
      },

      orderNameForm: {
        errors: [],
        orderName: '',
      }
    }
  },
  computed: {
    paymentRequest() {
      if (!this.rawPaymentRequest) return

      return new PaymentRequest(this.rawPaymentRequest)
    },

    merchantData () {
      const merchantData = {
        order: { id: '', name: '' },
        shop: { id: '', name: '' },
      }

      if (!this.paymentRequest ||
          !this.paymentRequest.paymentDetails ||
          !this.paymentRequest.paymentDetails.merchantData ||
          !this.paymentRequest.paymentDetails.merchantData.order
      )
        return merchantData

      merchantData.order.id = this.paymentRequest.paymentDetails.merchantData.order.id
      merchantData.order.name = this.paymentRequest.paymentDetails.merchantData.order.name

      if (!this.paymentRequest.paymentDetails.merchantData.order.shop)
        return merchantData

      merchantData.shop.id = this.paymentRequest.paymentDetails.merchantData.order.shop.id
      merchantData.shop.name = this.paymentRequest.paymentDetails.merchantData.order.shop.name

      return merchantData
    },
  },
  methods: {
    playSound (success) {
      if (success) {
        const audio = new Audio('/audio/send-success.wav')
        audio.play()
      }
    },

    swiped () {
      console.log('swiped')
      this.executeSecurityChecking()
      setTimeout(() => {
        this.showDragSlide = false
      }, 1000)
    },

    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
    },

    executePaymentRequest () {
      if (!this.paymentRequest || !this.paymentRequest._isValid) return
      if (this.paymentRequest.paymentDetails.isExpired()) return

      const changeAddress = this.getChangeAddress('bch')
      const outputs = this.paymentRequest.paymentDetails.outputs.map(output => {
        return {
          address: output.toCashAddress(),
          amount: output.toBCH(),
        }
      })

      this.paymentRequestStatus.executing = true
      this.wallet.BCH.sendBchMultiple(outputs, changeAddress)
        .finally(() => {
          this.paymentRequestStatus.executing = false
          this.paymentRequestStatus.errors = []
        })
        .then(result => {
          if (!result.success) return Promise.reject(result)
          this.playSound(true)

          this.paymentRequestStatus.success = true
          this.paymentRequestStatus.showSuccessDialog = true

          if (result.txid) {
            this.sendPaymentRequestResponse([result.txid])
          }
          return Promise.resolve(result)
        })
        .catch(err => {
          console.log('error encountered')
          console.log(err)
          let errors = []

          if (err.error) {
            if (err.error.indexOf('not enough balance in sender') > -1) {
              errors.push('Not enough balance to cover the send amount and transaction fee')
            } else if (err.error.indexOf('has insufficient priority') > -1) {
              errors.push('Not enough balance to cover the transaction fee')
            } else {
              errors.push(err.error)
            }
          }

          if (!Array.isArray(errors) || !errors.length) this.paymentRequestStatus.errors = ['Unknown error occurred']
          else this.paymentRequestStatus.errors = errors
        })
    },

    sendPaymentRequestResponse (txids) {
      // payload is currently not following BIP70 protocol
      if (!Array.isArray(txids) || !txids.length) return
      if (!this.paymentRequest || !this.paymentRequest.paymentDetails) return

      const data = {
        payment_invoice_id: this.paymentRequest.paymentDetails.merchantData.payment_invoice_id,
        transaction_ids: txids,
      }

      const headers = {}
      const secret = process.env.CONNECTA_WEBHOOK_SHARED_SECRET || ''
      const headerName = 'X-Paytaca-Webhook-Hmac-Sha256'
      const hmac = createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex')
      headers[headerName] = hmac

      const url = this.paymentRequest.paymentDetails.paymentUrl ||
                'v1/paytaca/webhooks/tx_update/'

      this.$connectaAxios.post(url, data, { headers })
        .then(() => {
          this.$q.notify({
            message: 'Payment acknowledged',
            color: 'green-5',
            icon: 'mdi-check-circle'
          })
        })
        .catch(err => {
          console.warn('error in sending payment to merchant server')
          console.warn(err)
        })
    },

    openPinVerification () {
      this.verification.type = String(Date.now())
      this.verification.type = 'VERIFY'
    },

    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          setTimeout(() => {
            this.executePaymentRequest()
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          this.verification.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.verification.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        }
        )
    },

    executeSecurityChecking () {
      SecureStoragePlugin.get({ key: 'pin' })
        .then(() => {
          setTimeout(() => {
            if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
              this.openPinVerification()
            } else {
              this.verifyBiometric()
            }
          }, 500)
        })
    },

    getPaymentRequestFromOrderNumber() {
      return this.fetchPaymentRequest({orderName: `#${this.orderNameForm.orderName}`})
    },

    fetchPaymentRequest({orderId = '', orderName = ''}) {
      const params = {}
      if (orderId) params.order_id = orderId
      else if(orderName) params.order_name = orderName

      this.paymentRequestStatus.fetching = true
      this.$connectaAxios
        .get(
          'v1/paytaca/get_payment_link',
          { params: params }
        )
        .finally(() => {
          this.paymentRequestStatus.fetching = false
          this.orderNameForm.errors = []
        })
        .then(response => {
          if (response.data && response.data.link) {
            const url = new URL(response.data.link)
            const paymentRequestB64 = url.searchParams.get('d')
            if (paymentRequestB64) {
              this.rawPaymentRequest = paymentRequestB64
              return Promise.resolve()
            }
          }
          return Promise.reject({ response: { data: { detail: 'Payment details not found' } } })
        })
        .catch(err => {
          let errors = []
          if (err && err.response && err.response.status) errors = ["Order not found"]
          if (err && err.response && err.response.data && err.response.data.detail) {
            if (Array.isArray(err.response.data.detail) && err.response.data.detail.length)
              errors = err.response.data.detail
            else
              errors = [err.response.data.detail]
          }

          if (!Array.isArray(errors) || !errors.length) errors = ['Unknown exception occured']
          this.orderNameForm.errors = errors
        })
    },

    loadWallet () {
      getMnemonic().then((mnemonic) => {
        const wallet = new Wallet(mnemonic)
        wallet.sBCH.getOrInitWallet()
          .then(() => {
            this.wallet = wallet
          })
      })
    }
  },

  mounted () {
    this.loadWallet()
    if (this.orderId) this.fetchPaymentRequest({ orderId: this.orderId })
  }
}
</script>

<style>
.pp-text {
  color: #000 !important;
}
</style>
