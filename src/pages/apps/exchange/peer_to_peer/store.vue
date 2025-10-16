<template>
  <div v-if="$route.name === 'p2p-store'">
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps" class="header-nav" />
    <StoreListings :key="storeListingsKey"/>
  </div>
  <div v-else>
    <router-view :key="$route.path"></router-view>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import StoreListings from 'src/components/ramp/fiat/StoreListings.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  inheritAttrs: false,
  components: {
    HeaderNav,
    StoreListings
  },
  data () {
    return {
      storeListingsKey: 0
    }
  },
  created () {
    bus.on('relogged', this.refreshPage)
  },
  methods: {
    refreshPage () {
      this.storeListingsKey++
    }
  },
  mounted () {
    console.log('Query', this.$route.query)
    if ('ad_id' in this.$route.query) {
      this.$router?.push({ name: 'p2p-store-form', params: { ad: this.$route.query.ad_id } })
    }
  }
}
</script>
