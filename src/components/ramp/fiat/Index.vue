<template>
  <FiatStore v-if="menu === 'store'"/>
  <FiatOrders v-if="menu === 'orders'"/>
  <FiatAds v-if="menu === 'ads'"/>
  <footerMenu
    v-on:clicked="switchMenu"
  />
</template>
<script>
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
import FiatOrders from './FiatOrders.vue'
import FiatAds from './FiatAds.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      menu: 'store',
      availableFiat: [] //api/ramp-p2p/currency/fiat/
    }
  },
  components: {
    footerMenu,
    FiatStore,
    FiatOrders,
    FiatAds
  },
  methods: {
    switchMenu (item) {
      this.menu = item
    }
  },
  async mounted () {
    console.log(this.menu)
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
