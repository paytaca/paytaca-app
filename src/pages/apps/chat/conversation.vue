<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow column"
    :class="getDarkModeClass(darkMode)"
    @click="onRootClick"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/chat"
      :title="roomName"
      :normal-case="true"
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
            <q-item v-if="isMlsRoom" clickable v-close-popup @click="resetMlsData">
              <q-item-section side>
                <q-icon name="delete_sweep" size="18px" color="negative" />
              </q-item-section>
              <q-item-section>
                <span class="text-negative">{{ $t('ResetMlsData', {}, 'Reset MLS data (test)') }}</span>
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
      <div ref="messagesContainer" class="messages-scroll-area col scroll" @click="onMessagesClick" @scroll="onMessagesScroll">
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
              :show-sender-name="isGroupRoom"
              :contacts="contacts"
              :display-names="memberDisplayNames"
              :is-read="messageReadMap[msg.id] || false"
              :read-by-names="readByNamesMap[msg.id] || []"
              :is-new="newMessageIds.has(msg.id)"
              :reply-to-message="getMessageById(msg.replyTo)"
              :is-replying="replyToMessage?.id === msg.id"
              :reactions="getMessageReactions(msg.id)"
              :is-selected="selectedMessageId === msg.id"
              :text-selectable="isContextMenuOpen && selectedMessageId === msg.id"
              @context-menu="openMessageMenu"
              @remove-reaction="onRemoveReaction"
              @scroll-to-message="scrollToMessage"
              @open-transaction="onOpenTransaction"
              @retry-message="onRetryFailedMessage"
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
    <transition name="context-menu-scale">
      <div
        v-if="showContextMenuDialog"
        class="context-menu-backdrop"
        :class="getDarkModeClass(darkMode)"
        @click="hideContextMenu"
        @contextmenu.prevent="hideContextMenu"
        @pointerdown="onContextMenuBackdropPointerDown"
      >
        <div
          ref="contextMenuEl"
          class="context-menu text-bow"
          :class="getDarkModeClass(darkMode)"
          :style="contextMenuStyle"
          @click.stop
        >
          <q-list style="min-width: 150px">
            <q-item clickable @mousedown.prevent @click.stop="copyMessage(contextMessage)">
              <q-item-section avatar>
                <q-icon name="content_copy" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ $t('Copy', {}, 'Copy') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="hasTextSelection" clickable @mousedown.prevent @click.stop="quoteMessage(contextMessage)">
              <q-item-section avatar>
                <q-icon name="format_quote" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ $t('Quote', {}, 'Quote') }}</q-item-label>
              </q-item-section>
            </q-item>
            <template v-if="!hasTextSelection">
              <q-item clickable @mousedown.prevent @click.stop="setReply(contextMessage)">
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
                @mousedown.prevent
                @click.stop="setEdit(contextMessage)"
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
                @mousedown.prevent
                @click.stop="confirmDeleteMessage(contextMessage)"
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
                    <span v-for="emoji in quickReactions" :key="emoji" class="react-emoji" @mousedown.prevent @click.stop="onReact(contextMessage, emoji)">{{ emoji }}</span>
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </div>
      </div>
    </transition>

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
    // Room type hint from the URL (?type=mls-group|group|private). Used as a
    // fallback so the conversation can be handled correctly (e.g. MLS send
    // routing) before/without the full room object being in the store.
    type: { type: String, default: null },
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
      hasTextSelection: false,
      selectedText: '',
      quickReactions: ['😂', '🎉', '❤️', '😊', '👍', '💯', '🔥', '🙏', '🤔', '😮', '😢', '👎'],
      showScrollToBottom: false,
      isContextMenuOpen: false,
      showContextMenuDialog: false,
      selectedMessageId: null,
      contextMenuStyle: {},
      displayLimit: 15,
      isLoadingMore: false,
      _allMessagesLoaded: false,
      _scrollToMessageId: null,
      // Guard to ignore the next pointerdown which may be the finger lifting
      _ignoreNextPointerDown: false,
      _selectionChangeHandler: null,
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
      if (this.type) {
        return {
          id: this.roomId,
          type: this.type,
          name: this._previewName || 'Group',
          members: [],
        }
      }
      return null
    },
    isMlsRoom () {
      return (this.room?.type || this.type) === 'mls-group'
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
      return this.room?.type === 'group' || this.room?.type === 'mls-group'
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
      if (room.type === 'group' || room.type === 'mls-group') {
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
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey) return map

      const readBy = this.$store.getters['nostrChat/getMessageReadBy'](this.roomId)

      for (const msg of this.displayedMessages) {
        if (msg.sender !== myPubKey) continue
        map[msg.id] = Object.keys(readBy[msg.id] || {}).length > 0
      }

      return map
    },
    readByNamesMap () {
      const map = {}
      const myPubKey = this.myPubKey
      const room = this.room
      if (!room || !myPubKey || (room.type !== 'group' && room.type !== 'mls-group')) return map

      const readBy = this.$store.getters['nostrChat/getMessageReadBy'](this.roomId)

      for (const msg of this.displayedMessages) {
        if (msg.sender !== myPubKey) continue
        const readers = Object.keys(readBy[msg.id] || {})
        if (!readers.length) continue
        map[msg.id] = readers.map(pubKey => {
          const contact = this.contactsByPubKey.get(pubKey)
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
          const container = this.$refs.messagesContainer
          const nearBottom = container &&
            container.scrollTop + container.clientHeight >= container.scrollHeight - 150
          if (nearBottom) {
            this.scrollToBottom()
          }
        }
      }
      this.previousMessageCount = newLen

      // Observe only newly added message groups instead of iterating all DOM elements
      if (oldLen < newLen && this.$refs.messagesContainer) {
        const els = this.$refs.messagesContainer.querySelectorAll(`[data-msg-id]:not(.observed)`)
        for (let i = newLen - oldLen; i > 0 && els[i - 1]; i--) {
          const el = els[i - 1]
          this._messageObserver?.observe(el)
          el.classList.add('observed')
        }
      }
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
    this._stopWatchingSelection()
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
      if (this._messageObserver && this.$refs.messagesContainer) {
        const els = this.$refs.messagesContainer.querySelectorAll('.message-group')
        els.forEach(el => {
          this._messageObserver.observe(el)
          el.classList.add('observed')
        })
      }
      this.markDisplayedMessagesAsRead()
    },
    markDisplayedMessagesAsRead () {
      if (!this.roomId || !this.myPubKey || !this._isActive) return
      for (const msg of this.displayedMessages) {
        if (msg.sender === this.myPubKey) continue
        if (this._sentReadReceiptIds.has(msg.id)) continue
        this._pendingReadMsgIds.add(msg.id)
      }
      this._flushReadMsgIds()
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
          const msg = this.messageIndexById.get(id)
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
      if (this.isContextMenuOpen) this.hideContextMenu()
      this.contextMessage = message
      this.selectedMessageId = message.id

      // The initial long-press / right-click must not highlight any text —
      // it only opens the context menu. Clear any leftover selection so the
      // menu always starts in its full state; a new selection made while the
      // menu is open swaps it to copy/quote.
      window.getSelection()?.removeAllRanges()
      this.hasTextSelection = false
      this.selectedText = ''

      this.$nextTick(async () => {
        const msgElement = document.getElementById('msg-' + message.id)
        if (!msgElement) {
          this.showContextMenuCenter()
          return
        }

        const menuMargin = 12
        const estimatedMenuHeight = this.hasTextSelection ? 140 : 340
        let msgRect = msgElement.getBoundingClientRect()

        // If the menu doesn't fit below the bubble (bubble near the message
        // input), raise the bubble by scrolling the list so the menu can sit
        // below it without overlapping the bubble.
        const container = this.$refs.messagesContainer
        const spaceBelow = this._spaceBelowBubble(msgRect)
        if (spaceBelow < estimatedMenuHeight + menuMargin && container) {
          const scrollNeeded = estimatedMenuHeight + menuMargin - spaceBelow + 16
          const startTop = container.scrollTop
          const targetTop = Math.min(startTop + scrollNeeded, container.scrollHeight - container.clientHeight)
          if (targetTop > startTop) {
            // Smooth scrolling of a plain div is not reliably supported in
            // mobile WebViews, so if the scroll never starts we jump straight
            // to the target. Either way the bubble ends up raised and the
            // menu can sit below it.
            try {
              container.scrollTo({ top: targetTop, behavior: 'smooth' })
            } catch (e) {
              container.scrollTop = targetTop
            }
            await this._awaitScrollSettled(container, targetTop, startTop)
            msgRect = msgElement.getBoundingClientRect()
          }
        }

        this.positionContextMenu(msgRect, message.sender === this.myPubKey, menuMargin, estimatedMenuHeight)

        this.showContextMenuDialog = true
        this.isContextMenuOpen = true
        this._ignoreNextPointerDown = true
        setTimeout(() => { this._ignoreNextPointerDown = false }, 350)

        this._startWatchingSelection(message.id)

        // Re-anchor the menu to the bubble using its real rendered height —
        // the estimate used for the initial position may differ, which would
        // otherwise leave the menu floating too high above the bubble.
        this.$nextTick(() => {
          this._repositionContextMenu()
        })
      })
    },
    // Usable space below the bubble, reserving room for the chat input so the
    // menu never sits on top of it.
    _spaceBelowBubble (msgRect) {
      const inputEl = this.$refs.chatInput?.$el
      const inputH = inputEl ? inputEl.offsetHeight : 64
      return window.innerHeight - msgRect.bottom - inputH - 16
    },
    _awaitScrollSettled (el, targetTop, startTop) {
      return new Promise(resolve => {
        const begin = Date.now()
        const tick = () => {
          if (Math.abs(el.scrollTop - targetTop) <= 1) {
            resolve()
            return
          }
          // Smooth scroll never started (unsupported on this WebView) —
          // jump straight to the target so the menu position is correct.
          if (Date.now() - begin > 60 && Math.abs(el.scrollTop - startTop) <= 1) {
            el.scrollTop = targetTop
            resolve()
            return
          }
          if (Date.now() - begin > 1200) {
            resolve()
            return
          }
          requestAnimationFrame(tick)
        }
        tick()
      })
    },
    positionContextMenu (msgRect, isMine, margin, menuHeight = 340) {
      const menuWidth = 200
      const padding = 16
      let left = Math.max(padding, msgRect.left)

      if (isMine) {
        left = Math.max(padding, msgRect.right - menuWidth)
      }

      // Prefer placing the menu below the bubble. When there is not enough
      // room (bubble near the message input), flip it above so the context
      // menu never overlays the message bubble itself.
      const spaceBelow = this._spaceBelowBubble(msgRect)
      const spaceAbove = msgRect.top - padding
      let top
      if (menuHeight <= spaceBelow) {
        top = msgRect.bottom + margin
      } else if (menuHeight <= spaceAbove) {
        top = msgRect.top - menuHeight - margin
      } else {
        // Neither side fully fits — use the side with the most room.
        top = spaceAbove >= spaceBelow
          ? Math.max(padding, msgRect.top - menuHeight - margin)
          : msgRect.bottom + margin
      }

      const inputEl = this.$refs.chatInput?.$el
      const inputH = inputEl ? inputEl.offsetHeight : 64
      top = Math.min(Math.max(top, padding), window.innerHeight - inputH - menuHeight - padding)
      left = Math.min(Math.max(left, padding), window.innerWidth - menuWidth - padding)

      this.contextMenuStyle = {
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
      }
    },
    showContextMenuCenter () {
      this.contextMenuStyle = {
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
      }
      this.showContextMenuDialog = true
      this.isContextMenuOpen = true
      this._ignoreNextPointerDown = true
      setTimeout(() => { this._ignoreNextPointerDown = false }, 350)
      if (this.contextMessage) {
        this._startWatchingSelection(this.contextMessage.id)
      }
    },
    _startWatchingSelection (messageId) {
      this._stopWatchingSelection()
      this._selectionChangeHandler = () => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) {
          if (this.hasTextSelection) {
            this.hasTextSelection = false
            this.selectedText = ''
            this._repositionContextMenu()
          }
          return
        }
        const msgEl = document.getElementById('msg-' + messageId)
        if (!msgEl) return
        if (msgEl.contains(sel.anchorNode) && msgEl.contains(sel.focusNode)) {
          const text = sel.toString().trim()
          if (text && text !== this.selectedText) {
            this.hasTextSelection = true
            this.selectedText = text
            this._repositionContextMenu()
          }
        }
      }
      document.addEventListener('selectionchange', this._selectionChangeHandler)
    },
    // Recompute the menu position when its content changes height (full menu
    // <-> copy/quote) so it stays anchored to the message bubble. Uses the
    // real rendered menu height so it never floats far from the bubble.
    _repositionContextMenu () {
      if (!this.contextMessage) return
      const msgElement = document.getElementById('msg-' + this.contextMessage.id)
      const menuEl = this.$refs.contextMenuEl
      if (!msgElement || !menuEl) return
      const msgRect = msgElement.getBoundingClientRect()
      const menuHeight = menuEl.offsetHeight || (this.hasTextSelection ? 140 : 340)
      this.positionContextMenu(msgRect, this.contextMessage.sender === this.myPubKey, 12, menuHeight)
    },
    _stopWatchingSelection () {
      if (this._selectionChangeHandler) {
        document.removeEventListener('selectionchange', this._selectionChangeHandler)
        this._selectionChangeHandler = null
      }
    },
    hideContextMenu () {
      if (this._ignoreNextPointerDown) return
      this._stopWatchingSelection()
      this.showContextMenuDialog = false
      this.isContextMenuOpen = false
      this.hasTextSelection = false
      this.selectedText = ''
      this.selectedMessageId = null
      window.getSelection()?.removeAllRanges()
    },
    onMessagesClick (e) {
      this.onRootClick(e)
    },
    onRootClick (e) {
      // Clicks inside the message whose context menu is open must not dismiss
      // the menu — the user may be clicking to position or complete a text
      // selection. This guards both the messages container and the root
      // app-container, since the click bubbles up through both.
      if (this.selectedMessageId && this.isContextMenuOpen) {
        const msgEl = document.getElementById('msg-' + this.selectedMessageId)
        if (msgEl && msgEl.contains(e.target)) return
      }
      this.hideContextMenu()
    },
    onDocumentPointerDown (e) {
      if (this._ignoreNextPointerDown) {
        this._ignoreNextPointerDown = false
        return
      }

      if (!this.isContextMenuOpen) return
      const menuEl = this.$refs.contextMenuEl
      const target = e.target
      if (menuEl && (menuEl.contains && menuEl.contains(target))) return
      const path = (typeof e.composedPath === 'function') ? e.composedPath() : (e.path || [])
      if (path && menuEl && path.indexOf(menuEl) !== -1) return
      const backdrop = target.closest?.('.context-menu-backdrop')
      if (backdrop) return

      // Allow clicking inside the selected message without closing the menu
      // so users can select/copy text while the context menu is visible.
      if (this.selectedMessageId) {
        const msgEl = document.getElementById('msg-' + this.selectedMessageId)
        if (msgEl && (msgEl.contains && msgEl.contains(target))) return
      }

      this.hideContextMenu()
      window.getSelection()?.removeAllRanges()
    },
    onContextMenuBackdropPointerDown (e) {
      if (this._ignoreNextPointerDown) {
        this._ignoreNextPointerDown = false
        return
      }
    },
    onReact (message, emoji) {
      this.hideContextMenu()
      if (!message || !emoji) return
      this.$store.dispatch('nostrChat/sendReaction', {
        roomId: this.roomId,
        messageId: message.id || message.kind14Id,
        emoji,
      }).catch(err => {
        console.error('[Conversation] Failed to send reaction:', err)
      })
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
      const query = { from: 'chat', roomId: this.roomId }
      if (markup.category) {
        query.assetID = `ct/${markup.category}`
        query.category = markup.category
      }
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: markup.txid },
        query,
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
    copyMessage (message) {
      const sel = window.getSelection()
      const selection = sel && !sel.isCollapsed ? sel.toString().trim() : ''
      this.hideContextMenu()
      if (selection) {
        navigator.clipboard.writeText(selection)
      } else {
        const { text } = parseMessageMarkup(message.content || '')
        const content = text || message.content || ''
        navigator.clipboard.writeText(content)
      }
      this.$q.notify({
        type: 'positive',
        message: this.$t('MessageCopied', {}, 'Message copied'),
        timeout: 2000,
      })
    },
    quoteMessage (message) {
      const sel = window.getSelection()
      const selection = sel && !sel.isCollapsed ? sel.toString().trim() : ''
      this.hideContextMenu()
      const { text } = parseMessageMarkup(message.content || '')
      const quoteText = selection || text || message.content || ''
      this.replyToMessage = message
      this.$nextTick(() => {
        this.$refs.chatInput?.setText(`> ${quoteText}\n\n`)
        setTimeout(() => {
          this.$refs.chatInput?.focus()
        }, 150)
      })
    },
    setReply (message) {
      this.hideContextMenu()
      this.replyToMessage = message
      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.chatInput?.focus()
        }, 150)
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
      this.hideContextMenu()
      if (!this.canEditMessage(message)) return
      if (this.replyToMessage) this.replyToMessage = null
      this.editingMessage = message
      this.$nextTick(() => {
        this.$refs.chatInput?.setText(message.content)
        this.$refs.chatInput?.focus()
      })
    },
    cancelEdit () {
      this.editingMessage = null
    },
    confirmDeleteMessage (message) {
      this.hideContextMenu()
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
      this.handleTipRequest(null, 0)
    },
    async onSend (text) {
      if (!this.room) return
      try {
        if (this.editingMessage && !this.isMlsRoom) {
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

          // MLS groups use the MLS encryption layer instead of NIP-17 gift-wraps.
          // The message is returned already added to the local store by the action.
          if (this.isMlsRoom) {
            const { message, roomId } = await this.$store.dispatch('nostrChat/sendMlsMessage', {
              roomId: this.roomId,
              text,
              replyTo,
            })
            this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
            this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
            this.$store.dispatch('nostrChat/touchRoom', { roomId, timestamp: new Date().toISOString() })
            this.replyToMessage = null
            this.editingMessage = null
            this.scrollToBottom()
            if (this.$store.getters['nostrChat/getShowActiveStatus']) {
              this.$store.dispatch('nostrChat/touchActive', {
                pubkey: this.myPubKey,
                recipients: this.room?.members?.filter(m => m !== this.myPubKey) || [],
              })
            }
          } else {
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
    async resetMlsData () {
      this.$q.dialog({
        title: this.$t('ResetMlsData', {}, 'Reset MLS data?'),
        message: this.$t('ResetMlsDataConfirm', {}, 'This clears all MLS vuex state (ready, KeyPackage, groupStates, roomMlsMap, kpHistory) and IndexedDB groupStates for the current wallet so you can create a clean test group. Continue?'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Reset', {}, 'Reset'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        try {
          await this.$store.dispatch('nostrChat/resetMlsForTesting')
          this.$q.notify({ type: 'positive', message: this.$t('MlsDataReset', {}, 'MLS data cleared — create a new group to test') })
        } catch (err) {
          this.$q.notify({ type: 'negative', message: err.message || 'Failed to reset MLS data' })
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
      const { tipTxid, tipAmount, tipSymbol, tipLogo, tipAssetId, tipRecipient } = this.$route.query
      if (!tipTxid || !tipAmount) return
      const query = { ...this.$route.query }
      delete query.tipTxid
      delete query.tipAmount
      delete query.tipSymbol
      delete query.tipLogo
      delete query.tipAssetId
      delete query.tipRecipient
      this.$router.replace({ query })
      this.$nextTick(() => this.sendTipConfirmationMessage(tipTxid, parseFloat(tipAmount), tipSymbol || 'BCH', tipLogo || '', tipAssetId || '', tipRecipient || null))
    },
    async sendTipConfirmationMessage (txid, amount, symbol, logo, assetId, recipientPubKey = null) {
      if (!this.room || !txid) return
      let markup = `t:payment,a:${amount},s:${symbol},x:${txid}`
      if (logo) markup += `,l:${logo}`
      if (assetId) markup += `,c:${assetId}`
      // Embed the send-time fiat conversion so every member sees the same
      // value regardless of when they render the message.
      const fiatCurrency = this.$store.getters['market/selectedCurrency']?.symbol
      const bchPrice = symbol === 'BCH' && fiatCurrency
        ? this.$store.getters['market/getAssetPrice']('bch', fiatCurrency)
        : null
      if (bchPrice > 0) {
        markup += `,f:${(amount * bchPrice).toFixed(2)},fc:${fiatCurrency}`
      }
      const recipientName = recipientPubKey ? this.resolveMemberName(recipientPubKey) : null
      const text = recipientName
        ? `Sent ${amount} ${symbol} to @${recipientName} [/*${markup}*/]`
        : `Sent ${amount} ${symbol} [/*${markup}*/]`
      try {
        let message
        let roomId = this.roomId
        if (this.isMlsRoom) {
          // Tip confirmation must go to the whole group, not as a DM to the
          // person being tipped. Tag the recipient so the group sees who got it.
          const res = await this.$store.dispatch('nostrChat/sendMlsMessage', { roomId: this.roomId, text, recipientPubKey })
          message = res.message
          roomId = res.roomId
        } else {
          const res = await this.$store.dispatch('nostrChat/sendMessage', { roomId: this.roomId, text })
          message = res.message
          roomId = res.roomId
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps: res.giftWraps })
        }
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId, message })
        this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', roomId)
        this.$store.dispatch('nostrChat/touchRoom', { roomId, timestamp: new Date().toISOString() })
        this.$q.notify({
          type: 'positive',
          message: this.$t('BchSentSuccess', { symbol }, `${symbol} sent successfully`),
        })
      } catch (err) {
        console.error('[Conversation] Failed to send tip confirmation:', err)
        // Keep a local-only copy of the failed message so the sender sees it in
        // the conversation with a retry button. It is never published, so no
        // other member ever receives it.
        this.$store.commit('nostrChat/ADD_MESSAGE', {
          roomId: this.roomId,
          message: {
            id: `failed-${Date.now()}`,
            sender: this.myPubKey,
            content: text,
            kind: this.isMlsRoom ? 30117 : undefined,
            created_at: Math.floor(Date.now() / 1000),
            failed: true,
            mls: this.isMlsRoom,
            recipientPubKey: recipientPubKey || null,
          },
        })
      }
    },
    async onRetryFailedMessage (message) {
      if (!message?.failed || !this.room) return
      try {
        let res
        if (message.mls || this.isMlsRoom) {
          res = await this.$store.dispatch('nostrChat/sendMlsMessage', {
            roomId: this.roomId,
            text: message.content,
            recipientPubKey: message.recipientPubKey || undefined,
          })
        } else {
          res = await this.$store.dispatch('nostrChat/sendMessage', { roomId: this.roomId, text: message.content })
          await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps: res.giftWraps })
        }
        this.$store.commit('nostrChat/REMOVE_MESSAGE', { roomId: this.roomId, messageId: message.id })
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId: res.roomId, message: res.message })
        this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', res.roomId)
        this.$q.notify({ type: 'positive', message: this.$t('MessageSent', {}, 'Message sent') })
      } catch (err) {
        console.error('[Conversation] Retry failed:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('RetryFailed', {}, 'Still failing — check your connection and try again'),
          timeout: 5000,
        })
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
        await this.handleTipRequest(amount, originalText)
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
    async handleTipRequest (amount, originalText = null) {
      let recipientPubKey = this.otherMemberPubKey
      if (this.isGroupRoom) {
        // Groups (both MLS open groups and NIP-17 closed groups) have no single
        // "other member" — ask who is being tipped, then tip that member while
        // posting the confirmation to the whole group (see
        // sendTipConfirmationMessage).
        recipientPubKey = await this.pickTipRecipient()
        if (!recipientPubKey) {
          if (originalText) this.$refs.chatInput?.setText(originalText)
          return
        }
      }
      await this.sendTipNavigate(recipientPubKey, amount, originalText)
    },
    // In a group room there is no single "other member", so ask which member is
    // being tipped. The payment goes to that member's address, but the tip
    // confirmation message is posted to the whole group (via MLS for open
    // groups, via NIP-17 gift-wraps for closed groups), not as a DM to the
    // recipient.
    pickTipRecipient () {
      const myPub = this.myPubKey
      const members = (this.room?.members || []).filter(m => m && m !== myPub)
      if (!members.length) return Promise.resolve(null)
      const items = members.map(pk => {
        const contact = this.contactsByPubKey.get(pk)
        const displayName = this.memberDisplayNames[pk] || contact?.name || pk.slice(0, 12) + '...'
        return { label: displayName, value: pk }
      })
      return new Promise(resolve => {
        this.$q.dialog({
          title: this.$t('TipRecipientTitle', {}, 'Who are you tipping?'),
          message: this.$t('TipRecipientMessage', {}, 'Select the group member you want to send to.'),
          options: { type: 'radio', model: items[0]?.value || null, items: items },
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          ok: { label: this.$t('Next', {}, 'Next'), flat: true, color: 'primary' },
          cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
          persistent: true,
        }).onOk(pk => resolve(pk)).onCancel(() => resolve(null)).onDismiss(() => resolve(null))
      })
    },
    resolveMemberName (pubKey) {
      const contact = this.contactsByPubKey.get(pubKey)
      if (contact?.name) return contact.name
      const displayName = this.memberDisplayNames[pubKey]
      if (displayName) return displayName
      return pubKey.slice(0, 10)
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
      if (recipientPubKey) query.tipRecipient = recipientPubKey

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

/* Custom context menu */
.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: transparent;
  pointer-events: none;
}

