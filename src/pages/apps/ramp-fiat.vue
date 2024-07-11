<template>
  <div id="app-container" class="row" :class="getDarkModeClass(darkMode)">
    <!-- <HeaderNav :title="`${userType === 'arbiter' ? 'Appeal Ramp' : 'P2P Exchange'}`" backnavpath="/apps"/> -->
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader/>
    </div>
    <div v-else-if="!loggedIn">
      <RampLogin @loggedIn="loggedInAs" :error="errorMessage"/>
    </div>
    <div v-else>
      <FiatIndex v-if="userType === 'peer'" :notif="$route.query"/>
      <AppealIndex v-if="userType === 'arbiter'" :notif="$route.query"/>
    </div>
  </div>
</template>
<script>
import AppealIndex from 'src/pages/apps/exchange/arbiter/index.vue'
// import AppealIndex from 'src/components/ramp/appeal/AppealIndex.vue'
import FiatIndex from 'src/components/ramp/fiat/FiatIndex.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { deleteAuthToken } from 'src/wallet/ramp/auth'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import { getBackendWsUrl } from 'src/wallet/ramp/backend'

export default {
  components: {
    ProgressLoader,
    FiatIndex,
    AppealIndex,
    RampLogin,
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      error: false,
      pageName: 'ramp-fiat-store',
      loggedIn: false,
      userType: null,
      errorMessage: null,
      isloaded: false,
      reconnectWebsocket: true
    }
  },
  computed: {
    appTitle () {
      if (this.userType === 'arbiter') return 'appeal'
      return 'fiat'
    }
  },
  created () {
    bus.on('session-expired', this.handleSessionEvent)
  },
  async mounted () {
    this.rampWallet = loadRampWallet()
    this.setupWebsocket(20, 1000)
    this.isloaded = true
    this.resetFilters()
  },
  beforeUnmount () {
    this.closeWSConnection()
  },
  methods: {
    getDarkModeClass,
    resetFilters () {
      this.$store.commit('ramp/resetStoreFilters')
      this.$store.commit('ramp/resetOrderFilters')
    },
    handleSessionEvent (_data) {
      this.loggedIn = false
      this.errorMessage = 'Session expired'
      deleteAuthToken()
    },
    loggedInAs (userType) {
      this.loggedIn = true
      this.userType = userType
    },
    handleNewOrder (data) {
      const currency = this.$store.getters['ramp/ordersCurrency']
      const filters = this.$store.getters['ramp/ongoingOrderFilters'](currency || 'All')
      // filter the new order
      let filterCheck = false
      const order = data?.extra?.order
      if ((currency === 'All' || order.ad.fiat_currency.symbol === currency) &&
              filters.not_appealable && filters.ownership.notOwned && !filters.queryname) {
        filterCheck = true
      }
      let tradeTypeCheck = false
      if ((order.trade_type === 'BUY' && filters.trade_type.buy) || (order.trade_type === 'SELL' && filters.trade_type.sell)) {
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
        const ongoingOrders = [...this.$store.getters['ramp/getOngoingOrders']]
        if (filters.sort_type === 'descending') {
          ongoingOrders.unshift(data?.extra?.order)
        } else {
          ongoingOrders.push(data?.extra?.order)
        }
        this.$store.commit('ramp/updateOngoingOrders', { overwrite: true, data: { orders: ongoingOrders } })
      }
    },
    handleNewAppeal (data) {
      const ongoingAppeals = [...this.$store.getters['ramp/pendingAppeals']]
      if (ongoingAppeals.length >= 20) return
      ongoingAppeals.push(data?.extra?.appeal)
      this.$store.commit('ramp/updatePendingAppeals', { overwrite: true, data: { appeals: ongoingAppeals } })
    },
    setupWebsocket (retries, delayDuration) {
      const wsUrl = `${getBackendWsUrl()}general/${this.rampWallet.walletHash}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        bus.emit('update-unread-count', data?.extra?.unread_count)
        if (data.type === 'NEW_ORDER') {
          this.handleNewOrder(data)
        }
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
<style lang="scss" scoped>
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>
