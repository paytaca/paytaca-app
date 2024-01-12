<template>
  <q-card
  class="q-pt-md q-mx-md q-mb-lg"
  :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
  :style="`height: ${minHeight}px;`">
    <div v-if="isLoading">
      <div class="row justify-center q-py-lg" style="margin-top: 50%">
        <ProgressLoader/>
      </div>
    </div>
    <div v-else class="row justify-center q-gutter-sm" style="margin-top: 5%">
      <div>
        <div class="q-mt-md">
          <div
            v-if="!loggingIn"
            class="row justify-center q-mx-lg q-mb-sm"
            style="margin-top: 30%; font-weight: 400; font-size: 20px;">
              {{ register ? "Sign up" : "Sign in"}} as {{ isArbiter ? "Arbiter" : "Peer"}}
          </div>
          <div
            v-else
            class="row justify-center q-mx-lg q-mb-sm"
            style="margin-top: 30%; font-weight: 400; font-size: 20px;">
              {{ register ? "Signing up" : "Signing in"}}...
          </div>
          <q-input
            :dark="darkMode"
            :readonly="!register || isArbiter"
            rounded
            standout
            dense
            :placeholder="register ? 'Enter nickname' : ''"
            v-model="usernickname"
            :loading="isLoading || loggingIn || (!usernickname && !register)"
            class="row q-mx-md">
            <template v-slot:append>
              <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
              <!-- <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" /> -->
              <q-btn v-if="register" round dense flat icon="send" :disable="!isValidNickname || isArbiter" @click="createRampUser" />
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
      <div class="col row justify-evenly" style="position: fixed; margin-bottom: 25%; width: 100%; font-weight: 300; font-size: 20px;  bottom: 0;">
          <span>{{ isArbiter ? "APPEALS" : "PEER-TO-PEER"}}</span>
      </div>
    </div>
  </q-card>
</template>
<script>
import { rampWallet } from 'src/wallet/ramp/wallet'

import { getKeypair, getDeviceId } from 'src/wallet/ramp/chat/keys'
import { updatePeerChatIdentityId, fetchChatIdentity, createChatIdentity, updateOrCreateKeypair } from 'src/wallet/ramp/chat'
import { chatBackend, updateSignerData, signRequestData } from 'src/wallet/ramp/chat/backend'
import { backend } from 'src/wallet/ramp/backend'

