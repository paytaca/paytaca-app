<template>
  <HeaderNav title="Ramp Appeals" :backnavpath="previousRoute" />
  <div v-if="!$route.params?.id">
    <div v-if="state === 'list'">
      <Appeals :appeal-id="$route.params?.id" :tab="$route.query?.tab" :key="appealListKey"/>
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
import Appeals from './appeals.vue'
import AppealDetail from './appeal.vue'
import AppealProfile from './profile.vue'
import AppealFooterMenu from 'src/components/ramp/appeal/AppealFooterMenu.vue'
import RampLogin from 'src/components/ramp/fiat/RampLogin.vue'
import HeaderNav from 'src/components/header-nav.vue'
import { bus } from 'src/wallet/event-bus.js'

export default {
  components: {
    Appeals,
    AppealDetail,
    AppealProfile,
    AppealFooterMenu,
    RampLogin,
    HeaderNav
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
      appealProfileKey: 0,
      previousRoute: null
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.previousRoute = from.path
      if (from.name === 'exchange') {
        vm.previousRoute = '/apps'
      }
    })
  },
  created () {
    bus.on('session-expired', this.handleSessionEvent)
    bus.on('relogged', this.refreshChildren)
    bus.on('show-footer-menu', this.onShowFooterMenu)
  },
  mounted () {
    if (this.$route.name === 'appeal-detail') {
      this.showFooterMenu = false
    }
    if (this.$route.query.tab === 'profile') {
      this.state = 'profile'
    } else {
      this.state = 'list'
    }
  },
  methods: {
    onShowFooterMenu (show) {
      this.showFooterMenu = show
    },
    handleSessionEvent () {
      this.showLogin = true
    },
    refreshChildren () {
      this.appealListKey++
      this.appealDetailKey++
      this.appealProfileKey++
    },
    async switchMenu (tab) {
      await this.$router.replace({ ...this.$route.query, query: { tab: tab === 'list' ? 'pending' : 'profile' } })
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
    switch (from.name) {
      case 'appeal-detail':
        if (to.name === 'exchange-appeals') {
          next()
        } else if (to.name === 'exchange') {
          next('exchange-appeals')
        } else {
          next()
        }
        break
      case 'exchange-appeals':
        if (to.name === 'apps-dashboard') {
          next()
        } else if (to.name === 'exchange') {
          next('/apps')
        } else {
          next()
        }
    }
  }
}
</script>
