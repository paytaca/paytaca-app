<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow column"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/chat"
      :title="roomName"
    />

    <!-- Messages area -->
    <div ref="messagesContainer" class="messages-scroll-area col scroll">
      <div v-if="messages.length === 0" class="empty-conversation">
        <div class="empty-illustration">
          <q-icon name="chat_bubble_outline" size="64px" />
        </div>
        <div class="empty-title">{{ $t('NoMessagesYet', {}, 'No messages yet') }}</div>
        <div class="empty-subtitle">{{ $t('SendFirstMessage', {}, 'Send your first message') }}</div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="(msg, index) in messages"
          :key="msg.id"
          class="message-group"
        >
          <!-- Date separator (if day changes) -->
          <div
            v-if="showDateSeparator(index)"
            class="date-separator"
          >
            <span class="date-label">{{ formatDate(msg.created_at) }}</span>
          </div>

          <message-bubble
            :message="msg"
            :my-pub-key="myPubKey"
            :show-sender-name="room?.type === 'group'"
            :contacts="contacts"
          />
        </div>
      </div>
    </div>

    <!-- Input area -->
    <chat-input @send="onSend" />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import MessageBubble from 'src/components/chat/MessageBubble.vue'
import ChatInput from 'src/components/chat/ChatInput.vue'

export default {
  name: 'ChatConversation',
  components: { HeaderNav, MessageBubble, ChatInput },
  props: {
    roomId: { type: String, required: true },
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      return this.$store.getters['nostrChat/getRoom'](this.roomId)
    },
    roomName () {
      return this.room?.name || this.$t('Chat', {}, 'Chat')
    },
    messages () {
      return this.$store.getters['nostrChat/getMessages'](this.roomId)
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
  },
  watch: {
    messages: {
      handler () {
        this.scrollToBottom()
      },
      deep: true,
    },
    room (val) {
      if (!val) {
        this.$router.replace('/apps/chat')
      }
    },
  },
  mounted () {
    this.scrollToBottom()
    if (!this.$store.getters['nostrChat/isInitialized']) {
      this.$store.dispatch('nostrChat/initialize').then(() => {
        this.$store.dispatch('nostrChat/subscribeToRelays')
      })
    }
  },
  methods: {
    getDarkModeClass,
    scrollToBottom () {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    showDateSeparator (index) {
      if (index === 0) return true
      const curr = new Date(this.messages[index].created_at * 1000)
      const prev = new Date(this.messages[index - 1].created_at * 1000)
      return curr.toDateString() !== prev.toDateString()
    },
    formatDate (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      if (d.toDateString() === now.toDateString()) return 'Today'
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    },
    async onSend (text) {
      if (!this.room) return
      try {
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
      } catch (err) {
        console.error('Failed to send message:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('SendMessageFailed', {}, 'Failed to send message') + ': ' + err.message,
        })
      }
    },
  },
}
</script>

<style scoped>
#app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.messages-scroll-area {
  overflow-y: auto;
  padding: 16px 16px 24px;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message-group {
  display: flex;
  flex-direction: column;
}

/* Date separator */
.date-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0 12px;
}

.date-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 12px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Empty state */
.empty-conversation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
}

.empty-illustration {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #3b82f6;
  opacity: 0.7;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 14px;
  color: #9ca3af;
}

/* Dark mode */
.dark #app-container {
  background: #0f172a;
}

.dark .date-label {
  color: #64748b;
  background: rgba(255, 255, 255, 0.06);
}

.dark .empty-illustration {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.08));
  color: #60a5fa;
}

.dark .empty-title {
  color: #e2e8f0;
}

.dark .empty-subtitle {
  color: #64748b;
}
</style>