import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getCookie } from 'src/wallet/ramp'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      apiURL: process.env.WATCHTOWER_BASE_URL,
      dialog: false,
      user: null,
      usernickname: '',
      wallet: null,
      isLoading: true,
      register: false,
      isArbiter: false,
      loggingIn: false,
      errorMessage: null,
      hasBiometric: false,
      securityDialogUp: false,
      chatIdentityId: null
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
    this.loadWallet()
    this.getProfile()
  },
  methods: {
    async loadChatIdentity () {
      await updateSignerData()
      return new Promise((resolve, reject) => {
        const vm = this
        const data = {
          rampWallet: rampWallet,
          ref: vm.wallet.walletHash,
          name: vm.user.name
        }
        fetchChatIdentity(data.ref)
          .then(identity => {
            if (!identity) {
              vm.buildChatIdentityPayload(data)
                .then(payload => createChatIdentity(payload))
                .then(identity => updatePeerChatIdentityId(identity.id))
            } else if (!vm.user.chat_identity_id) {
              updatePeerChatIdentityId(identity.id)
            }
          })
          .then(updateOrCreateKeypair())
          .finally(resolve())
          .catch(error => {
            console.error(error)
            reject(error)
          })
      })
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
    loadWallet () {
      const vm = this
      const wallet = vm.$store.getters['global/getWallet']('bch')
      const walletInfo = {
        walletHash: wallet.walletHash,
        connectedAddressIndex: wallet.connectedAddressIndex,
        address: vm.$store.getters['global/getAddress']('bch')
      }
      vm.$store.commit('ramp/updateWallet', walletInfo)
      vm.wallet = walletInfo
      return walletInfo
    },
    getProfile () {
      const vm = this
      backend.get('/ramp-p2p/user')
        .then(response => {
          console.log('profile:', response.data)
          if (response.data && response.data.user) {
            vm.isArbiter = response.data.is_arbiter
            vm.user = response.data.user
            vm.usernickname = vm.user?.name
            if (vm.user) {
              this.$store.commit('ramp/updateUser', vm.user)
              this.$store.dispatch('ramp/loadAuthHeaders')
            }
          } else {
            vm.register = true
            console.log('register')
          }
        })
        .then(async () => {
          if (!vm.register) {
            // check if has Biometric
            await vm.checkBiometric()
              .then(hasBiometric => {
                if (hasBiometric) {
                  vm.verifyBiometric()
                } else {
                  vm.showSecurityDialog()
                }
              })
              .then(vm.loadChatIdentity())

            // added delay to accomodate security dialog animation
            setTimeout(() => {
              this.isLoading = false
            }, 1500)
          } else {
            this.isLoading = false
          }
        })
        .catch(error => {
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 401) {
              vm.errorMessage = `${error.response.status}:  Unauthorized`
            }
          } else {
            console.error(error)
          }
          vm.isLoading = false
        })
    },
    login () {
      const vm = this
      if (getCookie('token')) {
        vm.loadChatIdentity()
        return vm.$emit('loggedIn', this.isArbiter ? 'arbiter' : 'peer')
      }
      backend(`/auth/otp/${this.isArbiter ? 'arbiter' : 'peer'}`)
        .then(response => rampWallet.signMessage(response.data.otp))
        .then(signature => {
          rampWallet.pubkey()
            .then(pubkey => {
              const body = {
                wallet_hash: rampWallet.walletHash,
                signature: signature,
                public_key: pubkey
              }
              backend.post(`/auth/login/${this.isArbiter ? 'arbiter' : 'peer'}`, body)
                .then((response) => {
                  // save token as cookie and set to expire 1h later
                  document.cookie = `token=${response.data.token}; expires=${new Date(response.data.expires_at).toUTCString()}; path=/`
                  vm.user = response.data.user
                  if (vm.user) {
                    vm.$store.commit('ramp/updateUser', this.user)
                    vm.$store.dispatch('ramp/loadAuthHeaders')
                  }
                  let userType
                  if (vm.isArbiter) userType = 'arbiter'
                  else userType = 'peer'
                  vm.$emit('loggedIn', userType)
                })
                .then(vm.loadChatIdentity())
            })
        })
        .catch(error => {
          if (error.response) {
            console.log(error.response)
            if (!('data' in error.response)) {
              console.log('network error')
            }
          } else {
            console.error(error)
          }
        })
    },
    createRampUser () {
      this.isLoading = true
      const timestamp = Date.now()
      const url = `${this.apiURL}/ramp-p2p/peer/create`
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      rampWallet.signMessage('PEER_CREATE', timestamp)
        .then((signature) => {
          rampWallet.pubkey()
            .then((pubkey) => {
              const headers = {
                'wallet-hash': rampWallet.walletHash,
                timestamp: timestamp,
                signature: signature,
                'public-key': pubkey
              }
              const body = {
                name: this.usernickname,
                address: this.wallet.address
              }
              this.$axios.post(url, body, { headers: headers })
                .then((response) => {
                  this.user = response.data
                  this.$store.commit('ramp/updateUser', this.user)
                  console.log('user:', this.user)
                  this.login()
                })
            })
            .catch((error) => {
              console.error(error)
              if (error.response) {
                console.error(error.response)
              }
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
      const authHeaders = this.$store.getters['ramp/authHeaders']
      try {
        const response = await this.$axios.post(url, null, { headers: authHeaders })
        console.log('response:', response)
      } catch (error) {
        console.error(error)
        console.error(error.response)
      }
    },
    checkBiometric () {
      return new Promise((resolve) => {
        NativeBiometric.isAvailable()
          .then(() => {
            this.hasBiometric = true
            resolve(true)
          })
          .catch((error) => {
            console.error('Implementation error: ', error)
            resolve(false)
          })
      })
    },
    onLoginClick (type) {
      if (this.securityDialogUp) return
      this.securityDialogUp = true
      if (type === 'pin') {
        this.showSecurityDialog()
      } else if (type === 'biometric') {
        this.verifyBiometric()
      }
    },
    showSecurityDialog () {
      const securityDialog = Dialog.create({
        component: SecurityCheckDialog
      })
        .onOk(() => {
          this.loggingIn = true
          this.login()
          securityDialog.hide()
          this.securityDialogUp = false
        })
        .onCancel(() => {
          this.loggingIn = false
          this.securityDialogUp = false
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
            this.loggingIn = true
            this.login()
          }, 1000)
          this.securityDialogUp = false
        })
        .catch((error) => {
          // Failed to authenticate
          console.error(error)
          this.loggingIn = false
          if (!String(error).toLocaleLowerCase().includes('cancel')) {
            this.errorMessage = 'Failed to authenticate'
          }
          this.securityDialogUp = false
        })
    }
  }
}
</script>
