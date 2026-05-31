import { ref, onUnmounted } from 'vue'

export function useKeyboardTooltip () {
  const showTooltip = ref(false)
  const tipCounter = ref(0)
  let tipTimer = null

  function showKeyboardTooltip () {
    clearTimeout(tipTimer)
    showTooltip.value = true
    tipCounter.value++
    tipTimer = setTimeout(() => { showTooltip.value = false }, 10000)
  }

  function hideKeyboardTooltip () {
    clearTimeout(tipTimer)
    showTooltip.value = false
  }

  onUnmounted(() => {
    clearTimeout(tipTimer)
  })

  return { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip }
}
