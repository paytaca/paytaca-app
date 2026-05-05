<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow column"
    :class="getDarkModeClass(darkMode)"
    @click="hideContextMenu"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/chat"
      :title="roomName"
    >
      <template v-if="room && room.members?.length > 1" v-slot:top-right-menu>
        <q-btn
          flat
          round
          dense
          icon="more_vert"
          size="sm"
          class="q-mr-xs"
        >
          <q-menu anchor="bottom right" self="top right">
            <q-item v-if="otherMemberContact" clickable v-close-popup @click="openRenameDialog">
              <q-item-section side>
                <q-icon name="edit" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('RenameContact', {}, 'Rename Contact') }}
              </q-item-section>
            </q-item>
            <q-separator v-if="otherMemberContact" />
            <q-item v-if="!isRoomArchived" clickable v-close-popup @click="confirmArchiveRoom">
              <q-item-section side>
                <q-icon name="archive" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('ArchiveConversation', {}, 'Archive Conversation') }}
              </q-item-section>
            </q-item>
            <q-item v-else clickable v-close-popup @click="unarchiveRoom">
              <q-item-section side>
                <q-icon name="unarchive" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('UnarchiveConversation', {}, 'Unarchive Conversation') }}
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="confirmDeleteRoom">
              <q-item-section side>
                <q-icon name="delete" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('DeleteConversation', {}, 'Delete Conversation') }}
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item
              v-if="!isContactBlocked"
              clickable
              v-close-popup
              @click="confirmBlockRoom"
            >
              <q-item-section side>
                <q-icon name="block" size="18px" color="negative" />
              </q-item-section>
              <q-item-section>
                <span class="text-negative">{{ $t('BlockContact', {}, 'Block Contact') }}</span>
              </q-item-section>
            </q-item>
            <q-item
              v-else
              clickable
              v-close-popup
              @click="confirmUnblockRoom"
            >
              <q-item-section side>
                <q-icon name="block" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('UnblockContact', {}, 'Unblock Contact') }}
              </q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
      </template>
    </header-nav>

    <!-- Rename contact dialog -->
    <q-dialog v-model="showRenameDialog" persistent>
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ $t('RenameContact', {}, 'Rename Contact') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="renameContactName"
            :label="$t('Name', {}, 'Name')"
            outlined
            dense
            rounded
            class="q-mb-md"
            autofocus
            @keyup.enter="renameContact"
          />
          <q-btn
            :label="$t('Save', {}, 'Save')"
            color="primary"
            rounded
            unelevated
            class="full-width"
            :disable="!renameContactName.trim()"
            @click="renameContact"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Unknown contact prompt -->
    <div
      v-if="isUnknownContact"
      class="unknown-contact-banner"
      :class="getDarkModeClass(darkMode)"
      :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)`, borderBottomColor: `${themeColor}26` }"
      @click="showSaveContactDialog = true"
    >
      <q-icon name="person_add" size="18px" class="banner-icon" :style="{ color: themeColor }" />
      <span class="banner-text" :style="{ color: `${themeColor}cc` }">
        {{ $t('UnknownContactSavePrompt', {}, 'Save this contact to keep their name') }}
      </span>
      <q-icon name="chevron_right" size="18px" class="banner-chevron" :style="{ color: themeColor }" />
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
    <div ref="messagesContainer" class="messages-scroll-area col scroll" @click="hideContextMenu" @scroll="onMessagesScroll">
      <div v-if="displayedMessages.length === 0" class="empty-conversation">
        <div class="empty-illustration">
          <q-icon name="chat_bubble_outline" size="64px" />
        </div>
        <div class="empty-title">{{ $t('NoMessagesYet', {}, 'No messages yet') }}</div>
        <div class="empty-subtitle">{{ $t('SendFirstMessage', {}, 'Send your first message') }}</div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="(msg, index) in displayedMessages"
          :key="msg.id"
          :id="'msg-' + msg.id"
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
            :reply-to-message="getMessageById(msg.replyTo)"
            :is-replying="replyToMessage?.id === msg.id"
            :reactions="getMessageReactions(msg.id)"
            @context-menu="openMessageMenu"
            @remove-reaction="onRemoveReaction"
            @scroll-to-message="scrollToMessage"
          />
        </div>
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <transition name="scroll-btn-fade">
      <button
        v-if="showScrollToBottom"
        class="scroll-to-bottom-btn"
        :class="getDarkModeClass(darkMode)"
        @click="onScrollToBottom"
      >
        <q-icon name="keyboard_arrow_down" size="24px" />
      </button>
    </transition>

    <!-- Reply bar -->
    <div v-if="replyToMessage" class="reply-bar" :class="getDarkModeClass(darkMode)">
      <div class="reply-bar-indicator" :style="{ background: themeColor }"></div>
      <div class="reply-bar-body">
        <div class="reply-bar-label" :style="{ color: themeColor }">
          {{ $t('ReplyingTo', {}, 'Replying to') }} {{ replySenderName }}
        </div>
        <div class="reply-bar-snippet">{{ replyToSnippet }}</div>
      </div>
      <q-btn flat dense unelevated icon="close" size="sm" class="reply-bar-close" @click="cancelReply" />
    </div>

    <!-- Input area -->
    <chat-input ref="chatInput" @send="onSend" @command="onCommand" @focus="onInputFocus" @blur="onInputBlur" />

    <!-- Message context menu -->
    <q-menu ref="contextMenu" touch-position no-parent-event class="text-bow" :class="getDarkModeClass(darkMode)">
      <q-list style="min-width: 150px">
        <q-item clickable v-close-popup @click.stop="setReply(contextMessage)" @pointerdown.stop.prevent="menuPointerDown('reply', $event)">
          <q-item-section avatar>
            <q-icon name="reply" size="20px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('Reply', {}, 'Reply') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item-label header class="q-px-md q-pt-sm q-pb-none">{{ $t('React', {}, 'React') }}</q-item-label>
        <q-item class="q-px-sm q-py-xs">
          <q-item-section>
            <div class="react-emoji-row">
              <span v-for="emoji in quickReactions" :key="emoji" class="react-emoji" v-close-popup @click.stop="onReact(contextMessage, emoji)" @pointerdown.stop.prevent="menuPointerDown('emoji-'+emoji, $event)">{{ emoji }}</span>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Send BCH Dialog -->
    <send-bch-dialog
      v-if="showSendDialog"
      :amount="sendAmount"
      :recipient-pub-key="sendRecipientPubKey"
      :recipient-name="getSendRecipientName()"
      :pre-filled-address="sendPreFilledAddress"
      @ok="onSendSuccess"
      @cancel="onSendCancel"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseMessageMarkup } from 'src/utils/chat-markup'
import HeaderNav from 'src/components/header-nav.vue'
import MessageBubble from 'src/components/chat/MessageBubble.vue'
import ChatInput from 'src/components/chat/ChatInput.vue'
import SendBchDialog from 'src/components/chat/SendBchDialog.vue'
import { npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'ChatConversation',
  components: { HeaderNav, MessageBubble, ChatInput, SendBchDialog },
  props: {
    roomId: { type: String, required: true },
  },
  data () {
    return {
      newMessageIds: new Set(),
      previousMessageCount: 0,
      showSaveContactDialog: false,
      saveContactName: '',
      showRenameDialog: false,
      renameContactName: '',
      showSendDialog: false,
      sendAmount: 0,
      sendRecipientPubKey: '',
      sendPreFilledAddress: '',
      inputFocused: false,
      replyToMessage: null,
      contextMessage: null,
      quickReactions: ['😂', '🎉', '❤️', '😊', '👍', '💯', '🔥', '🙏', '🤔', '😮', '😢', '👎'],
      showScrollToBottom: false,
      isContextMenuOpen: false,
      displayLimit: 15,
      isLoadingMore: false,
      _allMessagesLoaded: false,
      // Guard to ignore the next pointerdown which may be the finger lifting
      _ignoreNextPointerDown: false,
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
    isContactBlocked () {
      if (!this.otherMemberPubKey) return false
      return this.$store.getters['nostrChat/isContactBlocked'](this.otherMemberPubKey)
    },
    isRoomArchived () {
      return this.room?.archived === true
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
    allMessages () {
      const room = this.$store.getters['nostrChat/getRoom'](this.roomId)
      if (!room) return []
      return this.$store.state.nostrChat.messages[this.roomId] || []
    },
    displayedMessages () {
      const total = this.allMessages.length
      const limit = this.displayLimit
      if (total <= limit) return this.allMessages
      return this.allMessages.slice(total - limit)
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
    replySenderName () {
      if (!this.replyToMessage) return ''
      const contact = this.contacts.find(c => c.pubKeyHex === this.replyToMessage.sender)
      return contact?.name || this.replyToMessage.sender?.slice(0, 12) + '...'
    },
    replyToSnippet () {
      if (!this.replyToMessage) return ''
      const { text } = parseMessageMarkup(this.replyToMessage.content || '')
      return text.length > 80 ? text.slice(0, 80) + '...' : text
    },
    messageReadMap () {
      // Compute read status for messages I sent.
      // Uses Kind 7 "👀" reactions received via NIP-17 gift-wraps.
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey) return map

      const readBy = this.$store.state.nostrChat.messageReadBy?.[this.roomId] || {}

      for (const msg of this.allMessages) {
        // Only check read status for messages I sent
        if (msg.sender !== myPubKey) continue
        // Read if ANY other room member sent a 👀 reaction for this message
        map[msg.id] = Object.keys(readBy[msg.id] || {}).length > 0
      }

      return map
    },
  },
  watch: {
    allMessages: {
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
    // Use pointerdown to reliably detect outside interactions across devices
    // Attach in bubble phase (no capture) so menu item handlers can stop propagation
    document.addEventListener('pointerdown', this.onDocumentPointerDown)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onViewportResize)
      window.visualViewport.addEventListener('scroll', this.onViewportResize)
    } else {
      window.addEventListener('resize', this.onViewportResize)
    }
  },
  beforeUnmount () {
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    document.removeEventListener('pointerdown', this.onDocumentPointerDown)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onViewportResize)
      window.visualViewport.removeEventListener('scroll', this.onViewportResize)
    } else {
      window.removeEventListener('resize', this.onViewportResize)
    }
  },
  methods: {
    getDarkModeClass,
    onInputFocus () {
      this.inputFocused = true
      this.scrollToBottom()
    },
    onInputBlur () {
      this.inputFocused = false
    },
    scrollToBottom () {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
        // On mobile, the keyboard animates open after focus —
        // scroll again after the keyboard has finished pushing the viewport
        setTimeout(() => {
          const c = this.$refs.messagesContainer
          if (c) {
            c.scrollTop = c.scrollHeight
          }
        }, 300)
        setTimeout(() => {
          const c = this.$refs.messagesContainer
          if (c) {
            c.scrollTop = c.scrollHeight
          }
        }, 600)
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
        // Debounce: skip if we just re-subscribed (within last 2s).
        // The action layer also debounces, but this avoids unnecessary dispatches.
        if (this._lastVisibilitySubscribe) {
          const elapsed = Date.now() - this._lastVisibilitySubscribe
          if (elapsed < 2000) return
        }
        this._lastVisibilitySubscribe = Date.now()
        this.ensureSubscribed()
      }
    },
    onViewportResize () {
      if (this.inputFocused) {
        this.$nextTick(() => {
          const container = this.$refs.messagesContainer
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      }
    },
    showDateSeparator (index) {
      if (index === 0) return true
      const curr = new Date(this.allMessages[index].created_at * 1000)
      const prev = new Date(this.allMessages[index - 1].created_at * 1000)
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
    getMessageById (id) {
      if (!id) return null
      return this.allMessages.find(m => m.id === id) || null
    },
    getMessageReactions (messageId) {
      return this.$store.getters['nostrChat/getMessageReactions'](this.roomId, messageId)
    },
    openMessageMenu (message, event) {
      // Debugging: log when menu opens and what message is bound
      this.contextMessage = message
      this.$nextTick(() => {
        this.$refs.contextMenu?.show(event)
        this.isContextMenuOpen = true
        // Ignore the next pointerdown to avoid immediate dismissal on touch
        this._ignoreNextPointerDown = true
        // Also clear the guard after a short window to avoid permanently blocking interactions
        setTimeout(() => { this._ignoreNextPointerDown = false }, 350)
      })
    },
    hideContextMenu () {
      // If we're within the ignore window, don't immediately hide (prevents the opening gesture from closing it)
      if (this._ignoreNextPointerDown) return
      this.$refs.contextMenu?.hide()
      this.isContextMenuOpen = false
    },
    onDocumentPointerDown (e) {
      // Ignore pointerdown immediately following opening the menu (same interaction)
      if (this._ignoreNextPointerDown) {
        this._ignoreNextPointerDown = false
        return
      }

      if (!this.isContextMenuOpen) return
      const menuEl = this.$refs.contextMenu?.$el
      const target = e.target
      // Use composedPath if available to accurately detect clicks inside teleported popups
      const path = (typeof e.composedPath === 'function') ? e.composedPath() : (e.path || [])
      const pathContainsMenu = path && menuEl && path.indexOf(menuEl) !== -1
      const pathHasQClose = path && path.some && path.some(n => n && n.__qclosepopup)
      if (menuEl && (menuEl.contains && menuEl.contains(target))) return
      if (pathContainsMenu) return
      if (pathHasQClose) return
      // As a last resort, check for the special Quasar close marker on the target
      if (target && target.__qclosepopup) return
      
      this.hideContextMenu()
    },
    onReact (message, emoji) {
      this.$refs.contextMenu?.hide()
      if (!message || !emoji) return
      // Visible debug feedback so we can see handlers firing without remote console
      
      this.$store.dispatch('nostrChat/sendReaction', {
        roomId: this.roomId,
        messageId: message.id || message.kind14Id,
        emoji,
      }).catch(err => {
        console.error('[Conversation] Failed to send reaction:', err)
      })
    },
    menuPointerDown (tag, e) {
      // Log pointerdown inside menu items to check event flow
      
      
    },
    onRemoveReaction ({ messageId, emoji }) {
      if (!messageId || !emoji) return
      this.$store.dispatch('nostrChat/removeReaction', {
        roomId: this.roomId,
        messageId,
        emoji,
      }).catch(err => {
        console.error('[Conversation] Failed to remove reaction:', err)
      })
    },
    scrollToMessage (messageId) {
      const el = document.getElementById('msg-' + messageId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-message')
        setTimeout(() => el.classList.remove('highlight-message'), 2000)
      }
    },
    onMessagesScroll () {
      const container = this.$refs.messagesContainer
      if (!container) return
      const threshold = 80
      this.showScrollToBottom = container.scrollTop + container.clientHeight < container.scrollHeight - threshold

      if (container.scrollTop < 50 && !this.isLoadingMore && !this._allMessagesLoaded) {
        this.loadMoreMessages()
      }
    },
    loadMoreMessages () {
      if (this.allMessages.length <= this.displayLimit) {
        this._allMessagesLoaded = true
        return
      }
      this.isLoadingMore = true
      const container = this.$refs.messagesContainer
      const prevScrollHeight = container.scrollHeight
      const prevScrollTop = container.scrollTop

      this.displayLimit += 10

      this.$nextTick(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
        }
        this.isLoadingMore = false

        if (this.allMessages.length <= this.displayLimit) {
          this._allMessagesLoaded = true
        }
      })
    },
    onScrollToBottom () {
      const container = this.$refs.messagesContainer
      if (!container) return
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    },
    setReply (message) {
      this.replyToMessage = message
      this.$nextTick(() => {
        this.$refs.chatInput?.$el?.querySelector('input')?.focus()
      })
    },
    cancelReply () {
      this.replyToMessage = null
    },
    async onSend (text) {
      if (!this.room) return
      try {
        const replyTo = this.replyToMessage?.id
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
          replyTo,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.replyToMessage = null
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
    openRenameDialog () {
      this.renameContactName = this.otherMemberContact?.name || ''
      this.showRenameDialog = true
    },
    async renameContact () {
      try {
        const name = this.renameContactName.trim()
        const contact = this.otherMemberContact
        if (!name || !contact) return

        await this.$store.dispatch('nostrChat/updateContact', {
          npub: contact.npub,
          name,
        })

        // Update room name to match
        if (this.room) {
          this.$store.commit('nostrChat/UPDATE_ROOM_NAME', {
            roomId: this.roomId,
            name,
          })
        }

        this.renameContactName = ''
        this.showRenameDialog = false

        this.$q.notify({
          type: 'positive',
          message: this.$t('ContactRenamed', {}, 'Contact renamed'),
        })
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: this.$t('ContactRenameFailed', {}, 'Failed to rename contact') + ': ' + err.message,
        })
      }
    },
    confirmArchiveRoom () {
      const roomName = this.roomName
      this.$q.dialog({
        title: this.$t('ArchiveConversation', {}, 'Archive Conversation'),
        message: this.$t('ArchiveConversationConfirm', { name: roomName }, `Archive conversation with ${roomName}?`),
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Archive', {}, 'Archive'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(() => {
        this.$store.commit('nostrChat/ARCHIVE_ROOM', this.roomId)
        this.$router.replace('/apps/chat')
        this.$q.notify({
          type: 'info',
          message: this.$t('ConversationArchived', {}, 'Conversation archived'),
        })
      })
    },
    unarchiveRoom () {
      this.$store.commit('nostrChat/UNARCHIVE_ROOM', this.roomId)
      this.$q.notify({
        type: 'positive',
        message: this.$t('ConversationUnarchived', {}, 'Conversation unarchived'),
      })
    },
    confirmBlockRoom () {
      const roomName = this.roomName
      const otherPubKey = this.otherMemberPubKey
      this.$q.dialog({
        title: this.$t('BlockContact', {}, 'Block Contact'),
        message: this.$t('BlockContactConfirm', { name: roomName }, `Block ${roomName}? You will no longer receive messages from them.`),
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Block', {}, 'Block'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(() => {
        if (otherPubKey) {
          this.$store.commit('nostrChat/BLOCK_CONTACT', otherPubKey)
        }
        this.$router.replace('/apps/chat')
        this.$q.notify({
          type: 'info',
          message: this.$t('ContactBlocked', {}, 'Contact blocked'),
        })
      })
    },
    confirmUnblockRoom () {
      const roomName = this.roomName
      const otherPubKey = this.otherMemberPubKey
      this.$q.dialog({
        title: this.$t('UnblockContact', {}, 'Unblock Contact'),
        message: this.$t('UnblockContactConfirm', { name: roomName }, `Unblock ${roomName}? They will be able to message you again.`),
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Unblock', {}, 'Unblock'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(() => {
        if (otherPubKey) {
          this.$store.commit('nostrChat/UNBLOCK_CONTACT', otherPubKey)
        }
        this.$q.notify({
          type: 'positive',
          message: this.$t('ContactUnblocked', {}, 'Contact unblocked'),
        })
      })
    },
    confirmDeleteRoom () {
      const roomName = this.roomName
      const otherPubKey = this.otherMemberPubKey
      const isBlocked = this.isContactBlocked

      if (isBlocked) {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Delete conversation with ${roomName}? This cannot be undone.`),
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('Delete', {}, 'Delete'), color: 'negative', flat: true },
          persistent: true,
        }).onOk(() => {
          this.$store.commit('nostrChat/REMOVE_ROOM', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({
            type: 'info',
            message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
          })
        })
      } else {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationOptions', { name: roomName }, `How would you like to delete the conversation with ${roomName}?`),
          options: {
            type: 'radio',
            model: 'delete',
            items: [
              {
                label: this.$t('DeleteOnly', {}, 'Delete only'),
                value: 'delete',
                description: this.$t('DeleteOnlyDesc', {}, 'Remove the conversation'),
              },
              {
                label: this.$t('BlockAndDelete', {}, 'Block and delete'),
                value: 'block_delete',
                description: this.$t('BlockAndDeleteDesc', {}, 'Remove the conversation and block the contact'),
              },
            ],
          },
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('Confirm', {}, 'Confirm'), color: 'negative', flat: true },
          persistent: true,
        }).onOk((option) => {
          if (option === 'block_delete' && otherPubKey) {
            this.$store.commit('nostrChat/BLOCK_CONTACT', otherPubKey)
          }
          this.$store.commit('nostrChat/REMOVE_ROOM', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({
            type: 'info',
            message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
          })
        })
      }
    },
    openSendDialog ({ amount, recipientPubKey }) {
      this.sendAmount = amount
      this.sendRecipientPubKey = recipientPubKey
      this.showSendDialog = true
    },
    onSendCancel () {
      this.showSendDialog = false
    },
    getSendRecipientName () {
      const contact = this.contacts.find(c => c.pubKeyHex === this.sendRecipientPubKey)
      return contact?.name || ''
    },
    async onCommand ({ type, amount, currency, originalText }) {
      if (type !== 'send') return
      if (!this.room) {
        this.$q.notify({ type: 'negative', message: 'No active room', timeout: 5000, closeBtn: true })
        this.$refs.chatInput?.setText(originalText)
        return
      }

      const currencyUpper = (currency || 'BCH').toUpperCase()

      if (currencyUpper === 'BCH') {
        await this.handleBchSend(amount, originalText)
      } else {
        this.$q.notify({
          type: 'info',
          message: this.$t('TokenSendNotSupported', { currency: currencyUpper }, `Sending ${currencyUpper} is not yet supported.`),
          timeout: 5000,
          closeBtn: true,
        })
        this.$refs.chatInput?.setText(originalText)
      }
    },
    async handleBchSend (amount, originalText) {
      const recipientPubKey = this.otherMemberPubKey
      if (!recipientPubKey) {
        this.$q.notify({ type: 'negative', message: 'No recipient found', timeout: 5000, closeBtn: true })
        this.$refs.chatInput?.setText(originalText)
        return
      }

      this.$q.loading.show({ message: 'Fetching recipient address...' })
      try {
        const address = await this.$store.dispatch('nostrChat/fetchPublishedBchAddress', {
          pubKeyHex: recipientPubKey,
        })
        this.$q.loading.hide()

        if (!address) {
          this.$q.notify({
            type: 'negative',
            message: this.$t('NoPublishedBCHAddress', {}, 'Recipient has not published a BCH address'),
            timeout: 5000,
            closeBtn: true,
          })
          this.$refs.chatInput?.setText(originalText)
          return
        }

        this.sendAmount = amount
        this.sendRecipientPubKey = recipientPubKey
        this.sendPreFilledAddress = address
        this.showSendDialog = true
      } catch (err) {
        this.$q.loading.hide()
        console.error('[Conversation] Failed to handle BCH send:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('FetchAddressFailed', {}, 'Failed to fetch recipient address'),
          timeout: 5000,
          closeBtn: true,
        })
        this.$refs.chatInput?.setText(originalText)
      }
    },
    async onSendSuccess ({ txid, amount, recipient }) {
      this.showSendDialog = false
      this.sendPreFilledAddress = ''
      this.$q.notify({
        type: 'positive',
        message: this.$t('BchSentSuccess', { amount, txid: txid?.slice(0, 12) }, `Successfully sent ${amount} BCH`),
      })

      // Send confirmation message in chat with embedded markup
      if (this.room && txid) {
        try {
          const text = `Sent ${amount} BCH [/*t:payment,a:${amount},x:${txid}*/]`
          const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
            roomId: this.roomId,
            text,
          })
          this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        } catch (err) {
          console.error('[Conversation] Failed to send confirmation message:', err)
        }
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
  position: relative;
}

