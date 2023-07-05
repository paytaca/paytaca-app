<template>
  <div v-if="proceed">
    <FiatStore v-if="menu === 'store'"/>
    <FiatOrders v-if="menu === 'orders'"/>
    <FiatAds v-if="menu === 'ads'"/>
    <FiatProfileCard
      v-if="menu === 'profile'"
      v-on:back="menu = 'store'"
    />
    <footerMenu
      v-on:clicked="switchMenu"
    />
  </div>
  <div v-else>
    <MiscDialogs
      :type="'editNickname'"
      v-on:submit="updateNickname"
      v-on:back="$router.go(-1)"
    />
  </div>
</template>
<script>
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
import FiatOrders from './FiatOrders.vue'
import FiatAds from './FiatAds.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import MiscDialogs from './dialogs/MiscDialogs.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      menu: 'store',
      // availableFiat: [], //api/ramp-p2p/currency/fiat/
      nickName: this.$store.getters['global/getRampNickName'],
      proceed: false
    }
  },
  components: {
    footerMenu,
    FiatStore,
    FiatOrders,
    FiatAds,
    FiatProfileCard,
    MiscDialogs
  },
  methods: {
    switchMenu (item) {
      this.menu = item
    },
    updateNickname (info) {
      // save user info
      this.$store.commit('global/editRampNickname', info.nickname)
      this.proceed = true
    }
  },
  async mounted () {
    const vm = this
    // vm.$store.commit('global/resetNickName') //remove later
    if (vm.nickName) {
      vm.proceed = true
    }
  }
}
</script>

<!-- TASK: GET AVAILABLE FIAT LATER -->
