<template>
  <div class="pt-settings">
      <header-nav title="SETTINGS" backnavpath="/" />
      <div class="row">
          <div class="col-12 q-px-lg q-mt-md">
              <p class="q-px-sm q-my-sm dim-text text-h6">SECURITY</p>
              <q-list bordered separator padding style="border-radius: 14px; background: #fff">
                <q-item clickable v-ripple v-if="securityAuth" @click="securityOptionDialogStatus = 'show in settings'">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu">Security Authentication Setup</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                        <q-icon name="security" class="pt-setting-avatar"></q-icon>
                    </q-item-section>
                </q-item>
                <q-item :disable="!pinStatus" clickable v-ripple @click="popUpPinDialog">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu">PIN {{ !pinStatus ? '(disabled)' : '' }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                        <q-icon name="pin" class="pt-setting-avatar"></q-icon>
                    </q-item-section>
                </q-item>
              </q-list>
          </div>
      </div>

      <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
      <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="removePinCaption" />

  </div>
</template>

<script>
import pinDialog from '../../components/pin'
import securityOptionDialog from '../../components/authOption'
import HeaderNav from '../../components/header-nav'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

export default {
  data () {
    return {
      pinDialogAction: '',
      securityOptionDialogStatus: 'dismiss',
      securityAuth: false,
      pinStatus: true
    }
  },
  components: { HeaderNav, pinDialog, securityOptionDialog },
  methods: {
    popUpPinDialog () {
      this.pinDialogAction = 'SET NEW'
    },
    removePinCaption (action = '') {
      this.pinDialogAction = ''
      if (action !== 'cancel') {
        this.securityOptionDialogStatus = 'dismiss'
      }
    },
    setPreferredSecurity (auth) {
      const vm = this
      vm.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        vm.pinStatus = true
        SecureStoragePlugin.get({ key: 'pin' })
          .then(() => {
            vm.securityOptionDialogStatus = 'dismiss'
          })
          .catch(_err => {
            vm.pinDialogAction = 'SET NEW'
          })
      } else {
        vm.pinStatus = false
        vm.securityOptionDialogStatus = 'dismiss'
      }
    }
  },
  created () {
    NativeBiometric.isAvailable()
      .then(result => {
        if (result.isAvailable !== false) {
          this.securityAuth = true
        } else {
          this.securityAuth = false
        }
      },
      (error) => {
        console.log('Implementation error: ', error)
      })
  },
  mounted () {
    if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
      this.pinStatus = true
    } else {
      this.pinStatus = false
    }
  }
}
</script>

<style>
.pt-settings {
    background-color: #ECF3F3;
    min-height: 100vh;
}
.pt-item {
    border-bottom-right-radius: 14px;
    border-bottom-left-radius: 14px;
}
.dim-text {
    color: #8F8CB8;
}
.pt-setting-menu {
    color: #3B7BF6;
}
.pt-setting-avatar {
    color: #da53b2;
}
</style>
