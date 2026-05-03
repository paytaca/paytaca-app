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

    <!-- Unknown contact prompt -->
    <div
      v-if="isUnknownContact"
      class="unknown-contact-banner"
      :class="getDarkModeClass(darkMode)"
      @click="showSaveContactDialog = true"
    >
      <q-icon name="person_add" size="18px" class="banner-icon" />
      <span class="banner-text">
        {{ $t('UnknownContactSavePrompt', {}, 'Save this contact to keep their name') }}
      </span>
      <q-icon name="chevron_right" size="18px" class="banner-chevron" />
    </div>

    <!-- Save contact dialog -->
    <q-dialog v-model="showSaveContactDialog" persistent>
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ $t('AddContact', {}, 'Add Contact') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="saveContactName"
            :label="$t('Name', {}, 'Name')"
            outlined
            dense
            rounded
            class="q-mb-md"
            autofocus
          />
          <q-input
            :model-value="otherMemberNpub"
            :label="$t('Npub', {}, 'npub')"
            outlined
            dense
            rounded
            readonly
            class="q-mb-md"
          />
          <q-btn
            :label="$t('AddContact', {}, 'Add Contact')"
            color="primary"
            rounded
            unelevated
            class="full-width"
            :disable="!saveContactName.trim()"
            @click="saveContact"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
            :is-read="messageReadMap[msg.id] || false"
            :is-new="newMessageIds.has(msg.id)"
          />
        </div>
      </div>
    </div>

    <!-- Input area -->
    <chat-input @send="onSend" @focus="scrollToBottom" />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import MessageBubble from 'src/components/chat/MessageBubble.vue'
import ChatInput from 'src/components/chat/ChatInput.vue'
import { npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'ChatConversation',
  components: { HeaderNav, MessageBubble, ChatInput },
  props: {
    roomId: { type: String, required: true },
  },
  data () {
    return {
      newMessageIds: new Set(),
      previousMessageCount: 0,
      showSaveContactDialog: false,
      saveContactName: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      return this.$store.getters['nostrChat/getRoom'](this.roomId)
    },
    otherMemberPubKey () {
      const room = this.room
      const myPubKey = this.myPubKey
      if (!room || !myPubKey) return null
      return room.members.find(m => m !== myPubKey) || null
    },
    otherMemberNpub () {
      const pk = this.otherMemberPubKey
      if (!pk) return null
      try {
        return npubEncode(pk)
      } catch {
        return null
      }
    },
    otherMemberContact () {
      const npub = this.otherMemberNpub
      if (!npub) return null
      return this.$store.getters['nostrChat/getContactByNpub'](npub)
    },
    isUnknownContact () {
      return this.otherMemberPubKey && !this.otherMemberContact
    },
    displayNpub () {
      const npub = this.otherMemberNpub
      if (!npub) return ''
      return npub.slice(0, 12) + '...' + npub.slice(-8)
    },
    roomName () {
      const room = this.room
      if (!room) return this.$t('Chat', {}, 'Chat')
      // If contact exists, use the room name (which is the contact name)
      if (this.otherMemberContact) {
        return room.name || this.$t('Chat', {}, 'Chat')
      }
      // Unknown contact: show npub in header
      return this.displayNpub || room.name || this.$t('Chat', {}, 'Chat')
    },
    messages () {
      // Access state directly for full reactivity — getter factories don't
      // track nested state mutations, so new messages never trigger updates.
      const room = this.$store.getters['nostrChat/getRoom'](this.roomId)
      if (!room) return []
      return this.$store.state.nostrChat.messages[this.roomId] || []
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    messageReadMap () {
      // Compute read status for messages I sent.
      // Uses Kind 7 "👀" reactions received via NIP-17 gift-wraps.
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey) return map

      const readBy = this.$store.state.nostrChat.messageReadBy?.[this.roomId] || {}
      const readByKeys = Object.keys(readBy)
      if (readByKeys.length > 0) {
        console.log('[Debug] messageReadMap: roomId=' + this.roomId + ', readBy has ' + readByKeys.length + ' messages')
      }

      for (const msg of this.messages) {
        // Only check read status for messages I sent
        if (msg.sender !== myPubKey) continue
        // Read if ANY other room member sent a 👀 reaction for this message
        const isRead = Object.keys(readBy[msg.id] || {}).length > 0
        if (isRead) {
          console.log('[Debug] messageReadMap: msg ' + msg.id.slice(0, 12) + ' is READ')
        }
        map[msg.id] = isRead
      }

      return map
    },
  },
  watch: {
    messages: {
      handler (newMessages) {
        this.scrollToBottom()
        this.markAsRead()

        // Track newly received messages for highlight effect
        const currentCount = newMessages.length
        if (currentCount > this.previousMessageCount) {
          const newMsgs = newMessages.slice(this.previousMessageCount)
          newMsgs.forEach(msg => {
            // Only highlight messages from others (not my own)
            if (msg.sender !== this.myPubKey) {
              this.newMessageIds.add(msg.id)
              // Remove highlight class after animation completes (4s + buffer)
              setTimeout(() => {
                this.newMessageIds.delete(msg.id)
              }, 5000)
            }
          })
        }
        this.previousMessageCount = currentCount
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
    this.markAsRead()
    this.ensureSubscribed()
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  },
  beforeUnmount () {
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
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
    markAsRead () {
      if (this.roomId) {
        this.$store.dispatch('nostrChat/markRoomAsRead', this.roomId)
      }
    },
    ensureSubscribed () {
      // Always ensure we have an active subscription,
      // especially after the tab has been backgrounded.
      if (!this.$store.getters['nostrChat/isInitialized']) {
        this.$store.dispatch('nostrChat/initialize').then(() => {
          this.$store.dispatch('nostrChat/subscribeToRelays')
        })
      } else {
        this.$store.dispatch('nostrChat/subscribeToRelays')
      }
    },
    onVisibilityChange () {
      if (document.visibilityState === 'visible') {
        this.ensureSubscribed()
      }
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
    async saveContact () {
      try {
        const name = this.saveContactName.trim()
        const npub = this.otherMemberNpub
        if (!name || !npub) return

        await this.$store.dispatch('nostrChat/addContact', { name, npub })

        // Update room name to the new contact name
        const contact = this.$store.getters['nostrChat/getContactByNpub'](npub)
        if (contact && this.room) {
          this.$store.commit('nostrChat/UPDATE_ROOM_NAME', {
            roomId: this.roomId,
            name: contact.name,
          })
        }

        this.saveContactName = ''
        this.showSaveContactDialog = false

        this.$q.notify({
          type: 'positive',
          message: this.$t('ContactSaved', {}, 'Contact saved'),
        })
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: this.$t('ContactSaveFailed', {}, 'Failed to save contact') + ': ' + err.message,
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
  padding-bottom: 25px !important;
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

/* Unknown contact banner */
.unknown-contact-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.unknown-contact-banner:active {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.banner-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #1d4ed8;
}

.banner-chevron {
  color: #3b82f6;
  flex-shrink: 0;
}

.dialog-header {
  padding-bottom: 8px;
}

/* Dark mode: unknown contact banner */
.dark.unknown-contact-banner {
  background: linear-gradient(135deg, #1e3a5f, #1a3655);
  border-bottom-color: rgba(59, 130, 246, 0.2);
}

.dark.unknown-contact-banner:active {
  background: linear-gradient(135deg, #1a3655, #172554);
}

.dark .banner-icon {
  color: #60a5fa;
}

.dark .banner-text {
  color: #93c5fd;
}

.dark .banner-chevron {
  color: #60a5fa;
}
</style>
