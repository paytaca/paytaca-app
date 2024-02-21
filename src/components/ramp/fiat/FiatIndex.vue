<template>
  <div>
    <div v-if="isLoading" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div v-else>
      <div class="q-mt-md">
        <component :is="currentPage"></component>
      </div>
      <footerMenu v-if="showFooterMenu" :tab="currentPage" v-on:clicked="switchMenu" ref="footer"/>
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
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      wallet: this.$store.getters['ramp/wallet'],
      network: 'BCH',
      menu: 'store',
      isLoading: true,
      user: null,
      proceed: false,
      createUser: false,
      initStatusType: 'ONGOING',
      hasAccount: false,
      userType: null,
      showFooterMenu: true,
      currentPage: 'FiatStore'
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
  created () {
    bus.on('hide-menu', this.hideMenu)
    bus.on('show-menu', this.showMenu)
    bus.on('switch-menu', this.switchMenu)
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
    hideMenu () {
      this.showFooterMenu = false
    },
    showMenu (tab) {
      if (tab) this.menu = tab
      this.showFooterMenu = true
    },
    switchMenu (data) {
      this.currentPage = data.name
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
