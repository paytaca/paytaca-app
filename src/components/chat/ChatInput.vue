<template>
  <div class="chat-input-wrapper" :class="getDarkModeClass(darkMode)">
    <div class="chat-input-container">
      <q-input
        v-model="text"
        dense
        borderless
        class="col chat-text-field"
        :placeholder="$t('TypeAMessage', {}, 'Type a message...')"
        @keydown.enter.prevent="send"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
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
  emits: ['send', 'focus', 'blur'],
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
  background: transparent;
  padding: 8px 16px;
  flex-shrink: 0;
}

.chat-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-radius: 28px;
  padding: 10px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.chat-input-container:focus-within {
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.2);
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
  background: transparent;
  padding: 8px 16px;
}

.dark .chat-input-container {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
}

.dark .chat-input-container:focus-within {
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.2), 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.dark .chat-text-field :deep(.q-field__native) {
  color: #e2e8f0;
}

.dark .chat-text-field :deep(.q-field__native::placeholder) {
  color: #64748b;
}
</style>
