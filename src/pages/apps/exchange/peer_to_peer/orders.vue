<template>
    <div v-if="$route.name === 'p2p-orders'">
      <HeaderNav :title="`P2P Ramp`" backnavpath="/apps" class="header-nav" />
      <OrderListings :key="orderListingsKey" />
    </div>
    <div v-else>
      <router-view :key="$route.params.order"></router-view>
    </div>
  </template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import OrderListings from 'src/components/ramp/fiat/OrderListings.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    HeaderNav,
    OrderListings
  },
  data () {
    return {
      orderListingsKey: 0
    }
  },
  created () {
    console.log('[orders.vue] created(), route:', this.$route.name, this.$route.fullPath)
    bus.on('relogged', this.refreshPage)
  },
  methods: {
    refreshPage () {
      this.orderListingsKey++
    }
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
            console.log('to: ', to)
            if ('ad_id' in to.query) {
              next()
            } else {
              next('/apps')
            }            
            break
          default:
            next()
        }
        break
      default:
        next()
    }
  },
  mounted () {
    console.trace('[orders.vue] mounted(), route:', this.$route.name, this.$route.fullPath)
    if ('order_id' in this.$route.query) {
      this.$router.push({ 
        name: 'p2p-order', 
        params: { order: this.$route.query.order_id },
        query: this.$route.query
      })
    }
  },
  beforeUnmount () {
    console.log('[orders.vue] beforeUnmount(), route:', this.$route.name)
    bus.off('relogged', this.refreshPage)
  }
}
</script>
