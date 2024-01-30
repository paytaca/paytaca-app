<template>
  <q-card
  class="q-pt-md q-mx-md q-mb-lg pt-card text-bow"
  :class="getDarkModeClass(darkMode)"
  :style="`height: ${minHeight}px;`">
    <div v-if="isLoading">
      <div class="row justify-center q-py-lg" style="margin-top: 50%">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
    </div>
    <div v-else class="row justify-center q-gutter-sm" style="margin-top: 5%">
      <div>
        <div class="q-mt-md">
          <div v-if="!loggingIn" class="row justify-center q-mx-lg q-mb-sm text-h6 login-label">
              {{ register ? "Sign up" : "Sign in"}} as {{ user?.is_arbiter ? "Arbiter" : "Peer"}}
          </div>
          <div v-else class="row justify-center q-mx-lg q-mb-sm text-h6 login-label">
              {{ register ? "Signing up" : "Signing in"}}...
          </div>
          <q-input
            class="row q-mx-md"
            rounded
            standout
            dense
            :dark="darkMode"
            :readonly="!register || user?.is_arbiter"
            :placeholder="register ? 'Enter nickname' : ''"
            :loading="loggingIn || (!usernickname && !register)"
            v-model="usernickname">
            <template v-slot:append>
              <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
              <!-- <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" /> -->
              <q-btn v-if="register" round dense flat icon="send" :disable="!isValidNickname || user?.is_arbiter" @click="createRampUser" />
            </template>
          </q-input>
        </div>
        <div v-if="!isLoading && !register" class="row justify-center q-mt-lg">
          <q-btn dense stack class="q-px-xs" :disable="loggingIn || !usernickname" @click="onLoginClick('biometric')" v-if="hasBiometric">
            <q-icon class="q-mt-sm" size="50px" name="fingerprint" />
            <span class="text-center q-my-sm q-mx-md">Biometrics</span>
          </q-btn>
          <q-btn dense stack class="q-px-lg" :class="hasBiometric ? 'q-mx-sm' : 'q-mx-lg'" :disable="loggingIn  || !usernickname" @click="onLoginClick('pin')">
            <q-icon class="q-mt-sm" size="50px" name="apps" />
            <span class="text-center q-my-sm q-mx-md">MPIN</span>
          </q-btn>
        </div>
      </div>
      <div v-if="errorMessage" class="row justify-center q-mx-lg q-px-md q-my-md">
        <q-card flat class="col q-mx-md q-pa-md bg-red-1 pp-text">
            <q-icon name="error" left/>
            {{ errorMessage }}
        </q-card>
      </div>
      <div class="col row justify-evenly text-h6 ramp-footer-text">
          <span>{{ user?.is_arbiter ? "APPEALS" : "PEER-TO-PEER"}}</span>
      </div>
    </div>
  </q-card>
</template>
<script>
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getKeypair, getDeviceId } from 'src/wallet/ramp/chat/keys'
import { updatePeerChatIdentityId, fetchChatIdentity, createChatIdentity, updateOrCreateKeypair } from 'src/wallet/ramp/chat'
import { updateSignerData, signRequestData } from 'src/wallet/ramp/chat/backend'
import { backend } from 'src/wallet/ramp/backend'

