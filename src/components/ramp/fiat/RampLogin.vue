<template>
  <q-dialog v-model="register" persistent maximized no-shake transition-show="slide-up" transition-hide="slide-down">
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
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            {{ user?.is_arbiter ? 'Ramp Appeals' : 'P2P Ramp' }}
          </p>
        </div>
        <div class="col-1">
          <slot name="top-right-menu">&nbsp;</slot>
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
              :hide-hint="!hintMessage && !retrySeconds"
              :dark="darkMode"
              :readonly="!register || user?.is_arbiter"
              :disable="loggingIn || registering"
              :placeholder="register ? $t('EnterNickname') : ''"
              :loading="inputLoading"
              :error="errorMessage !== null"
              v-model="usernickname"
              maxlength="15"
              :counter="register"
              >
              <template v-slot:append>
                <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
                <!-- <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" /> -->
                <q-btn v-if="register && !inputLoading" round dense flat icon="send" :disable="!isValidNickname || user?.is_arbiter || registering || retrySeconds > 0" @click="onRegisterUser" />
              </template>
              <template v-slot:hint>
                <div class="row justify-center text-center">{{ retrySeconds ? $t('RegistrationRetryIn', { seconds: retrySeconds }, `Retry in ${retrySeconds}s`) : hintMessage }}</div>
              </template>
              <template v-slot:error>
                <div class="row justify-center text-center">{{ errorMessage }}<span v-if="retrySeconds">&nbsp;{{ $t('RegistrationRetryIn', { seconds: retrySeconds }, `Retry in ${retrySeconds}s`) }}</span></div>
              </template>
            </q-input>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { wallet } from 'src/exchange/wallet'
import { registerP2PAccount, getRegistrationRetrySeconds } from 'src/exchange/backend'
import { loadAuthenticatedUser } from 'src/exchange/auth'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      show: true,
      user: null,
      usernickname: '',
      isLoading: true,
      register: false,
      loggingIn: false,
      registering: false,
      registrationVersion: 0,
      retrySeconds: 0,
      retryTimer: null,
      errorMessage: null,
      hintMessage: null
    }
  },
  emits: ['loggedIn'],
  props: {
    error: String,
    forceLogin: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isValidNickname () {
      return typeof this.usernickname === 'string' && this.usernickname.trim().length > 0 && this.usernickname.length <= 15
    },
    registrationIdentity () {
      return JSON.stringify([
        this.$store.getters['global/getWallet']('bch')?.walletHash,
        this.$store.getters['global/getWalletIndex'],
        this.$store.getters['global/isChipnet'],
        this.user?.is_arbiter, this.user?.user_type
      ])
    },
    inputLoading () {
      return this.loggingIn || this.registering || (!this.usernickname && !this.register) || this.isLoading
    }
  },
  watch: {
    usernickname: { flush: 'sync', handler () { this.registrationVersion++ } },
    registrationIdentity: { flush: 'sync', handler () { this.registrationVersion++ } }
  },
  created () {
    bus.on('next-login-step', this.onNextLoginStep)
    bus.on('logging-in', this.onLoggingIn)
    this.retrySeconds = getRegistrationRetrySeconds()
    this.retryTimer = setInterval(() => { this.retrySeconds = getRegistrationRetrySeconds() }, 1000)
  },
  beforeUnmount () {
    this.registrationVersion++
    clearInterval(this.retryTimer)
    bus.off('next-login-step', this.onNextLoginStep)
    bus.off('logging-in', this.onLoggingIn)
  },
  async mounted () {
    if (this.error) this.errorMessage = this.error
    this.loadUser()
  },
  methods: {
    getDarkModeClass,
    onLoggingIn (value) {
      this.loggingIn = value
    },
    onNextLoginStep (step) {
      this.hintMessage = this.$t(step)
    },
    async loadUser (forceLogin = this.forceLogin) {
      try {
        this.isLoading = true
        this.user = await loadAuthenticatedUser(forceLogin)
        this.$emit('loggedIn', this.user.user_type)
        this.$store.commit('ramp/updateUser', this.user)
        // Only notify the app to refetch data after a successful login.
        // Emitting on unmount can cause refresh loops if the dialog is closed/cancelled.
        bus.emit('relogged')
        return true
      } catch (error) {
        if (error.code === 'p2p_identity_mismatch') {
          this.errorMessage = error.message
        } else if (!error.response) {
          bus.emit('network-error')
        } else if (error.code === 'p2p_account_missing' || error.response.status === 404) {
          this.register = true
        } else {
          this.errorMessage = this.getErrorMessageByType(error)
        }
      } finally {
        this.isLoading = false
      }
    },
    async onRegisterUser () {
      if (this.registering || this.loggingIn || this.isLoading || !this.isValidNickname || this.user?.is_arbiter || getRegistrationRetrySeconds()) return
      this.registering = true
      this.loggingIn = true
      try {
        await this.registerUser()
        if (await this.loadUser(true)) this.register = false
      } catch (error) {
        this.handleError(error)
      } finally {
        this.retrySeconds = getRegistrationRetrySeconds()
        this.registering = false
        this.loggingIn = false
      }
    },
    async registerUser () {
      if (!this.isValidNickname || this.user?.is_arbiter) throw new Error('Please enter a valid nickname.')
      this.errorMessage = null
      const version = this.registrationVersion
      const nickname = this.usernickname
      const identity = this.registrationIdentity
      const body = {
        name: nickname,
        address: wallet.address(),
        address_path: wallet.addressPath()
      }
      await registerP2PAccount('peer', body, () => version === this.registrationVersion && nickname === this.usernickname && identity === this.registrationIdentity)
    },
    handleError (error) {
      if (this.isNetworkError(error)) {
        bus.emit('network-error')
      }
      this.errorMessage = this.getErrorMessageByType(error)
      this.isLoading = false
      this.loggingIn = false
    },
    getErrorMessageByType (error) {
      if (this.isNetworkError(error)) {
        return 'Network error'
      } else if (this.isRequestError(error)) {
        return `${error.response.status} ${error.response.data?.error}`
      } else {
        return error.message || 'Registration failed. Please try again.'
      }
    },
    isNetworkError (error) {
      return error.isAxiosError && !error.response
    },
    isRequestError (error) {
      return error.response
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
