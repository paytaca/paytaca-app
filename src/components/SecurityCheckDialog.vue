<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent>
    <q-card class="br-15" :class="{'pt-dark text-white': darkMode, 'text-black': !darkMode}">
      <q-card-section>
        <div class="text-center q-mb-sm">
          Security check
        </div>
        <div class="row items-center justify-around q-gutter-md">
          <q-btn rounded label="Log In" color="blue-9" @click="executeSecurityChecking()" />
          <q-btn rounded label="Cancel" color="blue-9" @click="onCancelClick()" />
        </div>
      </q-card-section>
      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
      <biometricWarningAttmepts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="verifyBiometric()" />
    </q-card>
  </q-dialog>
</template>
<script>
import pinDialog from './pin'
import biometricWarningAttmepts from './authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

export default {
  /**
   * Used with dialog plugin, must pass this.$root as props when using this dialog since;
   * it accesses $store.
   *
   * Example:
   *  vm.$q.dialog({ component: SecurityCheckDialog, root: vm.$root }).onOk(() => console.log('Success!'))
  */
  name: 'SecurityCheckDialog',
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  components: {
    pinDialog,
    biometricWarningAttmepts
  },
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss'
    }
  },
  methods: {
    executeSecurityChecking () {
      const vm = this
      SecureStoragePlugin.get({ key: 'pin' })
        .then(() => {
          setTimeout(() => {
            if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
              vm.pinDialogAction = 'VERIFY'
            } else {
              vm.verifyBiometric()
            }
          }, 500)
        })
        .catch(() => {
          setTimeout(() => {
            vm.verifyBiometric()
          }, 500)
        })
    },
    pinDialogNextAction (action) {
      if (action === 'send') this.onOKClick()
      else this.hide()
    },
    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      }).then(
        () => {
          // Authentication successful
          this.onOKClick()
        },
        (error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            this.onCancelClick()
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        }
      )
    },
    // following method is REQUIRED
    // (don't change its name --> "show")
    show () {
      this.$refs.dialog.show()
      this.executeSecurityChecking()
    },

    // following method is REQUIRED
    // (don't change its name --> "hide")
    hide () {
      this.$refs.dialog.hide()
    },

    onDialogHide () {
      // required to be emitted
      // when QDialog emits "hide" event
      this.$emit('hide')
    },

    onOKClick () {
      // on OK, it is REQUIRED to
      // emit "ok" event (with optional payload)
      // before hiding the QDialog
      this.$emit('ok')
      // or with payload: this.$emit('ok', { ... })

      // then hiding dialog
      this.hide()
    },

    onCancelClick () {
      // we just need to hide dialog
      this.hide()
    }
  }
}
</script>
