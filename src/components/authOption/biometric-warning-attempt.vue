<template>
    <div>
      <q-dialog
      v-model="dialog"
      persistent
      >
        <q-card>
            <q-card-section>
                <p class="q-my-none pp-text">{{ $t('BiometricMaxAttemptsMsg') }}</p>
            </q-card-section>
        </q-card>
      </q-dialog>
    </div>
</template>

<script>

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
  methods: {
    startTimer () {
      let counter = 0
      const timer = setInterval(() => {
        counter++
        if (counter === 28) {
          clearInterval(timer)
          this.$emit('closeBiometricWarningAttempts')
          this.dialog = false
        }
      }, 1000)
    }
  }
}
</script>

<style>
.pp-text {
  color: #000 !important;
}
</style>
