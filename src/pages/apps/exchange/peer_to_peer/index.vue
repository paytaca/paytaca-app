<template>
  <div>
    <router-view :key="$route.path"></router-view>
    <NoticeBoardDialog v-if="showNoticeBoard" :type="noticeBoardType" :message="noticeBoardMessage" @hide="showNoticeBoard=false"/>
    <FooterMenu v-if="showFooterMenu" :tab="currentPage" :data="footerData"/>
    <RampLogin v-if="showLogin" :force-login="forceLogin" @logged-in="showLogin = false; forceLogin = false"/>
  </div>
</template>
<script>
import NoticeBoardDialog from 'src/components/ramp/fiat/dialogs/NoticeBoardDialog.vue'
import FooterMenu from 'src/components/ramp/fiat/footerMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { bus } from 'src/wallet/event-bus.js'
import { backend, getBackendWsUrl } from 'src/exchange/backend'
import { webSocketManager } from 'src/exchange/websocket/manager'
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
      noticeBoardType: null,
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

      // console.log('previous: ', vm.previousRoute)
      if (from.name === 'exchange') {
        vm.previousRoute = '/apps'
      }
    })
  },
  beforeRouteLeave (to, from, next) {    
    if (to.name === 'exchange') {
      this.$router.push({ name: 'apps-dashboard' })
    } else {
      next()
    }    
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
    
    // Ensure wallet state is initialized before accessing getters
    const wallet = this.$store.getters['global/getWallet']('bch')
    const walletHash = wallet?.walletHash
    if (walletHash) {
      // Initialize wallet-specific state if not already initialized
      this.$store.commit('ramp/initializeWalletState', walletHash)
      this.$store.commit('paytacapos/initializeWalletState', walletHash)
    }
    
    // Fetch user non-blocking - check store first
    this.fetchUser()
    // Setup WebSocket non-blocking - don't await it
    this.setupWebsocket()
  },
  beforeUnmount () {    
    // Removed loading.hide() since loading gif is no longer used
  },
  methods: {
    async loadWallet () {
      // Check Vuex store first for existing wallet to avoid duplicate loading
      const storedWallet = this.$store.getters['ramp/wallet']
      if (storedWallet && storedWallet.wallet) {
        // Use the libauth wallet from the stored RampWallet instance
        this.wallet = storedWallet.wallet
        return
      }
      // If not in store, load it
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
      // Check Vuex store first for existing user to avoid duplicate fetch
      const storedUser = this.$store.getters['ramp/getUser']
      if (storedUser) {
        // User already loaded, just fetch unread count non-blocking
        this.fetchUnreadCount()
        return
      }
      // If user not in store, fetch it (non-blocking)
      // Note: This endpoint doesn't require authorization - it's a public endpoint
      backend.get('/ramp-p2p/user').then(response => {
        this.updateUnreadCount(response?.data?.user?.unread_orders_count)
        // Store user in Vuex if not already stored
        if (response?.data?.user) {
          this.$store.commit('ramp/updateUser', response.data.user)
        }
      })
        .catch(error => {
          if (error.response) {
            if (error.response.status === 403) {
              this.handleSessionEvent()
            } else if (error.response.status === 401) {
              // 401 means not authenticated - this is expected if user hasn't logged in yet
              // Silently ignore - user will be prompted to login when needed
            } else if (error.response.status === 404) {
              // 404 means user doesn't exist yet, which is fine - silently ignore
            } else {
              // Only log other errors, don't show to user
              console.error('Error fetching user:', error.response.status)
            }
          } else {
            // Network error - only emit if it's a real network issue
            if (error.code !== 'ECONNABORTED') {
              bus.emit('network-error')
            }
          }
        })
    },
    fetchUnreadCount () {
      // Non-blocking fetch of unread count only
      // Note: This endpoint doesn't require authorization - it's a public endpoint
      backend.get('/ramp-p2p/user').then(response => {
        this.updateUnreadCount(response?.data?.user?.unread_orders_count)
      })
        .catch(error => {
          // Silently fail - unread count is not critical for initial load
          if (error.response) {
            if (error.response.status === 403) {
              this.handleSessionEvent()
            } else if (error.response.status === 401) {
              // 401 means not authenticated - silently ignore
            } else if (error.response.status === 404) {
              // 404 means user doesn't exist yet, which is fine - silently ignore
            }
            // Don't log or show other errors for unread count - it's non-critical
          }
          // Silently ignore network errors for unread count
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
      if (this.footerData) {
        this.footerData.unreadOrdersCount = count
      }
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
        // All orders (including cash-in) now go into the main orders list
        const ongoingOrders = [...this.$store.getters['ramp/getOngoingOrders']]
        if (filters.sort_type === 'descending') {
          ongoingOrders.unshift(order)
        } else {
          ongoingOrders.push(order)
        }
        this.$store.commit('ramp/updateOngoingOrders', { overwrite: true, data: { orders: ongoingOrders } })
      }
    },
    setupWebsocket () {
      // Non-blocking WebSocket setup - don't delay UI rendering
      // Get walletHash from stored RampWallet or global wallet
      const storedWallet = this.$store.getters['ramp/wallet']
      let walletHash = storedWallet?.walletHash
      
      // If not in ramp store, get from global wallet
      if (!walletHash) {
        const globalWallet = this.$store.getters['global/getWallet']('bch')
        walletHash = globalWallet?.walletHash
      }
      
      if (!walletHash) {
        // If wallet not ready yet, wait a bit and retry
        setTimeout(() => this.setupWebsocket(), 500)
        return
      }
      
      const wsUrl = `${getBackendWsUrl()}general/${walletHash}/`
      webSocketManager.setWebSocketUrl(wsUrl)
      webSocketManager?.subscribeToMessages((message) => {
        bus.emit('update-unread-count', message?.extra?.unread_count)
        if (message.type === 'NEW_ORDER') {
          this.handleNewOrder(message?.extra?.order)
        }
      })
    },
    handleRequestError (error) {
      // Don't log or show 404/401 errors - they're often expected
      // 404: resource doesn't exist (e.g., user not registered yet)
      // 401: not authenticated (user will be prompted to login when needed)
      // 403: For chat-related errors, this often means chat identity not ready yet
      if (error?.response?.status === 404 || error?.response?.status === 401) {
        return // Silently ignore 404s and 401s
      }
      
      // Check if it's a chat-related 403 error (chat identity not found)
      if (error?.response?.status === 403) {
        const errorDetail = error?.response?.data?.detail || ''
        if (errorDetail.includes('Chat identity') || errorDetail.includes('chat identity')) {
          // Chat identity not ready - silently ignore
          return
        }
        // Other 403 errors - session expired
        bus.emit('session-expired')
        return
      }
      
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
          case 400:
            this.showErrorDialog('Bad Request. Please check the request parameters.')
            break
          case 500:
            this.showErrorDialog('Internal Server Error. Please try again later.')
            break
          default:
            console.error(`Error: ${error.response.status}. ${error.response.statusText}`)
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
