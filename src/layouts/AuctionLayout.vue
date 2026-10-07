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
      this.checkAuctionProfile()
    }
  },
  methods: {
    async checkAuctionProfile () {
      if (this.$route.name === 'app-auction-profile') return
      if (!this.$store.getters['auction/username']) {
        await this.$store.dispatch('auction/fetchUsername')
      }
      if (!this.$store.getters['auction/username']) {
        this.$router.replace({ name: 'app-auction-profile' })
      }
    }
  }
}
</script>
