<template>
  <q-dialog
    persistent
    seamless
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
        <span class="text-h6">Redeem Points</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row q-mt-sm">
        <span class="full-width text-subtitle1 q-mb-sm">
          Enter points to be converted to BCH.
        </span>
        <span>
          <strong>Rate:</strong> 1 {{ pointsType.toUpperCase() }} = {{ singlePointConversion }}
        </span>
      </div>

      <div class="q-mt-md q-mb-sm">
        <q-input
          ref="points-input"
          type="text"
          inputmode="none"
          @focus="customKeyboardState = 'show'"
          filled
          v-model="pointsToRedeem"
          :label="$t('Amount')"
          :dark="darkMode"
          :error="pointsToRedeem > points"
          :error-message="$t('BalanceExceeded')"
        >
          <template v-slot:append>
            <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
              {{ pointsType.toUpperCase() }}
            </div>
          </template>
        </q-input>
      </div>

      <div class="row justify-between q-mb-sm q-mx-sm">
        <span>{{ pointsBalance }} {{ pointsType.toUpperCase() }}</span>
        <span
          class="max-button text-grad"
          :class="getDarkModeClass(darkMode)"
          @click="onMaxClick"
        >
          {{ $t('MAX') }}
        </span>
      </div>

      <div class="text-body1 q-mb-sm">
        <span>You will receive:</span><br/>
        <span class="row q-ml-md">
          {{ pointsConvertion }}
        </span>
      </div>

      <div class="row full-width justify-evenly">
        <template v-if="isSending">
          <progress-loader
            :color="isNotDefaultTheme(theme) ? theme : 'pink'"
            :isTight="true"
            class="q-mb-md"
          />
        </template>
        <template v-else>
          <q-btn
            rounded
            outline
            class="button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            :label="$t('Cancel')"
            v-close-popup
          />
          <q-btn
            rounded
            class="button"
            :label="$t('Redeem')"
            :disable="pointsBalance < 0 || Number(pointsToRedeem) === 0"
            @click="executeSecurityChecking"
          />
        </template>
      </div>
    </q-card>

    <custom-keyboard
      :custom-keyboard-state="customKeyboardState"
      v-on:addKey="setAmount"
      v-on:makeKeyAction="makeKeyAction"
    />

    <pin-dialog
      v-model:pin-dialog-action="pinDialogAction"
      v-on:nextAction="onSecurityCheckSuccess"
    />

    <biometric-warning-attempt :warning-attempts="warningAttemptsStatus" />
  </q-dialog>
</template>

<script>
import { NativeBiometric } from 'capacitor-native-biometric'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import {
  convertPoints,
  getKeyPairFromWalletMnemonic,
  getWalletTokenAddress,
  processPointsRedemption
} from 'src/utils/engagementhub-utils/rewards'
import { parseKey } from 'src/utils/custom-keyboard-utils'
import { raiseNotifyError, getWallet } from 'src/utils/send-page-utils'

import CustomKeyboard from 'src/pages/transaction/dialog/CustomKeyboard.vue'
import BiometricWarningAttempt from 'src/components/authOption/biometric-warning-attempt.vue'
import PinDialog from 'src/components/pin/index.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

import PromoContract from 'src/utils/rewards-utils/contracts/PromoContract'