.context-menu {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);
  padding: 6px 0;
  overflow: hidden;
  z-index: 2001;
  min-width: 180px;
  max-width: 260px;
  pointer-events: auto;
}

.context-menu.dark {
  background: #1e293b;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.context-menu :deep(.q-item) {
  min-height: 44px;
  padding: 8px 16px;
  cursor: pointer;
}

.context-menu :deep(.q-item.q-item-label) {
  cursor: default;
}

.context-menu :deep(.q-item:hover) {
  background: rgba(0, 0, 0, 0.04);
}

.context-menu.dark :deep(.q-item:hover) {
  background: rgba(255, 255, 255, 0.06);
}

.context-menu :deep(.q-item__section--avatar) {
  min-width: 36px;
  padding-right: 4px;
}

.context-menu :deep(.q-item__label--header) {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  padding: 10px 16px 4px;
}

.context-menu.dark :deep(.q-item__label--header) {
  color: #64748b;
}

.context-menu :deep(.react-emoji-row) {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  justify-items: center;
  padding: 0 8px;
}

.context-menu :deep(.react-emoji) {
  font-size: 22px;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background-color 0.15s ease, transform 0.15s ease;
  line-height: 1;
}

.context-menu :deep(.react-emoji:hover) {
  background: rgba(0, 0, 0, 0.06);
  transform: scale(1.2);
}

.context-menu.dark :deep(.react-emoji:hover) {
  background: rgba(255, 255, 255, 0.08);
}

/* Context menu scale transition */
.context-menu-scale-enter-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-scale-leave-active {
  transition: opacity 0.1s ease, transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-scale-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.context-menu-scale-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
</style>
