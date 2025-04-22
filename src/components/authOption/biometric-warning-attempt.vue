<template>
  <q-dialog
    v-model="dialog"
    persistent
    seamless
    class="no-click-outside"
  >
    <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-end">
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <p class="">{{ $t('BiometricMaxAttemptsMsg') }}</p>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      dialog: false
    }
  },
  props: ['warningAttempts'],
  watch: {
    warningAttempts () {
      if (this.warningAttempts === 'show') {
        this.dialog = true
        this.startTimer()
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    startTimer () {
      let counter = 0
      const timer = setInterval(() => {
        counter++
        if (counter === 28) {
          clearInterval(timer)
          this.dialog = false
        }
      }, 1000)
    }
  }
}
</script>
