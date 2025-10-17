<template>
  <div v-if="$route.name === 'arbiter-appeals'">
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps" class="header-nav" />
    <AppealListing :key="appealListingKey" />
  </div>
  <div v-else>
    <router-view :key="$route.path"></router-view>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AppealListing from 'src/components/ramp/appeal/AppealListing.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  data () {
    return {
      appealListingKey: 0
    }
  },
  created () {
    bus.on('relogged', this.refreshPage)
  },
  components: {
    HeaderNav,
    AppealListing
  },
  methods: {
    refreshPage () {
      this.appealListingKey++
    }
  }
}
</script>
