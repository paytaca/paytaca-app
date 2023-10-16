<template>
    <q-card
    class="br-15 q-pt-md q-mx-md q-mx-none q-mb-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${minHeight}px;`">

    <div v-if="!isLoading" class="row justify-center" style="margin-top: 30%">
        <div>
            <div class="row justify-center q-mt-lg">
                <div class="q-mx-lg q-mb-sm" style="font-weight: 200; font-size: 20px;">
                    {{ register ? "Sign up" : "Sign in"}} as
                </div>
                <q-input
                    :dark="darkMode"
                    :disable="!register || isArbiter"
                    :readonly="!register || isArbiter"
                    rounded
                    standout
                    dense
                    placeholder="Enter nickname"
                    v-model="usernickname"
                    class="row q-mx-md">
                    <template v-slot:append>
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
            <div  class="row q-mx-lg q-px-md q-my-md">
                <q-card flat v-if="isArbiter" class="col q-mx-md q-pa-md bg-blue-1 pp-text">
                    <div class="row">
                        <q-icon class="col-auto q-my-xs" name="info" left/>
                        <span class="col">Arbiter accounts cannot sign up as Peer.</span>
                    </div>
                </q-card>
            </div>
        </div>
    </div>
    </q-card>
</template>
<script>
import { signMessage } from 'src/wallet/ramp/signature'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { Dialog } from 'quasar'

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
      nickname: '',
      isArbiter: false,
      loggingIn: false,
      errorMessage: null
    }
  },
  emits: ['login', 'createUser'],
  async mounted () {
    this.wallet = this.$store.getters['ramp/wallet']
    this.dialog = true
    await this.getProfile()
    this.isLoading = false
    // this.getOTP()
  },
  computed: {
    isValidNickname () {
      return this.usernickname && this.usernickname.length > 0
    }
  },
  methods: {
    onLoginClick () {
      console.log('onLoginClick')
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
      const url = `${this.apiURL}/ramp-p2p/peer/profile`
      await this.$axios.get(url, { headers: { 'wallet-hash': this.wallet.walletHash } })
        .then(response => {
          this.user = response.data.user
          console.log('user:', this.user)
        })
        .catch(error => {
          console.error(error.response)
          this.isArbiter = error.response.data.is_arbiter
          if (error.response.status === 404) {
            this.register = true
          }
        })
    },
    async login () {
      try {
        const { data } = await this.$axios.get(`${this.apiURL}/auth/otp/peer`, { headers: { 'wallet-hash': this.wallet.walletHash } })
        const signature = await signMessage(this.wallet.privateKeyWif, data.otp)
        const body = {
          wallet_hash: this.wallet.walletHash,
          signature: signature,
          public_key: this.wallet.publicKey
        }
        await this.$axios.post(`${this.apiURL}/auth/login/peer`, body)
          .then(response => {
            // console.log('response:', response)
            // save token as cookie and set to expire 1h later
            document.cookie = `token=${response.data.token}; expires=${new Date(Date.now() + 3600000).toUTCString()}; path=/`
            this.user = response.data.user
            if (this.user) {
              this.$store.commit('ramp/updateUser', response.data.user)
              this.$store.dispatch('ramp/loadAuthHeaders')
            }

            // this.$emit('login')
            this.dialog = false
          })
      } catch (error) {
        console.log(error)
        console.log(error.response)
        if ('data' in error.response) {
          if (error.response.data.error === 'Wallet not found') {
            this.hasAccount = false
          } else {
            this.hasAccount = true
          }
        }
      }
    },
    async createRampUser () {
      const timestamp = Date.now()
      const url = `${this.apiURL}/ramp-p2p/peer/create`
      // this.$store.dispatch('ramp/createUser', this.nickname)
      try {
        const signature = await signMessage(this.wallet.privateKeyWif, 'PEER_CREATE', timestamp)
        const headers = {
          'wallet-hash': this.wallet.walletHash,
          timestamp: timestamp,
          signature: signature,
          'public-key': this.wallet.publicKey
        }
        const body = {
          nickname: this.nickname,
          address: this.wallet.address
        }
        const { data: user } = await this.$axios.post(url, body, { headers: headers })
        this.user = user
        this.$store.commit('ramp/updateUser', user)
      } catch (error) {
        console.error(error)
        console.error(error.response)
      }
      // this.user = await this.$store.dispatch('ramp/createUser', { nickname: this.nickname, wallet: this.wallet })

      if (this.user) {
        this.state = 'login'
        await this.fetchOTP()
        this.login()
      }
    }
  }
}
</script>
<style scoped>
.scrollable {
  max-height: 110px; /* Adjust as needed */
  overflow-y: scroll;
}
</style>
