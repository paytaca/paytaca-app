<template>
  <div
    class="message-row"
    :class="[isMine ? 'mine' : 'theirs', { 'is-replying': isReplying }]"
    @contextmenu.prevent="onContextMenu"
  >
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

      <!-- Reply preview -->
      <div v-if="replyToMessage" class="reply-preview">
        <div class="reply-preview-indicator" :style="{ background: themeColor }"></div>
        <div class="reply-preview-body">
          <div class="reply-preview-sender">{{ replySenderName }}</div>
          <div class="reply-preview-text">{{ replySnippet }}</div>
        </div>
      </div>

      <!-- Plain text content -->
      <div class="message-text">{{ displayText }}</div>

      <!-- Rich markup card: payment -->
      <div
        v-if="markup?.type === 'payment'"
        class="payment-card q-mt-sm"
        @click="openTransactionDetail"
      >
        <div class="payment-amount-row">
          <q-icon name="img:bitcoin-cash-circle.svg" size="22px" />
          <span class="payment-amount">{{ markup.amount }} BCH</span>
        </div>
        <div v-if="markup.txid" class="payment-txid">
          <span class="txid-label">TXID</span>
          <span class="txid-value">{{ formatTxid(markup.txid) }}</span>
          <q-icon name="chevron_right" size="16px" class="payment-chevron" />
        </div>
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
      <div v-if="groupedReactions.length" class="message-reactions">
        <span
          v-for="group in groupedReactions"
          :key="group.emoji"
          class="reaction-badge"
          @click.stop="expandedReaction = (expandedReaction === group.emoji ? null : group.emoji)"
        >
          {{ group.emoji }} {{ group.count }}
        </span>
      </div>
      <div v-if="expandedReaction" class="reaction-detail" @click.stop>
        <div class="reaction-detail-header">
          <span class="reaction-detail-emoji">{{ expandedReaction }}</span>
          <span class="reaction-detail-count">{{ expandedGroup.count }}</span>
        </div>
        <div class="reaction-detail-list">
          <div
            v-for="reactor in expandedGroup.reactors"
            :key="reactor"
            class="reaction-detail-item"
            :class="{ 'is-mine': reactor === myPubKey }"
            @click="onReactionClick(reactor, expandedReaction)"
          >
            <span class="reaction-detail-name">{{ reactorName(reactor) }}</span>
            <q-icon v-if="reactor === myPubKey" name="close" size="14px" class="reaction-remove-icon" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { parseMessageMarkup } from 'src/utils/chat-markup'

export default {
  name: 'MessageBubble',
  props: {
    message: { type: Object, required: true },
    myPubKey: { type: String, default: '' },
    showSenderName: { type: Boolean, default: false },
    contacts: { type: Array, default: () => [] },
    isRead: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
    replyToMessage: { type: Object, default: null },
    isReplying: { type: Boolean, default: false },
    reactions: { type: Array, default: () => [] },
  },
  emits: ['context-menu', 'remove-reaction'],
  data () {
    return {
      expandedReaction: null,
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
    replySenderName () {
      if (!this.replyToMessage) return ''
      const contact = this.contacts.find(c => c.pubKeyHex === this.replyToMessage.sender)
      return contact?.name || this.replyToMessage.sender?.slice(0, 12) + '...'
    },
    replySnippet () {
      if (!this.replyToMessage) return ''
      const text = this.replyToMessage.content || ''
      return text.length > 80 ? text.slice(0, 80) + '...' : text
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    parsed () {
      return parseMessageMarkup(this.message.content)
    },
    displayText () {
      return this.parsed.text
    },
    markup () {
      return this.parsed.markup
    },
    groupedReactions () {
      const groups = {}
      for (const r of this.reactions) {
        if (!groups[r.emoji]) groups[r.emoji] = { emoji: r.emoji, count: 0, reactors: [] }
        groups[r.emoji].count++
        groups[r.emoji].reactors.push(r.reactorPubKey)
      }
      return Object.values(groups)
    },
    expandedGroup () {
      if (!this.expandedReaction) return null
      return this.groupedReactions.find(g => g.emoji === this.expandedReaction)
    },
  },
  methods: {
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    formatTxid (txid) {
      if (!txid || txid.length < 16) return txid
      return txid.slice(0, 8) + '...' + txid.slice(-8)
    },
    openTransactionDetail () {
      if (!this.markup?.txid) return
      const roomId = this.$route?.params?.roomId
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: this.markup.txid },
        query: { from: 'chat', roomId },
      })
    },
    onContextMenu ($event) {
      this.$emit('context-menu', this.message, $event)
    },
    reactorName (pubKey) {
      if (pubKey === this.myPubKey) return this.$t('You', {}, 'You')
      const contact = this.contacts.find(c => c.pubKeyHex === pubKey)
      return contact?.name || pubKey.slice(0, 12) + '...'
    },
    onReactionClick (reactor, emoji) {
      if (reactor === this.myPubKey) {
        this.$emit('remove-reaction', { messageId: this.message.id || this.message.kind14Id, emoji })
        this.expandedReaction = null
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

/* Reply preview */
.reply-preview {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
}

.reply-preview-indicator {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-preview-body {
  flex: 1;
  min-width: 0;
}

.reply-preview-sender {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
  opacity: 0.8;
}

.reply-preview-text {
  font-size: 13px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dark mode reply preview */
.dark .reply-preview {
  background: rgba(255, 255, 255, 0.06);
}

.dark .reaction-badge {
  background: rgba(255, 255, 255, 0.1);
}

.dark .reaction-detail {
  background: rgba(255, 255, 255, 0.06);
}

.dark .reaction-detail-item.is-mine:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Replying indicator */
.message-row.is-replying .message-bubble {
  box-shadow: 0 0 0 2px var(--replying-color, #3b82f6) !important;
}

.message-text {
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reaction-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.reaction-badge:hover {
  transform: scale(1.08);
}

.reaction-badge:active {
  transform: scale(0.95);
}

.message-row.mine .reaction-badge {
  background: rgba(255, 255, 255, 0.2);
}

.reaction-detail {
  margin-top: 4px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 220px;
}

.reaction-detail-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 600;
}

.reaction-detail-emoji {
  font-size: 16px;
}

.reaction-detail-count {
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
}

.reaction-detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reaction-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: default;
}

.reaction-detail-item.is-mine {
  cursor: pointer;
}

.reaction-detail-item.is-mine:hover {
  background: rgba(0, 0, 0, 0.06);
}

.reaction-detail-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reaction-remove-icon {
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.read-receipt {
  font-size: 14px;
}

.read-receipt.read {
  color: #34d399;
}

/* Payment card */
.payment-card {
  padding: 12px 14px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.payment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
}

.payment-card:active {
  transform: translateY(0);
}

.payment-amount-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payment-amount {
  font-size: 18px;
  font-weight: 700;
  color: #166534;
}

.payment-txid {
  display: flex;
  align-items: center;
  gap: 6px;
}

.txid-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.txid-value {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #374151;
  flex: 1;
}

.payment-chevron {
  color: #9ca3af;
  margin-left: auto;
}

/* Dark mode overrides */
.dark .message-row.theirs .message-bubble {
  background: #1e293b;
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dark .payment-card {
  background: linear-gradient(135deg, #14532d, #166534);
  border-color: #166534;
}

.dark .payment-amount {
  color: #86efac;
}

.dark .txid-label {
  color: #9ca3af;
}

.dark .txid-value {
  color: #d1d5db;
}

.dark .payment-chevron {
  color: #6b7280;
}

.dark .payment-card:hover {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
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