import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getAuthToken, saveAuthToken, deleteAuthToken } from 'src/wallet/ramp/auth'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      apiURL: process.env.WATCHTOWER_BASE_URL,
      dialog: false,
      user: null,
      usernickname: '',
      rampWallet: null,
      isLoading: true,
      register: false,
      loggingIn: false,
      errorMessage: null,
      hasBiometric: false,
      securityDialogUp: false,
      chatIdentityId: null,
      retrying: false,
      retry: {
        loadChatIdentity: false,
        updatePeerChatIdentityId: false
      }
    }
  },
  components: {
    ProgressLoader
  },
  emits: ['loggedIn'],
  props: {
    error: String
  },
  computed: {
    isValidNickname () {
      return this.usernickname && this.usernickname.length > 0
    }
  },
  mounted () {
    this.dialog = true
    if (this.error) {
      this.errorMessage = this.error
    }
    this.fetchUser()
    this.rampWallet = loadRampWallet()
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    fetchUser () {
      const vm = this
      backend.get('/auth/')
        .then(response => {
          vm.user = response.data
          vm.usernickname = vm.user?.name
          vm.$store.commit('ramp/updateUser', vm.user)
          // vm.$store.dispatch('ramp/loadAuthHeaders')
          console.log('user:', vm.user)
          if (vm.user.is_authenticated) {
            getAuthToken().then(token => {
              if (token) {
                vm.exponentialBackoff(vm.loadChatIdentity, 5, 1000).then(vm.loggingIn = false)
                vm.savePubkeyAndAddress()
                vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
              } else {
                vm.isLoading = false
                vm.login()
              }
            })
          } else {
            vm.isLoading = false
            deleteAuthToken()
            vm.login()
          }
        })
        .catch(error => {
          if (error.response) {
            console.log(error.response)
            if (error.response.status === 404) {
              vm.register = true
            }
          } else {
            console.error(error)
          }
          vm.isLoading = false
        })
    },
    async loadChatIdentity () {
      // check if chatIdentity exist
      console.log('loading chat identity')
      const chatIdentity = this.$store.getters['ramp/chatIdentity']
      if (!chatIdentity) {
        await updateSignerData()
        return new Promise((resolve, reject) => {
          const vm = this
          vm.retry.loadChatIdentity = true
          const data = {
            rampWallet: vm.rampWallet,
            ref: vm.rampWallet.walletHash,
            name: vm.user.name
          }
          fetchChatIdentity(data.ref)
            .then(identity => {
              if (!identity) {
                vm.buildChatIdentityPayload(data)
                  .then(payload => createChatIdentity(payload))
                  .then(identity => {
                    vm.retry.updatePeerChatIdentityId = true
                    // updatePeerChatIdentityId(identity.id)
                    vm.exponentialBackoff(updatePeerChatIdentityId, 5, 1000, identity.id)
                  })
              } else if (!vm.user.chat_identity_id) {
                vm.retry.updatePeerChatIdentityId = true
                // updatePeerChatIdentityId(identity.id)
                vm.exponentialBackoff(updatePeerChatIdentityId, 5, 1000, identity.id)
              }
              vm.$store.commit('ramp/updateChatIdentity', identity)
            })
            .then(updateOrCreateKeypair())
            .finally(() => {
              vm.retry.loadChatIdentity = false
              // vm.retry.updatePeerChatIdentityId = false
              resolve()
            })
            .catch(error => {
              console.error(error)
              vm.isLoading = false
              reject(error)
            })
        })
      }
    },
    exponentialBackoff (fn, retries, delayDuration, ...data) {
      const vm = this
      const funcName = fn.name.split('bound ').join('')
      const identityId = data[0]

      return fn(identityId)
        .then((info) => {
          if (vm.retry[funcName]) {
            console.log('retrying')
            if (retries > 0) {
              return vm.delay(delayDuration)
                .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, identityId))
            } else {
              vm.retry[funcName] = false
            }
          }
        })
        .catch(error => {
          console.log(error)
          if (retries > 0) {
            return vm.delay(delayDuration)
              .then(() => vm.exponentialBackoff(fn, retries - 1, delayDuration * 2, identityId))
          } else {
            vm.retry[funcName] = false
          }
        })
    },
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
    },
    async buildChatIdentityPayload (data) {
      const wallet = data.rampWallet
      const hexRef = Buffer.from(String(data.ref)).toString('hex')
      const payload = {
        ref: data.ref,
        name: data.name, // display name for your chat identity
        pubkey: {
          pubkey: (await getKeypair()).pubkey, // the pubkey used by other users when encrypting messages sent to you
          device_id: await getDeviceId().catch(console.error) // device id of your app
        },
        verifying_pubkey: await wallet.pubkey(), // pubkey used for authentication
        signature: (await signRequestData(hexRef)).signature // signature generated by signing `ref` using private key of `verifying_pubkey`
      }
      return payload
    },
    savePubkeyAndAddress () {
      return new Promise((resolve, reject) => {
        const vm = this
        const usertype = vm.user.is_arbiter ? 'arbiter' : 'peer'
        vm.rampWallet.pubkey().then(async pubkey => {
          const payload = {
            public_key: pubkey,
            address: vm.rampWallet.address,
            address_path: await vm.rampWallet.addressPath()
          }
          if (payload.public_key === vm.user.public_key &&
              payload.address === vm.user.address &&
              payload.address_path === vm.user.address_path) {
            console.log('local wallet keys match server keys')
            resolve(vm.user)
          } else {
            console.log('user:', vm.user)
            backend.put(`/ramp-p2p/${usertype}/detail`, payload, { authorize: true })
              .then(response => {
                console.log('Updated pubkey and address:', response.data)
                resolve(response)
              })
              .catch(error => {
                if (error.response) {
                  console.error('Failed to update pubkey and address:', error.response)
                  if (error.response.status === 403) {
                    this.login()
                  }
                } else {
                  console.error('Failed to update pubkey and address:', error)
                }
                reject(error)
              })
          }
        })
      })
    },
    login (securityType) {
      const vm = this
      vm.loggingIn = true
      // security check before login
      vm.checkSecurity(securityType)
        .then(success => {
          if (success) {
            backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`).then(response => {
              vm.rampWallet.keypair().then(async keypair => {
                const signature = await vm.rampWallet.signMessage(keypair.privateKey, response.data.otp)
                const body = {
                  wallet_hash: vm.rampWallet.walletHash,
                  signature: signature,
                  public_key: keypair.publicKey
                }
                backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
                  .then((response) => {
                    if (vm.user) vm.$store.commit('ramp/updateUser', vm.user)
                    saveAuthToken(response.data.token)
                    vm.loadChatIdentity().then(vm.loggingIn = false)
                    vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
                  })
                  .finally(() => {
                    vm.exponentialBackoff(vm.loadChatIdentity, 5, 1000).then(vm.loggingIn = false)
                  })
              })
            }).catch((error) => { console.error(error) })
          } else {
            vm.loggingIn = false
          }
        })
    },
    async createRampUser () {
      const vm = this
      const timestamp = Date.now()
      this.loggingIn = true
      deleteAuthToken()
      const keypair = await vm.rampWallet.keypair()
      vm.rampWallet.signMessage(keypair.privateKey, 'PEER_CREATE', timestamp)
        .then(signature => {
          const headers = {
            timestamp: timestamp,
            signature: signature,
            'public-key': keypair.publicKey
          }
          const body = {
            name: this.usernickname,
            address: this.rampWallet.address
          }
          backend.post('/ramp-p2p/peer/create', body, { headers: headers })
            .then((response) => {
              this.user = response.data
              this.$store.commit('ramp/updateUser', this.user)
              console.log('Created user:', this.user)
              this.login()
            })
        })
        .catch((error) => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
          }
        })
    },
    async revokeAuth () {
      const url = `${this.apiURL}/auth/revoke`
      try {
        await backend.post(url, null, { authrize: true })
      } catch (error) {
        console.error(error)
        console.error(error.response)
      }
    },
    checkSecurity (securityType) {
      return new Promise((resolve) => {
        if (this.register) return resolve(true)
        if (!securityType || securityType === 'pin') {
          this.showSecurityDialog().then(result => {
            resolve(result)
          })
        } else if (securityType === 'biometric') {
          NativeBiometric.isAvailable()
            .then(() => {
              this.hasBiometric = true
              this.verifyBiometric().then(result => {
                resolve(result)
              })
            })
            .catch((error) => {
              console.error('Implementation error: ', error)
              this.showSecurityDialog().then(result => {
                resolve(result)
              })
            })
        }
      })
    },
    onLoginClick (type) {
      if (this.securityDialogUp) return
      if (!this.register) {
        this.securityDialogUp = true
      }
      this.login(type)
    },
    showSecurityDialog () {
      return new Promise((resolve) => {
        const securityDialog = Dialog.create({
          component: SecurityCheckDialog
        })
          .onOk(() => {
            securityDialog.hide()
            this.securityDialogUp = false
            resolve(true)
          })
          .onCancel(() => {
            this.securityDialogUp = false
            resolve(false)
          })
      })
    },
    verifyBiometric () {
      return new Promise((resolve) => {
        NativeBiometric.verifyIdentity({
          reason: 'For ownership verification',
          title: 'Security Authentication',
          subtitle: 'Verify your account using fingerprint.',
          description: ''
        })
          .then(() => {
            this.securityDialogUp = false
            resolve(true)
          })
          .catch((error) => {
            console.error(error)
            if (!String(error).toLocaleLowerCase().includes('cancel')) {
              this.errorMessage = 'Failed to authenticate'
            }
            this.securityDialogUp = false
            resolve(false)
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  .login-label {
    margin-top: 30%;
    font-weight: 400;
  }
  .ramp-footer-text {
    position: fixed;
    margin-bottom: 25%;
    width: 100%;
    font-weight: 300;
    bottom: 0;
  }
</style>
