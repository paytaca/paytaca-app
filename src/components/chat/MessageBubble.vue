<template>
  <div class="message-row" :class="isMine ? 'mine' : 'theirs'">
    <div
      class="message-bubble"
      :class="{ 'new-message': isNew }"
      :style="isMine ? { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` } : {}"
    >
      <div
        v-if="showSenderName && !isMine"
        class="sender-name"
        :style="{ color: themeColor }"
      >
        {{ senderName }}
      </div>
      <div class="message-text">{{ message.content }}</div>

      <!-- Send BCH action card -->
      <div v-if="sendCommand && !isMine" class="send-action-card">
        <div class="send-action-header">
          <q-icon name="payments" size="18px" color="positive" />
          <span class="send-action-label">{{ sendCommand.amount }} BCH</span>
        </div>
        <div v-if="recipientCheckLoading" class="send-action-status">
          <q-spinner size="14px" />
          <span>Checking wallet...</span>
        </div>
        <div v-else-if="recipientRegistered" class="send-action-status registered">
          <q-icon name="check_circle" size="14px" color="positive" />
          <span>Paytaca wallet detected</span>
        </div>
        <div v-else class="send-action-status unregistered">
          <q-icon name="warning" size="14px" color="orange" />
          <span>Not a Paytaca wallet</span>
        </div>
        <q-btn
          v-if="!recipientCheckLoading"
          color="positive"
          unelevated
          dense
          no-caps
          icon="send"
          :label="$t('SendBCH', {}, 'Send BCH')"
          class="send-action-btn"
          @click="$emit('send-bch', { amount: sendCommand.amount, recipientPubKey: message.sender })"
        />
      </div>

      <div class="message-meta">
        <span class="message-time">{{ formatTime(message.created_at) }}</span>
        <q-icon
          v-if="isMine"
          name="done_all"
          size="14px"
          class="read-receipt"
          :class="isRead ? 'read' : ''"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { parseSendCommand, isNostrPubkeyRegistered } from 'src/utils/chat-send-utils'

export default {
  name: 'MessageBubble',
  props: {
    message: { type: Object, required: true },
    myPubKey: { type: String, default: '' },
    showSenderName: { type: Boolean, default: false },
    contacts: { type: Array, default: () => [] },
    isRead: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
  },
  emits: ['send-bch'],
  data () {
    return {
      recipientRegistered: false,
      recipientCheckLoading: false,
    }
  },
  computed: {
    isMine () {
      return this.message.sender === this.myPubKey
    },
    senderName () {
      const contact = this.contacts.find(c => c.pubKeyHex === this.message.sender)
      return contact?.name || this.message.sender?.slice(0, 12) + '...'
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    sendCommand () {
      if (this.isMine) return null
      return parseSendCommand(this.message.content)
    },
  },
  watch: {
    sendCommand: {
      immediate: true,
      handler (val) {
        if (val && !this.isMine) {
          this.checkRecipientRegistered()
        }
      },
    },
  },
  methods: {
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    async checkRecipientRegistered () {
      if (!this.message.sender) return
      console.log('[SendBCH] Checking pubkey:', this.message.sender)
      this.recipientCheckLoading = true
      try {
        this.recipientRegistered = await isNostrPubkeyRegistered(this.message.sender)
        console.log('[SendBCH] Registered:', this.recipientRegistered)
      } catch {
        this.recipientRegistered = false
      } finally {
        this.recipientCheckLoading = false
      }
    },
  },
}
</script>

<style scoped>
.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 8px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.theirs {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  line-height: 1.45;
}

.message-row.mine .message-bubble {
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.message-row.theirs .message-bubble {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.sender-name {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.message-text {
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Send BCH action card */
.send-action-card {
  margin-top: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.send-action-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.send-action-label {
  font-size: 16px;
  font-weight: 700;
  color: #166534;
}

.send-action-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
}

.send-action-status.registered {
  color: #166534;
}

.send-action-status.unregistered {
  color: #9a3412;
}

.send-action-btn {
  align-self: flex-start;
  border-radius: 8px;
  font-weight: 600;
}

/* Dark mode overrides */
.dark .message-row.theirs .message-bubble {
  background: #1e293b;
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dark .send-action-card {
  background: linear-gradient(135deg, #14532d, #166534);
  border-color: #166534;
}

.dark .send-action-label {
  color: #86efac;
}

.dark .send-action-status {
  color: #94a3b8;
}

.dark .send-action-status.registered {
  color: #86efac;
}

.dark .send-action-status.unregistered {
  color: #fdba74;
}

.dark .read-receipt {
  color: #94a3b8;
}

.dark .read-receipt.read {
  color: #34d399;
}

/* New message highlight — elegant background fade */
/* Only applies to received messages (not sent by me) */
.message-row.theirs .message-bubble.new-message {
  animation: newMessageFade 4s ease-out forwards;
}

@keyframes newMessageFade {
  0%, 20% {
    background-color: #dbeafe;
    box-shadow: 0 2px 16px rgba(59, 130, 246, 0.12);
  }
  100% {
    background-color: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }
}

/* Dark mode: new message highlight */
.dark .message-row.theirs .message-bubble.new-message {
  animation: newMessageFadeDark 4s ease-out forwards;
}

@keyframes newMessageFadeDark {
  0%, 20% {
    background-color: #1a3655;
    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.12);
  }
  100% {
    background-color: #1e293b;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
}
</style>
