<template>
  <q-dialog
    persistent
    seamless
    full-width
    position="bottom"
    ref="dialogRef"
    class="no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card-2 text-bow br-15"
      style="height: 70vh;"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row justify-between items-center">
        <span class="text-h6">Help</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div>
        Welcome to the Rewards Page!
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'HelpDialog',

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
