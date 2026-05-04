<template>
  <div class="room-list">
    <q-slide-item
      v-for="room in rooms"
      :key="room.id"
      :left-color="archived ? 'blue' : 'red'"
      :right-color="archived ? 'red' : 'blue'"
      @left="(evt) => onSwipeLeft(room, evt)"
      @right="(evt) => onSwipeRight(room, evt)"
    >
      <template v-slot:left>
        <div class="row items-center q-gutter-sm">
          <q-icon :name="archived ? 'unarchive' : (isRoomBlocked(room) ? 'lock_open' : 'block')" size="20px" color="white" />
          <span class="text-white text-weight-medium" style="font-size: 13px;">
            {{ archived ? $t('Unarchive', {}, 'Unarchive') : (isRoomBlocked(room) ? $t('Unblock', {}, 'Unblock') : $t('Block', {}, 'Block')) }}
          </span>
        </div>
      </template>
      <template v-slot:right>
        <div class="row items-center q-gutter-sm">
          <q-icon :name="archived ? 'delete' : 'archive'" size="20px" color="white" />
          <span class="text-white text-weight-medium" style="font-size: 13px;">
            {{ archived ? $t('Delete', {}, 'Delete') : $t('Archive', {}, 'Archive') }}
          </span>
        </div>
      </template>

      <div
        class="room-item"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('select-room', room.id)"
      >
        <div class="room-avatar">
            <q-avatar
                size="52px"
                class="avatar-bg"
                :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }"
              >
                <q-icon v-if="room.type === 'group'" name="group" size="24px" />
                <span v-else class="avatar-initial">{{ roomInitial(room) }}</span>
              </q-avatar>
        </div>
        <div class="room-content">
          <div class="room-header">
            <div class="room-name" :class="getDarkModeClass(darkMode)">
              {{ roomName(room) }}
            </div>
            <div v-if="room.updatedAt" class="room-time">
              {{ formatTime(room.updatedAt) }}
            </div>
          </div>
          <div class="room-preview-row">
            <div class="room-preview" :class="getDarkModeClass(darkMode)">
              {{ lastMessagePreview(room.id) }}
            </div>
            <div class="room-badges">
              <div v-if="unreadCount(room.id) > 0" class="unread-badge">
                {{ unreadCount(room.id) }}
              </div>
              <q-badge
                v-if="isRoomBlocked(room)"
                color="red"
                label="blocked"
                outline
                class="room-badge"
              />
              <q-badge
                v-if="room.type === 'group'"
                color="accent"
                label="group"
                outline
                class="room-badge"
              />
            </div>
          </div>
        </div>
      </div>
    </q-slide-item>
    <div v-if="rooms.length === 0" class="empty-state">
      <q-icon :name="archived ? 'archive' : 'chat_bubble_outline'" size="56px" class="empty-icon" />
      <div v-if="archived" class="empty-title">{{ $t('NoArchivedChats', {}, 'No archived chats') }}</div>
      <div v-else class="empty-title">{{ $t('NoChatsYet', {}, 'No chats yet') }}</div>
      <div v-if="!archived" class="empty-subtitle">{{ $t('StartNewChatPrompt', {}, 'Start a new chat to begin messaging') }}</div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDistanceToNow } from 'date-fns'
import { npubEncode } from 'nostr-tools/nip19'
import { parseMessageMarkup } from 'src/utils/chat-markup'

