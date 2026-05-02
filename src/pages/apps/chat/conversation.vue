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
    <div ref="messagesContainer" class="col q-pa-md scroll" style="overflow-y: auto;">
      <div v-if="messages.length === 0" class="text-center text-grey q-mt-xl">
        <q-icon name="chat_bubble_outline" size="48px" class="q-mb-sm" />
        <div>{{ $t('NoMessagesYet', {}, 'No messages yet') }}</div>
        <div class="text-caption">{{ $t('SendFirstMessage', {}, 'Send your first message') }}</div>
      </div>

      <message-bubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :my-pub-key="myPubKey"
        :show-sender-name="room?.type === 'group'"
        :contacts="contacts"
      />
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
    // Ensure initialized
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
    async onSend (text) {
      if (!this.room) return
      try {
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
        })
        // Optimistically add to UI
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        // Publish in background
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
}
</style>
