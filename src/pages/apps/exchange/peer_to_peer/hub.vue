<template>
    <div v-if="isLoading" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>
    <div v-else>
      <component :is="currentPage"></component>
      <footerMenu v-if="showFooterMenu" :tab="currentPage" :data="footerData" v-on:clicked="switchMenu" ref="footer"/>
    </div>
  </template>
<script>
import footerMenu from 'src/components/ramp/fiat/footerMenu.vue'
import Store from 'src/components/ramp/fiat/FiatStore.vue'
import Orders from 'src/components/ramp/fiat/FiatOrders.vue'
import Ads from 'src/components/ramp/fiat/FiatAds.vue'
import Profile from 'src/components/ramp/fiat/FiatProfileCard.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      websocket: null,
      network: 'BCH',
      menu: 'store',
      isLoading: true,
      rampWalllet: null,
      proceed: false,
      createUser: false,
      initStatusType: 'ONGOING',
      hasAccount: false,
      userType: null,
      showFooterMenu: true,
      currentPage: 'Store',
      footerData: {
        unreadOrdersCount: 0
      }
    }
  },
  components: {
    footerMenu,
    Store,
    Orders,
    Ads,
    Profile,
    ProgressLoader
  },
  props: {
    notif: {
      type: Object,
      default: null
    },
    tab: {
      type: String,
      default: 'Store'
    }
  },
  created () {
    bus.on('hide-menu', this.hideMenu)
    bus.on('show-menu', this.showMenu)
    bus.on('switch-menu', this.switchMenu)
    bus.on('update-unread-count', this.updateUnreadCount)
  },
  async mounted () {
    this.isLoading = false
    if (Object.keys(this.notif).length > 0) {
      this.menu = 'orders'
      this.currentPage = 'FiatOrders'
    }
    this.fetchUser()
    this.currentPage = this.tab
  },
  async beforeUnmount () {
    this.$store.commit('ramp/resetPaymentTypes')
  },
  watch: {
    menu (val) {
      this.$router.push({ name: 'ramp-fiat-' + val, query: this.notif })
    }
  },
  methods: {
    isNotDefaultTheme,
    fetchUser () {
      backend.get('ramp-p2p/user').then(response => {
        this.updateUnreadCount(response?.data?.user?.unread_orders_count)
      })
    },
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
    },
    updateUnreadCount (count) {
      this.footerData.unreadOrdersCount = count
    }
  }
}
</script>
