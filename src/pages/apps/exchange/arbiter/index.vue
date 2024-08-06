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
import { loadRampWallet } from 'src/exchange/wallet'
// import {isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  components: {
    // Appeals,
    // AppealDetail,
    // AppealProfile,
    AppealFooterMenu,
    RampLogin
    // HeaderNav
  },
  data () {
    return {
      state: 'list',
      websocket: null,
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
    console.log('to.name:', to.name)
    console.log('from.name:', from.name)
    next(vm => {
      vm.previousRoute = from.path
      if (from.name === 'exchange') {
        vm.previousRoute = '/apps'
      }
    })
  },
  beforeRouteLeave (to, from, next) {
    console.log('to.name__:', to.name)
    console.log('from.name__:', from.name)
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
    this.isLoading = false
    // this.loadRouting()
    this.setupWebsocket(40, 1000)
  },
  methods: {
    // isNotDefaultTheme,
    loadRouting () {
      console.log('route???:', this.$route)
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
      console.log('tab:', tab)
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
      ongoingAppeals.push(data.extra.appeal)
      this.$store.commit('ramp/updatePendingAppeals', { overwrite: true, data: { appeals: ongoingAppeals } })
    },
    setupWebsocket (retries, delayDuration) {
      const wsUrl = `${getBackendWsUrl()}general/${loadRampWallet().walletHash}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.updateUnreadCount(data.extra.unread_count)
        if (data.type === 'NEW_APPEAL') {
          this.handleNewAppeal(data)
        }
      }
      this.websocket.onclose = () => {
        console.log('General WebSocket connection closed.')
        if (this.reconnectWebsocket && retries > 0) {
          console.log(`General Websocket reconnection failed. Retrying in ${delayDuration / 1000} seconds...`)
          return this.delay(delayDuration)
            .then(() => this.setupWebsocket(retries - 1, delayDuration * 2))
        }
      }
    },
    closeWSConnection () {
      this.reconnectWebsocket = false
      if (this.websocket) {
        this.websocket.close()
      }
    },
    delay (duration) {
      return new Promise(resolve => setTimeout(resolve, duration))
    }
  }
}
</script>
src/exchange/backendsrc/exchange/wallet