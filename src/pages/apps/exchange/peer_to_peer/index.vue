<template>
  <router-view :key="$route.path"></router-view>
  <NoticeBoardDialog v-if="showNoticeBoard" :type="noticeBoardType" :message="noticeBoardMessage" @hide="showNoticeBoard=false"/>
  <FooterMenu v-if="showFooterMenu" :tab="currentPage" :data="footerData"/>
  <RampLogin v-if="showLogin" :force-login="forceLogin" @logged-in="showLogin = false; forceLogin = false"/>
</template>
<script>
import NoticeBoardDialog from 'src/components/ramp/fiat/dialogs/NoticeBoardDialog.vue'
import FooterMenu from 'src/components/ramp/fiat/footerMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { closeWebsocketManager, setupWebsocketManager } from 'src/exchange/websocket/manager'
import { loadLibauthHdWallet } from 'src/wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      network: 'BCH',
      menu: 'store',
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
      reconnectWebsocket: true,
      showNoticeBoard: false,
      noticeBoardMessage: null,
      forceLogin: false,
      wallet: null
    }
  },
  components: {
    FooterMenu,
    RampLogin,
    ProgressLoader,
    NoticeBoardDialog
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
  computed: {
    multipleAdLimitMessage () {
      return 'You currently have multiple ads for the same currency. Please note that you\'re now only allowed to have 1 active ad per currency and trade type.'
    }
  },
  created () {
    bus.on('hide-menu', this.hideMenu)
    bus.on('show-menu', this.showMenu)
    bus.on('update-unread-count', this.updateUnreadCount)
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('post-notice', this.postNotice)
    bus.on('handle-request-error', this.handleRequestError)
  },
  async mounted () {
    await this.loadWallet()
    this.fetchUser()
    this.setupWebsocket()
  },
  methods: {
    isNotDefaultTheme,
    async loadWallet () {
      const isChipnet = this.$store.getters['global/isChipnet']
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.wallet = await loadLibauthHdWallet(walletIndex, isChipnet)
    },
    postNotice (type, message) {
      this.showNoticeBoard = true
      this.noticeBoardType = type
      switch (type) {
        case 'ad-limit':
          this.noticeBoardMessage = this.multipleAdLimitMessage
          break
        default:
          this.noticeBoardMessage = message
      }
    },
    handleSessionEvent () {
      this.forceLogin = true
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
      const wsUrl = `${getBackendWsUrl()}general/${this.wallet?.walletHash}/`
      const webSocketManager = setupWebsocketManager(wsUrl)
      webSocketManager?.subscribeToMessages((message) => {
        bus.emit('update-unread-count', message?.extra?.unread_count)
        if (message.type === 'NEW_ORDER') {
          this.handleNewOrder(message?.extra?.order)
        }
      })
    },
    handleRequestError (error) {
      console.error('Handling error:', error?.response || error)
      if (error?.code === 'ECONNABORTED') {
        // Request timeout
        this.showErrorDialog('Request timed out. Please try again later.')
      } else if (!error?.response) {
        // Network error
        bus.emit('network-error')
      } else {
        // HTTP status code error
        switch (error.response.status) {
          case 403:
            bus.emit('session-expired')
            break
          case 400:
            this.showErrorDialog('Bad Request. Please check the request parameters.')
            break
          case 500:
            this.showErrorDialog('Internal Server Error. Please try again later.')
            break
          default:
            console.log(`Error: ${error.response.status}. ${error.response.statusText}`)
        }
      }
    },
    showErrorDialog (message) {
      if (!this.errorDialogActive) {
        this.errorDialogActive = false
        this.$q.notify({
          type: 'warning',
          message: message,
          position: 'bottom',
          timeout: 5000,
          onDismiss: () => {
            this.errorDialogActive = false
          }
        })
      }
    }
  }
}
</script>
