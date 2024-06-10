<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="'QR Reader'" backnavpath="/" />

    <div>
      QR reader heree yey
    </div>

    <footer-menu />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from '../../components/header-nav'

export default {
  name: 'QRReader',

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
