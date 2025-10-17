<template>
    <div v-if="$route.name === 'p2p-ads'">
      <HeaderNav :title="`P2P Exchange`" backnavpath="/apps" class="header-nav" />
      <AdListings :key="adListingsKey"/>
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
  </template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AdListings from 'src/components/ramp/fiat/AdListings.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    HeaderNav,
    AdListings
  },
  data () {
    return {
      adListingsKey: 0
    }
  },
  created () {
    bus.on('relogged', this.refreshData)
  },
  methods: {
    refreshData () {
      this.adListingsKey++
    }
  }
}
</script>
