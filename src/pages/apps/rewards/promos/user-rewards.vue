<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
      <header-nav :title="`User Rewards`" class="apps-header" />

    <div
      class="row q-mx-lg q-gutter-y-md"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      user rewards yey
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav'

export default {
  name: 'UserRewards',

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
