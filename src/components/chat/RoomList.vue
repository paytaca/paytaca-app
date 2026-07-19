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
          <q-icon :name="leftSwipeIcon(room)" size="20px" color="white" />
          <span class="text-white text-weight-medium" style="font-size: 13px;">
            {{ leftSwipeLabel(room) }}
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
                :style="roomAvatarStyle(room)"
              >
                <img v-if="getDmAvatar(room)" :src="getDmAvatar(room)" />
                <q-icon v-else-if="room.type === 'group'" name="group" size="24px" />
                <span v-else class="avatar-initial">{{ roomInitial(room) }}</span>
              </q-avatar>
              <div
                v-if="activeIndicatorMap[room.id]"
                class="active-dot"
                :class="{ 'active-dot--dark': darkMode }"
              ></div>
        </div>
        <div class="room-content">
          <div class="room-header">
            <div class="room-name" :class="getDarkModeClass(darkMode)">
              {{ roomName(room) }}
              <q-badge v-if="room.type === 'group'" outline color="primary" class="q-ml-xs" style="font-size: 10px; padding: 1px 5px; font-weight: 500;">
                {{ $t('Group', {}, 'Group') }}
              </q-badge>
            </div>
            <div v-if="room.lastMessageAt || lastMessageTime(room.id) || room.updatedAt" class="room-time">
              {{ formatTime(room.lastMessageAt || lastMessageTime(room.id) || room.updatedAt) }}
            </div>
          </div>
          <div class="room-preview-row">
            <div class="room-preview" :class="getDarkModeClass(darkMode)">
              {{ lastMessagePreview(room.id) }}
            </div>
            <div class="room-badges">
              <div v-if="isRoomBlocked(room)" class="blocked-badge">{{ room.type === 'group' ? $t('Left', {}, 'LEFT') : $t('Blocked', {}, 'BLOCKED') }}</div>
              <div v-if="unreadCount(room.id) > 0" class="unread-badge">
                {{ unreadCount(room.id) }}
              </div>
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
import { ACTIVE_THRESHOLD_MS } from 'src/store/nostr-chat/state'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDistanceToNow } from 'date-fns'
import { npubEncode } from 'nostr-tools/nip19'
import { parseMessageMarkup } from 'src/utils/chat-markup'
import { getCachedAvatar, setCachedAvatar } from 'src/utils/avatar-cache'

