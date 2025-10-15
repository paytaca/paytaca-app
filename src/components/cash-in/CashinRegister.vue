<template>
  <div class="text-center" style="margin-top: 40px;">
    <div class="text-bow" style="font-size: large;">{{ $t('SignUpTo') }}</div>
    <div :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 25px;">P2P Exchange</div>
  </div>
  <div>
    <q-input
      class="row justify-center q-mt-md q-mx-lg q-px-lg text-bow"
      rounded
      standout
      dense
      hide-bottom-space
      bottom-slots
      v-model="username"
      :placeholder="$t('EnterUsername')"
      :error="!!errorMessage"
      :loading="loggingIn"
      maxlength="15"
      counter
      >
      <template v-slot:append>
        <q-btn v-if="!loggingIn" round dense flat icon="send" @click="registerUser" />
      </template>
      <template v-slot:error>
        <div class="row justify-center text-center">{{ errorMessage }}</div>
      </template>
    </q-input>
  </div>
</template>
<script>
import { backend } from 'src/exchange/backend'
import { deleteAuthToken } from 'src/exchange/auth'
import { wallet } from 'src/exchange/wallet'

export default {
  data () {
    return {
      username: '',
      errorMessage: null,
      loggingIn: false
    }
  },
  emits: ['login'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    async registerUser () {
      const vm = this
      const timestamp = Date.now()
      vm.errorMessage = null
      vm.loggingIn = true
      deleteAuthToken()
      try {
        const keypair = wallet.keypair()
        const signature = wallet.signMessage(keypair.privateKey, 'PEER_CREATE', timestamp)
        const headers = {
          timestamp: timestamp,
          signature: signature,
          'public-key': keypair.publicKey
        }
        const body = {
          name: vm.username,
          address: wallet.address(),
          address_path: wallet.addressPath()
        }
        await backend.post('/ramp-p2p/peer/', body, { headers: headers })
          .then((response) => {
            vm.user = response.data
            vm.$store.commit('ramp/updateUser', vm.user)
            console.log('Created user:', vm.user)
            vm.errorMessage = null
            vm.$emit('login')
          })
          .catch(error => {
            vm.handleError(error)
          })
      } catch (error) {
        vm.handleError(error)
      }
    },
    handleError (error) {
      console.error(error.response || error)
      this.loggingIn = false
      this.errorMessage = error.response?.data?.error || error.response?.data?.name
    }
  }
}
</script>
