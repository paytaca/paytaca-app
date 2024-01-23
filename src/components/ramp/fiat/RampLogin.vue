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
              {{ register ? "Sign up" : "Sign in"}} as {{ user?.is_arbiter ? "Arbiter" : "Peer"}}
          </div>
          <div
            v-else
            class="row justify-center q-mx-lg q-mb-sm"
            style="margin-top: 30%; font-weight: 400; font-size: 20px;">
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
      <div class="col row justify-evenly" style="position: fixed; margin-bottom: 25%; width: 100%; font-weight: 300; font-size: 20px;  bottom: 0;">
          <span>{{ user?.is_arbiter ? "APPEALS" : "PEER-TO-PEER"}}</span>
      </div>
    </div>
  </q-card>
</template>
<script>
import { rampWallet } from 'src/wallet/ramp/wallet'
import { getKeypair, getDeviceId } from 'src/wallet/ramp/chat/keys'
import { updatePeerChatIdentityId, fetchChatIdentity, createChatIdentity, updateOrCreateKeypair } from 'src/wallet/ramp/chat'
import { updateSignerData, signRequestData } from 'src/wallet/ramp/chat/backend'
import { backend } from 'src/wallet/ramp/backend'

import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getAuthCookie, setAuthCookie, clearAuthCookie } from 'src/wallet/ramp/auth'
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
    this.fetchUser()
  },
  methods: {
    fetchUser () {
      const vm = this
      backend.get('/auth/')
        .then(response => {
          vm.user = response.data
          vm.usernickname = vm.user?.name
          vm.$store.commit('ramp/updateUser', vm.user)
          vm.$store.dispatch('ramp/loadAuthHeaders')
          if (vm.user.is_authenticated) {
            if (getAuthCookie()) {
              vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
              vm.loadChatIdentity().then(vm.isLoading = false)
            } else {
              vm.isLoading = false
              vm.login()
            }
          } else {
            vm.isLoading = false
            clearAuthCookie()
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
    savePubkeyAndAddress (payload) {
      return new Promise((resolve, reject) => {
        backend.put('/ramp-p2p/peer/detail', payload, { authorize: true })
          .then(response => {
            console.log('Updated pubkey and address:', response.data)
            resolve(response)
          })
          .catch(error => {
            if (error.response) {
              console.error('Failed to update pubkey and address:', error.response)
            } else {
              console.error('Failed to update pubkey and address:', error)
            }
            reject(error)
          })
      })
    },
    loadWallet () {
      const vm = this
      const wallet = vm.$store.getters['global/getWallet']('bch')
      rampWallet.pubkey().then(pubkey => {
        const body = {
          address: rampWallet.address,
          public_key: pubkey
        }
        vm.savePubkeyAndAddress(body)
      })
      const walletInfo = {
        walletHash: wallet.walletHash,
        connectedAddressIndex: wallet.connectedAddressIndex,
        address: vm.$store.getters['global/getAddress']('bch')
      }
      vm.$store.commit('ramp/updateWallet', walletInfo)
      vm.wallet = walletInfo
      return walletInfo
    },
    login (securityType) {
      console.log(securityType)
      const vm = this
      vm.loggingIn = true
      // security check before login
      vm.checkSecurity(securityType)
        .then(success => {
          if (success) {
            backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`)
              .then(response => rampWallet.signMessage(response.data.otp))
              .then(signature => {
                rampWallet.pubkey()
                  .then(pubkey => {
                    const body = {
                      wallet_hash: rampWallet.walletHash,
                      signature: signature,
                      public_key: pubkey
                    }
                    backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
                      .then((response) => {
                        setAuthCookie(response.data.token, response.data.expires_at)
                        if (vm.user) {
                          vm.$store.commit('ramp/updateUser', vm.user)
                          vm.$store.dispatch('ramp/loadAuthHeaders')
                        }
                        vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
                      })
                      .then(() => {
                        vm.loadChatIdentity().then(vm.loggingIn = false)
                        vm.savePubkeyAndAddress({
                          address: rampWallet.address,
                          public_key: pubkey
                        })
                      })
                  })
              })
              .catch(error => {
                if (error.response) {
                  console.error(error.response)
                  if (!('data' in error.response)) {
                    console.error('network error')
                  }
                } else {
                  console.error(error)
                }
                vm.loggingIn = false
              })
          } else {
            vm.loggingIn = false
          }
        })
    },
    createRampUser () {
      const timestamp = Date.now()
      const url = `${this.apiURL}/ramp-p2p/peer/create`
      this.loggingIn = true
      clearAuthCookie()
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
