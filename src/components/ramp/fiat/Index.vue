<template>
  <div>
    <div v-if="isLoading" class="row justify-center q-ma-lg q-pa-lg">
      <ProgressLoader/>
    </div>
    <div v-else>
      <div v-if="proceed">
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
        <footerMenu
          v-on:clicked="switchMenu"
          ref="footer"
        />
      </div>
      <div v-else>
        <MiscDialogs
          :type="'editNickname'"
          v-on:submit="createRampUser"
          v-on:back="processDialog()"
        />
      </div>
    </div>
  </div>
</template>
<script>
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
import FiatOrders from './FiatOrders.vue'
import FiatAds from './FiatAds.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'
import { loadP2PWalletInfo } from 'src/wallet/ramp'
import { signMessage } from 'src/wallet/ramp/signature'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL,
      walletIndex: this.$store.getters['global/getWalletIndex'],
      network: 'BCH',
      menu: 'store',
      isLoading: true,
      wallet: null,
      user: null,
      proceed: false,
      createUser: false,
      initStatusType: 'ONGOING'
    }
  },
  components: {
    footerMenu,
    FiatStore,
    FiatOrders,
    FiatAds,
    FiatProfileCard,
    MiscDialogs,
    ProgressLoader
  },
  async mounted () {
    const walletInfo = this.$store.getters['global/getWallet']('bch')
    this.wallet = await loadP2PWalletInfo(walletInfo, this.walletIndex)
    this.login()
  },
  watch: {
    menu (val) {
      this.$router.push({ name: 'ramp-fiat-' + val })
    }
  },
  methods: {
    async login () {
      try {
        const { data } = await this.$axios.get(`${this.apiURL}/auth/otp`, { headers: { 'wallet-hash': this.wallet.walletHash } })
        const signature = await signMessage(this.wallet.privateKeyWif, data.otp)
        const body = {
          wallet_hash: this.wallet.walletHash,
          signature: signature,
          public_key: this.wallet.publicKey
        }
        await this.$axios.post(`${this.apiURL}/auth/login`, body)
          .then(response => {
            // save token as cookie and set to expire 1h later
            document.cookie = `token=${response.data.token}; expires=${new Date(Date.now() + 3600000).toUTCString()}; path=/`
            this.user = response.data.user
            if (this.user) {
              this.$store.commit('ramp/updateUser', response.data.user)
              this.proceed = true
            }
            this.isLoading = false
          })
      } catch (error) {
        console.error(error.response)
        this.isLoading = false
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
    async createRampUser (value) {
      this.createUser = true
      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo, this.walletIndex)
      await this.$store.dispatch('ramp/createUser', { nickname: value.nickname, wallet: wallet })
      this.proceed = true
    },
    onOrderCanceled () {
      this.switchMenu('orders')
      this.initStatusType = 'COMPLETED'
    }
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
