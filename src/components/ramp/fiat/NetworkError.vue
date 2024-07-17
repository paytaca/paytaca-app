<template>
  <div class="text-center q-px-lg" style="margin-top: 50px;">
    <q-icon name="wifi_off" size="100px" color="primary"/>
    <div :class="darkMode ? '' : 'text-grey-8'" style="font-size: large;">Server Cannot be Reached... ☹</div>
    <div class="q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-5'" style="font-size: medium;">Please Try Again</div>
    <q-btn
      round
      unelevated
      ripple
      dense
      size="30px"
      :icon="'refresh'"
      class="button button-text-primary"
      :class="getDarkModeClass(darkMode)">
    </q-btn>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      screenHeight: this.$q.screen.height
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>
<style lang="scss" scoped>
.center {
  margin: 0;
  position: absolute;
  top: 50%;
}
</style>