.messages-scroll-area {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 16px 24px;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
  max-width: 100%;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
}

.message-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
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
  border-bottom: 1px solid;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.banner-icon {
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.banner-chevron {
  flex-shrink: 0;
}

.dialog-header {
  padding-bottom: 8px;
}

/* Reply bar */
.reply-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f4ff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
}

.reply-bar-indicator {
  width: 3px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-bar-body {
  flex: 1;
  min-width: 0;
}

.reply-bar-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 1px;
}

.reply-bar-snippet {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reply-bar-close {
  flex-shrink: 0;
}

.dark .reply-bar {
  background: #1a2332;
  border-top-color: rgba(255, 255, 255, 0.06);
}

.dark .reply-bar-snippet {
  color: #94a3b8;
}

/* Reaction emoji row */
.react-emoji-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  justify-items: center;
}

.react-emoji {
  font-size: 22px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.15s ease, transform 0.15s ease;
  line-height: 1;
}

.react-emoji:hover {
  background-color: rgba(0, 0, 0, 0.06);
  transform: scale(1.15);
}

.react-emoji:active {
  transform: scale(0.95);
}

.dark .react-emoji:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.message-group.highlight-message {
  animation: highlightFade 2s ease-out forwards;
}

@keyframes highlightFade {
  0%, 15% {
    background-color: rgba(59, 130, 246, 0.15);
  }
  100% {
    background-color: transparent;
  }
}

.dark .message-group.highlight-message {
  animation: highlightFadeDark 2s ease-out forwards;
}

@keyframes highlightFadeDark {
  0%, 15% {
    background-color: rgba(59, 130, 246, 0.25);
  }
  100% {
    background-color: transparent;
  }
}

.scroll-to-bottom-btn {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #ffffff;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.scroll-to-bottom-btn:hover {
  background: #f3f4f6;
  transform: translateX(-50%) scale(1.08);
}

.scroll-to-bottom-btn:active {
  transform: translateX(-50%) scale(0.95);
}

.scroll-to-bottom-btn.dark {
  background: #334155;
  color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.scroll-to-bottom-btn.dark:hover {
  background: #475569;
}

.scroll-btn-fade-enter-active,
.scroll-btn-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.scroll-btn-fade-enter-from,
.scroll-btn-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.7);
}
</style>
