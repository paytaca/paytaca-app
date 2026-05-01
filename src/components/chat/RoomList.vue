<template>
  <div class="room-list q-py-sm">
    <div
      v-for="room in rooms"
      :key="room.id"
      class="room-item row items-center q-pa-md cursor-pointer"
      :class="getDarkModeClass(darkMode)"
      @click="$emit('select-room', room.id)"
    >
      <div class="col-auto q-mr-md">
        <q-avatar color="primary" text-color="white" size="48px">
          <q-icon v-if="room.type === 'group'" name="group" />
          <span v-else>{{ roomInitial(room) }}</span>
        </q-avatar>
      </div>
      <div class="col">
        <div class="row items-center justify-between">
          <div class="text-subtitle1 text-weight-medium text-bow" :class="getDarkModeClass(darkMode)">
            {{ roomName(room) }}
          </div>
          <div v-if="room.updatedAt" class="text-caption text-grey">
            {{ formatTime(room.updatedAt) }}
          </div>
        </div>
        <div class="row items-center justify-between">
          <div class="text-body2 text-grey ellipsis" style="max-width: 70%;">
            {{ lastMessagePreview(room.id) }}
          </div>
          <q-badge v-if="room.type === 'group'" color="accent" label="group" outline />
        </div>
      </div>
    </div>
    <div v-if="rooms.length === 0" class="text-center text-grey q-pa-lg">
      <q-icon name="chat_bubble_outline" size="48px" class="q-mb-sm" />
      <div>{{ $t('NoChatsYet', {}, 'No chats yet') }}</div>
      <div class="text-caption">{{ $t('StartNewChatPrompt', {}, 'Start a new chat to begin messaging') }}</div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDistanceToNow } from 'date-fns'

export default {
  name: 'RoomList',
  props: {
    rooms: { type: Array, default: () => [] },
    messages: { type: Object, default: () => ({}) },
  },
  emits: ['select-room'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  methods: {
    getDarkModeClass,
    roomInitial (room) {
      const name = room.name || ''
      return name.charAt(0).toUpperCase()
    },
    roomName (room) {
      return room.name || room.id.slice(0, 12) + '...'
    },
    lastMessagePreview (roomId) {
      const msgs = this.messages[roomId] || []
      if (!msgs.length) return this.$t('NoMessagesYet', {}, 'No messages yet')
      const last = msgs[msgs.length - 1]
      return last.content
    },
    formatTime (ts) {
      try {
        return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true })
      } catch {
        return ''
      }
    },
  },
}
</script>

<style scoped>
.room-item {
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.room-item:last-child {
  border-bottom: none;
}
</style>
