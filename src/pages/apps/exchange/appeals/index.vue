<template>
  <HeaderNav title="Ramp Appeals" :backnavpath="previousRoute" />
  <div v-if="!$route.params?.id">
    <div v-if="state === 'list'">
      <Appeals :appeal-id="$route.params?.id" :tab="$route.query?.tab" :key="appealListKey"/>
    </div>
    <div v-if="state === 'profile'">
      <AppealProfile :key="appealProfileKey"/>
    </div>
  </div>
  <div v-else>
    <AppealDetail :key="appealDetailKey"/>
  </div>
  <AppealFooterMenu v-if="showFooterMenu" :data="footerData" :tab="state" v-on:clicked="switchMenu"/>
  <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
</template>
<script>
import Appeals from './appeals.vue'
import AppealDetail from './appeal.vue'
import AppealProfile from './profile.vue'
import AppealFooterMenu from 'src/components/ramp/appeal/AppealFooterMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { bus } from 'src/wallet/event-bus.js'
import { getBackendWsUrl } from 'src/wallet/ramp/backend'
import { loadRampWallet } from 'src/wallet/ramp/wallet'

export default {
  components: {
    Appeals,
    AppealDetail,
    AppealProfile,
    AppealFooterMenu,
    RampLogin,
    HeaderNav
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
      previousRoute: null
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
        if (to.name === 'exchange-appeals') {
          next()
        } else if (to.name === 'exchange') {
          next('exchange-appeals')
        } else {
          next()
        }
        break
      case 'exchange-appeals':
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
    this.loadRouting()
    this.setupWebsocket(40, 1000)
  },
  methods: {
    loadRouting () {
      // hide footer menu if viewing appeal detail from $route
      if (this.$route.name === 'appeal-detail') {
        this.showFooterMenu = false
      }
      // set state based on $route query
      if (this.$route.query.tab === 'profile') {
        this.state = 'profile'
      } else {
        this.state = 'list'
      }
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
      await this.$router.replace({ ...this.$route.query, query: { tab: tab === 'list' ? 'pending' : 'profile' } })
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
