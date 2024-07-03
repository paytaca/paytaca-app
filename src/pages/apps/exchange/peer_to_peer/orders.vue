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
  }
}
</script>

