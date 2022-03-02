<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;">
    <HeaderNav
      title="Hopcash"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-tabs
      dense
      active-color="brandblue"
      class="col-12 q-px-lg"
      v-model="transferType.value"
    >
      <q-tab name="C2S" label="BCH to sBCH" no-caps :disable="transferType.lock"/>
      <q-tab name="S2C" label="sBCH to BCH" no-caps :disable="transferType.lock"/>
    </q-tabs>

    <QrScanner
      v-model="scanner.show"
      :front-camera="scanner.frontCamera"
      @decode="onScannerDecode"
    />

    <div class="q-px-md">
      <div
        v-if="Array.isArray(errors) && errors.length"
        class="q-my-sm q-pa-sm rounded-borders bg-red-2 text-red"
      >
        <ul class="q-my-sm q-pl-lg">
          <li v-for="(error, index) in errors" :key="index">
            {{ error }}
          </li>
        </ul>
      </div>
      <q-form class="q-mt-lg" @submit="submitSwapForm()">
        <div class="row justify-center">
          <div class="col-12">
            <q-btn
              class="full-width btn-scan q-py-xs"
              label="scan qr code"
              icon="qr_code_scanner"
              :disable="formData.disable"
              @click="scanner.show = true"
            />
          </div>
          <div class="col-12 q-mt-lg" style="text-align: center; font-size: 20px;">
            OR
          </div>
          <div class="col-12 q-mt-lg" style="text-align: center;">
            <q-input
              outlined
              bottom-slots
              :disable="formData.disable"
              :readonly="formData.disable"
              v-model="formData.address"
              label="Paste address here"
              :rules="[
                val => validateAddress(val).valid || 'Invalid address',
              ]"
            />
          </div>
        </div>
        <div class="q-mt-sm">
          <q-input
            type="text"
            inputmode="tel"
            :disable="formData.disable"
            :readonly="formData.disable"
            outlined
            v-model="formData.amount"
            label="Amount"
            :rules="[
              val => Number.isFinite(Number(val)) || 'Invalid amount',
              val => Number(val) > 0 || 'Amount most be greater than zero',
            ]"
          />
        </div>
        <div class="q-mt-sm">
          <div v-if="loading" class="row justify-center">
            <Loader/>
          </div>
          <q-btn
            v-else
            type="submit"
            label="Swap"
            :disable="formData.disable"
            :loading="loading"
          />
        </div>
      </q-form>
    </div>

    <DragSlide
      v-if="showDragSlide"
      square
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
        actionType === 'send' ? executeSwap(): null
      }"
    />

    <BiometricWarningAttempt
      :warning-attempts="verification.warningAttemptsStatus"
      @closeBiometricWarningAttempts="verifyBiometric()"
    />
  </div>
</template>
<script>
import { getMnemonic, Wallet, Address } from '../../wallet'
import { decodeEIP681URI } from '../../wallet/sbch'
import { s2c, c2s } from '../../wallet/hopcash'
import HeaderNav from '../../components/header-nav'
import DragSlide from 'components/drag-slide'
import QrScanner from '../../components/qr-scanner.vue'
import Loader from 'components/Loader'

import Pin from 'components/pin'
import BiometricWarningAttempt from 'components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

export default {
  name: 'Hopcash',
  components: { HeaderNav, DragSlide, QrScanner, Loader, Pin, BiometricWarningAttempt, },
  data() {
    return {
      wallet: null,
      transferType: {
        value: 'C2S',
        lock: false,
      },

      scanner: {
        show: false,
        frontCamera: false,
      },

      showDragSlide: false,
      verification: {
        type: '',
        warningAttemptsStatus: 'dismiss',
      },

      loading: false,
      errors: [],
      formData: {
        address: '0x8C5A01ace0EF0aFac314fC18Be47271fb4CB59bB',
        amount: '',

        disable: false,
      }
    }
  },
  methods: {
    getChangeAddress () {
      return this.$store.getters['global/getChangeAddress']('bch')
    },
    onScannerDecode(content) {
      let address = content
      try {
        console.log('Parsing content as eip681')
        const eip6821data = decodeEIP681URI(content)
        address = eip6821data.target_address
      } catch (err) {
        console.log('Failed to parse as eip681 uri')
        console.log(err)
      }
      this.formData.address = address
      this.scanner.show = false
    },

    validateAddress(address) {
      const addressObj = new Address(address)
      let addressIsValid = false
      let formattedAddress
      try {
        if (this.transferType.value === 'C2S') {
          if (addressObj.isSep20Address()) {
            addressIsValid = true
          }
          if (addressIsValid) {
            formattedAddress = addressObj.address
          }
        } else if (this.transferType.value === 'S2C') {
          if (addressObj.isLegacyAddress()) {
            addressIsValid = true
          }
          if (addressObj.isCashAddress()) {
            addressIsValid = true
          }
          if (addressObj.isMainnetCashAddress()) {
            addressIsValid = true
          } else {
            addressIsValid = false
          }
          if (addressIsValid) {
            formattedAddress = addressObj.toCashAddress(address)
          }
        }
      } catch (err) {
        addressIsValid = false
        console.log(err)
      }

      return {
        valid: addressIsValid,
        address: formattedAddress
      }
    },

    submitSwapForm () {
      this.transferType.lock = true
      this.formData.disable = true
      this.showDragSlide = true
    },

    swiped() {
      console.log('swiped')
      this.executeSecurityChecking()
      setTimeout(() => {
        this.showDragSlide = false
      }, 1000)
    },

    openPinVerification () {
      this.verification.type = String(Date.now())
      this.verification.type = 'VERIFY'
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
            this.executeSwap()
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

    executeSwap () {
      console.log('swapping')
      let func = null
      if (this.transferType.value === 'C2S') func = c2s
      if (this.transferType.value === 'S2C') func = s2c
      console.log(func)

      if (!func) return

      console.log('swapping')
      this.loading = true
      func(this.wallet, this.formData.amount, this.formData.address, this.getChangeAddress())
        .finally(() => {
          this.errors = []
          this.loading = false
        })
        .then(response => {
          console.log(response)
          if (response.success) {
            this.alertSwapSuccess()
            return Promise.resolve(response)
          }
          return Promise.reject(response)
        })
        .catch(err => {
          console.log(err)
          let errors = []
          if (err && err.error) {
            if (err.error.indexOf('not enough balance in sender') > -1) {
              errors.push('Not enough balance to cover the send amount and transaction fee')
            } else if (err.error.indexOf('has insufficient priority') > -1) {
              errors.push('Not enough balance to cover the transaction fee')
            } else {
              errors.push(err.error)
            }
          }

          if (!Array.isArray(errors) || !errors.length) this.errors = ['Unknown error occurred']
          else this.errors = errors
        })
    },

    alertSwapSuccess () {
      this.$q.dialog({
        title: 'Swapped',
        message: `Swaped token ${this.formdata.amount} BCH to address: ${this.formData.address}`
      })
    },

    loadWallet () {
      const vm = this
      // Load wallets
      getMnemonic().then(function (mnemonic) {
        vm.wallet = new Wallet(mnemonic, vm.isTestnet)
      })
    }
  },
  mounted () {
    this.loadWallet()
  }
}
</script>