export default {
  name: 'RoomList',
  props: {
    rooms: { type: Array, default: () => [] },
    messages: { type: Object, default: () => ({}) },
    archived: { type: Boolean, default: false },
  },
  emits: ['select-room', 'archive-room', 'unarchive-room', 'delete-room', 'block-room', 'unblock-room'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    myPubKey () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    contacts () {
      return this.$store.getters['nostrChat/getContacts']
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    unreadCountMap () {
      // Compute unread counts by message ID.
      // NIP-17 randomizes created_at, so timestamp-based counting is unreliable.
      const map = {}
      const myPubKey = this.myPubKey
      if (!myPubKey) return map
      for (const room of this.rooms) {
        const msgs = this.$store.state.nostrChat.messages[room.id] || []
        const readIds = this.$store.state.nostrChat.readMessageIds?.[room.id] || {}
        map[room.id] = msgs.filter(m => m.sender !== myPubKey && !readIds[m.id]).length
      }
      return map
    },
  },
  methods: {
    getDarkModeClass,
    isRoomBlocked (room) {
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (!otherPubKey) return false
      return this.$store.getters['nostrChat/isContactBlocked'](otherPubKey)
    },
    onSwipeLeft (room, { reset }) {
      reset()
      if (this.archived) {
        this.$emit('unarchive-room', room.id)
      } else if (this.isRoomBlocked(room)) {
        this.$emit('unblock-room', room.id)
      } else {
        this.$emit('block-room', room.id)
      }
    },
    onSwipeRight (room, { reset }) {
      reset()
      if (this.archived) {
        this.$emit('delete-room', room.id)
      } else {
        this.$emit('archive-room', room.id)
      }
    },
    roomInitial (room) {
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (otherPubKey) {
        const contact = this.contacts.find(c => c.pubKeyHex === otherPubKey)
        if (contact) {
          return contact.name.charAt(0).toUpperCase()
        }
        // Unknown contact — use '?' as avatar initial
        return '?'
      }
      const name = room.name || ''
      return name.charAt(0).toUpperCase()
    },
    roomName (room) {
      // Check if this room has a known contact
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (!otherPubKey) return room.name || room.id.slice(0, 12) + '...'

      const contact = this.contacts.find(c => c.pubKeyHex === otherPubKey)
      if (contact) {
        // Known contact — show their name
        return contact.name
      }

      // Unknown contact — show truncated npub
      try {
        const npub = npubEncode(otherPubKey)
        return npub.slice(0, 12) + '...' + npub.slice(-8)
      } catch {
        return room.name || room.id.slice(0, 12) + '...'
      }
    },
    lastMessagePreview (roomId) {
      const msgs = this.messages[roomId] || []
      if (!msgs.length) return this.$t('NoMessagesYet', {}, 'No messages yet')
      const last = msgs[msgs.length - 1]
      const { text } = parseMessageMarkup(last.content)
      return text
    },
    formatTime (ts) {
      try {
        return formatDistanceToNow(new Date(ts * 1000), { addSuffix: false })
          .replace('about ', '')
          .replace('less than a minute ago', 'now')
          .replace('minute ago', 'm')
          .replace('minutes ago', 'm')
          .replace('hour ago', 'h')
          .replace('hours ago', 'h')
          .replace('day ago', 'd')
          .replace('days ago', 'd')
          .replace('week ago', 'w')
          .replace('weeks ago', 'w')
          .replace('month ago', 'mo')
          .replace('months ago', 'mo')
      } catch {
        return ''
      }
    },
    unreadCount (roomId) {
      return this.unreadCountMap[roomId] || 0
    },
  },
}
</script>

<style scoped>
.room-list {
  padding: 4px 0;
}

.room-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.room-item:last-child {
  border-bottom: none;
}

.room-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.room-item:active {
  background-color: rgba(0, 0, 0, 0.04);
}

.room-avatar {
  margin-right: 14px;
  flex-shrink: 0;
}

.avatar-bg {
  color: #ffffff;
  font-weight: 600;
  font-size: 20px;
}

.avatar-initial {
  line-height: 1;
}

.room-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.room-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-time {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
  white-space: nowrap;
}

.room-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.room-preview {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 85%;
}

.room-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.unread-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.room-badge {
  font-size: 10px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #9ca3af;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 13px;
  color: #9ca3af;
}

/* Dark mode */
.dark.room-item {
  border-bottom-color: rgba(255, 255, 255, 0.04);
}

.dark.room-item:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.dark.room-item:active {
  background-color: rgba(255, 255, 255, 0.05);
}

.dark .room-name {
  color: #f1f5f9;
}

.dark .room-preview {
  color: #94a3b8;
}

.dark .room-time {
  color: #64748b;
}

.dark .unread-badge {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.dark .empty-title {
  color: #94a3b8;
}
</style>
