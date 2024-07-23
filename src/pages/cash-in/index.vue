<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav title="Cash In"/>

    <div v-if="loading">
      loading...
    </div>
    <div v-else>
      <router-view :key="$route.path"></router-view>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'

export default {
  data () {
    return {
      selectedPaymentMethod: null,
      step: 1,
      loading: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    HeaderNav
  },
  methods: {
    getDarkModeClass,
    goToPage (name) {
      this.$router?.push({ name: name })
    }
  }
}
</script>