export default {
  name: 'RoomList',
  props: {
    rooms: { type: Array, default: () => [] },
    messages: { type: Object, default: () => ({}) },
    archived: { type: Boolean, default: false },
  },
  emits: ['select-room', 'archive-room', 'unarchive-room', 'delete-room', 'block-room', 'unblock-room', 'leave-room', 'rejoin-room'],
  data () {
    return {
      dmAvatars: {},
      dmDisplayNames: {},
    }
  },
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
    showActiveStatus () {
      return this.$store.getters['nostrChat/getShowActiveStatus']
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
        map[room.id] = this.$store.getters['nostrChat/getUnreadCount'](room.id)
      }
      return map
    },
    activeIndicatorMap () {
      const map = {}
      if (!this.showActiveStatus) return map
      const activeStatus = this.$store.getters['nostrChat/getActiveStatusMap']
      for (const room of this.rooms) {
        if (room.type === 'group') continue
        const otherPubKey = room.members?.find(m => m !== this.myPubKey)
        if (!otherPubKey) continue
        const entry = activeStatus[otherPubKey]
        if (!entry || !entry.lastActiveAt) {
          map[room.id] = false
        } else {
          map[room.id] = Date.now() - new Date(entry.lastActiveAt).getTime() <= ACTIVE_THRESHOLD_MS
        }
      }
      return map
    },
  },
  async created () {
    const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
    const walletState = walletHash ? this.$store.state.nostrChat?.byWallet?.[walletHash] : null
    const nameCache = walletState?.displayNameCache || {}
    const avatarStoreCache = walletState?.avatarCache || {}

    const avatars = {}
    const names = {}
    for (const room of this.rooms) {
      if (room.type === 'group') continue
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (!otherPubKey) continue

      const cachedUrl = await getCachedAvatar(otherPubKey)
      const url = cachedUrl || avatarStoreCache[otherPubKey]?.avatar || null
      if (url) avatars[otherPubKey] = url

      const cachedName = nameCache[otherPubKey]?.displayName
      if (cachedName) names[otherPubKey] = cachedName
    }
    this.dmAvatars = avatars
    this.dmDisplayNames = names
  },
  async mounted () {
    await this.fetchDmAvatars()
  },
  watch: {
    rooms: {
      handler () {
        this.fetchDmAvatars()
      },
      deep: true,
    },
  },
  methods: {
    getDarkModeClass,
    isRoomBlocked (room) {
      if (room.type === 'group') {
        return this.$store.getters['nostrChat/isGroupBlocked'](room.id)
      }
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (!otherPubKey) return false
      return this.$store.getters['nostrChat/isContactBlocked'](otherPubKey)
    },
    leftSwipeLabel (room) {
      if (this.archived) return this.$t('Unarchive', {}, 'Unarchive')
      const blocked = this.isRoomBlocked(room)
      if (room.type === 'group') {
        return blocked ? this.$t('Rejoin', {}, 'Rejoin') : this.$t('Leave', {}, 'Leave')
      }
      return blocked ? this.$t('Unblock', {}, 'Unblock') : this.$t('Block', {}, 'Block')
    },
    leftSwipeIcon (room) {
      if (this.archived) return 'unarchive'
      const blocked = this.isRoomBlocked(room)
      if (room.type === 'group') {
        return blocked ? 'group_add' : 'exit_to_app'
      }
      return blocked ? 'lock_open' : 'block'
    },
    onSwipeLeft (room, { reset }) {
      reset()
      if (this.archived) {
        this.$emit('unarchive-room', room.id)
        return
      }
      const blocked = this.isRoomBlocked(room)
      if (room.type === 'group') {
        if (blocked) {
          this.$emit('rejoin-room', room.id)
        } else {
          this.$emit('leave-room', room.id)
        }
      } else {
        if (blocked) {
          this.$emit('unblock-room', room.id)
        } else {
          this.$emit('block-room', room.id)
        }
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
      if (room.type === 'group') {
        return (room.name || 'G').charAt(0).toUpperCase()
      }
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (otherPubKey) {
        const contact = this.contacts.find(c => c.pubKeyHex === otherPubKey)
        if (contact) {
          return contact.name.charAt(0).toUpperCase()
        }
        if (this.dmDisplayNames[otherPubKey]) {
          return this.dmDisplayNames[otherPubKey].charAt(0).toUpperCase()
        }
        // Unknown contact — use '?' as avatar initial
        return '?'
      }
      const name = room.name || ''
      return name.charAt(0).toUpperCase()
    },
    roomName (room) {
      if (room.type === 'group') return room.name || 'Group'
      // If a subject has been set, use it as the conversation name
      if (room.subject) return room.subject
      // Check if this room has a known contact
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      if (!otherPubKey) return room.name || room.id.slice(0, 12) + '...'

      const contact = this.contacts.find(c => c.pubKeyHex === otherPubKey)
      if (contact) {
        // Known contact — show their name
        return contact.name
      }

      // Check if we have a published display name from relays
      if (this.dmDisplayNames[otherPubKey]) {
        return this.dmDisplayNames[otherPubKey]
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
      if (last.isFile) {
        const icon = last.fileType?.startsWith('image/') ? '🖼'
          : last.fileType?.startsWith('video/') ? '🎥'
          : last.fileType?.startsWith('audio/') ? '🎵'
          : last.fileType === 'application/pdf' ? '📄'
          : '📎'
        return icon + ' ' + (last.fileName || this.$t('File', {}, 'File'))
      }
      const { text } = parseMessageMarkup(last.content)
      return text
    },
    lastMessageTime (roomId) {
      const msgs = this.messages[roomId] || []
      if (!msgs.length) return null
      const last = msgs[msgs.length - 1]
      return last.created_at || null
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
    getDmAvatar (room) {
      if (room.type === 'group') return null
      const otherPubKey = room.members?.find(m => m !== this.myPubKey)
      return otherPubKey ? this.dmAvatars[otherPubKey] || null : null
    },
    roomAvatarStyle (room) {
      if (this.getDmAvatar(room)) {
        return { background: 'transparent' }
      }
      return { background: `linear-gradient(135deg, ${this.themeColor}, ${this.themeColor}dd)` }
    },
    async fetchDmAvatars () {
      const avatarsToFetch = new Set()
      const namesToFetch = new Set()
      for (const room of this.rooms) {
        if (room.type === 'group') continue
        const otherPubKey = room.members?.find(m => m !== this.myPubKey)
        if (!otherPubKey) continue
        if (!this.dmAvatars[otherPubKey]) {
          avatarsToFetch.add(otherPubKey)
        }
        const contact = this.contacts.find(c => c.pubKeyHex === otherPubKey)
        if (!contact && !this.dmDisplayNames[otherPubKey]) {
          namesToFetch.add(otherPubKey)
        }
      }
      for (const pubKeyHex of avatarsToFetch) {
        try {
          const cachedUrl = await getCachedAvatar(pubKeyHex)
          if (cachedUrl) {
            this.dmAvatars = { ...this.dmAvatars, [pubKeyHex]: cachedUrl }
            continue
          }
          const avatar = await this.$store.dispatch('nostrChat/fetchPublishedAvatar', { pubKeyHex })
          if (avatar) {
            setCachedAvatar(pubKeyHex, avatar)
            this.dmAvatars = { ...this.dmAvatars, [pubKeyHex]: avatar }
          }
        } catch (err) {
          console.warn('[RoomList] Failed to fetch avatar:', err)
        }
      }
      for (const pubKeyHex of namesToFetch) {
        try {
          const displayName = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex })
          if (displayName) {
            this.dmDisplayNames = { ...this.dmDisplayNames, [pubKeyHex]: displayName }
          }
        } catch (err) {
          console.warn('[RoomList] Failed to fetch display name:', err)
        }
      }
    },
  },
}
</script>

<style scoped>
.room-list {
  padding: 4px 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
  position: relative;
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
  display: flex;
  align-items: center;
  gap: 4px;
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

.blocked-badge {
  padding: 1px 6px;
  border-radius: 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.4;
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

.active-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4caf50;
  border: 3px solid #ffffff;
  z-index: 1;
}

.active-dot--dark {
  border-color: #1e293b;
}

.dark .unread-badge {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.dark .empty-title {
  color: #94a3b8;
}
</style>
