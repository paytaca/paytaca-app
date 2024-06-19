<template>
  <div v-if="!$route.params?.id">
    <div v-if="state === 'list'">
      <AppealList @select-appeal="onSelectAppeal" :key="appealListKey"/>
    </div>
    <div v-if="state === 'profile'">
      <AppealProfile :key="appealProfileKey"/>
    </div>
  </div>
  <div v-else>
    <AppealDetail :key="appealDetailKey"/>
  </div>
  <AppealFooterMenu v-if="showFooterMenu" :data="footerData" :tab="state" v-on:clicked="switchMenu"/>
  <RampLogin v-if="showLogin" @logged-in="onLoggedIn"/>
</template>
<script>
import AppealList from './appeals.vue'
import AppealDetail from './appeal.vue'
import AppealProfile from './profile.vue'
import AppealFooterMenu from 'src/components/ramp/appeal/AppealFooterMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    AppealList,
    AppealDetail,
    AppealProfile,
    AppealFooterMenu,
    RampLogin
  },
  data () {
    return {
      state: 'list',
      showFooterMenu: true,
      footerData: {
        unreadOrdersCount: 0
      },
      showLogin: false,
      appealListKey: 0,
      appealDetailKey: 0,
      appealProfileKey: 0
    }
  },
  created () {
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('relogged', this.refreshChildren)
  },
  mounted () {
    if (this.$route.name === 'appeal-detail') {
      this.showFooterMenu = false
    }
  },
  methods: {
    handleSessionEvent () {
      this.showLogin = true
    },
    refreshChildren () {
      this.appealListKey++
      this.appealDetailKey++
      this.appealProfileKey++
    },
    switchMenu (tab) {
      this.state = tab
    },
    onSelectAppeal () {
      this.showFooterMenu = false
    },
    onLoggedIn () {
      this.showLogin = false
    }
  },
  beforeRouteLeave (to, from, next) {
    if (from.name === 'exchange-appeals' && to.name === 'exchange') {
      next('/apps')
    } else {
      next()
    }
  }
}
</script>
