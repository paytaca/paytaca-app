<template>
  <div>
    <div
      v-if="Array.isArray(errors) && errors.length"
      class="q-my-sm q-pa-sm rounded-borders bg-red-2 text-red"
    >
      <ul class="q-my-sm q-pl-lg">
        <li :class="[darkMode ? 'pt-dark-label' : 'pp-text']" v-for="(error, index) in errors" :key="index">
          {{ error }}
        </li>
      </ul>
    </div>
    <div class="row no-wrap justify-around items-baseline">
      <div class="col-5 column items-center">
        <img
          height="40"
          src="bch-logo.png"
        />
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">from</div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
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
        :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
        @click="transferType = transferType === 'c2s' ? 's2c': 'c2s'"
      />

      <div class="col-5 column items-center">
        <img height="40" src="bch-logo.png"/>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">to</div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          <template v-if="transferType === 'c2s'">Smart Bitcoin Cash</template>
          <template v-else>Bitcoin Cash</template>
        </div>
      </div>
    </div>

    <q-form ref="form" @submit="onSwapSubmit()">
      <q-card class="q-mt-sm" :class="{'pt-dark-card': darkMode}">
        <q-card-section>
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
            <span>Bridge balance:</span>
            <q-btn
              padding="xs sm"
              flat
              :disable="lockInputs"
              :label="maxBridgeBalance + ' BCH'"
              :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
              @click="amount = maxBridgeBalance"
            />
          </div>
          <div>
            <span :class="[darkMode ? 'pt-dark-label' : 'pp-text']">Wallet balance:</span>
            <q-btn
              padding="xs sm"
              flat
              :disable="lockInputs"
              :label="sourceTransferBalance + ' BCH'"
              :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
              @click="amount = sourceTransferBalance"
            />
          </div>
          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              <img height="40" src="bch-logo.png"/>
              <div class="q-ml-sm">
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="text-caption" style="margin-bottom:-6px">You send:</div>
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">BCH</div>
              </div>
            </div>
            <CustomKeyboardInput
              v-model="amount"
              :fieldProps="{
                dense: true,
                outlined: true,
                dark: darkMode,
                disable: lockInputs || maxBridgeBalance === 0,
                rules: [
                  val => Number(val) >= 0.01 || 'Must be atleast 0.01',
                  val => Number(val) <= maxBridgeBalance || 'Amount must be less than bridge\'s balance',
                ],
              }"
              class="q-space q-my-sm"
            />
            <!-- <q-input
              dense
              outlined
              :disable="lockInputs"
              v-model="amount"
              placeholder="0.0"
              class="q-space q-my-sm"
              :rules="[
                val => Number(val) > 0.01 || 'Must be greater than 0.01',
                val => Number(val) <= maxBridgeBalance || 'Amount must be less than bridge\'s balance',
              ]"
              bottom-slots
            /> -->
          </div>

          <div class="row no-wrap items-start" style="margin-top: -10px;">
            <div class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              <img height="40" src="bch-logo.png"/>
              <div class="q-ml-sm">
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="text-caption" style="margin-bottom:-6px">You receive:</div>
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']">BCH</div>
              </div>
            </div>
            <CustomKeyboardInput
              v-model="transferredAmount"
              :fieldProps="{
                dense: true,
                outlined: true,
                dark: darkMode,
                disable: maxBridgeBalance === 0,
                bottomSlots: true,
              }"
              class="q-space q-my-sm"
            />
            <!-- <q-input
              dense
              outlined
              :disable="lockInputs"
              v-model="transferredAmount"
              placeholder="0.0"
              class="q-space q-my-sm"
              bottom-slots
            /> -->
          </div>

          <div class="row no-wrap items-start" style="margin-top: -10px;">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row items-center no-wrap q-my-sm" style="min-width:130px;max-width:150px;">
              Address
            </div>
            <q-input
              v-if="manualAddress"
              key="manualRecipient"
              autogrow
              clearable
              dense
              outlined
              :disable="lockInputs"
              v-model="recipientAddress"
              class="q-space q-my-sm "
              :rules="[
                val => validateAddress(val) || 'Invalid address',
              ]"
            />
            <q-input
              v-else
              key="defaultRecipient"
              autogrow
              dense
              outlined
              readonly
              :dark="darkMode"
              :value="defaultRecipientAddress"
              class="q-space q-my-sm"
              bottom-slots
            />
          </div>
          <div v-if="!loading" class="row justify-end items-start">
            <q-btn
              v-if="manualAddress"
              no-caps
              padding="xs sm"
              label="Scan QR code"
              :disable="lockInputs"
              @click="showQrScanner = true"
            />
          </div>
          <div v-if="!loading" class="row justify-end items-start">
            <q-space />
            <q-toggle
              dense
              v-model="manualAddress"
              :class="[darkMode ? 'pt-dark-label' : 'pp-text']"
              label="Send to another address"
            />
          </div>

          <q-separator spaced/>
          <div v-if="!loading" class="q-pa-sm rounded-borders">
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
              <span>BCH to send:</span>
              <span class="text-nowrap q-ml-xs">{{ amount || 0 }} BCH</span>
            </div>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
              <span>
                Estimated fees:
                <q-icon :name="showSplitFees ? 'expand_less' : 'expand_more'"/>
              </span>
              <span v-if="!showSplitFees" class="text-nowrap q-ml-xs">
                ~{{ (fees.paytaca + fees.hopcash) | formatAmount }} BCH
              </span>
            </div>
            <q-slide-transition>
              <div v-if="showSplitFees">
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-pl-sm">
                  <span>Paytaca:</span>
                  <span class="text-nowrap q-ml-xs">~{{ fees.paytaca | formatAmount }} BCH</span>
                </div>
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-pl-sm">
                  <span>Hopcash:</span>
                  <span class="text-nowrap q-ml-xs">~{{ fees.hopcash | formatAmount }} BCH</span>
                </div>
              </div>
            </q-slide-transition>
            <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
              <span>BCH to receive:</span>
              <span class="text-nowrap q-ml-xs">~{{ transferredAmount | formatAmount }} BCH</span>
            </div>
          </div>
          <div class="row justify-center" style="color: gray;">Powered by hop.cash</div>
        </q-card-section>
      </q-card>

      <div class="row items-start justify-center q-mt-sm" style="margin-top: 15px;">
        <ProgressLoader
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
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />

    <BiometricWarningAttempt
      :warning-attempts="verification.warningAttemptsStatus"
      @closeBiometricWarningAttempts="verifyBiometric()"
    />
  </div>
