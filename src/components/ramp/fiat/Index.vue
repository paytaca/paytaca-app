<template>
  <!-- <div v-if="proceed">
    <FiatStore v-if="menu === 'store'"/>
    <FiatOrders v-if="menu === 'orders'"/>
    <FiatAds v-if="menu === 'ads'"/>
    <FiatProfileCard
      v-if="menu === 'profile'"
      v-on:back="menu = 'store'"
    />
    <footerMenu
      v-on:clicked="switchMenu"
    />
  </div>
  <div v-else>
    <MiscDialogs
      :type="'editNickname'"
      v-on:submit="updateNickname"
      v-on:back="proceed ? '' : $router.go(-1)"
    /> -->
  <div>
    <div v-if="isLoading" class="row justify-center q-ma-lg q-pa-lg">
      <ProgressLoader/>
    </div>
    <div v-else>
        <div v-if="proceed">
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

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
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
    this.wallet = await markRaw(loadWallet())
    const walletHash = this.wallet.BCH.getWalletHash()
    await this.$store.dispatch('ramp/resetPagination')
    this.user = await this.$store.dispatch('ramp/fetchUser', walletHash)
    if (this.user) {
      this.proceed = true
    }
    this.isLoading = false
  },
  watch: {
    menu (val) {
      // console.log('pageName:', 'ramp-fiat-' + val)
      this.$router.push({ name: 'ramp-fiat-' + val })
      this.initStatusType = 'ONGOING'
    }
  },
  methods: {
    switchMenu (item) {
      this.menu = item
    },
    processDialog () {
      if (!this.proceed && !this.createUser) {
        this.$router.go(-1)
      }
    },
    async createRampUser (value) {
      this.createUser = true
      const walletInfo = this.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo)
      await this.$store.dispatch('ramp/createUser', { nickname: value.nickname, wallet: wallet })
      this.proceed = true
    },
    onOrderCanceled () {
      this.menu = 'orders'
      this.initStatusType = 'COMPLETED'
    }
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
