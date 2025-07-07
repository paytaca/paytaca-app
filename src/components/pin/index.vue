<template>
  <div>
    <q-dialog
    v-model="dialog"
    persistent
    :maximized="true"
    transition-show="slide-up"
    transition-hide="slide-down"
    seamless
    >
      <q-card v-if="loader" class="full-height flex flex-center text-bow" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row">
              <div class="col-12 text-center q-mt-lg">
                <p class="text-h6 dim-text">{{ $t('SavingYourPin') }}...</p>
              </div>
              <div class="col-12 text-center">
                <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
              </div>
            </div>
          </q-card-section>
      </q-card>

      <q-card v-else id="app-container" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-mt-md q-pb-none">
            <div class="text-center">
                <p class="text-h6 text-blue-9 text-uppercase" :class="{'text-grad': darkMode}"><strong>{{ actionCaption }}</strong></p>
                <p class="dim-text q-mt-md" :class="{'text-grey-5': darkMode}">{{ subTitle }}</p>
            </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row justify-center">
              <div class="col-10 text-center">
                  <p class="q-py-none q-my-none pt-label" :class="getDarkModeClass(darkMode)">{{ pinLabel }}</p>
              </div>
              <div class="col-10">
                  <div class="row justify-center">
                      <div class="col-2 pt-pin-key" v-for="(keys, index) in pinKeys" :key="index">
                        <p class="q-py-md text-h5 text-center q-my-none pt-text-key">
                            <span v-if="keys.key !== ''" class="material-icons pin-icon" :class="{'text-blue-5': darkMode}">
                              radio_button_checked
                            </span>
                            <span v-else class="material-icons">
                              radio_button_unchecked
                            </span>
                        </p>
                      </div>
                  </div>
              </div>
          </div>
          <div class="row justify-center text-center">
              <span v-if="validationMsg.length > 0" class="q-mt-md" style="position: absolute; color: #ef4f84;">{{ validationMsg }}</span>
          </div>
          <span class="pt-pin-error"></span>
        </q-card-section>

        <q-card-section class="q-px-sm q-mt-none">
          <div class="row q-px-md pt-num-keys q-py-md bg-grad">
            <div class="col-3 pt-col-key" v-for="(key, index) in 16" :key="index">
              <q-btn
                push
                v-if="[4, 8, 12, 16].includes(key)"
                :disable="((key === 4 && pinDialogAction === 'VERIFY') || (pinStep === 1 && key === 4) || (key === 16 && disableClose))"
                @click="removeKey(key === 4 ? 'reset' : key === 8 ? 'delete' : key === 12 ? 'backspace' : key === 16 ? 'cancel' : '')"
                class="pp-key pt-key-del"
                :class="nonNumKeysClass(key)"
                :icon="key === 4 ? 'refresh' : key === 8 ? 'delete' : key === 12 ? 'backspace' : key === 16 ? 'mdi-close-circle' : ''" />
              <q-btn 
                push
                class="pp-key pt-key-num"
                :class="darkMode ? 'pt-bg-dark' : 'bg-white'"
                :text-color="darkMode ? '#515151' : 'black'"
                :disable="(key === 13)"
                v-else-if="(key !== 15)" :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : (key-2) : (key-1) : key"
                @click="processKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : (key-2) : (key-1) : key)" />
              <q-btn
                push
                v-else
                :icon="btnIcon"
                :disable="saveBtn"
                @click="setPin"
                class="pt-key-enter pt-check-key"
                style="width: 95%; height: 95%"
               />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import ProgressLoader from '../../components/ProgressLoader'