export default {
  name: 'RedeemPointsDialog',

  props: {
    points: { type: Number, default: 0 },
    pointsType: { type: String, default: '' },
    pointsDivisor: { type: Number, default: 0 },
    promoId: { type: Number, default: -1 },
    address: { type: String, default: '' }
  },

  components: {
    CustomKeyboard,
    BiometricWarningAttempt,
    PinDialog,
    ProgressLoader
  },

  data () {
    return {
      pointsToRedeem: '0',
      customKeyboardState: 'dismiss',
      pointsBalance: 0,
      isSecurityCheckSuccess: false,
      warningAttemptsStatus: 'dismiss',
      pinDialogAction: '',
      isSending: false,
      contract: null
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    singlePointConversion () {
      return convertPoints(1, this.pointsDivisor)
    },
    pointsConvertion () {
      return convertPoints(Number(this.pointsToRedeem), this.pointsDivisor)
    }
  },

  async mounted () {
    this.computeBalance()
    const keyPair = await getKeyPairFromWalletMnemonic()
    this.contract = new PromoContract(this.pointsType, keyPair.pubKey)
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    computeBalance () {
      this.pointsBalance = this.points - Number(this.pointsToRedeem)
    },
    onMaxClick () {
      this.pointsToRedeem = '' + this.points
      this.computeBalance()
    },
    setAmount (key) {
      const vm = this

      const currentPoints = vm.pointsToRedeem
      const currentCaret = vm.$refs['points-input'].nativeEl.selectionStart

      vm.$refs['points-input'].nativeEl.focus({ focusVisible: true })
      vm.pointsToRedeem = parseKey(key, currentPoints, currentCaret, null)
      vm.computeBalance()
    },
    makeKeyAction (action) {
      const vm = this

      if (action === 'backspace') {
        vm.$refs['points-input'].nativeEl.focus({ focusVisible: true })
        try {
          vm.pointsToRedeem = vm.pointsToRedeem.slice(0, -1)
        } catch {
          vm.pointsToRedeem = 0
        }
        if (vm.pointsToRedeem.length === 0) vm.pointsToRedeem = '0'
      } else if (action === 'delete') {
        vm.$refs['points-input'].nativeEl.focus({ focusVisible: true })
        vm.pointsToRedeem = '0'
      } else vm.customKeyboardState = 'dismiss'

      vm.computeBalance()
    },
    executeSecurityChecking () {
      const vm = this

      if (!vm.isSecurityCheckSuccess) {
        setTimeout(() => {
          if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
            vm.pinDialogAction = 'VERIFY'
          } else vm.verifyBiometric()
        }, 500)
      } else {
        vm.redeemPoints()
      }
    },
    verifyBiometric () {
      const vm = this

      NativeBiometric.verifyIdentity({
        reason: vm.$t('NativeBiometricReason2'),
        title: vm.$t('SecurityAuthentication'),
        subtitle: vm.$t('NativeBiometricSubtitle'),
        description: ''
      })
        .then(() => {
          // Authentication successful
          vm.customKeyboardState = 'dismiss'
          setTimeout(() => {
            vm.onSecurityCheckSuccess('proceed')
          }, 1000)
        })
        .catch((error) => {
          // Failed to authenticate
          vm.warningAttemptsStatus = 'dismiss'
          if (error.message.includes(vm.$t('MaxAttempts'))) {
            vm.warningAttemptsStatus = 'show'
          } else if (error.message.includes(vm.$t('AuthenticationFailed'))) {
            vm.verifyBiometric()
          } else vm.isSecurityCheckSuccess = false
        })
    },
    onSecurityCheckSuccess (action) {
      this.pinDialogAction = ''
      if (action === 'proceed') this.redeemPoints()
    },
    async redeemPoints () {
      this.isSending = true

      const keyPair = await getKeyPairFromWalletMnemonic()
      const txId = await this.contract.redeemPromoTokenToBch(
        Number(this.pointsToRedeem), getWallet('bch').walletHash,
        this.address, keyPair.privKey
      )

      if (txId) {
        // call to engagement-hub to process swapping
        const data = {
          tx_id: txId,
          amount: Number(this.pointsToRedeem),
          address: this.$store.getters['global/getAddress']('bch'),
          token_address: await getWalletTokenAddress(),
          promo: this.pointsType,
          id: this.promoId
        }

        const isSuccessful = await processPointsRedemption(data)
  
        if (isSuccessful) {
          this.$q.notify({
            type: 'positive',
            timeout: 3000,
            message: 'Points redemption processed successfully.'
          })
          this.$refs.dialogRef.hide()
        } else {
          raiseNotifyError('An error occurred while processing your redemption. Please try again later.')
        }
      } else {
        raiseNotifyError('An error occurred while processing your redemption. Please try again later.')
      }

      this.isSending = false
    }
  }
}
</script>

<style lang="scss">
.q-field--dark.q-field--error {
  .text-negative,
  .q-field__messages,
  .q-field__label,
  .q-field__control.text-negative {
    color: #e57373 !important
  }
}
</style>
