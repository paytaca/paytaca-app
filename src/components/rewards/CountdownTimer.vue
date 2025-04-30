<template>
  <h4 class="col-12 no-margin q-px-md">{{ countdownText }}</h4>
  <div class="col-12 q-my-xl">
    <q-spinner-clock size="100px" />
  </div>
  <div class="text-h5">
    <p>{{ countdown }}</p>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { i18n } from 'src/boot/i18n'

export default {
  setup () {
    const { t: $t } = i18n.global
    const countdownText = ref($t('PageLiveNo'))
    const countdown = ref('')
    let intervalId = null

    const targetDate = new Date('2025-05-15T00:00:00Z') // May 15, 2025, UTC

    const updateCountdown = () => {
      const now = new Date()
      const timeLeft = targetDate.getTime() - now.getTime()

      if (timeLeft <= 0) {
        countdownText.value = $t('PageLiveYes')
        countdown.value = $t('PleaseWait')
        clearInterval(intervalId)
        return
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

      countdown.value = $t(
        'PageLiveTimeframe',
        { days, hours, minutes, seconds },
        `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`
      )
    }

    onMounted(() => {
      updateCountdown() // Initial update
      intervalId = setInterval(updateCountdown, 1000) // Update every second
    })

    onUnmounted(() => {
      clearInterval(intervalId) // Clear interval when component unmounts
    })

    return {
      countdown, countdownText
    }
  },
}
</script>
