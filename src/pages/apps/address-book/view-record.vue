<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="'Address Book'"
      id="header-nav"
    />

    <div class="q-px-md">
      yey
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'

export default {
  name: 'ViewRecord',

  components: {
    HeaderNav
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>