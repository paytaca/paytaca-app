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
      <q-card v-if="loader" :class="{'pt-dark': $q.dark.mode}">
          <q-card-section>
              <div class="row">
                  <div class="col-12 text-center q-mt-lg">
                      <p class="text-h6 dim-text">Saving your PIN...</p>
                  </div>
                  <div class="col-12 text-center">
                      <loader></loader>
                  </div>
              </div>
          </q-card-section>
      </q-card>

      <q-card v-else class="pt-bg-card" :class="{'pt-dark': $q.dark.mode}">
        <q-card-section class="q-mt-md q-pb-none">
            <div class="text-center">
                <p class="text-h6 pt-set-pin" :class="{'pt-dark-label': $q.dark.mode}"><strong>{{ actionCaption }} PIN</strong></p>
                <p class="dim-text q-mt-md">{{ subTitle }}</p>
            </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row justify-center">
              <div class="col-10 text-center">
                  <p class="q-py-none q-my-none pt-set-pin" :class="{'pt-dark-label': $q.dark.mode}">{{ pinLabel }}</p>
              </div>
              <div class="col-10">
                  <div class="row justify-center">
                      <div class="col-2 pt-pin-key" v-for="(keys, index) in pinKeys" :key="index">
                        <p class="q-py-md text-h5 text-center q-my-none pt-text-key">
                            <span v-if="keys.key !== ''" class="material-icons" :class="{'pt-radio-dark': $q.dark.mode}">
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
          <div class="row q-px-xs pt-num-keys q-py-sm shadow-up-3">
            <div class="col-3 pt-col-key" v-for="(key, index) in 16" :key="index">
              <q-btn
                push
                v-if="[4, 8, 12, 16].includes(key)"
                :disable="((key === 4 && pinDialogAction === 'VERIFY') || (pinStep === 1 && key === 4))"
                @click="removeKey(key === 4 ? 'reset' : key === 8 ? 'delete' : key === 12 ? 'backspace' : key === 16 ? 'cancel' : '')"
                class="full-width pp-key pt-key-del pt-remove-key"
                :class="{'pt-bg-dark': $q.dark.mode}"
                :icon="key === 4 ? 'refresh' : key === 8 ? 'delete' : key === 12 ? 'backspace' : key === 16 ? 'highlight_off' : ''" />
              <q-btn
                push
                class="full-width pp-key pt-key-num"
                :class="{'pt-bg-dark-2': $q.dark.mode}"
                :disable="(key === 13)"
                v-else-if="(key !== 15)" :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : (key-2) : (key-1) : key"
                @click="processKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : (key-2) : (key-1) : key)" />
              <q-btn
                push
                v-else
                :icon="btnIcon"
                :disable="saveBtn"
                @click="setPin"
                class="full-width pt-key-enter pt-check-key"
               />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import 'capacitor-secure-storage-plugin'
import Loader from '../../components/loader'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

export default {
  data () {
    return {
      dialog: false,
      actionCaption: '',
      pinLabel: 'Enter PIN',
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
      subText1: 'Enter your PIN to proceed.',
      subText2: 'PIN will serve as a verfication of your account in every transaction you make for security purposes.',
      subTitle: null
    }
  },
  components: { Loader },
  props: ['pinDialogAction', 'nextAction'],
  watch: {
    pinDialogAction () {
      const vm = this
      if (vm.pinDialogAction === 'SET UP' || vm.pinDialogAction === 'SET NEW' || vm.pinDialogAction === 'VERIFY') {
        vm.pin = ''
        vm.removeKey('delete')
        vm.dialog = true
        vm.actionCaption = vm.pinDialogAction
        vm.btnIcon = vm.pinDialogAction === 'VERIFY' ? 'verified_user' : 'done'
        vm.subTitle = vm.pinDialogAction === 'VERIFY' ? vm.subText1 : vm.subText2
      } else {
        if (vm.pinDialogAction === 'SKIP') {
          vm.$emit('nextAction', 'send')
        } else {
          vm.dialog = false
        }
      }
    }
  },
  methods: {
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
            vm.validationMsg = 'PIN mismatched'
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
        vm.pinLabel = 'Enter PIN'
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

      if (vm.pinDialogAction === 'VERIFY') {
        const secretKey = await SecureStoragePlugin.get({ key: 'pin' })
        if (secretKey.value === vm.pin) {
          resetAll()
          vm.$emit('nextAction', 'send')
        } else {
          vm.validationMsg = 'Incorrect PIN'
        }
      } else if (vm.pinStep === 1) {
        vm.pinStep = 2
        vm.removeKey('delete')
        vm.pinLabel = 'Confirm PIN'
        vm.btnIcon = 'done'
        vm.resetStatus = false
      } else if (vm.pinStep === 2) {
        vm.loader = true
        SecureStoragePlugin.set({ key: 'pin', value: vm.pin })
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
        vm.pinDialogAction = ''
      }
    },
    cancelPin () {
      this.removeKey('reset')
      this.$emit('nextAction', 'cancel')
    }
  }
}
</script>

<style>
.pt-set-pin {
  font-family: Arial, Helvetica, sans-serif;
  color: #2E73D2;
}
.pt-bg-card {
  position: relative;
  background: #fff;
}
.pt-btn-set-pin {
  color: #fff;
  height: 40px;
  background-color: #2E73D2;
}
.pt-btn-reset-pin {
  height: 40px;
}
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
.pt-pin-dialog-close {
  position: absolute;
  right: 14px;
  top: 14px;
}
.dim-text {
  color: #8F8CB8;
}

/* New */
.pt-key-num {
  height: 45px;
  font-size: 16px;
  font-weight: bolder;
  background: #fff;
}
.pt-key-del {
  height: 45px;
  font-weight: bolder;
  background: #fff;
}
.pt-check-key {
  color: #fff;
  height: 45px;
  font-weight: bolder;
  background-color: #3b7bf6;
}
.pt-remove-key {
  background: #D7DBDE;
}
.pt-col-key {
  padding: 2px;
}
.pt-num-keys {
  position: fixed !important;
  width: 100%;
  left: 0px;
  bottom: 0px !important;
}
.pp-key {
  color: #515151 !important;
}
.pt-bg-dark {
  color: #fff !important;
  background: #273746 !important;
}
.pt-bg-dark-2 {
  color: #fff !important;
  background: #5D6D7E !important;
}
.pt-radio-dark {
  color: #fff !important;
}
.pt-dark {
  background: #273746 !important;
}
</style>
