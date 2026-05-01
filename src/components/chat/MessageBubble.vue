<template>
  <div class="message-bubble q-my-xs" :class="bubbleClass">
    <div
      class="bubble-content q-pa-sm rounded-borders"
      :class="[isMine ? 'bg-primary text-white' : 'bg-grey-3 text-dark', getDarkModeClass(darkMode)]"
      :style="isMine ? 'border-bottom-right-radius: 2px;' : 'border-bottom-left-radius: 2px;'"
    >
      <div v-if="showSenderName && !isMine" class="text-caption text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
        {{ senderName }}
      </div>
      <div class="text-body2" style="white-space: pre-wrap; word-break: break-word;">{{ message.content }}</div>
      <div class="row justify-end items-center q-mt-xs" style="gap: 4px;">
        <span class="text-caption" :class="isMine ? 'text-white' : 'text-grey-7'">
          {{ formatTime(message.created_at) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MessageBubble',
  props: {
    message: { type: Object, required: true },
    myPubKey: { type: String, default: '' },
    showSenderName: { type: Boolean, default: false },
    contacts: { type: Array, default: () => [] },
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMine () {
      return this.message.sender === this.myPubKey
    },
    bubbleClass () {
      return this.isMine ? 'row justify-end' : 'row justify-start'
    },
    senderName () {
      const contact = this.contacts.find(c => c.pubKeyHex === this.message.sender)
      return contact?.name || this.message.sender?.slice(0, 12) + '...'
    },
  },
  methods: {
    getDarkModeClass,
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  },
}
</script>

<style scoped>
.message-bubble {
  max-width: 85%;
}
.bubble-content {
  display: inline-block;
  min-width: 80px;
}
</style>
