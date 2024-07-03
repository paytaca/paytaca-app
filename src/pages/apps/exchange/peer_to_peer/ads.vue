<template>
    <div v-if="$route.name === 'p2p-ads'">
      <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
      <AdListings />
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
  </template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AdListings from 'src/components/ramp/fiat/AdListings.vue'

export default {
  components: {
    HeaderNav,
    AdListings
  }
}
</script>
