<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="'Generate QR'" backnavpath="/qr-reader" />

    <div
      v-if="generatingAddress"
      class="text-center"
      style="padding-top: 80px;"
    >
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>

    <div v-else class="column items-center">
      <div>
        <q-img src="bch-logo.png" height="35px" width="35px" />
        &nbsp;BCH
        <q-toggle
          v-model="isCt"
          class="text-bow"
          style="margin: auto;"
          keep-color
          color="teal-5"
          size="lg"
          checked-icon="img:ct-logo.png"
          unchecked-icon="img:bch-logo.png"
          :class="getDarkModeClass(darkMode)"
        />
        <q-img src="ct-logo.png" height="35px" width="35px" />
        CashToken
      </div>
      qr<br/>
      legacy address if bch<br/>
      address<br/>
      click to copy address<br/>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader'

export default {
  name: 'GenerateQR',

  components: {
    HeaderNav,
    ProgressLoader
  },

  data () {
    return {
      generatingAddress: false,
      isCt: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme
  }
}
</script>