import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'
import { getMnemonic } from '../../wallet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { sha256 } from 'js-sha256'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export default {
  /**
   * Note: quasar upgrade from v1 to v2 requires 'pinDialogAction' prop to be used with v-model instead of v-bind
   * 
   *
   * Before:
   *  <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
   * Recommended:
   *  <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
  */
  data () {
    return {
      dialog: false,
      actionCaption: '',
      pinLabel: this.$t('EnterPin'),
      btnIcon: 'done',
      pin: '',
      pin2: '',
      validationMsg: '',
      pinKeys: [{ key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }],
      countKeys: 0,
      pinStep: 1,
      loader: false,
      resetStatus: true,
      saveBtn: true,
      subTitle: null
    }
  },
  components: { ProgressLoader },
  props: {
    'pinDialogAction': { type: String, default: '' },
    'nextAction': { type: Function, default: () => {} },
    'newWalletMnemonic': { type: String, default: '' },
    'disableClose': { type: Boolean, default: false }
  },
  watch: {
    pinDialogAction () {
      const vm = this
      if (vm.pinDialogAction === 'SET UP' || vm.pinDialogAction === 'SET NEW' || vm.pinDialogAction === 'VERIFY') {
        vm.pin = ''
        vm.removeKey('delete')
        vm.dialog = true

        if (vm.pinDialogAction === 'SET UP') {
          vm.actionCaption = vm.$t('SetupPin')
        } else if (vm.pinDialogAction === 'SET NEW') {
          vm.actionCaption = vm.$t('SetupNewPin')
        } else if (vm.pinDialogAction === 'VERIFY') {
          vm.actionCaption = vm.$t('VerifyPin')
        }

        vm.btnIcon = vm.pinDialogAction === 'VERIFY' ? 'verified_user' : 'done'
        vm.subTitle = vm.pinDialogAction === 'VERIFY' ? vm.$t('PinSubtext1') : vm.$t('PinSubtext2')
      } else {
        if (vm.pinDialogAction === 'SKIP') {
          vm.$emit('nextAction', 'proceed')
        } else {
          vm.dialog = false
        }
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    nonNumKeysClass (key) {
      let classes = ''
      if (this.$store.getters['darkmode/getStatus']) {
        classes = key === 16 ? 'bg-red-7 text-white' : 'bg-grey-9 text-grey-1'
      } else {
        classes = key === 16 ? 'bg-red-5 text-white' : 'bg-white text-grey-10'
      }
      return classes
    },
    processKey (num) {
      const vm = this

      vm.validationMsg = ''
      const keyLength = vm.pinKeys.length
      for (let i = 0; keyLength > i; i++) {
        if (vm.pinKeys[i].key === '') {
          vm.pinKeys[i].key = num
          break
        }
      }

      let keys = ''
      for (let i = 0; vm.pinKeys.length > i; i++) {
        keys += vm.pinKeys[i].key
      }

      if (keys.length === 6) {
        vm.saveBtn = false
      }

      if (vm.pinStep === 1) {
        vm.pin = keys
      } else if (vm.pinStep === 2) {
        vm.pin2 = keys
        if (vm.pin2.length === 6) {
          if (vm.pin2 !== vm.pin) {
            vm.saveBtn = true
            vm.validationMsg = vm.$t('PinMismatched')
          }
        }
      }
    },
    removeKey (action) {
      const vm = this
      vm.countKeys = 0
      vm.validationMsg = ''
      vm.saveBtn = true
      const keyLength = vm.pinKeys.length
      if (action === 'delete') {
        for (let i = 0; keyLength > i; i++) {
          vm.pinKeys[i].key = ''
        }
      } else if (action === 'reset') {
        vm.pin = ''
        vm.pin2 = ''
        vm.pinStep = 1
        vm.pinLabel = vm.$t('EnterPin')
        vm.btnIcon = 'done'
        vm.resetStatus = true
        for (let i = 0; keyLength > i; i++) {
          vm.pinKeys[i].key = ''
        }
      } else if (action === 'cancel') {
        vm.cancelPin()
      } else {
        for (let i = 0; keyLength > i; i++) {
          if (vm.pinKeys[i].key !== '') {
            vm.countKeys += 1
          }
        }
        if (vm.countKeys !== 0) { vm.pinKeys[vm.countKeys - 1].key = '' }
      }
    },
    async setPin () {
      const vm = this
      let mnemonic = ''

      if (vm.newWalletMnemonic) {
        mnemonic = vm.newWalletMnemonic
      } else {
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        mnemonic = await getMnemonic(walletIndex)
      }
      const pinKey = `pin-${sha256(mnemonic)}`

      if (vm.pinDialogAction === 'VERIFY') {
        let secretKey = null
        try {
          secretKey = await SecureStoragePlugin.get({ key: pinKey })
        } catch (error) {
          try {
            // fallback for retrieving pin using unhashed mnemonic
            secretKey = await SecureStoragePlugin.get({ key: `pin ${mnemonic}` })
          } catch (error1) {
            // fallback for old process of pin retrieval
            secretKey = await SecureStoragePlugin.get({ key: 'pin' })
          }
        }
        if (secretKey?.value === vm.pin) {
          resetAll()
          vm.$emit('nextAction', 'proceed')
        } else {
          vm.validationMsg = vm.$t('IncorrectPin')
        }
      } else if (vm.pinStep === 1) {
        vm.pinStep = 2
        vm.removeKey('delete')
        vm.pinLabel = vm.$t('ConfirmPin')
        vm.btnIcon = 'done'
        vm.resetStatus = false
      } else if (vm.pinStep === 2) {
        vm.loader = true
        SecureStoragePlugin.set({ key: pinKey, value: vm.pin })
          .then(() => {
            setTimeout(() => {
              if (vm.pinDialogAction === 'SET UP') {
                vm.$emit('nextAction', 'proceed')
              } else {
                resetAll()
              }
            }, 500)
          })
      }

      function resetAll () {
        vm.loader = false
        vm.removeKey('reset')
        vm.$emit('nextAction')
        try {
          vm.pinDialogAction = ''
        } catch {}
        finally {
          vm.$emit('update:pinDialogAction')
        }
      }
    },
    cancelPin () {
      this.removeKey('reset')
      this.$emit('nextAction', 'cancel')
    }
  }
}
</script>

<style lang="scss">
.pt-pin-key {
  position: relative;
  height: 50px !important;
  display: flex;
  justify-content: center;
  align-items: center;
}
.pt-pin-key .material-icons {
  color: #6D6D6D;
}
.pt-text-key {
  border-bottom: 3px solid #dfe3e9;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 70%;
  vertical-align: middle;
  font-size: 20px;
}
.dim-text {
  color: #8F8CB8;
}

/* New */
.pt-key-num {
  height: 45px;
  font-size: 16px;
}
.pt-key-del {
  height: 45px;
}
.pt-check-key {
  color: #fff;
  height: 45px;
  font-weight: bolder;
  background-color: #3b7bf6;
}
.pt-col-key {
  padding: 2px;
}
.pt-num-keys {
  position: fixed !important;
  width: 100%;
  left: 0px;
  height: 250px;
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  bottom: 0px !important;
}
.pp-key {
  width: 95%;
  height: 95%;
  font-weight: 400;
}
.pt-bg-dark {
  color: #fff !important;
  background: #273746 !important;
}
</style>
