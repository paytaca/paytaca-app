<template>
  <router-view :key="$route.path"></router-view>
  <AppealFooterMenu v-if="showFooterMenu" :data="footerData" v-on:clicked="switchMenu"/>
  <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
</template>
<script>
import AppealFooterMenu from 'src/components/ramp/appeal/AppealFooterMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import { bus } from 'src/wallet/event-bus.js'
import { getBackendWsUrl } from 'src/exchange/backend'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import { WebSocketManager } from 'src/exchange/websocket/manager'

export default {
  components: {
    AppealFooterMenu,
    RampLogin
  },
  data () {
    return {
      state: 'list',
      websocketManager: null,
      showFooterMenu: true,
      footerData: {
        unreadOrdersCount: 0
      },
      showLogin: false,
      appealListKey: 0,
      appealDetailKey: 0,
      appealProfileKey: 0,
      previousRoute: null,
      isLoading: true
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
      case 'appeal-detail':
        if (to.name === 'exchange-arbiter') {
          next()
        } else if (to.name === 'exchange') {
          next('exchange-arbiter')
        } else {
          next()
        }
        break
      case 'exchange-arbiter':
        if (to.name === 'apps-dashboard') {
          next()
        } else if (to.name === 'exchange') {
          next('/apps')
        } else {
          next()
        }
        break
      default:
        next()
    }
  },
  created () {
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('relogged', this.refreshChildren)
    bus.on('show-footer-menu', this.onShowFooterMenu)
  },
  mounted () {
    loadRampWallet()
    this.isLoading = false
    this.setupWebSocket()
  },
  methods: {
    loadRouting () {
      this.$router.push({ name: 'arbiter-appeals' })
    },
    onShowFooterMenu (show) {
      this.showFooterMenu = show
    },
    handleSessionEvent () {
      this.showLogin = true
    },
    refreshChildren () {
      this.appealListKey++
      this.appealDetailKey++
      this.appealProfileKey++
    },
    async switchMenu (tab) {
      const routeName = tab === 'profile' ? 'arbiter-profile' : 'arbiter-appeals'
      await this.$router.push({ name: routeName })
      this.state = tab
    },
    onSelectAppeal () {
      this.showFooterMenu = false
    },
    onLoggedIn () {
      this.showLogin = false
    },
    updateUnreadCount (count) {
      this.footerData.unreadAppealsCount = count
    },
    handleNewAppeal (data) {
      const ongoingAppeals = [...this.$store.getters['ramp/pendingAppeals']]
      if (ongoingAppeals.length >= 20) return
      if (!ongoingAppeals.map(e => { return e.id }).includes(data.extra.appeal.id)) {
        ongoingAppeals.push(data.extra.appeal)
        this.$store.commit('ramp/updatePendingAppeals', { overwrite: true, data: { appeals: ongoingAppeals } })
      }
    },
    setupWebSocket () {
      const url = `${getBackendWsUrl()}general/${wallet.walletHash}/`
      this.websocketManager = new WebSocketManager()
      this.websocketManager.setWebSocketUrl(url)
      this.websocketManager.subscribeToMessages((message) => {
        this.updateUnreadCount(message.extra.unread_count)
        if (message.type === 'NEW_APPEAL') {
          this.handleNewAppeal(message)
        }
      })
    }
  }
}
</script>
