<template>
  <div>
    <div v-if="isLoading" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
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
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      apiURL: process.env.WATCHTOWER_BASE_URL,
      wallet: this.$store.getters['ramp/wallet'],
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
  async mounted () {
    this.isLoading = false
  },
  async beforeUnmount () {
    this.$store.commit('ramp/resetStoreFilters')
    this.$store.commit('ramp/resetPaymentTypes')
  },
  watch: {
    menu (val) {
      this.$router.push({ name: 'ramp-fiat-' + val })
    }
  },
  methods: {
    isNotDefaultTheme,
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
