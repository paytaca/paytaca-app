<template>
  <q-dialog maximized persistent v-model="dialog">
    <q-card class="bg-blue-6 text-white text-center">
      <div v-if="state === 'standby'">
        <div style="margin-top: 75%; font-weight: 500; font-size: 30px;">
          Click to Log in
        </div>
        <q-btn class="q-mt-md" padding="md" outline round color="white" icon="login" size="1.5em" @click="loginProcess()"/>
      </div>

      <div v-if="state === 'login'">
        <div style="margin-top: 75%; font-weight: 500; font-size: 30px;">
          Logging in...
        </div>
        <q-spinner-hourglass class="q-pt-sm" size="80px" color="white" />
      </div>

      <!-- Register Account -->
      <div v-if="state === 'register'" style="margin-top: 75%; font-weight: 500; font-size: 30px;">
        <div>
          Set Nickname
        </div>
        <div class="q-mx-lg q-px-lg">
          <q-input dark dense outlined rounded v-model="nickname">
            <template v-slot:append>
              <q-icon name="login" @click="createRampUser()"/>
            </template>
          </q-input>
        </div>
      </div>

      <!-- OTP request error -->
      <div v-if="state === 'otp-error'">
        <div style="margin-top: 75%; font-weight: 500; font-size: 30px;">
          Network Error
        </div>
        <q-btn outline round color="white" icon="refresh" size="1.5em"/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { signMessage } from 'src/wallet/ramp/signature'

export default {
  data () {
    return {
      apiURL: process.env.WATCHTOWER_BASE_URL,
      dialog: false,
      hasAccount: false,
      user: null,
      wallet: null,
      isLoading: true,
      state: 'standby',
      nickname: '',
      auth: null
    }
  },
  emits: ['login', 'createUser'],
  methods: {
    async loginProcess () {
      await this.fetchOTP()

      if (this.state === 'login') {
        this.login()
      }
    },
    async login () {
      try {
        // const { data } = await this.$axios.get(`${this.apiURL}/auth/otp/peer`, { headers: { 'wallet-hash': this.wallet.walletHash } })
        const signature = await signMessage(this.wallet.privateKeyWif, this.auth.otp)
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

            this.$emit('login')
            this.dialog = false
          })
      } catch (error) {
        console.log(error)
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
    },
    async fetchOTP () {
      try {
        const { data } = await this.$axios.get(`${this.apiURL}/auth/otp/peer`, { headers: { 'wallet-hash': this.wallet.walletHash } })
        this.auth = data
        this.state = 'login'
      } catch (error) {
        const resp = error.response
        this.state = 'otp-error'
        if (resp.data) {
          if (resp.data.error === 'Wallet not found') {
            this.state = 'register'
          } else { this.state = 'otp-error' }
        } else {
          this.state = 'otp-error'
        }
      }
    }
  },
  async mounted () {
    this.wallet = this.$store.getters['ramp/wallet']
    this.dialog = true

    this.isLoading = false
  }
}
</script>
