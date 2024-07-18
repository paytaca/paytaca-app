<template>
  <q-dialog v-model="openDialog" maximized>
    <q-card class="pt-card">
      <q-btn
        unelevated
        dense
        size="lg"
        icon="close"
        padding="0"
        class="close-button q-mt-lg q-ml-md"
        round
        @click="close"
        >
      </q-btn>
      <div class="text-center q-px-lg" :style="`margin-top: 150px;`">
        <q-icon name="wifi_off" size="100px" color="primary"/>
        <div :class="darkMode ? '' : 'text-grey-8'" style="font-size: large;">Server Cannot be Reached... ☹</div>
        <div class="q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" style="font-size: medium;">Please Try Again Later</div>
        <q-btn
          round
          unelevated
          ripple
          dense
          size="30px"
          icon="refresh"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="retry"
          >
        </q-btn>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      openDialog: true,
      darkMode: this.$store.getters['darkmode/getStatus'],
      screenHeight: (this.$q.screen.height / 2) - 100
    }
  },
  emits: ['retry'],
  mounted () {
    console.log('network error dialog')
  },
  methods: {
    getDarkModeClass,
    close () {
      this.openDialog = false
      this.$router.push('/apps')
    },
    retry () {
      this.openDialog = false
      // this.$emit('retry')

      this.$router.go()
    }
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
