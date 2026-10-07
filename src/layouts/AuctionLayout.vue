<template>
  <div>
    <router-view v-slot="{ Component }">
      <keep-alive :include="['cauldron-pool']">
        <component :is="Component"/>
      </keep-alive>
    </router-view>
  </div>
</template>

<script>

export default {
  name: 'auction-layout',
  data () {
    return {
    }
  },
  computed: {
    walletSwitchId () {
      return this.$store.getters['global/getWalletSwitchId']
    }
  },
  watch: {
    walletSwitchId () {
      this.checkAuctionAccess()
    }
  },
  methods: {
    async checkAuctionAccess () {
      if (!this.$store.getters['auction/username']) {
        await this.$store.dispatch('auction/fetchUsername')
      }
      if (!this.$store.getters['auction/username']) {
        if (this.$route.name !== 'app-auction-profile') {
          this.$router.replace({ name: 'app-auction-profile' })
        }
        return
      }
      if (this.$store.getters['auction/isArbiter'] && this.$route.name !== 'app-auction-appeals') {
        this.$router.replace({ name: 'app-auction-appeals' })
      }
    }
  }
}
</script>
