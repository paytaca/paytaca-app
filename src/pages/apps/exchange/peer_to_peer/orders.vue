<template>
    <div v-if="$route.name === 'p2p-orders'">
      <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
      <OrderListings />
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
  </template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import OrderListings from 'src/components/ramp/fiat/OrderListings.vue'

export default {
  components: {
    HeaderNav,
    OrderListings
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
            next('/apps')
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

