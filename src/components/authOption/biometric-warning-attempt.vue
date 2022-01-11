<template>
    <div>
      <q-dialog
      v-model="dialog"
      persistent
      >
        <q-card>
            <q-card-section>
                <p class="q-my-none">You've done many attempts. Please try again after 30 seconds.</p>
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
      setTimeout(() => {
        this.$emit('closeBiometricWarningAttempts')
        this.dialog = false
      }, 28000)
    }
  }
}
</script>

<style>
</style>
