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
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
import FiatOrders from './FiatOrders.vue'
import FiatAds from './FiatAds.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import { getBackendWsUrl } from 'src/wallet/ramp/backend'
import { loadRampWallet } from 'src/wallet/ramp/wallet'

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
      }
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
  props: {
    notif: {
      type: Object,
      default: null
    }
  },
  created () {
    bus.on('hide-menu', this.hideMenu)
    bus.on('show-menu', this.showMenu)
    bus.on('switch-menu', this.switchMenu)
  },
  async mounted () {
    this.rampWallet = loadRampWallet()
    this.isLoading = false
    if (Object.keys(this.notif).length > 0) {
      this.menu = 'orders'
      this.currentPage = 'FiatOrders'
    }
    this.setupWebsocket()
  },
  async beforeUnmount () {
    // this.$store.commit('ramp/resetStoreFilters')
    this.$store.commit('ramp/resetPaymentTypes')
    // this.closeWSConnection()
  },
  watch: {
    menu (val) {
      this.$router.push({ name: 'ramp-fiat-' + val, query: this.notif })
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
    },
    setupWebsocket () {
      const wsUrl = `${getBackendWsUrl()}general/${this.rampWallet.walletHash}/`
      this.websocket = new WebSocket(wsUrl)
      this.websocket.onopen = () => {
        console.log('WebSocket connection established to ' + wsUrl)
      }
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('data:', data)
        this.footerData.unreadOrdersCount = data.extra.unread_count
        if (data.type === 'NEW_ORDER') {
          console.log('add order in ongoing orders')
          // const ongoingOrders = [...this.$store.getters['ramp/getOngoingOrders']]
          // ongoingOrders.push(data.extra.order)
          // console.log('ongoingOrders:', ongoingOrders)
          // this.$store.commit('ramp/updateOngoingOrders', { overwrite: true, data: ongoingOrders })
        }
      }
      this.websocket.onclose = () => {
        console.log('General WebSocket connection closed.')
      }
    },
    closeWSConnection () {
      if (this.websocket) {
        this.websocket.close()
      }
    }
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
