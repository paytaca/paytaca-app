<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card v-show="displayDialogCard" class="br-15 pt-card-3 text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-center q-mb-sm">
          {{ $t('SecurityCheck') }}
        </div>
        <div class="row items-center justify-around q-gutter-md">
          <q-btn rounded :label="$t('LogIn')" class="button" @click="executeSecurityChecking()" />
          <q-btn rounded :label="$t('Cancel')" class="button" @click="onCancelClick()" />
        </div>
      </q-card-section>
    </q-card>
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
    <biometricWarningAttmepts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="verifyBiometric()" />
  </q-dialog>
</template>
<script>
import pinDialog from './pin'
import biometricWarningAttmepts from './authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
    securityCheckingDelay: {
      type: Number,
      default: 50,
    },
    displayDialogCard: {
      type: Boolean,
      default: false,
    }
  },
  data () {
    return {
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss'
    }
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  watch: {
    pinDialogAction (newVal, oldVal) {
      console.log('[SecurityCheckDialog] pinDialogAction changed from', oldVal, 'to', newVal)
    }
  },
  methods: {
    getDarkModeClass,
    async executeSecurityChecking () {
      const vm = this
      console.log('[SecurityCheckDialog] executeSecurityChecking called')
      console.log('[SecurityCheckDialog] $store available:', !!vm.$store)
      console.log('[SecurityCheckDialog] preferredSecurity:', vm.$store?.getters?.['global/preferredSecurity'])

      setTimeout(() => {
        const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
        console.log('[SecurityCheckDialog] Setting security check, preferredSecurity:', preferredSecurity)
        if (preferredSecurity === 'pin') {
          console.log('[SecurityCheckDialog] Setting pinDialogAction to VERIFY')
          vm.pinDialogAction = 'VERIFY'
          console.log('[SecurityCheckDialog] pinDialogAction after set:', vm.pinDialogAction)
        } else {
          console.log('[SecurityCheckDialog] Calling verifyBiometric')
          vm.verifyBiometric()
        }
      }, this.securityCheckingDelay)
    },
    pinDialogNextAction (action) {
      console.log('[SecurityCheckDialog] pinDialogNextAction called with action:', action)
      if (action === 'proceed') {
        console.log('[SecurityCheckDialog] Proceeding with onOKClick')
        this.onOKClick()
      } else {
        console.log('[SecurityCheckDialog] Hiding dialog')
        this.hide()
      }
    },
    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason2'),
        title: this.$t('SecurityAuthentication'),
        subtitle: this.$t('NativeBiometricSubtitle'),
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
      console.log('[SecurityCheckDialog] show() method called')
      console.log('[SecurityCheckDialog] $refs.dialog exists:', !!this.$refs.dialog)
      if (this.$refs.dialog) {
        console.log('[SecurityCheckDialog] Calling $refs.dialog.show()')
        this.$refs.dialog.show()
      } else {
        console.error('[SecurityCheckDialog] ERROR: $refs.dialog is not available!')
      }
      // Execute security checking after dialog is shown
      this.$nextTick(() => {
        console.log('[SecurityCheckDialog] $nextTick callback, calling executeSecurityChecking')
        this.executeSecurityChecking()
      })
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