</template>
<script>
import { throttle } from 'quasar'
import { getMnemonic, Wallet, Address } from '../../wallet'
import { deductFromFee, s2c, c2s, smart2cashMax, cash2smartMax } from '../../wallet/hopcash'
import CustomKeyboardInput from 'components/CustomKeyboardInput.vue'
import QrScanner from 'components/qr-scanner.vue'
import DragSlide from 'components/drag-slide'
import ProgressLoader from 'components/ProgressLoader'

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
  components: { CustomKeyboardInput, QrScanner, DragSlide, Pin, BiometricWarningAttempt, ProgressLoader },
  props: {
    darkMode: Boolean
  },
  filters: {
    formatAmount (value) {
      const parsedNum = Number(value)
      if (isNaN(parsedNum)) return ''
      return Number(parsedNum.toFixed(6))
    }
  },

  data () {
    return {
      wallet: null,

      transferType: 'c2s', // s2c || c2s
      amount: '',
      manualAddress: false,
      recipientAddress: '',
      errors: [],

      bridgeBalances: {
        bch: 0,
        sbch: 0
      },

      showSplitFees: false,
      showQrScanner: false,
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
    maxBridgeBalance () {
      let balance = 0
      if (this.transferType === 'c2s') balance = this.bridgeBalances.sbch
      if (this.transferType === 's2c') balance = this.bridgeBalances.bch
      balance = Number(balance)
      if (isNaN(balance)) return 0
      return Number(balance.toFixed(6))
    },
    sourceTransferBalance() {
      let balance = 0
      if (this.transferType === 'c2s') balance = this.bchBalance
      if (this.transferType === 's2c') balance = this.sbchBalance
      balance = Number(balance)
      if (isNaN(balance)) return 0
      return Number(balance.toFixed(6))
    },
    bchBalance () {
      return this.$store.getters['assets/getAsset']('bch')[0].balance
    },
    sbchBalance () {
      return this.$store.getters['sep20/getAsset']('bch')[0].balance
    },
    fees() {
      const parsedNum = Number(this.amount)
      if (isNaN(parsedNum)) return 0

      const paytacaDeducted = deductFromFee(parsedNum, paytacaFee)
      const hopCashDeducted = deductFromFee(paytacaDeducted, hopCashFee)

      return {
        paytaca: Number((parsedNum - paytacaDeducted).toFixed(16)),
        hopcash: Number((paytacaDeducted - hopCashDeducted).toFixed(16)),
      }
    },
    transferredAmount: {
      get() {
        const parsedNum = Number(this.amount)
        if (isNaN(parsedNum)) return 0

        const paytacaDeducted = deductFromFee(parsedNum, paytacaFee)
        const hopCashDeducted = deductFromFee(paytacaDeducted, hopCashFee)

        return Number(hopCashDeducted.toFixed(8))
      },
      set(value) {
        const parsedNum = Number(value)
        if (isNaN(parsedNum)) this.amount = ''

        const reverseHopCashDeducted = deductFromFee(
          parsedNum,
          {
            pctg: 1 - 1/(1-hopCashFee.pctg),
            fixed: -hopCashFee.fixed / (1-hopCashFee.pctg),
          }
        )

        const reversePaytacaDeducted = deductFromFee(
          reverseHopCashDeducted,
          {
            pctg: 1 - 1/(1-paytacaFee.pctg),
            fixed: -paytacaFee.fixed / (1-paytacaFee.pctg),
          }
        )

        this.amount = Number(reversePaytacaDeducted.toFixed(8))
      }
    },
    defaultRecipientAddress() {
      if (!this.wallet) return ''
      if(this.transferType === 'c2s') {
        return this.wallet.sBCH._wallet.address
      }
      return this.$store.getters['global/getAddress']('bch')
    },
  },
  methods: {
    validateAddress(address) {
      const addressObj = new Address(address)
      let valid = false
      if (this.transferType === 'c2s') valid = addressObj.isSep20Address()
      if (this.transferType === 's2c') {
        try {
          valid = addressObj.isLegacyAddress() || addressObj.isCashAddress()
        } catch {
          valid = false
        }
      }
      return valid
    },
    getChangeAddress () {
      return this.$store.getters['global/getChangeAddress']('bch')
    },
    onScannerDecode(content) {
      this.showQrScanner = false
      if (!this.validateAddress(content)) {
        this.$q.notify('Invalid address')
      } else {
        this.manualAddress = true
        this.recipientAddress = content
      }
    },
    updateBridgeBalances: throttle(function(all=false) {
      if (this.transferType === 'c2s' || all) {
        cash2smartMax()
          .then(({ balance, success }) => {
            if (!success) return
            this.bridgeBalances.sbch = balance
          })
      }
      if (this.transferType === 's2c' || all) {
        smart2cashMax()
          .then(({ balance, success }) => {
            if (!success) return
            this.bridgeBalances.bch = balance
          })
      }
    }, 5000),
    updateWalletBalance: throttle(function(all=false) {
      const id = 'bch'
      if (this.transferType === 'c2s' || all) {
        this.wallet.BCH.getBalance().then((response) => {
          this.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance
          })
        })
      }
      if (this.transferType === 's2c') {
        this.wallet.sBCH.getBalance()
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            this.$store.commit(commitName, {
              id: id,
              balance: balance
            })
          })
      }
    }, 5000),
    resetForm () {
      this.lockInputs = false
      this.amount = ''
      this.manualAddress = false
      this.recipientAddress = ''
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
        .catch(() => {
          setTimeout(() => {
            this.verifyBiometric()
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
      let recipientAddress = this.manualAddress
        ? this.recipientAddress
        : this.defaultRecipientAddress
      func(this.wallet, this.amount, recipientAddress, 0, this.getChangeAddress())
        .finally(() => {
          this.errors = []
          this.loading = false
        })
        .then(response => {
          if (response.success) {
            const txid = response.txid || (response.transaction && response.transaction.hash)
            // const txid = this.transferType === 'c2s'
            //   ? 'e07122a6abb43941170b6477c29618fe8d5325e1a4bdbe9012e2940def10faeb'
            //   : '0xdd879c7c9695ff81c5b952dc2237a3792bdddcd3d9092bf3835f0b5bfb804ef2'
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
      return getMnemonic().then(function (mnemonic) {
        const wallet = new Wallet(mnemonic)
        return wallet.sBCH.getOrInitWallet()
          .then(() => {
            vm.wallet = wallet
          })
      })
    }
  },

  watch: {
    transferType() {
      this.updateBridgeBalances()
    }
  },

  mounted () {
    this.loadWallet()
      .then(() => {
        this.updateWalletBalance(true)
      })
    this.updateBridgeBalances(true)
  }
}
</script>
<style scoped>
.text-nowrap {
  white-space: nowrap;
}
.text-subtitle1 {
  font-size: 14px;
}
.pp-text {
  color: #000 !important;
}
</style>
