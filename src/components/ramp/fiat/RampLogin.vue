<template>
  <q-dialog v-model="show" persistent maximized no-shake transition-show="slide-up">
    <q-card class="br-15 pt-card-2 text-bow q-pb-sm" :class="getDarkModeClass(darkMode)">
      <div class="row justify-center q-py-lg q-my-lg q-mx-lg">
        <div class="col-1">
           <q-icon
            size="md" name="arrow_back" class="text-grad"
            @click="$router.push('/apps')"
            :style="`margin-top: ${$q.platform.is.ios ? '-5px' : '0'}`"/>
        </div>
        <div class="col-10">
          <p
            ref="header-title"
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': isNotDefaultTheme || darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            {{ user?.is_arbiter ? 'Ramp Appeals' : 'P2P Exchange' }}
          </p>
        </div>
        <div class="col-1">
          <slot name="top-right-menu" v-bind="{ isNotDefaultTheme }">&nbsp;</slot>
        </div>
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
                <q-btn v-if="register && !loggingIn" round dense flat icon="send" :disable="!isValidNickname || user?.is_arbiter" @click="onRegisterUser" />
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
import { wallet } from 'src/exchange/wallet'
import { backend } from 'src/exchange/backend'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getAuthToken, saveAuthToken, deleteAuthToken } from 'src/exchange/auth'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import { loadChatIdentity } from 'src/exchange/chat'
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
      // rampWallet: null,
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
    this.loadUser()
  },
  beforeUnmount () {
    bus.emit('relogged')
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async loadUser (forceLogin = false) {
      const vm = this
      try {
        const { data: user } = await backend.get('/auth/')
        console.log('user:', user)
        vm.user = user
        vm.usernickname = user?.name
        vm.isLoading = false

        // login user if not authenticated
        vm.hintMessage = vm.$t('LoggingYouIn')
        const token = await getAuthToken()
        if (!token) forceLogin = true
        if (!user.is_authenticated || forceLogin) {
          await vm.login()
        }

        // load chat identity
        vm.hintMessage = this.$t('LoadingChatIdentity')
        const usertype = user.is_arbiter ? 'arbiter' : 'peer'
        const params = { name: user.name, chat_identity_id: user.chat_identity_id }
        await loadChatIdentity(usertype, params)

        await vm.savePubkeyAndAddress()
        vm.$emit('loggedIn', vm.user.is_arbiter ? 'arbiter' : 'peer')
        vm.$store.commit('ramp/updateUser', user)
      } catch (error) {
        vm.isLoading = false
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 404) {
            vm.register = true
          }
        } else {
          console.error(error)
          bus.emit('network-error')
        }
      }
    },
    async login () {
      const vm = this
      vm.hintMessage = null
      vm.errorMessage = null
      deleteAuthToken()
      try {
        vm.loggingIn = true
        const { data: { otp } } = await backend(`/auth/otp/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`)
        const keypair = await wallet.keypair()
        const signature = await wallet.signMessage(keypair.privateKey, otp)
        const body = {
          wallet_hash: wallet.walletHash,
          signature: signature,
          public_key: keypair.publicKey
        }
        const loginResponse = await backend.post(`/auth/login/${vm.user.is_arbiter ? 'arbiter' : 'peer'}`, body)
        if (vm.user) {
          saveAuthToken(loginResponse.data.token)
        }
      } catch (error) {
        console.log(error.response || error)
        if (error.response) {
          vm.errorMessage = error.response?.data?.error || error
          if (vm.errorMessage.includes('disabled')) {
            vm.errorMessage = vm.$t('ThisAccountIsDisabled')
          }
          console.log('errorMessage:', vm.errorMessage)
        } else {
          bus.emit('network-error')
        }
      }
      vm.loggingIn = false
      return await getAuthToken()
    },
    savePubkeyAndAddress () {
      return new Promise((resolve, reject) => {
        const vm = this
        vm.hintMessage = this.$t('UpdatingPubkeyAndAddress')
        const usertype = vm.user.is_arbiter ? 'arbiter' : 'peer'
        wallet.pubkey().then(async pubkey => {
          const payload = {
            public_key: pubkey,
            address: await wallet.address(),
            address_path: wallet.addressPath()
          }
          console.log('payload:', payload)
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
    async onRegisterUser () {
      this.loggingIn = true
      // register user
      await this.registerUser()
      // load new user
      await this.loadUser(true)
    },
    async registerUser () {
      const vm = this
      vm.errorMessage = null
      const timestamp = Date.now()
      const keypair = await wallet.keypair()
      const signature = await wallet.signMessage(keypair.privateKey, 'PEER_CREATE', timestamp)
      const headers = {
        timestamp: timestamp,
        signature: signature,
        'public-key': keypair.publicKey
      }
      const body = {
        name: vm.usernickname,
        address: await wallet.address(),
        address_path: wallet.addressPath()
      }
      await backend.post('/ramp-p2p/peer/', body, { headers: headers })
        .then((response) => {
          vm.user = response.data
          vm.$store.commit('ramp/updateUser', vm.user)
          console.log('Created user:', vm.user)
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
  .header-grad {
    color: -webkit-linear-gradient(red, yellow);
  }
</style>
