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
      :subtitle="isGroupRoom ? $t('MemberCount', { count: room?.members?.length || 0 }, `${room?.members?.length || 0} members`) : typingDisplayText || (otherMemberIsActive ? $t('ActiveNow', {}, 'Active now') : null)"
    >
      <template v-if="room" v-slot:top-right-menu>
        <div class="header-actions">
          <q-btn
            v-if="isGroupRoom"
            flat
            round
            dense
            icon="group"
            class="header-info-btn"
            @click="$router.push(`/apps/chat/${roomId}/info`)"
          />
          <q-btn
            v-if="!isGroupRoom"
            flat
            round
            dense
            icon="info"
            class="header-info-btn"
            @click="$router.push(`/apps/chat/${roomId}/dm-info`)"
          />
          <q-btn
            flat
            round
            dense
            icon="more_vert"
            class="header-menu-btn"
          >
          <q-menu anchor="bottom right" self="top right" class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-item v-if="!isGroupRoom && otherMemberContact" clickable v-close-popup @click="openRenameDialog">
              <q-item-section side>
                <q-icon name="edit" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('RenameContact', {}, 'Rename Contact') }}
              </q-item-section>
            </q-item>
            <q-item v-if="isGroupRoom" clickable v-close-popup @click="openRenameGroupDialog">
              <q-item-section side>
                <q-icon name="edit" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('RenameGroup', {}, 'Rename Group') }}
              </q-item-section>
            </q-item>
            <q-item v-if="isGroupRoom" clickable v-close-popup @click="$router.push(`/apps/chat/${roomId}/info`)">
              <q-item-section side>
                <q-icon name="info" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('GroupInfo', {}, 'Group Info') }}
              </q-item-section>
            </q-item>
            <q-item v-if="isGroupRoom && isRoomMember" clickable v-close-popup @click="shareGroupLink">
              <q-item-section side>
                <q-icon name="share" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('ShareGroupLink', {}, 'Share Group Link') }}
              </q-item-section>
            </q-item>
            <q-item v-if="!isGroupRoom" clickable v-close-popup @click="$router.push(`/apps/chat/${roomId}/dm-info`)">
              <q-item-section side>
                <q-icon name="info" size="18px" />
              </q-item-section>
              <q-item-section>
                {{ $t('ConversationInfo', {}, 'Conversation Info') }}
              </q-item-section>
            </q-item>
            <q-separator v-if="!isGroupRoom && otherMemberContact || isGroupRoom" />
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
            <q-separator v-if="!isGroupRoom" />
            <q-item
              v-if="!isGroupRoom && !isContactBlocked"
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
              v-if="!isGroupRoom && isContactBlocked"
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
            <q-item
              v-if="isGroupRoom && !isGroupBlocked"
              clickable
              v-close-popup
              @click="confirmLeaveGroup"
            >
              <q-item-section side>
                <q-icon name="exit_to_app" size="18px" color="negative" />
              </q-item-section>
              <q-item-section>
                <span class="text-negative">{{ $t('LeaveGroup', {}, 'Leave Group') }}</span>
              </q-item-section>
            </q-item>
            <q-item
              v-if="isGroupRoom && isGroupBlocked"
              clickable
              v-close-popup
              @click="confirmRejoinGroup"
            >
              <q-item-section side>
                <q-icon name="group_add" size="18px" color="primary" />
              </q-item-section>
              <q-item-section>
                {{ $t('RejoinGroup', {}, 'Rejoin Group') }}
              </q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
        </div>
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
          <div v-if="fetchedDisplayName && otherMemberContact?.name" class="use-published-name-row q-mb-md">
            <q-icon name="badge" size="16px" color="primary" />
            <span class="use-published-name-text">
              {{ $t('OverrideWithPublishedName', {}, 'Override with published name:') }}
              <strong>{{ fetchedDisplayName }}</strong>
            </span>
            <q-btn
              flat
              dense
              :label="$t('Use', {}, 'Use')"
              color="primary"
              size="sm"
              @click="useFetchedDisplayName"
            />
          </div>
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

    <!-- Rename group dialog -->
    <q-dialog v-model="showRenameGroupDialog" persistent>
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ $t('RenameGroup', {}, 'Rename Group') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="renameGroupName"
            :label="$t('GroupName', {}, 'Group name')"
            outlined
            dense
            rounded
            maxlength="100"
            class="q-mb-md"
            autofocus
            @keyup.enter="renameGroup"
          />
          <q-btn
            :label="$t('Save', {}, 'Save')"
            color="primary"
            rounded
            unelevated
            class="full-width"
            :disable="!renameGroupName.trim()"
            @click="renameGroup"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Unknown contact prompt -->
    <div
      v-if="isUnknownContact && !isGroupRoom"
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
    <q-dialog v-model="showSaveContactDialog" persistent v-if="!isGroupRoom">
      <q-card style="min-width: 320px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
        <q-card-section class="dialog-header">
          <div class="text-h6">{{ $t('AddContact', {}, 'Add Contact') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <template v-if="fetchedDisplayName">
            <div class="published-identity-row q-mb-md">
              <q-avatar size="48px" color="grey-4" text-color="white" class="q-mr-sm">
                <img v-if="fetchedAvatar" :src="fetchedAvatar" />
                <template v-else>{{ fetchedDisplayName.charAt(0).toUpperCase() }}</template>
              </q-avatar>
              <span class="published-name-text"><strong>{{ fetchedDisplayName }}</strong></span>
            </div>
          </template>
          <q-input
            v-else
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

    <!-- Member: messages scroll area -->
    <template v-if="isRoomMember">
      <div ref="messagesContainer" class="messages-scroll-area col scroll" @click="hideContextMenu" @scroll="onMessagesScroll">
        <div v-if="displayedMessages.length === 0" class="empty-conversation">
          <div class="empty-illustration">
            <q-icon name="chat_bubble_outline" size="64px" />
          </div>
          <div class="empty-title">{{ $t('NoMessagesYet', {}, 'No messages yet') }}</div>
          <div class="empty-subtitle">{{ $t('SendFirstMessage', {}, 'Send your first message') }}</div>
        </div>

        <div v-else-if="ready" class="messages-list">
          <div v-if="allMessages.length > displayLimit" class="load-more-container">
            <button
              class="load-more-btn"
              :class="getDarkModeClass(darkMode)"
              :disabled="isLoadingMore"
              @click="loadMoreMessages"
            >
              <q-spinner v-if="isLoadingMore" size="16px" class="load-more-spinner" />
              <template v-else>{{ $t('LoadPreviousMessages', {}, 'Load previous messages') }}</template>
            </button>
          </div>
          <div
            v-for="(msg, index) in displayedMessages"
            :key="msg.id"
            :id="'msg-' + msg.id"
            :data-msg-id="msg.id"
            class="message-group"
          >
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
              :display-names="memberDisplayNames"
              :is-read="messageReadMap[msg.id] || false"
              :read-by-names="readByNamesMap[msg.id] || []"
              :is-new="newMessageIds.has(msg.id)"
              :reply-to-message="getMessageById(msg.replyTo)"
              :is-replying="replyToMessage?.id === msg.id"
              :reactions="getMessageReactions(msg.id)"
              @context-menu="openMessageMenu"
              @remove-reaction="onRemoveReaction"
              @scroll-to-message="scrollToMessage"
              @open-transaction="onOpenTransaction"
            />
          </div>
        </div>
      </div>

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

      <div v-if="!isGroupRoom && isContactBlocked" class="blocked-notice">
        <q-icon name="block" size="16px" />
        <span>{{ $t('ContactBlockedNotice', {}, 'Contact blocked') }}</span>
      </div>
      <div v-if="isGroupRoom && isGroupBlocked" class="blocked-notice">
        <q-icon name="exit_to_app" size="16px" />
        <span>{{ $t('LeftGroupNotice', {}, 'You left this group') }}</span>
      </div>
    </template>

    <!-- Non-member group: request to join card -->
    <template v-else-if="isGroupRoom && room?.members?.length">
      <div class="request-to-join-container">
        <div class="request-to-join-card" :class="getDarkModeClass(darkMode)">
          <div class="request-card-icon">
            <q-icon name="group" size="48px" />
          </div>
          <div class="request-card-title">{{ room?.name || $t('Group', {}, 'Group') }}</div>
          <div class="request-card-meta">
            {{ $t('MemberCount', { count: room?.members?.length || 0 }, `${room?.members?.length || 0} members`) }}
          </div>
          <div class="request-card-desc">
            {{ $t('RequestToJoinDesc', {}, 'Request to join this group') }}
          </div>
          <q-btn
            unelevated
            rounded
            color="primary"
            size="lg"
            no-caps
            :label="$t('RequestToJoin', {}, 'Request to Join')"
            class="request-join-btn q-mt-md"
            :loading="requestingToJoin"
            @click="requestToJoin"
          />
        </div>
      </div>
    </template>

    <!-- Loading group metadata -->
    <template v-else-if="_fetchingMeta || _loadingRoom">
      <div class="request-to-join-container">
        <div class="request-to-join-card" :class="getDarkModeClass(darkMode)">
          <q-spinner color="primary" size="36px" />
          <div class="request-card-desc q-mt-md">
            {{ $t('LoadingGroup', {}, 'Loading group info...') }}
          </div>
        </div>
      </div>
    </template>

    <!-- Unknown group -->
    <template v-else>
      <div class="request-to-join-container">
        <div class="request-to-join-card" :class="getDarkModeClass(darkMode)">
          <div class="request-card-icon">
            <q-icon name="group_off" size="48px" color="grey-5" />
          </div>
          <div class="request-card-title" style="color: #9ca3af;">{{ $t('GroupNotFound', {}, 'Group Not Found') }}</div>
          <div class="request-card-desc">
            {{ $t('GroupNotFoundDesc', {}, 'This group link is invalid or you may not have access.') }}
          </div>
        </div>
      </div>
    </template>

    <!-- Reply/Edit bars + Chat input (always rendered at bottom) -->
    <div v-if="replyToMessage" class="reply-bar" :class="getDarkModeClass(darkMode)">
      <div class="reply-bar-indicator" :style="{ background: themeColor }"></div>
      <q-icon
        v-if="replyToMessage.isFile"
        :name="replyToFileIcon"
        size="18px"
        class="reply-bar-file-icon"
        :style="{ color: themeColor }"
      />
      <div class="reply-bar-body">
        <div class="reply-bar-label" :style="{ color: themeColor }">
          {{ $t('ReplyingTo', {}, 'Replying to') }} {{ replySenderName }}
        </div>
        <div class="reply-bar-snippet">{{ replyToSnippet }}</div>
      </div>
      <q-btn flat dense unelevated icon="close" size="sm" class="reply-bar-close" @click="cancelReply" />
    </div>

    <div v-if="editingMessage" class="edit-bar" :class="getDarkModeClass(darkMode)">
      <div class="edit-bar-indicator" :style="{ background: themeColor }"></div>
      <div class="edit-bar-body">
        <div class="edit-bar-label" :style="{ color: themeColor }">
          {{ $t('EditingMessage', {}, 'Editing message') }}
        </div>
        <div class="edit-bar-snippet">{{ editSnippet }}</div>
      </div>
      <q-btn flat dense unelevated icon="close" size="sm" class="edit-bar-close" @click="cancelEdit" />
    </div>

    <div v-if="typingDisplayText" class="typing-indicator" :class="getDarkModeClass(darkMode)">
      <span class="typing-dots"><span></span><span></span><span></span></span>
      <span class="typing-text">{{ typingDisplayText }}</span>
    </div>

    <chat-input ref="chatInput" :room-id="roomId" :disabled="isRoomArchived || isContactBlocked || isGroupBlocked" :blocked="isContactBlocked || isGroupBlocked" :blocked-placeholder="isGroupBlocked ? $t('LeftGroupInputDisabled', {}, 'You left this group') : null" @send="onSend" @command="onCommand" @tip="onTipAction" @focus="onInputFocus" @blur="onInputBlur" />

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
        <q-item
          v-if="contextMessage?.sender === myPubKey && canEditMessage(contextMessage)"
          clickable
          v-close-popup
          @click.stop="setEdit(contextMessage)"
          @pointerdown.stop.prevent="menuPointerDown('edit', $event)"
        >
          <q-item-section avatar>
            <q-icon name="edit" size="20px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('Edit', {}, 'Edit') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="contextMessage?.sender === myPubKey && canDeleteMessage(contextMessage)"
          clickable
          v-close-popup
          @click.stop="confirmDeleteMessage(contextMessage)"
          @pointerdown.stop.prevent="menuPointerDown('delete', $event)"
        >
          <q-item-section avatar>
            <q-icon name="delete" size="20px" color="negative" />
          </q-item-section>
          <q-item-section>
            <span class="text-negative">{{ $t('Delete', {}, 'Delete') }}</span>
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

  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseMessageMarkup } from 'src/utils/chat-markup'
import HeaderNav from 'src/components/header-nav.vue'
import MessageBubble from 'src/components/chat/MessageBubble.vue'
import ChatInput from 'src/components/chat/ChatInput.vue'
import { npubEncode } from 'nostr-tools/nip19'
import { getCachedAvatar, setCachedAvatar } from 'src/utils/avatar-cache'
import { ACTIVE_THRESHOLD_MS } from 'src/store/nostr-chat/state'

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
      fetchedDisplayName: null,
      fetchedAvatar: null,
      showRenameDialog: false,
      renameContactName: '',
      showRenameGroupDialog: false,
      renameGroupName: '',

      inputFocused: false,
      replyToMessage: null,
      editingMessage: null,
      contextMessage: null,
      quickReactions: ['😂', '🎉', '❤️', '😊', '👍', '💯', '🔥', '🙏', '🤔', '😮', '😢', '👎'],
      showScrollToBottom: false,
      isContextMenuOpen: false,
      displayLimit: 15,
      isLoadingMore: false,
      _allMessagesLoaded: false,
      _scrollToMessageId: null,
      // Guard to ignore the next pointerdown which may be the finger lifting
      _ignoreNextPointerDown: false,
      ready: false,
      _savedScrollTop: null,
      requestingToJoin: false,
      _fetchedGroupMeta: null,
      _fetchingMeta: false,
      _loadingRoom: true,
      otherMemberAvatar: null,
      memberDisplayNames: {},
      _messageObserver: null,
      _visibleTimers: {},
      _pendingReadMsgIds: new Set(),
      _readMsgFlushTimer: null,
      _sentReadReceiptIds: new Set(),
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    room () {
      const room = this.$store.getters['nostrChat/getRoomById'](this.roomId)
      if (room) return room
      if (this._previewMembers?.length) {
        return {
          id: this.roomId,
          type: 'group',
          name: this._previewName || 'Group',
          members: this._previewMembers,
        }
      }
      return null
    },
    isRoomMember () {
      if (!this.room || !this.myPubKey) return false
      return this.room.members?.includes(this.myPubKey)
    },
    _isGroupLink () {
      return this.$route?.name === 'group-chat-link'
    },
    _previewMembers () {
      if (this._fetchedGroupMeta?.members?.length) return this._fetchedGroupMeta.members
      return this.$route.query?.members?.split(',') || null
    },
    _previewName () {
      if (this._fetchedGroupMeta?.name) return this._fetchedGroupMeta.name
      return this.$route.query?.name || null
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
    otherMemberAvatarUrl () {
      if (this.isGroupRoom || !this.otherMemberPubKey) return null
      return this.otherMemberAvatar || null
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
    isGroupBlocked () {
      if (!this.roomId) return false
      return this.$store.getters['nostrChat/isGroupBlocked'](this.roomId)
    },
    isGroupRoom () {
      return this.room?.type === 'group'
    },
    otherMemberIsActive () {
      const pk = this.otherMemberPubKey
      if (!pk || this.isGroupRoom) return false
      const activeData = this.$store.getters['nostrChat/getActiveStatusMap']
      const entry = activeData[pk]
      if (!entry?.lastActiveAt) return false
      return Date.now() - new Date(entry.lastActiveAt).getTime() <= ACTIVE_THRESHOLD_MS
    },
    typingUsers () {
      return this.$store.getters['nostrChat/getTypingUsers'](this.roomId)
    },
    displayNameCache () {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
      const walletState = walletHash ? this.$store.state.nostrChat?.byWallet?.[walletHash] : null
      return walletState?.displayNameCache || {}
    },
    typingDisplayText () {
      const users = this.typingUsers
      if (!users.length) return ''
      const cache = this.displayNameCache
      const names = users.map(pk => {
        const contact = this.contactsByPubKey.get(pk)
        if (contact?.name) return contact.name
        const cached = cache[pk]?.displayName
        if (cached) return cached
        const displayName = this.memberDisplayNames[pk]
        if (displayName) return displayName
        return pk.slice(0, 8) + '...'
      })
      if (names.length === 1) {
        return this.$t('IsTyping', { name: names[0] }, '{name} is typing...')
      }
      if (names.length === 2) {
        return this.$t('TwoTyping', { names: names.join(', ') }, '{names} are typing...')
      }
      return this.$t('MultipleTyping', {}, 'Several people are typing...')
    },
    displayNpub () {
      const npub = this.otherMemberNpub
      if (!npub) return ''
      return npub.slice(0, 12) + '...' + npub.slice(-8)
    },
    roomName () {
      const room = this.room
      if (!room) return this.$t('Chat', {}, 'Chat')
      // Group rooms: use room.name directly
      if (room.type === 'group') {
        return room.name || room.subject || this.$t('Group', {}, 'Group')
      }
      // DM: if a subject has been set, prefer it over the contact name
      if (room.subject) return room.subject
      // If contact exists, use the contact's name (the other party)
      if (this.otherMemberContact) {
        return this.otherMemberContact.name || room.name || this.$t('Chat', {}, 'Chat')
      }
      // Published display name from relay (fetched on conversation open)
      if (this.fetchedDisplayName) {
        return this.fetchedDisplayName
      }
      // Unknown contact: show npub in header
      return this.displayNpub || room.name || this.$t('Chat', {}, 'Chat')
    },
    allMessages () {
      const room = this.$store.getters['nostrChat/getRoom'](this.roomId)
      if (!room) return []
      return this.$store.getters['nostrChat/getMessages'](this.roomId)
    },
    // O(1) id -> message lookup map, recomputed only when allMessages changes.
    // Avoids per-row `allMessages.find()` calls in the template (was O(m) each).
    messageIndexById () {
      const map = new Map()
      for (const m of this.allMessages) {
        if (m.id) map.set(m.id, m)
      }
      return map
    },
    // O(1) pubKey -> contact lookup for reader-name resolution (avoids
    // contacts.find() per reader per message in readByNamesMap).
    contactsByPubKey () {
      const map = new Map()
      for (const c of this.contacts) {
        if (c.pubKeyHex) map.set(c.pubKeyHex, c)
      }
      return map
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
      if (contact?.name) return contact.name
      const displayName = this.memberDisplayNames[this.replyToMessage.sender]
      if (displayName) return displayName
      return this.replyToMessage.sender?.slice(0, 12) + '...'
    },
    replyToSnippet () {
      if (!this.replyToMessage) return ''
      if (this.replyToMessage.isFile) {
        return this.replyToMessage.fileName || this.$t('File', {}, 'File')
      }
      const { text } = parseMessageMarkup(this.replyToMessage.content || '')
      return text.length > 80 ? text.slice(0, 80) + '...' : text
    },
    replyToFileIcon () {
      if (!this.replyToMessage?.isFile) return 'description'
      if (this.replyToMessage.fileType?.startsWith('image/')) return 'image'
      if (this.replyToMessage.fileType?.startsWith('video/')) return 'videocam'
      if (this.replyToMessage.fileType?.startsWith('audio/')) return 'audiotrack'
      return 'description'
    },
    myDisplayName () {
      const myPub = this.myPubKey
      if (!myPub) return 'You'
      const npub = (() => { try { return npubEncode(myPub) } catch { return null } })()
      if (!npub) return 'You'
      const contact = this.contacts.find(c => c.pubKeyHex === myPub)
      return contact?.name || this.$t('You', {}, 'You')
    },
    editSnippet () {
      if (!this.editingMessage) return ''
      const { text } = parseMessageMarkup(this.editingMessage.content || '')
      return text.length > 80 ? text.slice(0, 80) + '...' : text
    },
    messageReadMap () {
      // Compute read status for messages I sent.
      // Uses Kind 7 "👀" reactions received via NIP-17 gift-wraps.
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey) return map

      const readBy = this.$store.getters['nostrChat/getMessageReadBy'](this.roomId)

      for (const msg of this.allMessages) {
        // Only check read status for messages I sent
        if (msg.sender !== myPubKey) continue
        // Read if ANY other room member sent a 👀 reaction for this message
        map[msg.id] = Object.keys(readBy[msg.id] || {}).length > 0
      }

      return map
    },
    readByNamesMap () {
      // For group chats: build a map of { [msgId]: [displayName, ...] } for reader avatars/tooltips
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey || room.type !== 'group') return map

      const readBy = this.$store.getters['nostrChat/getMessageReadBy'](this.roomId)
      const contactsByPubKey = this.contactsByPubKey

      for (const msg of this.allMessages) {
        if (msg.sender !== myPubKey) continue
        const readers = Object.keys(readBy[msg.id] || {})
        if (!readers.length) continue
        map[msg.id] = readers.map(pubKey => {
          const contact = contactsByPubKey.get(pubKey)
          if (contact?.name) return contact.name
          const displayName = this.memberDisplayNames[pubKey]
          if (displayName) return displayName
          return pubKey.slice(0, 8) + '...'
        })
      }

      return map
    },
  },
  watch: {
    otherMemberPubKey: {
      async handler (pubKey) {
        if (!pubKey || this.isGroupRoom) return
        // Show cached values immediately for fast rendering
        const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
        const walletState = walletHash ? this.$store.state.nostrChat?.byWallet?.[walletHash] : null
        const cachedName = walletState?.displayNameCache?.[pubKey]?.displayName
        if (cachedName) this.fetchedDisplayName = cachedName
        const cachedUrl = await getCachedAvatar(pubKey)
        this.otherMemberAvatar = cachedUrl || walletState?.avatarCache?.[pubKey]?.avatar || null
        // Force-refresh from relays on conversation open to pick up any updates
        this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex: pubKey, forceRefresh: true })
          .then(displayName => {
            if (displayName) {
              this.fetchedDisplayName = displayName
            }
          })
          .catch(() => {})
        this.$store.dispatch('nostrChat/fetchPublishedAvatar', { pubKeyHex: pubKey, forceRefresh: true })
          .then(avatar => {
            if (avatar) {
              setCachedAvatar(pubKey, avatar)
              this.otherMemberAvatar = avatar
            }
          })
          .catch(() => {})
      },
      immediate: true,
    },
    'allMessages.length' (newLen, oldLen) {
      // Only auto-mark-as-read when this conversation is actually visible.
      // When deactivated (keep-alive, user navigated to chat index), the
      // watcher still fires on new messages — skip it so the unread counter
      // on the chat index page stays accurate.
      if (!this._isActive) return
      this.markAsRead()

      if (newLen > oldLen) {
        const newMsgs = this.allMessages.slice(oldLen)
        const sentByMe = newMsgs.some(msg => msg.sender === this.myPubKey)
        newMsgs.forEach(msg => {
          if (msg.sender !== this.myPubKey) {
            this.newMessageIds.add(msg.id)
            setTimeout(() => {
              this.newMessageIds.delete(msg.id)
            }, 5000)
          }
        })
        if (sentByMe) {
          this.scrollToBottom()
        } else {
          // Auto-scroll for incoming messages only if already near the bottom
          const container = this.$refs.messagesContainer
          const nearBottom = container &&
            container.scrollTop + container.clientHeight >= container.scrollHeight - 150
          if (nearBottom) {
            this.scrollToBottom()
          }
        }
      }
      this.previousMessageCount = newLen
    this.$nextTick(() => this.observeMessages())
    },
    room (val) {
      if (val) {
        this._loadingRoom = false
        return
      }
      if (!this._isGroupLink) {
        this.$router.replace('/apps/chat')
      }
    },
    otherMemberIsActive (isActive, wasActive) {
      if (!isActive && wasActive && this.otherMemberPubKey) {
        this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
      }
    },
    async showSaveContactDialog (val) {
      this.fetchedDisplayName = null
      this.fetchedAvatar = null
      this.saveContactName = ''
      if (val && this.otherMemberPubKey) {
        try {
          const [displayName, avatar] = await Promise.all([
            this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
              pubKeyHex: this.otherMemberPubKey,
            }),
            this.$store.dispatch('nostrChat/fetchPublishedAvatar', {
              pubKeyHex: this.otherMemberPubKey,
            }),
          ])
          if (displayName) {
            this.fetchedDisplayName = displayName
            this.saveContactName = displayName
          }
          if (avatar) {
            this.fetchedAvatar = avatar
          }
        } catch (err) {
          console.warn('[Conversation] Failed to fetch display name:', err)
        }
      }
    },
    async showRenameDialog (val) {
      this.fetchedDisplayName = null
      if (val && this.otherMemberPubKey) {
        try {
          const displayName = await this.$store.dispatch('nostrChat/fetchPublishedDisplayName', {
            pubKeyHex: this.otherMemberPubKey,
          })
          if (displayName) {
            this.fetchedDisplayName = displayName
          }
        } catch (err) {
          console.warn('[Conversation] Failed to fetch display name:', err)
        }
      }
    },
    ready (val) {
      if (val) {
        this.$nextTick(() => {
          if (this._scrollToMessageId) {
            this.scrollToMessage(this._scrollToMessageId)
            this._scrollToMessageId = null
          } else if (this._savedScrollTop) {
            const container = this.$refs.messagesContainer
            if (container) {
              container.scrollTop = parseInt(this._savedScrollTop, 10)
            }
            this._savedScrollTop = null
          } else {
            this.scrollToBottom()
            requestAnimationFrame(() => this.scrollToBottom())
            setTimeout(() => this.scrollToBottom(), 160)
          }
          sessionStorage.removeItem('chat_scroll_room_id')
          sessionStorage.removeItem('chat_scroll_message_id')
          sessionStorage.removeItem('chat_scroll_display_limit')
          sessionStorage.removeItem('chat_scroll_top')
        })
      }
    },
  },
  mounted () {
    this.handleTipResult()
    if (this.room) {
      this._loadingRoom = false
    }
    if (!this.room && this._isGroupLink) {
      this._fetchingMeta = true
      this.$store.dispatch('nostrChat/fetchGroupMetadata', { roomId: this.roomId }).then(meta => {
        this._fetchedGroupMeta = meta
        this._fetchingMeta = false
        this._loadingRoom = false
      }).catch(() => {
        this._fetchingMeta = false
        this._loadingRoom = false
      })
    }
    const savedRoomId = sessionStorage.getItem('chat_scroll_room_id')
    const savedMessageId = sessionStorage.getItem('chat_scroll_message_id')
    const savedDisplayLimit = sessionStorage.getItem('chat_scroll_display_limit')
    const savedScrollTop = sessionStorage.getItem('chat_scroll_top')
    const canRestoreScroll = savedRoomId && savedRoomId === this.roomId && (savedMessageId || savedScrollTop)
    if (canRestoreScroll && savedMessageId) {
      this._scrollToMessageId = savedMessageId
      sessionStorage.removeItem('chat_scroll_message_id')
    }
    if (canRestoreScroll && savedDisplayLimit) {
      this.displayLimit = parseInt(savedDisplayLimit, 10)
      sessionStorage.removeItem('chat_scroll_display_limit')
    }
    this._savedScrollTop = savedScrollTop
    this.markAsRead()
    this.ensureSubscribed().catch(() => {})
    this._loadingFallbackTimer = setTimeout(() => {
      this._loadingRoom = false
    }, 15000)
    this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
    if (this.isGroupRoom && this.room?.members) {
      const fetches = this.room.members.map(pk =>
        this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex: pk })
          .then(name => {
            if (name) this.memberDisplayNames = { ...this.memberDisplayNames, [pk]: name }
          })
          .catch(() => {})
      )
      Promise.allSettled(fetches)
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    document.addEventListener('pointerdown', this.onDocumentPointerDown)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onViewportResize)
      window.visualViewport.addEventListener('scroll', this.onViewportResize)
    } else {
      window.addEventListener('resize', this.onViewportResize)
    }

    // Defer message rendering so the chat input is interactive first
    this.$nextTick(() => {
      this.ready = true
      this.$nextTick(() => {
        this.createMessageObserver()
        this.observeMessages()
      })
    })
    // Poll active status every minute while on this page
    this._activeStatusPollTimer = setInterval(() => {
      this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
    }, 60000)
    this._isActive = true
  },
  activated () {
    this._isActive = true
    this.markAsRead()
    this.ensureSubscribed().catch(() => {})
    this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
    if (!this._activeStatusPollTimer) {
      this._activeStatusPollTimer = setInterval(() => {
        this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
      }, 60000)
    }
    if (this.isGroupRoom && this.room?.members) {
      const fetches = this.room.members.map(pk =>
        this.$store.dispatch('nostrChat/fetchPublishedDisplayName', { pubKeyHex: pk })
          .then(name => {
            if (name) this.memberDisplayNames = { ...this.memberDisplayNames, [pk]: name }
          })
          .catch(() => {})
      )
      Promise.allSettled(fetches)
    }
    const savedRoomId = sessionStorage.getItem('chat_scroll_room_id')
    const savedMessageId = sessionStorage.getItem('chat_scroll_message_id')
    const savedDisplayLimit = sessionStorage.getItem('chat_scroll_display_limit')
    const savedScrollTop = sessionStorage.getItem('chat_scroll_top')
    const canRestoreScroll = savedRoomId && savedRoomId === this.roomId && (savedMessageId || savedScrollTop)
    if (canRestoreScroll && savedMessageId) {
      this._scrollToMessageId = savedMessageId
      sessionStorage.removeItem('chat_scroll_message_id')
    }
    if (canRestoreScroll && savedDisplayLimit) {
      this.displayLimit = parseInt(savedDisplayLimit, 10)
      sessionStorage.removeItem('chat_scroll_display_limit')
    }
    if (canRestoreScroll && this._scrollToMessageId) {
      this.$nextTick(() => {
        if (savedScrollTop) {
          const container = this.$refs.messagesContainer
          if (container) {
            container.scrollTop = parseInt(savedScrollTop, 10)
          }
          sessionStorage.removeItem('chat_scroll_top')
          sessionStorage.removeItem('chat_scroll_room_id')
        } else {
          this.scrollToMessage(this._scrollToMessageId)
        }
        this._scrollToMessageId = null
      })
    } else {
      sessionStorage.removeItem('chat_scroll_room_id')
      sessionStorage.removeItem('chat_scroll_message_id')
      sessionStorage.removeItem('chat_scroll_display_limit')
      sessionStorage.removeItem('chat_scroll_top')
      this.scrollToBottom()
      requestAnimationFrame(() => this.scrollToBottom())
      setTimeout(() => this.scrollToBottom(), 160)
    }
    this.$nextTick(() => {
      this.ready = true
      this.$nextTick(() => {
        this.createMessageObserver()
        this.observeMessages()
      })
    })
  },
  deactivated () {
    this.ready = false
    clearInterval(this._activeStatusPollTimer)
    this._activeStatusPollTimer = null
    // Only flush mark-as-read if we were actually visible — not if we were
    // already deactivated in keep-alive (e.g., user on chat index sees a new
    // message arrive, then navigates to home; the Apps layout unmounts and
    // triggers deactivated again, but we should NOT mark background-arrived
    // messages as read).
    if (this._isActive) {
      this._isActive = false
      this.flushMarkAsRead()
    }
  },
  beforeUnmount () {
    clearInterval(this._activeStatusPollTimer)
    clearTimeout(this._loadingFallbackTimer)
    this._activeStatusPollTimer = null
    if (this._isActive) {
      this._isActive = false
      this.flushMarkAsRead()
    }
    this.ready = false
    if (this._vpRaf) { cancelAnimationFrame(this._vpRaf); this._vpRaf = null }
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    document.removeEventListener('pointerdown', this.onDocumentPointerDown)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onViewportResize)
      window.visualViewport.removeEventListener('scroll', this.onViewportResize)
    } else {
      window.removeEventListener('resize', this.onViewportResize)
    }
    if (this._messageObserver) {
      this._messageObserver.disconnect()
      this._messageObserver = null
    }
    for (const id of Object.keys(this._visibleTimers)) {
      clearTimeout(this._visibleTimers[id])
    }
    this._visibleTimers = {}
    if (this._readMsgFlushTimer) {
      clearTimeout(this._readMsgFlushTimer)
      this._readMsgFlushTimer = null
    }
    this._pendingReadMsgIds.clear()
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
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        }
      })
    },
    markAsRead () {
      if (!this.roomId) return
      // Debounce: the `allMessages.length` watcher used to fire `markRoomAsRead`
      // on every incoming (or sent) message, and that action performs per-sender
      // NIP-44 ECDH + a relay publish — enough to jank the UI during a 60s poll
      // burst. Coalesce rapid calls into one dispatch at most every 3s, and
      // guarantee a flush on deactivate/unmount via flushMarkAsRead().
      //
      // Uses localOnly=true so this only marks messages as read locally (clears
      // unread badge) WITHOUT publishing 👝 reactions. The IntersectionObserver
      // handles publishing 👝 for messages the user actually views.
      if (this._markAsReadTimer) return
      this._markAsReadTimer = setTimeout(() => {
        this._markAsReadTimer = null
        this.$store.dispatch('nostrChat/markRoomAsRead', { roomId: this.roomId, localOnly: true })
      }, 3000)
    },
    flushMarkAsRead () {
      if (this._markAsReadTimer) {
        clearTimeout(this._markAsReadTimer)
        this._markAsReadTimer = null
      }
      if (this.roomId) {
        this.$store.dispatch('nostrChat/markRoomAsRead', { roomId: this.roomId, localOnly: true })
      }
    },
    createMessageObserver () {
      if (this._messageObserver) {
        this._messageObserver.disconnect()
        this._messageObserver = null
      }
      const container = this.$refs.messagesContainer
      if (!container) return
      this._messageObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const msgId = entry.target.dataset?.msgId
          if (!msgId) continue
          if (entry.isIntersecting) {
            if (this._visibleTimers[msgId]) continue
            this._visibleTimers[msgId] = setTimeout(() => {
              delete this._visibleTimers[msgId]
              this._pendingReadMsgIds.add(msgId)
              this._flushReadMsgIds()
            }, 2000)
          } else {
            if (this._visibleTimers[msgId]) {
              clearTimeout(this._visibleTimers[msgId])
              delete this._visibleTimers[msgId]
            }
          }
        }
      }, { root: container, threshold: 0.5 })
    },
    observeMessages () {
      if (!this._messageObserver || !this.$refs.messagesContainer) return
      const els = this.$refs.messagesContainer.querySelectorAll('.message-group')
      els.forEach(el => this._messageObserver.observe(el))
    },
    _flushReadMsgIds () {
      if (this._readMsgFlushTimer) return
      this._readMsgFlushTimer = setTimeout(() => {
        this._readMsgFlushTimer = null
        const ids = Array.from(this._pendingReadMsgIds)
        this._pendingReadMsgIds.clear()
        if (!ids.length || !this.roomId) return
        // Filter out own messages and already-processed IDs
        const filtered = ids.filter(id => {
          if (this._sentReadReceiptIds.has(id)) return false
          const msg = this.allMessages.find(m => m.id === id)
          return msg && msg.sender !== this.myPubKey
        })
        if (filtered.length) {
          for (const id of filtered) this._sentReadReceiptIds.add(id)
          this.$store.dispatch('nostrChat/markRoomAsRead', {
            roomId: this.roomId,
            messageIds: filtered,
          })
        }
      }, 200)
    },
    markMessageAsRead (msgId) {
      const msg = this.allMessages.find(m => m.id === msgId)
      if (!msg || msg.sender === this.myPubKey) return
      this._pendingReadMsgIds.add(msgId)
      this._flushReadMsgIds()
    },
    ensureSubscribed () {
      // Always ensure we have an active subscription,
      // especially after the tab has been backgrounded.
      if (!this.$store.getters['nostrChat/isInitialized']) {
        return this.$store.dispatch('nostrChat/initialize').then(() => {
          return this.$store.dispatch('nostrChat/subscribeToRelays')
        })
      } else {
        return this.$store.dispatch('nostrChat/subscribeToRelays')
      }
    },
    async requestToJoin () {
      this.requestingToJoin = true
      try {
        const members = this._previewMembers || this.room?.members || []
        await this.$store.dispatch('nostrChat/requestToJoinGroup', {
          roomId: this.roomId,
          memberPubKeys: members,
          name: this._previewName || this.room?.name,
        })
        this.$q.notify({
          type: 'positive',
          message: this.$t('JoinRequestSent', {}, 'Join request sent to group members'),
        })
      } catch (err) {
        console.error('[Conversation] Failed to send join request:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('JoinRequestFailed', {}, 'Failed to send join request'),
        })
      } finally {
        this.requestingToJoin = false
      }
    },
    async shareGroupLink () {
      try {
        if (!this.room?.name) {
          this.$q.notify({
            type: 'warning',
            message: this.$t('GroupHasNoName', {}, 'Set a group name first before sharing'),
          })
          return
        }
        await this.$store.dispatch('nostrChat/publishGroupMetadata', {
          roomId: this.roomId,
          memberPubKeys: this.room?.members || [],
          name: this.room?.name,
        })
      } catch (err) {
        console.warn('[Conversation] Failed to publish group metadata:', err)
      }
      const url = `https://chat.paytaca.com/group/${this.roomId}`
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url)
        this.$q.notify({
          type: 'positive',
          message: this.$t('GroupLinkCopied', {}, 'Group link copied to clipboard'),
        })
      } else {
        this.$q.dialog({
          title: this.$t('ShareGroupLink', {}, 'Share Group Link'),
          message: url,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          ok: { label: this.$t('Copy', {}, 'Copy'), flat: true, color: 'primary' },
        }).onOk(() => {
          const textArea = document.createElement('textarea')
          textArea.value = url
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          this.$q.notify({
            type: 'positive',
            message: this.$t('GroupLinkCopied', {}, 'Group link copied to clipboard'),
          })
        })
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
        this.ensureSubscribed().catch(() => {})
        this.markAsRead()
        this.$store.dispatch('nostrChat/fetchActiveStatus').catch(() => {})
      }
    },
    onViewportResize () {
      // visualViewport fires `resize` and `scroll` repeatedly while the
      // mobile keyboard is animating, which used to force
      // `$nextTick(scrollBottom)` on every tick and fight the user's own
      // scroll. Coalesce with rAF, and only auto-follow if the user is
      // already near the bottom (otherwise respect their scrolled-up view
      // and let `showScrollToBottom` offer to jump back).
      if (this._vpRaf) return
      this._vpRaf = requestAnimationFrame(() => {
        this._vpRaf = null
        if (!this.inputFocused || this.showScrollToBottom) return
        const container = this.$refs.messagesContainer
        if (container) container.scrollTop = container.scrollHeight
      })
    },
    showDateSeparator (index) {
      if (index === 0) return true
      const curr = new Date(this.displayedMessages[index].created_at * 1000)
      const prev = new Date(this.displayedMessages[index - 1].created_at * 1000)
      return curr.toDateString() !== prev.toDateString()
    },
    formatDate (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      if (d.toDateString() === now.toDateString()) return this.$t('Today')
      if (d.toDateString() === yesterday.toDateString()) return this.$t('Yesterday')
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    },
    getMessageById (id) {
      if (!id) return null
      return this.messageIndexById.get(id) || null
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
      const container = this.$refs.messagesContainer
      const el = document.getElementById('msg-' + messageId)
      if (!container || !el) return
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTop = offset
      el.classList.add('highlight-message')
      setTimeout(() => el.classList.remove('highlight-message'), 2000)
    },
    onOpenTransaction (messageId) {
      const msg = this.getMessageById(messageId)
      if (!msg) return
      const { markup } = parseMessageMarkup(msg.content)
      if (!markup?.txid) return
      const container = this.$refs.messagesContainer
      sessionStorage.setItem('chat_scroll_room_id', this.roomId)
      sessionStorage.setItem('chat_scroll_message_id', messageId)
      sessionStorage.setItem('chat_scroll_display_limit', this.displayLimit)
      if (container) {
        sessionStorage.setItem('chat_scroll_top', container.scrollTop)
      }
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: markup.txid },
        query: { from: 'chat', roomId: this.roomId },
      })
    },
    onMessagesScroll () {
      const container = this.$refs.messagesContainer
      if (!container) return
      const threshold = 80
      this.showScrollToBottom = container.scrollTop + container.clientHeight < container.scrollHeight - threshold
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
        this.observeMessages()

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
    canEditMessage (message) {
      if (!message || message.sender !== this.myPubKey) return false
      const elapsed = Date.now() / 1000 - message.created_at
      return elapsed <= 60
    },
    canDeleteMessage (message) {
      if (!message || message.sender !== this.myPubKey) return false
      const elapsed = Date.now() / 1000 - message.created_at
      return elapsed <= 60
    },
    setEdit (message) {
      if (!this.canEditMessage(message)) return
      if (this.replyToMessage) this.replyToMessage = null
      this.editingMessage = message
      this.$nextTick(() => {
        this.$refs.chatInput?.setText(message.content)
        this.$refs.chatInput?.$el?.querySelector('input')?.focus()
      })
    },
    cancelEdit () {
      this.editingMessage = null
    },
    confirmDeleteMessage (message) {
      this.$q.dialog({
        title: this.$t('DeleteMessage', {}, 'Delete Message'),
        message: this.$t('DeleteMessageConfirm', {}, 'Delete this message? This cannot be undone.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Delete', {}, 'Delete'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          const { giftWraps, roomId, messageId } = await this.$store.dispatch('nostrChat/sendDeleteMessage', {
            roomId: this.roomId,
            messageId: message.id,
          })
          this.$store.commit('nostrChat/DELETE_MESSAGE', { roomId, messageId })
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        } catch (err) {
          console.error('Failed to delete message:', err)
          this.$q.notify({
            type: 'negative',
            message: this.$t('DeleteMessageFailed', {}, 'Failed to delete message') + ': ' + err.message,
          })
        }
      })
    },
    onTipAction () {
      const recipientPubKey = this.otherMemberPubKey
      if (!recipientPubKey) {
        this.$q.notify({ type: 'negative', message: this.$t('NoRecipientFound'), timeout: 5000, closeBtn: true })
        return
      }
      this.sendTipNavigate(recipientPubKey, 0)
    },
    async onSend (text) {
      if (!this.room) return
      try {
        if (this.editingMessage) {
          const { giftWraps, roomId } = await this.$store.dispatch('nostrChat/sendEditMessage', {
            roomId: this.roomId,
            text,
            editOf: this.editingMessage.id,
          })
          this.$store.commit('nostrChat/UPDATE_MESSAGE', {
            roomId,
            messageId: this.editingMessage.id,
            newContent: text,
          })
          this.editingMessage = null
          this.scrollToBottom()
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
          if (this.$store.getters['nostrChat/getShowActiveStatus']) {
            this.$store.dispatch('nostrChat/touchActive', {
              pubkey: this.myPubKey,
              recipients: this.room?.members?.filter(m => m !== this.myPubKey) || [],
            })
          }
        } else {
          const replyTo = this.replyToMessage?.id
          const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
            roomId: this.roomId,
            text,
            replyTo,
          })
          this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
          this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
          this.$store.dispatch('nostrChat/touchRoom', { roomId, timestamp: new Date().toISOString() })
          this.replyToMessage = null
          this.scrollToBottom()
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
          if (this.$store.getters['nostrChat/getShowActiveStatus']) {
            this.$store.dispatch('nostrChat/touchActive', {
              pubkey: this.myPubKey,
              recipients: this.room?.members?.filter(m => m !== this.myPubKey) || [],
            })
          }
        }
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
          this.$store.dispatch('nostrChat/updateRoomName', {
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
    useFetchedDisplayName () {
      if (this.fetchedDisplayName) {
        if (this.showRenameDialog) {
          this.renameContactName = this.fetchedDisplayName
        } else if (this.showSaveContactDialog) {
          this.saveContactName = this.fetchedDisplayName
        }
      }
    },
    openRenameDialog () {
      this.renameContactName = this.otherMemberContact?.name || ''
      this.showRenameDialog = true
    },
    openRenameGroupDialog () {
      this.renameGroupName = this.room?.name || ''
      this.showRenameGroupDialog = true
    },
    async renameGroup () {
      try {
        const name = this.renameGroupName.trim()
        if (!name || !this.room) return
        await this.$store.dispatch('nostrChat/updateRoomName', { roomId: this.roomId, name })
        const text = this.$t('GroupRenamedTo', { name }, `Changed group name to "${name}"`)
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
          subject: name,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
        this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        // Persist the new name on the relay so all members see it
        this.$store.dispatch('nostrChat/publishGroupMetadata', {
          roomId: this.roomId,
          memberPubKeys: this.room?.members || [],
          name,
        }).catch(() => {})
        this.renameGroupName = ''
        this.showRenameGroupDialog = false
        this.$q.notify({ type: 'positive', message: this.$t('GroupRenamed', {}, 'Group renamed') })
      } catch (err) {
        this.$q.notify({ type: 'negative', message: err.message || this.$t('RenameGroupFailed', {}, 'Failed to rename group') })
      }
    },
    confirmLeaveGroup () {
      this.$q.dialog({
        title: this.$t('LeaveGroup', {}, 'Leave Group'),
        message: this.$t('LeaveGroupConfirm', { name: this.room?.name }, `Leave group "${this.room?.name}"?`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('LeaveGroup', {}, 'Leave Group'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          await this.$store.dispatch('nostrChat/leaveGroup', { roomId: this.roomId })
          this.$router.replace('/apps/chat')
          this.$q.notify({ type: 'info', message: this.$t('LeftGroup', {}, 'You left the group') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || this.$t('LeaveGroupFailed', {}, 'Failed to leave group') })
        }
      })
    },
    confirmRejoinGroup () {
      const roomName = this.roomName
      this.$q.dialog({
        title: this.$t('RejoinGroup', {}, 'Rejoin Group'),
        message: this.$t('RejoinGroupConfirm', { name: roomName }, `Rejoin "${roomName}"? You will be able to send and receive messages again.`),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('RejoinGroup', {}, 'Rejoin Group'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(async () => {
        await this.$store.dispatch('nostrChat/rejoinGroup', { roomId: this.roomId })
        this.$q.notify({ type: 'positive', message: this.$t('GroupRejoined', {}, 'Group rejoined') })
      })
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
          this.$store.dispatch('nostrChat/updateRoomName', {
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
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Archive', {}, 'Archive'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(() => {
        this.$store.dispatch('nostrChat/archiveRoom', this.roomId)
        this.$router.replace('/apps/chat')
        this.$q.notify({
          type: 'info',
          message: this.$t('ConversationArchived', {}, 'Conversation archived'),
        })
      })
    },
    unarchiveRoom () {
      this.$store.dispatch('nostrChat/unarchiveRoom', this.roomId)
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
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Block', {}, 'Block'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(() => {
        if (otherPubKey) {
          this.$store.dispatch('nostrChat/blockContact', otherPubKey)
          this.$store.dispatch('nostrChat/archiveRoom', this.roomId)
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
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Unblock', {}, 'Unblock'), color: 'primary', flat: true },
        persistent: true,
      }).onOk(() => {
        if (otherPubKey) {
          this.$store.dispatch('nostrChat/unblockContact', otherPubKey)
          this.$store.dispatch('nostrChat/unarchiveRoom', this.roomId)
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
      const note = this.$t('DeleteConversationNote', {}, 'This only removes it from this device. It stays on the relay and will be restored if you Reset Chat.')

      // Groups: leaving already handles "blocking" via BLOCK_GROUP, so delete
      // is a simple permanent removal. Also clear any group-block tracker.
      if (this.isGroupRoom) {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Delete "${roomName}"?`) + '\n\n' + note,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('Delete', {}, 'Delete'), color: 'negative', flat: true },
          persistent: true,
        }).onOk(() => {
          this.$store.dispatch('nostrChat/unblockGroup', this.roomId)
          this.$store.dispatch('nostrChat/deleteRoom', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({ type: 'info', message: this.$t('ConversationDeleted', {}, 'Conversation deleted') })
        })
        return
      }

      if (isBlocked) {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationConfirm', { name: roomName }, `Delete conversation with ${roomName}?`) + '\n\n' + note,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          ok: { label: this.$t('Delete', {}, 'Delete'), color: 'negative', flat: true },
          persistent: true,
        }).onOk(() => {
          this.$store.dispatch('nostrChat/deleteRoom', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({
            type: 'info',
            message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
          })
        })
      } else {
        this.$q.dialog({
          title: this.$t('DeleteConversation', {}, 'Delete Conversation'),
          message: this.$t('DeleteConversationOptions', { name: roomName }, `How would you like to delete the conversation with ${roomName}?`) + '\n\n' + note,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
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
            this.$store.dispatch('nostrChat/blockContact', otherPubKey)
          }
          this.$store.dispatch('nostrChat/deleteRoom', this.roomId)
          this.$router.replace('/apps/chat')
          this.$q.notify({
            type: 'info',
            message: this.$t('ConversationDeleted', {}, 'Conversation deleted'),
          })
        })
      }
    },
    handleTipResult () {
      const { tipTxid, tipAmount, tipSymbol, tipLogo } = this.$route.query
      if (!tipTxid || !tipAmount) return
      const query = { ...this.$route.query }
      delete query.tipTxid
      delete query.tipAmount
      delete query.tipSymbol
      delete query.tipLogo
      this.$router.replace({ query })
      this.$nextTick(() => this.sendTipConfirmationMessage(tipTxid, parseFloat(tipAmount), tipSymbol || 'BCH', tipLogo || ''))
    },
    async sendTipConfirmationMessage (txid, amount, symbol, logo) {
      if (!this.room || !txid) return
      try {
        let markup = `t:payment,a:${amount},s:${symbol},x:${txid}`
        if (logo) markup += `,l:${logo}`
        const text = `Sent ${amount} ${symbol} [/*${markup}*/]`
        const { giftWraps, message, roomId } = await this.$store.dispatch('nostrChat/sendMessage', {
          roomId: this.roomId,
          text,
        })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
        this.$store.dispatch('nostrChat/touchRoom', { roomId, timestamp: new Date().toISOString() })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        this.$q.notify({
          type: 'positive',
          message: this.$t('BchSentSuccess', { amount, txid: txid?.slice(0, 12) }, `Successfully sent ${amount} ${symbol}`),
        })
      } catch (err) {
        console.error('[Conversation] Failed to send tip confirmation:', err)
      }
    },
    async onCommand ({ type, amount, currency, originalText }) {
      if (type !== 'send') return
      if (!this.room) {
        this.$q.notify({ type: 'negative', message: this.$t('NoActiveRoom'), timeout: 5000, closeBtn: true })
        this.$refs.chatInput?.setText(originalText)
        return
      }

      const currencyUpper = (currency || 'BCH').toUpperCase()

      if (currencyUpper === 'BCH') {
        await this.sendTipNavigate(this.otherMemberPubKey, amount, originalText)
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
    async sendTipNavigate (recipientPubKey, amount, originalText = null) {
      if (!recipientPubKey) {
        this.$q.notify({ type: 'negative', message: this.$t('NoRecipientFound'), timeout: 5000, closeBtn: true })
        if (originalText) this.$refs.chatInput?.setText(originalText)
        return
      }

      this.$q.loading.show({ message: this.$t('FetchingRecipientAddress', {}, 'Fetching recipient address...') })
      let address = null
      try {
        address = await this.$store.dispatch('nostrChat/fetchPublishedBchAddress', {
          pubKeyHex: recipientPubKey,
        })
      } catch (err) {
        console.error('[Conversation] Failed to fetch BCH address:', err)
      }
      this.$q.loading.hide()

      const query = { chatRoomId: this.roomId, backPath: `/apps/chat/${this.roomId}` }
      if (address) query.address = address
      if (amount > 0) query.amount = amount

      this.$router.push({ name: 'transaction-send-select-asset', query })
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0;
}

.header-info-btn {
  height: 36px;
  width: 36px;
}

.header-menu-btn {
  height: 36px;
  width: 36px;
}

/* Widen the header right slot only on this page to fit both buttons */
.apps-header :deep(.pt-header-right) {
  flex: 0 0 auto;
  width: auto;
  min-width: auto;
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

.published-identity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.published-name-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.use-published-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.use-published-name-text {
  flex: 1;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

.use-published-name-text strong {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-top: 2px;
}

/* Dark mode */
.dark .published-identity-row {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .published-name-text {
  color: #f1f5f9;
}

.dark .use-published-name-row {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .use-published-name-text {
  color: #d1d5db;
}

.dark .use-published-name-text strong {
  color: #f3f4f6;
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

.reply-bar-file-icon {
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

/* Edit bar */
.edit-bar {
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

.edit-bar-indicator {
  width: 3px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.edit-bar-body {
  flex: 1;
  min-width: 0;
}

.edit-bar-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 1px;
}

.edit-bar-snippet {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-bar-close {
  flex-shrink: 0;
}

.dark .edit-bar {
  background: #1a2332;
  border-top-color: rgba(255, 255, 255, 0.06);
}

.dark .edit-bar-snippet {
  color: #94a3b8;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 20px 2px;
  flex-shrink: 0;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.dark .typing-dots span {
  background: #64748b;
}

.dark .typing-text {
  color: #64748b;
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

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

.load-more-btn {
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  padding: 6px 20px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.load-more-btn:active {
  transform: scale(0.97);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.load-more-btn.dark {
  border-color: #475569;
  color: #94a3b8;
}

.load-more-btn.dark:hover {
  background: #334155;
  border-color: #64748b;
  color: #e2e8f0;
}

.load-more-spinner {
  display: inline-block;
  vertical-align: middle;
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

.request-to-join-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-height: 0;
}

.request-to-join-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 32px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  max-width: 320px;
  width: 100%;
}

.request-to-join-card.dark {
  background: #1e293b;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
}

.request-card-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.06));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--q-primary);
}

.request-card-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.3;
}

.dark .request-card-title {
  color: #f1f5f9;
}

.request-card-meta {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
}

.dark .request-card-meta {
  color: #94a3b8;
}

.request-card-desc {
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.4;
}

.dark .request-card-desc {
  color: #64748b;
}

.request-join-btn {
  min-width: 180px;
}

.blocked-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
}

.dark .blocked-notice {
  color: #f87171;
}
</style>
