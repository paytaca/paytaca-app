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
            class="row justify-center q-mx-lg q-mb-sm"
            style="margin-top: 30%; font-weight: 400; font-size: 20px;">
              {{ register ? "Sign up" : "Sign in"}} as {{ isArbiter ? "Arbiter" : "Peer"}}
          </div>
          <q-input
            :dark="darkMode"
            :readonly="!register || isArbiter"
            rounded
            standout
            dense
            :placeholder="register ? 'Enter nickname' : ''"
            v-model="usernickname"
            :loading="!usernickname"
            class="row q-mx-md">
            <template v-slot:append>
              <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
              <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" />
              <q-btn v-if="register" round dense flat icon="send" :disable="!isValidNickname && isArbiter" @click="createRampUser" />
            </template>
          </q-input>
        </div>
        <div v-if="!register" class="row justify-center q-mt-lg">
          <q-btn dense stack class="q-px-xs" :disable="loggingIn || !usernickname" @click="onLoginClick('biometric')" v-if="hasBiometric">
            <q-icon class="q-mt-sm" size="50px" name="fingerprint" />
            <span class="text-center q-my-sm q-mx-md">Biometrics</span>
          </q-btn>
          <q-btn dense stack class="q-px-lg" :class="hasBiometric ? 'q-mx-sm' : 'q-mx-lg'" :disable="loggingIn  || !usernickname" @click="onLoginClick('pin')">
            <q-icon class="q-mt-sm" size="50px" name="apps" />
            <span class="text-center q-my-sm q-mx-md">MPIN</span>
          </q-btn>
        </div>
        <div v-if="errorMessage" class="row q-mx-lg q-px-md q-my-md">
            <q-card flat class="col q-mx-md q-pa-md bg-red-1 pp-text">
                <q-icon name="error" left/>
                Error: {{ errorMessage }}
            </q-card>
        </div>
        <div class="row justify-center align-center q-pb-md q-mb-lg" style="position:absolute; margin-bottom: 5%; font-weight: 300; font-size: 20px; left: 50%; bottom: 0; transform: translate(-50%, 0);">
            <span>{{ isArbiter ? "APPEALS" : "PEER-TO-PEER"}}</span>
        </div>
      </div>
    </div>
  </q-card>
</template>
<script>
import { signMessage } from 'src/wallet/ramp/signature'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Dialog } from 'quasar'
import { getCookie } from 'src/wallet/ramp'

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
      hasBiometric: false
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
    // check if has Biometric
    this.checkBiometric()
    this.dialog = true
    if (this.error) {
      this.errorMessage = this.error
    }
    this.getProfile()
    this.isLoading = false
  },
  methods: {
    async checkBiometric () {
      NativeBiometric.isAvailable()
        .then(result => {
          console.log(result)
          this.hasBiometric = true
        },
        (error) => {
          console.log('Implementation error: ', error)
        })
    },
    onLoginClick (type) {
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
        })
        .onCancel(() => {
          this.loggingIn = false
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
        },
        (error) => {
          // Failed to authenticate
          this.loggingIn = false
          this.errorMessage = 'Failed to Authenticate'
          console.log(error)
        }
        )
    },
    async getProfile () {
      this.$store.dispatch('ramp/loadWallet')
        .then(() => {
          this.wallet = this.$store.getters['ramp/wallet']
          const url = `${this.apiURL}/ramp-p2p/user`
          this.$axios.get(url, { headers: { 'wallet-hash': this.wallet.walletHash } })
            .then(response => {
              console.log('response:', JSON.stringify(response))
              if (response.data && response.data.user) {
                console.log(JSON.stringify(response.data))
                this.isArbiter = response.data.is_arbiter
                this.user = response.data.user
                this.usernickname = this.user.name
                if (this.user) {
                  this.$store.commit('ramp/updateUser', this.user)
                  this.$store.dispatch('ramp/loadAuthHeaders')
                }
                // const token = getCookie('token')
                // if (token) {
                //   this.$emit('loggedIn', this.isArbiter ? 'arbiter' : 'peer')
                // }
              } else {
                this.register = true
              }
            })
            .catch(error => {
              console.log('error:', JSON.stringify(error))
              console.error(error)
              if (error.response) {
                console.log('error.response:', JSON.stringify(error.response))
                console.error(error.response)
                this.errorMessage = error.response.data
              }
            })
        })
    },
    async login () {
      try {
        let otpUrl = `${this.apiURL}/auth/otp/`
        let loginUrl = `${this.apiURL}/auth/login/`
        if (this.isArbiter) {
          otpUrl += 'arbiter'
          loginUrl += 'arbiter'
        } else {
          otpUrl += 'peer'
          loginUrl += 'peer'
        }

        const { data } = await this.$axios.get(otpUrl, { headers: { 'wallet-hash': this.wallet.walletHash } })
        const signature = await signMessage(this.wallet.privateKeyWif, data.otp)
        const body = {
          wallet_hash: this.wallet.walletHash,
          signature: signature,
          public_key: this.wallet.publicKey
        }
        await this.$axios.post(loginUrl, body)
          .then(response => {
            // save token as cookie and set to expire 1h later
            document.cookie = `token=${response.data.token}; expires=${new Date(response.data.expires_at).toUTCString()}; path=/`
            this.user = response.data.user
            if (this.user) {
              this.$store.commit('ramp/updateUser', this.user)
              this.$store.dispatch('ramp/loadAuthHeaders')
            }

            let userType
            if (this.isArbiter) userType = 'arbiter'
            else userType = 'peer'

            this.$emit('loggedIn', userType)
          })
      } catch (error) {
        console.log(error)
        console.log(error.response)
        if (!('data' in error.response)) {
          console.log('network error')
        }
      }
    },
    async createRampUser () {
      const timestamp = Date.now()
      const url = `${this.apiURL}/ramp-p2p/peer/create`
      try {
        const signature = await signMessage(this.wallet.privateKeyWif, 'PEER_CREATE', timestamp)
        const headers = {
          'wallet-hash': this.wallet.walletHash,
          timestamp: timestamp,
          signature: signature,
          'public-key': this.wallet.publicKey
        }
        const body = {
          name: this.usernickname,
          address: this.wallet.address
        }
        console.log('body: ', body)
        const { data: user } = await this.$axios.post(url, body, { headers: headers })
        this.user = user
        this.$store.commit('ramp/updateUser', user)
      } catch (error) {
        console.error(error)
        console.error(error.response)
      }
      this.login()
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
    }
  }
}
</script>
