<template>
  <div class="chat-input-wrapper" :class="getDarkModeClass(darkMode)">
    <div class="chat-input-container row items-center q-gutter-sm">
      <q-input
        v-model="text"
        dense
        borderless
        class="col chat-text-field"
        :placeholder="$t('TypeAMessage', {}, 'Type a message...')"
        @keydown.enter.prevent="send"
        autofocus
      />
      <q-btn
        round
        unelevated
        color="primary"
        icon="send"
        size="sm"
        class="send-btn"
        :disable="!text.trim()"
        @click="send"
      />
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ChatInput',
  emits: ['send'],
  data () {
    return {
      text: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  methods: {
    getDarkModeClass,
    send () {
      const trimmed = this.text.trim()
      if (!trimmed) return
      this.$emit('send', trimmed)
      this.text = ''
    },
  },
}
</script>

<style scoped>
.chat-input-wrapper {
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 10px 16px;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.03);
}

.chat-input-container {
  background: #f3f4f6;
  border-radius: 24px;
  padding: 4px 4px 4px 16px;
  transition: box-shadow 0.2s ease;
}

.chat-input-container:focus-within {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.chat-text-field :deep(.q-field__control) {
  background: transparent !important;
}

.chat-text-field :deep(.q-field__native) {
  font-size: 15px;
  color: #1f2937;
}

.chat-text-field :deep(.q-field__native::placeholder) {
  color: #9ca3af;
}

.send-btn {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.send-btn:not(:disabled):active {
  transform: scale(0.92);
}

/* Dark mode */
.dark.chat-input-wrapper {
  background: #0f172a;
  border-top-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.2);
}

.dark .chat-input-container {
  background: #1e293b;
}

.dark .chat-text-field :deep(.q-field__native) {
  color: #e2e8f0;
}

.dark .chat-text-field :deep(.q-field__native::placeholder) {
  color: #64748b;
}
</style>
