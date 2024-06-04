<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="'Wallet Backup'" backnavpath="/apps" class="apps-header" />

    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <div class="col-12 q-px-lg q-mt-lg">
        wallet backup heree yey
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from 'src/components/header-nav'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'app-wallet-backup',

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
