<template>
  <div v-if="$route.name === 'p2p-store'">
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
    <StoreListings />
  </div>
  <div v-else>
    <router-view :key="$route.path"></router-view>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import StoreListings from 'src/components/ramp/fiat/StoreListings.vue'

export default {
  components: {
    HeaderNav,
    StoreListings
  }
}
</script>
