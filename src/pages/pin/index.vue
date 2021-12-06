<template>
    <div>
        <q-dialog
        v-model="dialog"
        persistent
        :maximized="true"
        transition-show="slide-up"
        transition-hide="slide-down"
        >
            <q-card v-if="loader">
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

            <q-card v-else class="pt-bg-card">
                <q-card-section class="q-mt-md q-pb-none">
                    <div class="text-center">
                        <p class="text-h6 pt-set-pin"><strong>{{ actionCaption }} PIN</strong></p>
                        <p class="dim-text q-mt-md">PIN will serve as a verfication of your account in every transaction you make for security purposes.  </p>
                    </div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                <div class="row justify-center">
                    <div class="col-10 text-center">
                        <p class="q-py-none q-my-none pt-set-pin">{{ pinLabel }}</p>
                    </div>
                    <div class="col-10">
                        <div class="row justify-center">
                            <div class="col-2 pt-pin-key" v-for="(keys, index) in pinKeys" :key="index">
                            <p class="q-py-md text-h5 text-center q-my-none pt-text-key">
                                <span v-if="keys.key !== ''" class="material-icons">
                                    circle
                                </span>
                                <!-- <span>{{ keys.key }}</span> -->
                            </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row justify-center text-center">
                    <span v-if="validationMsg.length > 0" class="q-mt-sm" style="position: absolute; color: #ef4f84;">{{ validationMsg }}</span>
                </div>
                <span class="pt-pin-error"></span>
                </q-card-section>

                <q-card-section class="q-px-sm q-mt-sm">
                <div class="row">
                    <div v-for="(count, index) in 12" :key="index" class="col-4 q-pa-sm">
                    <q-btn v-if="[10, 12].includes(count)" push class="full-width pt-btn-key" @click="removeKey(count === 10 ? 'delete' : 'keyboard_backspace')" :icon="count === 10 ? 'delete' : 'keyboard_backspace'" rounded />
                    <q-btn v-else push class="full-width pt-btn-key" :label="count === 11 ? 0 : count" @click="processKey(count === 11 ? 0 : count)" rounded />
                    </div>
                </div>
                <div class="row q-mt-md q-px-sm">
                  <div class="col-12">
                    <q-btn push class="full-width pt-btn-set-pin" :label="btnLabel" :disable="saveBtn" rounded @click="setPin" />
                    <div v-if="pinDialogAction === 'VERIFY'" class="col-12">
                      <q-btn push class="full-width pt-btn-reset-pin q-mt-md" label="Cancel" rounded @click="cancelPin" />
                    </div>
                    <div class="row" v-else-if="isPinInSettings">
                      <div class="col-6 q-pr-sm">
                        <q-btn :disable="resetStatus" push class="full-width pt-btn-reset-pin q-mt-md" label="Reset" rounded @click="removeKey('reset')" />
                      </div>
                      <div class="col-6 q-pl-sm">
                        <q-btn push class="full-width pt-btn-reset-pin q-mt-md" label="Cancel" rounded @click="cancelPin" />
                      </div>
                    </div>
                    <div v-else class="col-12">
                      <q-btn :disable="resetStatus" push class="full-width pt-btn-reset-pin q-mt-md" label="Reset" rounded @click="removeKey('reset')" />
                    </div>
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
      btnLabel: 'ENTER',
      pin: '',
      pin2: '',
      validationMsg: '',
      pinKeys: [{ key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }, { key: '' }],
      countKeys: 0,
      pinStep: 1,
      loader: false,
      resetStatus: true,
      saveBtn: true,
      isPinInSettings: false
    }
  },
  components: { Loader },
  props: ['pinDialogAction', 'nextAction'],
  watch: {
    pinDialogAction () {
      const vm = this
      if (vm.pinDialogAction === 'SET UP' || vm.pinDialogAction === 'SET UP PIN' || vm.pinDialogAction === 'SET NEW' || vm.pinDialogAction === 'VERIFY') {
        vm.pin = ''
        vm.removeKey('delete')
        vm.dialog = true
        vm.actionCaption = vm.pinDialogAction === 'SET UP PIN' ? 'SET UP' : vm.pinDialogAction
        vm.btnLabel = vm.pinDialogAction === 'VERIFY' ? 'VERIFY' : 'ENTER'
        if (vm.pinDialogAction === 'SET UP' || vm.pinDialogAction === 'SET UP PIN') {
          vm.isPinInSettings = false
        } else {
          vm.isPinInSettings = true
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
        vm.btnLabel = 'ENTER'
        vm.resetStatus = true
        for (let i = 0; keyLength > i; i++) {
          vm.pinKeys[i].key = ''
        }
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
          this.nextAction('send')
        } else {
          vm.validationMsg = 'Incorrect PIN'
          this.nextAction('cancel')
        }
      } else if (vm.pinStep === 1) {
        vm.pinStep = 2
        vm.removeKey('delete')
        vm.pinLabel = 'Confirm PIN'
        vm.btnLabel = 'Save'
        vm.resetStatus = false
      } else if (vm.pinStep === 2) {
        vm.loader = true
        SecureStoragePlugin.set({ key: 'pin', value: vm.pin })
          .then(() => {
            setTimeout(() => {
              if (this.pinDialogAction === 'SET UP') {
                vm.$emit('nextAction')
              } else {
                resetAll()
              }
            }, 1000)
          })
      }

      function resetAll () {
        vm.dialog = false
        vm.loader = false
        vm.removeKey('reset')
        vm.$emit('nextAction')
      }
    },
    cancelPin () {
      this.dialog = false
      this.removeKey('reset')
      this.$emit('nextAction')
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
  background: #fff;
}
.pt-btn-key {
  height: 40px;
  border-radius: 20px;
  vertical-align: middle;
  border: none;
  color: #da53b2;
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
  height: 60px !important;
  display: flex;
  justify-content: center;
  align-items: center;
}
.pt-pin-key .material-icons {
  color: #848484;
}
.pt-text-key {
  border-bottom: 3px solid #dfe3e9;
  height: 100%;
  width: 70%;
  font-size: 20px;
  color: #525252;
}
.pt-pin-dialog-close {
    position: absolute;
    right: 14px;
    top: 14px;
}
.dim-text {
  color: #8F8CB8;
}
</style>
