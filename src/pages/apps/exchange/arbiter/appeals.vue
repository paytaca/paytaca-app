<template>
  <div v-if="$route.name === 'arbiter-appeals'">
    <HeaderNav :title="`P2P Exchange`" backnavpath="/apps"/>
    <AppealListing />
  </div>
  <div v-else>
    <router-view :key="$route.path"></router-view>
  </div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import AppealListing from 'src/components/ramp/appeal/AppealListing.vue'

export default {
  components: {
    HeaderNav,
    AppealListing
  }
}
</script>
