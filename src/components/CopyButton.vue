<template>
  <q-btn @click.stop="() => copy(text)" size="sm" :icon="copied ? 'done_all' : 'content_copy'"
    :class="copied ? 'text-secondary' : ''" flat dense no-caps>{{ label ? label : '' }}</q-btn>
</template>

<script setup>
import { ref, inject } from 'vue'
import { copyToClipboard } from 'quasar'
const $copyText = inject('$copyText')

defineProps({
  text: String,
  label: {
    type: String,
    required: false
  }
})


const delay = async (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds))
}

const copied = ref('')
const copy = async (text) => {
  copied.value = 'copied'
  await copyToClipboard(text)
  await delay(500)
  copied.value = ''
}
</script>
