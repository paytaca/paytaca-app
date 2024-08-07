<template>
  <!-- <HeaderNav :title="`${user?.is_arbiter ? 'Appeal Ramp' : 'P2P Exchange'}`" backnavpath="/apps"/> -->
  <q-dialog v-model="show" persistent maximized no-shake transition-show="slide-up">
    <q-card class="br-15 pt-card-2 text-bow q-pb-sm" :class="getDarkModeClass(darkMode)">
      <div class="row justify-center q-py-lg q-my-lg q-mx-lg">
        <p class="text-h5 text-uppercase text-center q-my-none" :class="{'text-grad': isNotDefaultTheme || darkMode}">
          {{ user?.is_arbiter ? 'Ramp Appeals' : 'P2P Exchange' }}
        </p>
      </div>
      <div
      class="q-mb-lg text-bow">
        <div>
          <div class="q-px-md q-mb-sm text-h6 login-label">
            <div class="row justify-center q-mb-sm">
              {{ register ? "Sign up" : "Login"}} as {{ user?.is_arbiter ? "Arbiter" : "Peer"}}
            </div>
            <q-input
              class="row justify-center q-mx-lg q-px-lg"
              rounded
              standout
              dense
              hide-bottom-space
              bottom-slots
              :hide-hint="!hintMessage"
              :dark="darkMode"
              :readonly="!register || user?.is_arbiter"
              :disable="loggingIn"
              :placeholder="register ? 'Enter nickname' : ''"
              :loading="loggingIn || (!usernickname && !register) || isLoading"
              :error="errorMessage !== null"
              v-model="usernickname">
              <template v-slot:append>
                <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
                <!-- <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" /> -->
                <q-btn v-if="register && !loggingIn" round dense flat icon="send" :disable="!isValidNickname || user?.is_arbiter" @click="createRampUser" />
              </template>
              <template v-slot:hint>
                <div class="row justify-center text-center">{{ hintMessage }}</div>
              </template>
              <template v-slot:error>
                <div class="row justify-center text-center">{{ errorMessage }}</div>
              </template>
            </q-input>
          </div>
          <!-- <div v-if="!isLoading && !register" class="row justify-center q-mt-lg">
            <q-btn dense stack class="q-px-xs" :disable="loggingIn || !usernickname" @click="onLoginClick('biometric')" v-if="hasBiometric">
              <q-icon class="q-mt-sm" size="50px" name="fingerprint" />
              <span class="text-center q-my-sm q-mx-md">Biometrics</span>
            </q-btn>
            <q-btn dense stack class="q-px-lg" :class="hasBiometric ? 'q-mx-sm' : 'q-mx-lg'" :disable="loggingIn  || !usernickname" @click="onLoginClick('pin')">
              <q-icon class="q-mt-sm" size="50px" name="apps" />
              <span class="text-center q-my-sm q-mx-md">MPIN</span>
            </q-btn>
          </div> -->
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getKeypair, getDeviceId } from 'src/wallet/ramp/chat/keys'
import * as chatUtils from 'src/wallet/ramp/chat'
import { updateSignerData, signRequestData } from 'src/wallet/ramp/chat/backend'
import { backend } from 'src/wallet/ramp/backend'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getAuthToken, saveAuthToken, deleteAuthToken } from 'src/wallet/ramp/auth'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      minHeight: this.$q.screen.height - this.$q.screen.height * 0.2,
      apiURL: process.env.WATCHTOWER_BASE_URL,
      show: true,
      dialog: false,
      user: null,
      usernickname: '',
      rampWallet: null,
      isLoading: true,
      register: false,
      loggingIn: false,
      errorMessage: null,
      hintMessage: null,
      hasBiometric: false,
      securityDialogUp: false,
      chatIdentityId: null,
      retrying: false,
      retry: {
        loadChatIdentity: false,
        updateChatIdentityId: false
      }
    }
  },
  emits: ['loggedIn', 'cancel'],
  props: {
    error: String
  },
  computed: {
    isValidNickname () {
      return this.usernickname && this.usernickname.length > 0
    }
  },
  mounted () {
    this.$store.dispatch('ramp/migrateStoreOrderFilters')
    this.dialog = true
    if (this.error) this.errorMessage = this.error
    NativeBiometric.isAvailable().then(() => { this.hasBiometric = true })
    this.fetchUser()
    this.rampWallet = loadRampWallet()
  },
  beforeUnmount () {
    bus.emit('relogged')
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async fetchUser () {
      const vm = this
      try {
        const { data: user } = await backend.get('/auth/')
        vm.user = user
        vm.usernickname = user?.name
        console.log('user:', vm.user)
        if (vm.user.is_authenticated) {
          const token = await getAuthToken()
          if (token) {
            const success = await vm.loadChatIdentity()
            if (!success) return
            await vm.savePubkeyAndAddress()
            vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
            vm.$store.commit('ramp/updateUser', user)
            vm.loggingIn = false
          } else {
            vm.isLoading = false
            vm.login()
          }
        } else {
          vm.isLoading = false
          deleteAuthToken()
          vm.login()
        }
      } catch (error) {
        if (error.response) {
          console.error(error.response)
          if (error.response.status === 404) {
            vm.register = true
          }
        } else {
          console.error(error)
          bus.emit('network-error')
        }
        vm.isLoading = false
      }
    },
    async loadChatIdentity () {
      const vm = this
      const rampWallet = loadRampWallet()
      vm.hintMessage = this.$t('LoadingChatIdentity')

      // Update signer data for signing chat authentication
      vm.hintMessage = this.$t('UpdatingSignerData')
      await updateSignerData().catch(error => { return vm.handleError(error, 'Failed to update signer data') })

      // Update or create encrypting/decrypting keypair
      vm.hintMessage = this.$t('UpdatingChatKeypair')
      await chatUtils.updateOrCreateKeypair().catch(error => { return vm.handleError(error) })

      const chatIdentityRef = chatUtils.generateChatIdentityRef(rampWallet.walletHash)
      const data = {
        rampWallet: rampWallet,
        ref: chatIdentityRef,
        name: vm.user.name
      }
      // check if chatIdentity exists
      let chatIdentity = await chatUtils.fetchChatIdentity(data.ref).catch(error => { return vm.handleError(error, 'Unable to fetch chat identity') })

      // Build payload and create chat identity
      if (!chatIdentity) {
        vm.hintMessage = this.$t('CreatingChatIdentity')
        const payload = await vm.buildChatIdentityPayload(data).catch(error => { return vm.handleError(error, 'Failed to build chat identity') })
        chatIdentity = await chatUtils.createChatIdentity(payload).catch(error => { return vm.handleError(error, 'Failed to create chat identity') })
      }

      // Save chat identity to store
      vm.$store.commit('ramp/updateChatIdentity', { ref: data.ref, chatIdentity: chatIdentity })
      vm.hintMessage = this.$t('AlmostThere')

      // Update chat identity id if null or mismatch
      if (!vm.user.chat_identity_id || vm.user.chat_identity_id !== chatIdentity.id) {
        const userType = vm.user.is_arbiter ? 'arbiter' : 'peer'
        chatUtils.updateChatIdentityId(userType, chatIdentity.id).catch(error => { return vm.handleError(error, 'Failed to update chat identity id') })
      }
      return true
    },
    async buildChatIdentityPayload (data) {
      const wallet = data.rampWallet
      const hexRef = Buffer.from(String(data.ref)).toString('hex')
      const signatureData = await signRequestData(hexRef)
      let encPubkey = await getKeypair().then(keypair => { return keypair.pubkey }).catch(error => { console.error(error) })
      if (!encPubkey) {
        // Handle null encrypting pubkey
        console.error(`Error: getKeypair() returned pubkey: "${encPubkey}". Recreating keypair without updating server pubkey..`)
        this.hintMessage = this.$t('UpdatingChatKeypair')
        encPubkey = (await chatUtils.updateOrCreateKeypair({ updatePubkey: false }).catch(error => { return this.handleError(error) })).pubkey
      }
      const payload = {
        ref: data.ref,
        name: data.name, // display name for your chat identity
        pubkey: {
          pubkey: encPubkey, // the pubkey used by other users when encrypting messages sent to you
          device_id: await getDeviceId().catch(console.error) // device id of your app
        },
        verifying_pubkey: await wallet.pubkey(null, '0/0'), // pubkey used for authentication
        signature: signatureData.signature // signature generated by signing `ref` using private key of `verifying_pubkey`
      }
      return payload
    },
    savePubkeyAndAddress () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.hintMessage = this.$t('UpdatingPubkeyAndAddress')
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
            console.log('Local wallet keys match server keys')
            resolve(vm.user)
          } else {
            backend.patch(`/ramp-p2p/${usertype}/detail`, payload, { authorize: true })
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
                  bus.emit('network-error')
                }
                reject(error)
              })
          }
        })
      })
    },
    async login () {
      const vm = this
      vm.hintMessage = null
      vm.errorMessage = null
      try {
        vm.loggingIn = true
        vm.hintMessage = vm.$t('LoggingYouIn')
        const { data: { otp } } = await backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`)
        const keypair = await vm.rampWallet.keypair()
        const signature = await vm.rampWallet.signMessage(keypair.privateKey, otp)
        const body = {
          wallet_hash: vm.rampWallet.walletHash,
          signature: signature,
          public_key: keypair.publicKey
        }
        const loginResponse = await backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
        if (vm.user) {
          saveAuthToken(loginResponse.data.token)
          const success = await vm.loadChatIdentity()
          if (!success) return
          vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
          vm.$store.commit('ramp/updateUser', vm.user)
        }
      } catch (error) {
        if (error.response) {
          console.error(error.response)
          vm.errorMessage = error.response.data.error || error
          if (vm.errorMessage.includes('disabled')) {
            vm.errorMessage = vm.$t('ThisAccountIsDisabled')
          }
          console.log('error:', vm.errorMessage)
        } else {
          console.log(error)
          bus.emit('network-error')
        }
      }
      vm.loggingIn = false
    },
    async createRampUser () {
      const vm = this
      const timestamp = Date.now()
      vm.errorMessage = null
      vm.loggingIn = true
      deleteAuthToken()
      const keypair = await vm.rampWallet.keypair()
      vm.rampWallet.signMessage(keypair.privateKey, 'PEER_CREATE', timestamp)
        .then(async (signature) => {
          const headers = {
            timestamp: timestamp,
            signature: signature,
            'public-key': keypair.publicKey
          }
          const body = {
            name: vm.usernickname,
            address: vm.rampWallet.address,
            address_path: await vm.rampWallet.addressPath()
          }
          backend.post('/ramp-p2p/peer/create', body, { headers: headers })
            .then((response) => {
              vm.user = response.data
              vm.$store.commit('ramp/updateUser', vm.user)
              console.log('Created user:', vm.user)
              vm.errorMessage = null
              vm.login()
            })
            .catch(error => { vm.handleError(error) })
        })
        .catch(error => { vm.handleError(error) })
    },
    handleError (error, message) {
      const vm = this
      console.error(`${message}: ${error}`)
      if (error.isAxiosError && !error.response) {
        // This is a network error (server down, no response)
        console.error('Network error:', error.message)
        vm.errorMessage = `${error.message}${message ? `: ${message}` : ''}`
        bus.emit('network-error')
      } else if (error.response) {
        // Handle other types of errors (e.g., 400, 404, etc.)
        console.error('Error status:', error.response.status)
        console.error('Error data:', error.response.data)
        const errorMessage = error.response.data?.error
        vm.errorMessage = `Error ${error.response.status}${errorMessage ? `: ${errorMessage}` : ''}`
      } else {
        // Handle other non-network errors
        console.error('Error:', error)
        vm.errorMessage = `${error}${message ? `: ${message}` : ''}`
      }
      vm.isLoading = false
      vm.loggingIn = false
    },
    async revokeAuth () {
      const url = `${this.apiURL}/auth/revoke`
      try {
        await backend.post(url, null, { authorize: true })
      } catch (error) {
        if (error.response) {
          console.error(error.response)
        } else {
          console.error(error)
          bus.emit('network-error')
        }
      }
    },
    async checkSecurity (securityType) {
      if (this.register) return true
      let success = false
      if (!securityType || securityType === 'pin') {
        success = await this.showSecurityDialog()
      } else if (this.hasBiometric && securityType === 'biometric') {
        success = await this.verifyBiometric()
      }
      return success
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
        Dialog.create({
          component: SecurityCheckDialog
        })
          .onOk(() => {
            resolve(true)
          })
          .onCancel(() => {
            resolve(false)
          })
          .onDismiss(() => {
            this.securityDialogUp = false
            resolve(false)
          })
      })
    },
    verifyBiometric () {
      return new Promise((resolve) => {
        NativeBiometric.verifyIdentity({
          reason: this.$t('NativeBiometricReason2'),
          title: this.$t('SecurityAuthentication'),
          subtitle: this.$t('NativeBiometricSubtitle'),
          description: ''
        })
          .then(() => {
            resolve(true)
          })
          .catch((error) => {
            console.error(error)
            if (!String(error).toLocaleLowerCase().includes('cancel')) {
              this.errorMessage = this.$t('FailedToAuthenticate')
            }
            resolve(false)
          })
          .finally(() => { this.securityDialogUp = false })
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
