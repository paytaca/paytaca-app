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
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { wallet } from 'src/exchange/wallet'
import { mainWebSocketManager } from 'src/exchange/websocket/manager'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
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
      previousRoute: null,
      reconnectWebsocket: true
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
    if (to.name === 'apps-dashboard') {
      mainWebSocketManager.closeConnection(false)
    }
    switch (from.name) {
      case 'p2p-store':
      case 'p2p-ads':
      case 'p2p-orders':
      case 'p2p-profile':
        switch (to.name) {
          case 'p2p-order':
          case 'exchange':
            mainWebSocketManager.closeConnection(false)
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
  },
  async mounted () {
    this.isLoading = false
    // if (Object.keys(this.notif).length > 0) {
    //   this.menu = 'orders'
    //   this.currentPage = 'FiatOrders'
    // }
    this.fetchUser()
    this.setupWebsocket()
  },
  async beforeUnmount () {
    this.$store.commit('ramp/resetPaymentTypes')
  },
  methods: {
    isNotDefaultTheme,
    handleSessionEvent () {
      this.showLogin = true
    },
    fetchUser () {
      backend.get('ramp-p2p/user').then(response => {
        this.updateUnreadCount(response?.data?.user?.unread_orders_count)
      })
        .catch(error => {
          if (error.response) {
            if (error.response.status === 403) {
              this.handleSessionEvent()
            }
          } else {
            bus.emit('network-error')
          }
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
    },
    handleNewOrder (order) {
      const currency = this.$store.getters['ramp/ordersCurrency']
      const filters = this.$store.getters['ramp/ongoingOrderFilters'](currency || 'All')
      // filter the new order
      let filterCheck = false
      if ((currency === 'All' || order.ad.fiat_currency.symbol === currency) &&
              filters.not_appealable && filters.ownership.notOwned && !filters.queryname) {
        filterCheck = true
      }
      let tradeTypeCheck = false
      if ((order.ad.trade_type === 'BUY' && filters.trade_type.buy) || (order.ad.trade_type === 'SELL' && filters.trade_type.sell)) {
        tradeTypeCheck = true
      }
      const statusCheck = filters.status.includes(order.status.value)
      const timeLimitCheck = filters.time_limits.includes(Number(order.ad.appeal_cooldown))

      let addToList = false
      if (filterCheck && tradeTypeCheck && statusCheck && timeLimitCheck) {
        addToList = true
      }
      // NB: this does not filter by payment types
      if (addToList) {
        if (order.is_cash_in) {
          const cashinOrders = [...this.$store.getters['ramp/getCashinOrders']]
          cashinOrders.unshift(order)
          this.$store.commit('ramp/updateCashinOrders', { overwrite: true, data: { orders: cashinOrders } })
        } else {
          const ongoingOrders = [...this.$store.getters['ramp/getOngoingOrders']]
          if (filters.sort_type === 'descending') {
            ongoingOrders.unshift(order)
          } else {
            ongoingOrders.push(order)
          }
          this.$store.commit('ramp/updateOngoingOrders', { overwrite: true, data: { orders: ongoingOrders } })
        }
      }
    },
    setupWebsocket () {
      const wsUrl = `${getBackendWsUrl()}general/${wallet.walletHash}/`
      mainWebSocketManager.setWebSocketUrl(wsUrl)
      mainWebSocketManager.subscribeToMessages((message) => {
        bus.emit('update-unread-count', message?.extra?.unread_count)
        if (message.type === 'NEW_ORDER') {
          this.handleNewOrder(message?.extra?.order)
        }
      })
    }
  }
}
</script>
