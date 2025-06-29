<template>
    <div v-if="$route.name === 'p2p-orders'">
      <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
      <OrderListings :key="orderListingsKey" />
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
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
  }
}
</script>
