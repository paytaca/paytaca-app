<template>
    <q-card
    class="position-relative br-15 q-pt-md q-mx-md q-mx-none q-mb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px; position: relative;`">

    <div v-if="isLoading">
      <div class="row justify-center q-py-lg" style="margin-top: 50%">
        <ProgressLoader/>
      </div>
    </div>
    <div v-else class="row justify-center" style="margin-top: 5%">
        <div>
            <div class="q-mt-md">
                <div class="row justify-center q-mx-lg q-mb-sm" style="margin-top: 30%; font-weight: 200; font-size: 20px;">
                    {{ register ? "Sign up" : "Sign in"}} as {{ isArbiter ? "Arbiter" : "Peer"}}
                </div>
                <q-input
                    :dark="darkMode"
                    :readonly="!register || isArbiter"
                    rounded
                    standout
                    dense
                    placeholder="Enter nickname"
                    v-model="usernickname"
                    class="row q-mx-lg q-px-lg">
                    <template v-slot:append>
                        <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
                        <q-btn v-if="!register" round dense flat icon="swap_horiz" />
                        <q-btn v-if="register" round dense flat icon="send" :disable="!isValidNickname && isArbiter" @click="createRampUser" />
                    </template>
                </q-input>
            </div>

            <div v-if="!register" class="row justify-center q-mt-lg q-px-lg q-mx-lg">
                <q-btn dense stack class="col q-mx-sm" :disable="loggingIn" @click="onLoginClick">
                    <div class="q-ma-sm text-center">
                        <div class="row justify-center">
                            <q-icon size="50px" name="fingerprint" />
                        </div>
                        <div class="text-center q-mt-sm">
                            Biometrics
                        </div>
                    </div>
                </q-btn>
                <q-btn dense stack class="col q-mx-sm" :disable="loggingIn" @click="onLoginClick">
                    <div class="q-ma-xs">
                        <div class="row justify-center">
                            <q-icon size="50px" name="apps" />
                        </div>
                        <div class="text-center q-mt-sm">MPIN</div>
                    </div>
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
      wallet: this.$store.getters['ramp/wallet'],
      isLoading: true,
      register: false,
      isArbiter: false,
      loggingIn: false,
      errorMessage: null
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
  async mounted () {
    this.dialog = true
    await this.getProfile()
    this.isLoading = false
    if (this.error) {
      this.errorMessage = this.error
    }
  },
  methods: {
    onLoginClick () {
      this.showSecurityDialog()
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
    async getProfile () {
      const url = `${this.apiURL}/ramp-p2p/user`
      await this.$axios.get(url, { headers: { 'wallet-hash': this.wallet.walletHash } })
        .then(response => {
          this.isArbiter = response.data.is_arbiter
          this.user = response.data.user
          this.usernickname = this.user.name
          if (this.user) {
            this.$store.commit('ramp/updateUser', this.user)
            this.$store.dispatch('ramp/loadAuthHeaders')
          }
          const token = getCookie('token')
          if (token) {
            this.$emit('loggedIn', this.isArbiter ? 'arbiter' : 'peer')
          }
        })
        .catch(error => {
          console.error(error.response)
          if (error.response) {
            if (error.response.status === 404) {
              this.register = true
            }
          }
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
          name: this.nickname,
          address: this.wallet.address
        }
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
