<template>
  <q-btn @click.stop="() => copy(text)" size="sm" :icon="copied ? 'done_all' : 'content_copy'"
    :class="copied ? 'text-secondary' : ''" flat dense no-caps></q-btn>
</template>

<script setup>
import { ref, inject } from 'vue'
const $copyText = inject('$copyText')

defineProps({ text: String })

const delay = async (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds))
}

const copied = ref('')
const copy = async (text) => {
  copied.value = 'copied'
  await delay(500)
  copied.value = ''
  $copyText(text || '')
}
</script>
