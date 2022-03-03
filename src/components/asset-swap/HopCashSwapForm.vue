<template>
  <div>
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
    <div class="row no-wrap justify-around items-center">
      <div class="col-5 column items-center">
        <img
          height="50"
          src="bch-logo.png"
        />
        <div>from</div>
        <div class="text-subtitle1">
          <template v-if="transferType === 'c2s'">Bitcoin Cash</template>
          <template v-else>Smart Bitcoin Cash</template>
        </div>
      </div>

      <q-btn
        rounded
        flat
        padding="sm"
        icon="arrow_forward"
        :disable="lockInputs"
        @click="transferType = transferType === 'c2s' ? 's2c': 'c2s'"
      />

      <div class="col-5 column items-center">
        <img height="50" src="bch-logo.png"/>
        <div>from</div>
        <div class="text-subtitle1">
          <template v-if="transferType === 'c2s'">Smart Bitcoin Cash</template>
          <template v-else>Bitcoin Cash</template>
        </div>
      </div>
    </div>

    <q-form ref="form" @submit="onSwapSubmit()">
      <q-card class="q-mt-sm">
        <q-card-section>
          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              <img height="50" src="bch-logo.png"/>
              <div class="q-ml-sm">
                <div class="text-caption" style="margin-bottom:-10px">You send:</div>
                <div>BCH</div>
              </div>
            </div>
            <q-input
              dense
              outlined
              :disable="lockInputs"
              v-model="amount"
              placeholder="0.0"
              class="q-space q-my-sm"
              :rules="[
                val => Number(val) > 0.01 || 'Must be greater than 0.01'
              ]"
              bottom-slots
            />
          </div>

          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              <img height="50" src="bch-logo.png"/>
              <div class="q-ml-sm">
                <div class="text-caption" style="margin-bottom:-10px">You receive:</div>
                <div>BCH</div>
              </div>
            </div>
            <q-input
              dense
              outlined
              :disable="lockInputs"
              v-model="transferredAmount"
              placeholder="0.0"
              class="q-space q-my-sm"
              bottom-slots
            />
          </div>

          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              Address
            </div>
            <q-input
              dense
              outlined
              readonly
              :value="recipientAddress"
              class="q-space q-my-sm"
              bottom-slots
            />
          </div>
        </q-card-section>
      </q-card>

      <div class="row items-start justify-center q-mt-sm">
        <Loader
          v-if="loading"
        />
        <q-btn
          v-else
          no-caps
          :disable="lockInputs"
          label="Swap"
          color="brandblue"
          class="full-width"
          type="submit"
        />
      </div>
    </q-form>

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
import { getMnemonic, Wallet } from '../../wallet'
import { deductFromFee, s2c, c2s } from '../../wallet/hopcash'
import DragSlide from 'components/drag-slide'
import Loader from 'components/Loader'

import Pin from 'components/pin'
import BiometricWarningAttempt from 'components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const hopCashFee = {
  pctg: 0.001,
  fixed: 0,
}

const paytacaFee = {
  pctg: 0,
  fixed: 0,
}

export default {
  name: 'HopCashSwapForm',
  components: { DragSlide, Pin, BiometricWarningAttempt, Loader },

  data() {
    return {
      wallet: null,

      transferType: 'c2s', // s2c || c2s
      amount: '',
      errors: [],

      lockInputs: false,
      showDragSlide: false,
      loading: false,
      verification: {
        type: '',
        warningAttemptsStatus: 'dismiss',
      }
    }
  },

  computed: {
    transferredAmount: {
      get() {
        const parsedNum = Number(this.amount)
        if (isNaN(parsedNum)) return 0

        const hopCashDeducted = deductFromFee(parsedNum, hopCashFee)
        const paytacaDeducted = deductFromFee(hopCashDeducted, paytacaFee)

        return paytacaDeducted
      },
      set(value) {
        const parsedNum = Number(value)
        if (isNaN(parsedNum)) this.amount = ''

        const reversePaytacaDeducted = deductFromFee(
          parsedNum,
          {
            pctg: 1 - 1/(1-paytacaFee.pctg),
            fixed: -paytacaFee.fixed / (1-paytacaFee.pctg),
          }
        )

        const reverseHopCashDeducted = deductFromFee(
          reversePaytacaDeducted,
          {
            pctg: 1 - 1/(1-hopCashFee.pctg),
            fixed: -hopCashFee.fixed / (1-hopCashFee.pctg),
          }
        )

        this.amount = reverseHopCashDeducted
      }
    },
    recipientAddress() {
      if (!this.wallet) return ''
      if(this.transferType === 'c2s') {
        return this.wallet.sBCH._wallet.address
      }
      return this.$store.getters['global/getAddress']('bch')
    },
  },
  methods: {
    getChangeAddress () {
      return this.$store.getters['global/getChangeAddress']('bch')
    },
    resetForm () {
      this.lockInputs = false
      this.amount = ''
      if (typeof this?.$refs?.form?.resetValidation === 'function') {
        this.$refs.form.resetValidation()
      }
    },
    onSwapSubmit () {
      this.showDragSlide = true
      this.lockInputs = true
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
      if (this.transferType === 'c2s') func = c2s
      if (this.transferType === 's2c') func = s2c

      if (!func) return

      console.log('swapping')
      this.loading = true
      this.lockInputs = true
      func(this.wallet, this.amount, this.recipientAddress, this.getChangeAddress())
        .finally(() => {
          this.errors = []
          this.loading = false
        })
        .then(response => {
          if (response.success) {
            const txid = response.txid || (response.transaction && response.transaction.hash)
            // const txid = 'e07122a6abb43941170b6477c29618fe8d5325e1a4bdbe9012e2940def10faeb'
            this.onSuccessSwap(txid)
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
          this.lockInputs = false
        })
    },

    onSuccessSwap (txid) {
      this.$emit('new-incoming', {
        transferType: this.transferType,
        incomingTxid: txid,
        amount: this.amount,
        expectedAmount: this.transferredAmount,
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
