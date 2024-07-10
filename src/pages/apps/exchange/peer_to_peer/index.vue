<template>
  <div v-if="isLoading" class="row justify-center q-py-lg" style="margin-top: 50%">
    <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
  </div>
  <div v-else>
    <router-view :key="$route.path"></router-view>
    <FooterMenu v-if="showFooterMenu" :tab="currentPage" :data="footerData"/>
  </div>
  <RampLogin v-if="showLogin" @logged-in="showLogin = false"/>
</template>
<script>
import FooterMenu from 'src/components/ramp/fiat/footerMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
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
      currentPage: 'FiatStore',
      footerData: {
        unreadOrdersCount: 0
      },
      showLogin: false,
      previousRoute: null
    }
  },
  components: {
    FooterMenu,
    RampLogin,
    ProgressLoader
  },
  props: {
    notif: {
      type: Object,
      default: null
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
      if (from.name === 'exchange') {
        vm.previousRoute = '/apps'
      }
    })
  },
  beforeRouteLeave (to, from, next) {
    switch (from.name) {
      case 'p2p-store':
      case 'p2p-ads':
      case 'p2p-orders':
      case 'p2p-profile':
        switch (to.name) {
          case 'p2p-order':
          case 'exchange':
            next('/apps')
            break
          default:
            next()
        }
        break
      default:
        next()
    }
  },
  created () {
    bus.on('hide-menu', this.hideMenu)
    bus.on('show-menu', this.showMenu)
    bus.on('update-unread-count', this.updateUnreadCount)
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('relogged', this.refreshChildren)
  },
  async mounted () {
    this.isLoading = false
    // if (Object.keys(this.notif).length > 0) {
    //   this.menu = 'orders'
    //   this.currentPage = 'FiatOrders'
    // }
    this.fetchUser()
  },
  async beforeUnmount () {
    this.$store.commit('ramp/resetPaymentTypes')
  },
  methods: {
    isNotDefaultTheme,
    refreshChildren () {
      // TODO: refreshChildren
      console.log('refreshChildren')
    },
    handleSessionEvent () {
      console.log('handleSessionEvent')
      this.showLogin = true
    },
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
    processDialog () {
      if (!this.proceed && !this.createUser) {
        this.$router.go(-2)
      }
    },
    updateUnreadCount (count) {
      this.footerData.unreadOrdersCount = count
    }
  }
}
</script>
