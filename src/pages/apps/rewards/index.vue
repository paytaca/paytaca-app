<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="`Rewards`" backnavpath="/apps" class="apps-header" />

    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      yey
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav'

export default {
  name: 'RewardsPage',

  components: {
    HeaderNav
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>
