<template>
  <div>
    <div v-if="isLoading" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader/>
    </div>
    <div v-else>
      <div class="q-mt-md">
        <FiatStore
          v-if="menu === 'store'"
          @order-canceled="onOrderCanceled"
        />
        <FiatOrders
          v-if="menu === 'orders'"
          :init-status-type="initStatusType"
        />
        <FiatAds v-if="menu === 'ads'"/>
        <FiatProfileCard
          v-if="menu === 'profile'"
          v-on:back="menu = 'store'; $refs.footer.selectMenu('store')"
        />
      </div>
      <footerMenu v-on:clicked="switchMenu" ref="footer"/>
    </div>
  </div>
</template>
<script>
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
import FiatOrders from './FiatOrders.vue'
import FiatAds from './FiatAds.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { signMessage } from 'src/wallet/ramp/signature'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL,
      wallet: null,
      network: 'BCH',
      menu: 'store',
      isLoading: true,
      user: null,
      proceed: false,
      createUser: false,
      initStatusType: 'ONGOING',
      hasAccount: false,
      userType: null
    }
  },
  components: {
    footerMenu,
    FiatStore,
    FiatOrders,
    FiatAds,
    FiatProfileCard,
    ProgressLoader
  },
  emits: ['loggedIn'],
  async mounted () {
    await this.$store.dispatch('ramp/loadWallet')
    this.wallet = this.$store.getters['ramp/wallet']
    this.isLoading = false
  },
  watch: {
    menu (val) {
      this.$router.push({ name: 'ramp-fiat-' + val })
    }
  },
  methods: {
    loggedInAs (userType) {
      this.loggingIn = false
      this.userType = userType
      this.$emit('loggedIn', userType)
    },
    async login () {
      try {
        console.log('wallet:', this.wallet)
        const { data } = await this.$axios.get(`${this.apiURL}/auth/otp/peer`, { headers: { 'wallet-hash': this.wallet.walletHash } })
        console.log('data:', data)
        const signature = await signMessage(this.wallet.privateKeyWif, data.otp)
        const body = {
          wallet_hash: this.wallet.walletHash,
          signature: signature,
          public_key: this.wallet.publicKey
        }
        await this.$axios.post(`${this.apiURL}/auth/login/peer`, body)
          .then(response => {
            console.log('response:', response)
            // save token as cookie and set to expire 1h later
            document.cookie = `token=${response.data.token}; expires=${new Date(Date.now() + 3600000).toUTCString()}; path=/`
            this.user = response.data.user
            if (this.user) {
              this.$store.commit('ramp/updateUser', response.data.user)
              this.$store.dispatch('ramp/loadAuthHeaders')
                .then(() => {
                  this.hasAccount = true
                  this.proceed = true
                  this.isLoading = false
                })
            }
          })
      } catch (error) {
        console.error(error)
        console.error(error.response)
        // setTimeout(function () {
        //   console.log('hello')
        this.isLoading = false
        // }, 3000)
      }
    },
    switchMenu (item) {
      this.menu = item
      this.$refs.footer.selectMenu(this.menu)
    },
    processDialog () {
      if (!this.proceed && !this.createUser) {
        this.$router.go(-2)
      }
    },
    onOrderCanceled () {
      this.switchMenu('orders')
      this.initStatusType = 'COMPLETED'
    }
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
