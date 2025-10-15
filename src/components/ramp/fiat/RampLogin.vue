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
              :loading="inputLoading"
              :error="errorMessage !== null"
              v-model="usernickname"
              maxlength="15"
              :counter="register"
              >
              <template v-slot:append>
                <!-- <q-btn v-if="!register" round dense flat icon="logout" @click="revokeAuth"/> -->
                <!-- <q-btn v-if="!register && usernickname" disable round dense flat icon="swap_horiz" /> -->
                <q-btn v-if="register && !inputLoading" round dense flat icon="send" :disable="!isValidNickname || user?.is_arbiter" @click="onRegisterUser" />
              </template>
              <template v-slot:hint>
                <div class="row justify-center text-center">{{ hintMessage }}</div>
              </template>
              <template v-slot:error>
                <div class="row justify-center text-center">{{ errorMessage }}</div>
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
import { backend } from 'src/exchange/backend'
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
      return this.usernickname && this.usernickname.length > 0
    },
    inputLoading () {
      return this.loggingIn || (!this.usernickname && !this.register) || this.isLoading
    }
  },
  watch: {
    loggingIn (value) {
      if (value && !this.register) {
        this.$q.loading.show()
      }
      if (!value) {
        setTimeout(() => {
          this.$q.loading.hide()
        }, 1500)
      }
    }
  },
  created () {
    bus.on('next-login-step', this.onNextLoginStep)
    bus.on('logging-in', this.onLoggingIn)
  },
  async mounted () {
    if (this.error) this.errorMessage = this.error
    this.loadUser()
  },
  beforeUnmount () {
    bus.emit('relogged')
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
      } catch (error) {
        if (!error.response) {
          bus.emit('network-error')
        } else if (error.response.status === 404) {
          this.register = true
        }
      }
      this.isLoading = false
    },
    async onRegisterUser () {
      this.loggingIn = true
      await this.registerUser()
      await this.loadUser(true)
      this.loggingIn = false
      this.register = false
    },
    async registerUser () {
      const vm = this
      vm.errorMessage = null
      const libauthWallet = wallet.wallet
      const timestamp = Date.now()
      const addressPath = wallet.addressPath()
      const privkey = libauthWallet.getPrivateKeyWifAt(addressPath)
      const pubkey = libauthWallet.getPubkeyAt(addressPath)
      const address = libauthWallet.getAddressAt({ path: addressPath })
      const signature = wallet.signMessage(privkey, 'PEER_CREATE', timestamp)
      const headers = {
        timestamp: timestamp,
        signature: signature,
        'public-key': pubkey
      }
      const body = {
        name: vm.usernickname,
        address: address,
        address_path: addressPath
      }
      await backend.post('/ramp-p2p/peer/', body, { headers: headers })
        .then((response) => {
          vm.user = response.data
          vm.$store.commit('ramp/updateUser', vm.user)
          console.log('Created user:', vm.user)
        })
        .catch(error => { vm.handleError(error) })
    },
    handleError (error) {
      console.error(error)
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
      } else if (this.isRequestError()) {
        return `${error.response.status} ${error.response.data?.error}`
      } else {
        return error
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
